<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Column;
use App\Models\TeamMember;
use App\Models\InvitedMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use App\Mail\ProjectInvitationMail;
use Illuminate\Support\Facades\Log;

class ProjectController extends Controller
{
    /**
     * Get all projects for a user.
     */
    public function getUserProjects(string $clerkUserId)
    {
        // Find the team member
        $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();

        if (!$teamMember) {
            return response()->json(['message' => 'Team member not found'], 404);
        }

        // Get projects where the user is a team member
        $managerProjects = $teamMember->projects()
            ->wherePivot('role', 'manager')
            ->get();

        // Get projects where the user is invited
        $invitedProjects = $teamMember->projects()
            ->wherePivot('role', '!=', 'manager')
            ->get();

        return response()->json([
            'managerProjects' => $managerProjects,
            'invitedProjects' => $invitedProjects,
        ]);
    }

    /**
     * Create a new project.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'startDate' => 'required|date',
            'endDate' => 'required|date',
            'clerkUserId' => 'required|string',
            'invitedMembers' => 'nullable|array',
            'invitedMembers.*' => 'email',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Find or create the team member
        $teamMember = TeamMember::where('clerk_user_id', $request->clerkUserId)->first();

        if (!$teamMember) {
            return response()->json(['message' => 'Team member not found'], 404);
        }

        // Create the project
        $project = Project::create([
            'name' => $request->name,
            'description' => $request->description,
            'start_date' => $request->startDate,
            'end_date' => $request->endDate,
            'clerk_user_id' => $request->clerkUserId,
        ]);

        // Add the creator as a team member with manager role
        $project->teamMembers()->attach($teamMember->id, ['role' => 'manager']);

        // Create default columns
        $defaultColumns = ['À faire', 'En cours', 'En révision', 'Terminé'];
        foreach ($defaultColumns as $index => $title) {
            Column::create([
                'project_id' => $project->id,
                'title' => $title,
                'order' => $index,
            ]);
        }

        // Add invited members
        if ($request->has('invitedMembers') && is_array($request->invitedMembers)) {
            foreach ($request->invitedMembers as $email) {
                // Check if the member already exists
                $existingMember = TeamMember::where('email', $email)->first();

                if ($existingMember) {
                    // Add as a team member with member role
                    $project->teamMembers()->attach($existingMember->id, ['role' => 'member']);

                    // Send notification email to existing member
                    $this->sendInvitationEmail($project, $email, null, 'member');
                } else {
                    // Generate invitation token
                    $invitationToken = Str::random(32);

                    // Add as an invited member
                    InvitedMember::create([
                        'project_id' => $project->id,
                        'email' => $email,
                        'status' => 'pending',
                        'invitation_token' => $invitationToken,
                        'role' => 'member', // Default role
                    ]);

                    // Send invitation email
                    $this->sendInvitationEmail($project, $email, $invitationToken, 'member');
                }
            }
        }

        return response()->json([
            'message' => 'Project created successfully',
            'project' => $project,
        ], 201);
    }

    /**
     * Send invitation email to a member
     */
    private function sendInvitationEmail(Project $project, string $email, string $invitationToken = null, string $role = 'member')
    {
        try {
            // Create join link (with token if provided)
            $baseUrl = config('app.frontend_url', 'http://localhost:3000');
            $joinLink = $baseUrl . '/projects/' . $project->id;

            if ($invitationToken) {
                $joinLink .= '?token=' . $invitationToken;
            }

            // Send email
            Mail::to($email)->send(new ProjectInvitationMail($project, $joinLink, $role));

            return true;
        } catch (\Exception $e) {
            // Log the error but don't stop the process
            Log::error('Failed to send invitation email: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get a project with its columns and tasks.
     */
    public function show(int $id)
    {
        $project = Project::with([
            'columns.tasks.assignee',
            'columns.tasks.comments.author',
            'columns.tasks.attachments',
            'teamMembers',
        ])->findOrFail($id);

        return response()->json($project);
    }

    /**
     * Accept an invitation to join a project
     */
    public function acceptInvitation(Request $request, $token)
    {
        $invitation = InvitedMember::where('invitation_token', $token)->first();

        if (!$invitation) {
            return response()->json(['message' => 'Invalid invitation token'], 404);
        }

        if ($invitation->status !== 'pending') {
            return response()->json(['message' => 'Invitation already processed'], 400);
        }

        $validator = Validator::make($request->all(), [
            'clerkUserId' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Find or create team member
        $teamMember = TeamMember::where('clerk_user_id', $request->clerkUserId)->first();

        if (!$teamMember) {
            return response()->json(['message' => 'User not found'], 404);
        }

        // Add user to project with the role from the invitation
        $project = Project::findOrFail($invitation->project_id);
        $project->teamMembers()->attach($teamMember->id, ['role' => $invitation->role]);

        // Update invitation status
        $invitation->update(['status' => 'accepted']);

        return response()->json([
            'message' => 'Invitation accepted successfully',
            'project' => $project,
            'role' => $invitation->role
        ]);
    }

    // Ajouter cette méthode en haut de la classe pour vérifier les permissions
    private function checkProjectPermission($projectId, $clerkUserId, $requiredRole = 'member')
    {
        $project = Project::findOrFail($projectId);
        $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();

        if (!$teamMember) {
            return false;
        }

        $projectMember = $project->teamMembers()
            ->where('team_member_id', $teamMember->id)
            ->first();

        if (!$projectMember) {
            return false;
        }

        // Si l'utilisateur est manager, il a toutes les permissions
        if ($projectMember->pivot->role === 'manager') {
            return true;
        }

        // Si le rôle requis est 'manager', l'utilisateur n'a pas la permission
        if ($requiredRole === 'manager') {
            return false;
        }

        // Si le rôle requis est 'member' et que l'utilisateur est membre, il a la permission
        if ($requiredRole === 'member' && $projectMember->pivot->role === 'member') {
            return true;
        }

        // Si le rôle requis est 'observer' et que l'utilisateur est au moins observateur, il a la permission
        if ($requiredRole === 'observer' && in_array($projectMember->pivot->role, ['observer', 'member', 'manager'])) {
            return true;
        }

        return false;
    }

    /**
     * Invite users to a project with specific roles
     */
    public function inviteUsers(Request $request, $id)
    {
        // Vérifier si l'utilisateur est manager du projet
        if (!$this->checkProjectPermission($id, $request->header('X-Clerk-User-Id'), 'manager')) {
            return response()->json(['message' => 'Seuls les managers peuvent inviter des utilisateurs'], 403);
        }

        $validator = Validator::make($request->all(), [
            'invitations' => 'required|array',
            'invitations.*.email' => 'required|email',
            'invitations.*.permission' => 'required|in:observer,member,manager',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $project = Project::findOrFail($id);
            $invitationsSent = 0;

            // Process each invitation
            foreach ($request->invitations as $invitation) {
                $email = $invitation['email'];
                $role = $invitation['permission'];

                // Check if the member already exists
                $existingMember = TeamMember::where('email', $email)->first();

                if ($existingMember) {
                    // Check if already a member of this project
                    $isMember = $project->teamMembers()->where('team_member_id', $existingMember->id)->exists();

                    if ($isMember) {
                        // Update role if already a member
                        $project->teamMembers()->updateExistingPivot($existingMember->id, ['role' => $role]);
                    } else {
                        // Add as a team member with specified role
                        $project->teamMembers()->attach($existingMember->id, ['role' => $role]);
                    }

                    // Send notification email to existing member
                    $this->sendInvitationEmail($project, $email, null, $role);
                    $invitationsSent++;
                } else {
                    // Generate invitation token
                    $invitationToken = Str::random(32);

                    // Check if there's already a pending invitation
                    $existingInvitation = InvitedMember::where('project_id', $project->id)
                        ->where('email', $email)
                        ->where('status', 'pending')
                        ->first();

                    if ($existingInvitation) {
                        // Update existing invitation
                        $existingInvitation->update([
                            'role' => $role,
                            'invitation_token' => $invitationToken
                        ]);
                    } else {
                        // Create new invitation
                        InvitedMember::create([
                            'project_id' => $project->id,
                            'email' => $email,
                            'status' => 'pending',
                            'invitation_token' => $invitationToken,
                            'role' => $role,
                        ]);
                    }

                    // Send invitation email
                    $this->sendInvitationEmail($project, $email, $invitationToken, $role);
                    $invitationsSent++;
                }
            }

            return response()->json([
                'message' => 'Invitations sent successfully',
                'count' => $invitationsSent
            ]);
        } catch (\Exception $e) {
            Log::error('Error sending invitations: ' . $e->getMessage());
            return response()->json(['message' => 'Error sending invitations: ' . $e->getMessage()], 500);
        }
    }
}
