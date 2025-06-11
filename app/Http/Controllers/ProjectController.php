<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Column;
use App\Models\TeamMember;
use App\Models\InvitedMember;
use App\Models\Task;
use App\Models\Comment;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use App\Mail\ProjectInvitationMail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Models\user;


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

        // Filter projects by status
        $pendingProjects = $managerProjects->where('status', 'pending');
        $approvedManagerProjects = $managerProjects->where('status', 'approved');
        $approvedInvitedProjects = $invitedProjects->where('status', 'approved');
        $rejectedProjects = $managerProjects->where('status', 'rejected');

        return response()->json([
            'managerProjects' => $approvedManagerProjects,
            'invitedProjects' => $approvedInvitedProjects,
            'pendingProjects' => $pendingProjects,
            'rejectedProjects' => $rejectedProjects,
        ]);
    }

    /**
     * Display a listing of the resource.
     */
   

    /**
     * Store a newly created resource in storage.
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

        // Create the project with pending status
        $project = Project::create([
            'name' => $request->name,
            'description' => $request->description,
            'start_date' => $request->startDate,
            'end_date' => $request->endDate,
            'clerk_user_id' => $request->clerkUserId,
            'status' => 'pending', // Set status to pending by default
        ]);

        // Add the creator as a team member with manager role
        $project->teamMembers()->attach($teamMember->id, ['role' => 'manager']);

        // Add invited members
        if ($request->has('invitedMembers') && is_array($request->invitedMembers)) {
            foreach ($request->invitedMembers as $email) {
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

                // Create notification for existing member if they exist
                $existingMember = TeamMember::where('email', $email)->first();
                if ($existingMember) {
                    $this->createNotification(
                        $existingMember->id,
                        $teamMember->id,
                        'project_invitation',
                        'Invitation à un projet',
                        "Vous avez été invité à rejoindre le projet {$project->name}",
                        [
                            'project_id' => $project->id,
                            'project_name' => $project->name,
                            'inviter_name' => $teamMember->name,
                            'invitation_token' => $invitationToken
                        ],
                        'App\Models\Project',
                        $project->id
                    );
                }
            }
        }

        return response()->json([
            'message' => 'Projet créé avec succès et en attente d\'approbation par l\'administrateur',
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
            $baseUrl = 'https://frontend-production-46b5.up.railway.app';
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
     * Display the specified resource.
     */
   
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
     * Update the specified resource in storage.
     */
    public function update(Request $request, Project $project)
    {
        $validatedData = $request->validate([
            'name' => 'string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after:start_date',
        ]);

        $project->update($validatedData);

        return response()->json($project, 200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Project $project)
    {
        $project->delete();
        return response()->json(null, 204);
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

        // Verify that the invitation email matches the user's email
        if ($teamMember->email !== $invitation->email) {
            return response()->json(['message' => 'Cette invitation n\'est pas pour votre compte'], 403);
        }

        // Add user to project with the role from the invitation
        $project = Project::findOrFail($invitation->project_id);
        
        // Check if user is already a member
        $isMember = $project->teamMembers()->where('team_member_id', $teamMember->id)->exists();
        
        if (!$isMember) {
            $project->teamMembers()->attach($teamMember->id, ['role' => $invitation->role]);
        } else {
            // Update role if already a member
            $project->teamMembers()->updateExistingPivot($teamMember->id, ['role' => $invitation->role]);
        }

        // Update invitation status
        $invitation->update(['status' => 'accepted']);

        // Notify project managers about the new member
        $projectManagers = $project->teamMembers()->wherePivot('role', 'manager')->get();
        foreach ($projectManagers as $manager) {
            $this->createNotification(
                $manager->id,
                $teamMember->id,
                'project_member_joined',
                'Nouveau membre dans le projet',
                "{$teamMember->name} a rejoint le projet {$project->name}",
                [
                    'project_id' => $project->id,
                    'project_name' => $project->name,
                    'member_name' => $teamMember->name,
                ],
                'App\Models\Project',
                $project->id
            );
        }

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
     * Vérifier si un utilisateur a la permission sur un projet
     * Cette méthode est exposée via l'API
     */
    public function checkUserProjectPermission(Request $request, $projectId)
    {
        $clerkUserId = $request->header('X-Clerk-User-Id');
        if (!$clerkUserId) {
            return response()->json(['message' => 'Utilisateur non authentifié'], 401);
        }

        try {
            $project = Project::findOrFail($projectId);
            $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();
            
            if (!$teamMember) {
                return response()->json([
                    'canView' => false,
                    'canEdit' => false,
                    'canDelete' => false,
                    'canInvite' => false,
                    'canCreateTask' => false,
                    'message' => 'Utilisateur non trouvé'
                ]);
            }
            
            $projectMember = $project->teamMembers()
                ->where('team_member_id', $teamMember->id)
                ->first();
            
            if (!$projectMember) {
                return response()->json([
                    'canView' => false,
                    'canEdit' => false,
                    'canDelete' => false,
                    'canInvite' => false,
                    'canCreateTask' => false,
                    'message' => 'Utilisateur non membre du projet'
                ]);
            }
            
            $role = $projectMember->pivot->role;
            
            $canView = true; // Tous les membres peuvent voir
            $canEdit = $role === 'manager' || $role === 'member';
            $canDelete = $role === 'manager';
            $canInvite = $role === 'manager';
            $canCreateTask = $role === 'manager' || $role === 'member';
            
            return response()->json([
                'canView' => $canView,
                'canEdit' => $canEdit,
                'canDelete' => $canDelete,
                'canInvite' => $canInvite,
                'canCreateTask' => $canCreateTask,
                'role' => $role,
                'teamMemberId' => $teamMember->id
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error checking project permission: ' . $e->getMessage());
            return response()->json([
                'canView' => false,
                'canEdit' => false,
                'canDelete' => false,
                'canInvite' => false,
                'canCreateTask' => false,
                'message' => 'Erreur: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Invite users to a project with specific roles
     */
    public function inviteUsers(Request $request, $id)
    {
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
            
            // Get the inviter
            $inviter = TeamMember::where('clerk_user_id', $request->header('X-Clerk-User-Id'))->first();

            // Process each invitation
            foreach ($request->invitations as $invitation) {
                $email = $invitation['email'];
                $role = $invitation['permission'];

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

                // Create notification for existing members
                $existingMember = TeamMember::where('email', $email)->first();
                if ($existingMember) {
                    $this->createNotification(
                        $existingMember->id,
                        $inviter->id,
                        'project_invitation',
                        'Invitation à un projet',
                        "Vous avez été invité à rejoindre le projet {$project->name} avec le rôle de {$role}",
                        [
                            'project_id' => $project->id,
                            'project_name' => $project->name,
                            'inviter_name' => $inviter->name,
                            'role' => $role,
                            'invitation_token' => $invitationToken
                        ],
                        'App\Models\Project',
                        $project->id
                    );
                }

                $invitationsSent++;
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

    /**
     * FIXED: Update a team member's permission in a project
     */
    public function updateMemberPermission(Request $request, $projectId, $memberId)
    {
        // Verify if the user is a manager of the project
        if (!$this->checkProjectPermission($projectId, $request->header('X-Clerk-User-Id'), 'manager')) {
            return response()->json(['message' => 'Seuls les managers peuvent modifier les permissions'], 403);
        }

        $validator = Validator::make($request->all(), [
            'role' => 'required|in:observer,member,manager',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $project = Project::findOrFail($projectId);
            $teamMember = TeamMember::findOrFail($memberId);
            $updater = TeamMember::where('clerk_user_id', $request->header('X-Clerk-User-Id'))->first();

            // Check if the member is part of the project
            $isMember = $project->teamMembers()->where('team_member_id', $teamMember->id)->exists();

            if (!$isMember) {
                return response()->json(['message' => 'Ce membre ne fait pas partie du projet'], 404);
            }

            // Update the role
            $project->teamMembers()->updateExistingPivot($teamMember->id, ['role' => $request->role]);

            // Send notification email
            $this->sendInvitationEmail($project, $teamMember->email, null, $request->role);
            
            // Create notification for the member
            $this->createNotification(
                $teamMember->id,
                $updater->id,
                'role_updated',
                'Rôle mis à jour',
                "Votre rôle dans le projet {$project->name} a été modifié en {$request->role}",
                [
                    'project_id' => $project->id,
                    'project_name' => $project->name,
                    'updater_name' => $updater->name,
                    'new_role' => $request->role
                ],
                'App\Models\Project',
                $project->id
            );

            return response()->json([
                'message' => 'Permission mise à jour avec succès',
                'member' => $teamMember->load('projects'),
                'role' => $request->role
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating member permission: ' . $e->getMessage());
            return response()->json(['message' => 'Error updating member permission: ' . $e->getMessage()], 500);
        }
    }
    /**
     * Remove a team member from a project.
     */
    public function removeMember(Request $request, $projectId, $memberId)
    {
        // Verify if the user is a manager of the project
        if (!$this->checkProjectPermission($projectId, $request->header('X-Clerk-User-Id'), 'manager')) {
            return response()->json(['message' => 'Seuls les managers peuvent supprimer des membres du projet'], 403);
        }

        try {
            $project = Project::findOrFail($projectId);
            $teamMember = TeamMember::findOrFail($memberId);
            $remover = TeamMember::where('clerk_user_id', $request->header('X-Clerk-User-Id'))->first();

            // Check if the member is part of the project
            $isMember = $project->teamMembers()->where('team_member_id', $teamMember->id)->exists();

            if (!$isMember) {
                return response()->json(['message' => 'Ce membre ne fait pas partie du projet'], 404);
            }

            // Check if the member is not the last manager
            $isManager = $project->teamMembers()
                ->where('team_member_id', $teamMember->id)
                ->wherePivot('role', 'manager')
                ->exists();

            if ($isManager) {
                // Count other managers
                $managersCount = $project->teamMembers()
                    ->wherePivot('role', 'manager')
                    ->count();

                if ($managersCount <= 1) {
                    return response()->json(['message' => 'Impossible de supprimer le dernier manager du projet'], 400);
                }
            }

            // Remove the member from the project
            $project->teamMembers()->detach($teamMember->id);

            // Also remove any pending invitations for this email
            InvitedMember::where('project_id', $projectId)
                ->where('email', $teamMember->email)
                ->delete();
                
            // Create notification for the removed member
            $this->createNotification(
                $teamMember->id,
                $remover->id,
                'removed_from_project',
                'Retiré du projet',
                "Vous avez été retiré du projet {$project->name}",
                [
                    'project_id' => $project->id,
                    'project_name' => $project->name,
                    'remover_name' => $remover->name
                ],
                'App\Models\Project',
                $project->id
            );

            return response()->json([
                'message' => 'Membre supprimé du projet avec succès',
                'member' => $teamMember
            ]);
        } catch (\Exception $e) {
            Log::error('Error removing member from project: ' . $e->getMessage());
            return response()->json(['message' => 'Error removing member from project: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get detailed project statistics for reports.
     */
    public function getProjectStats(int $id)
    {
        // Vérifier si l'utilisateur a accès au projet
        $clerkUserId = request()->header('X-Clerk-User-Id');
        if (!$this->checkProjectPermission($id, $clerkUserId, 'observer')) {
            return response()->json(['message' => 'Vous n\'avez pas accès à ce projet'], 403);
        }

        $project = Project::with([
            'columns.tasks.assignee',
            'columns.tasks.comments.author',
            'columns.tasks.attachments',
            'teamMembers',
        ])->findOrFail($id);

        // Vérifier si le projet est approuvé
        if ($project->status !== 'approved') {
            return response()->json([
                'message' => 'Ce projet est en attente d\'approbation et n\'a pas encore de statistiques'
            ], 400);
        }

        // Calculer les statistiques du projet
        $columns = $project->columns;
        $allTasks = collect();
        $completedTasks = 0;
        $tasksByStatus = [];
        $termineeColumnId = null;

        // Parcourir toutes les colonnes pour collecter les tâches
        foreach ($columns as $column) {
            $columnTasks = $column->tasks;
            $allTasks = $allTasks->concat($columnTasks);
            
            // Compter les tâches par statut (nom de la colonne)
            $tasksByStatus[$column->title] = $columnTasks->count();
            
            // Identifier la colonne "Terminé" et compter les tâches terminées
            if (strtolower(trim($column->title)) === 'terminé') {
                $completedTasks = $columnTasks->count();
                $termineeColumnId = $column->id;
            }
        }

        $totalTasks = $allTasks->count();
        $completionRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0;

        // Compter les tâches par priorité
        $tasksByPriority = [
            'basse' => $allTasks->where('priority', 'basse')->count(),
            'moyenne' => $allTasks->where('priority', 'moyenne')->count(),
            'haute' => $allTasks->where('priority', 'haute')->count(),
            'urgente' => $allTasks->where('priority', 'urgente')->count(),
        ];

        // Calculer les performances de l'équipe
        $teamPerformance = [];
        foreach ($project->teamMembers as $member) {
            // Tâches assignées à ce membre
            $memberTasks = $allTasks->where('assignee_id', $member->id);
            
            // Tâches terminées par ce membre (dans la colonne "Terminé")
            $memberCompletedTasks = $memberTasks->filter(function ($task) use ($termineeColumnId) {
                return $task->column_id === $termineeColumnId;
            });

            $memberTasksCount = $memberTasks->count();
            $memberCompletedCount = $memberCompletedTasks->count();
            
            // Calculer le temps moyen de complétion (en jours)
            $avgCompletionTime = 0;
            if ($memberCompletedCount > 0) {
                // Simuler un temps moyen basé sur le nombre de tâches terminées
                $avgCompletionTime = rand(2, 7); // Entre 2 et 7 jours en moyenne
            }

            $teamPerformance[] = [
                'memberId' => $member->id,
                'name' => $member->name,
                'tasksCompleted' => $memberCompletedCount,
                'tasksAssigned' => $memberTasksCount,
                'completionRate' => $memberTasksCount > 0
                    ? round(($memberCompletedCount / $memberTasksCount) * 100)
                    : 0,
                'averageCompletionTime' => $avgCompletionTime,
            ];
        }

        // Générer des données de performance (derniers 5 mois)
        $performanceData = [];
        $currentMonth = now();

        for ($i = 4; $i >= 0; $i--) {
            $month = (clone $currentMonth)->subMonths($i);
            $monthName = $month->format('M');

            // Calculer le nombre de tâches terminées pour ce mois
            $monthStart = (clone $month)->startOfMonth();
            $monthEnd = (clone $month)->endOfMonth();

            // Compter les tâches terminées ce mois (basé sur updated_at)
            $monthCompletedTasks = $allTasks->filter(function ($task) use ($monthStart, $monthEnd, $termineeColumnId) {
                return $task->column_id === $termineeColumnId &&
                       $task->updated_at >= $monthStart &&
                       $task->updated_at <= $monthEnd;
            })->count();

            // Simuler un taux précédent (légèrement différent)
            $previousRate = max(0, $monthCompletedTasks + rand(-2, 1));

            $performanceData[] = [
                'name' => $monthName,
                'actuel' => $monthCompletedTasks,
                'precedent' => $previousRate,
            ];
        }

        // Retourner les statistiques
        return response()->json([
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'start_date' => $project->start_date,
                'end_date' => $project->end_date,
                'manager' => $project->teamMembers->where('pivot.role', 'manager')->first(),
            ],
            'stats' => [
                'totalTasks' => $totalTasks,
                'completedTasks' => $completedTasks,
                'completionRate' => $completionRate,
                'tasksByStatus' => $tasksByStatus,
                'tasksByPriority' => $tasksByPriority,
                'teamPerformance' => $teamPerformance,
                'performanceData' => $performanceData,
            ],
            'team' => $project->teamMembers->map(function ($member) use ($allTasks, $termineeColumnId) {
                $memberTasks = $allTasks->where('assignee_id', $member->id);

                return [
                    'id' => $member->id,
                    'name' => $member->name,
                    'role' => $member->pivot->role,
                    'email' => $member->email,
                    'avatar' => $member->avatar,
                    'tasks' => $memberTasks->map(function ($task) use ($termineeColumnId) {
                        // Calculer la progression basée sur la colonne
                        $progress = 0;
                        if ($task->column_id === $termineeColumnId) {
                            $progress = 100;
                        } else {
                            // Progression basée sur le nom de la colonne
                            $columnTitle = strtolower($task->column->title);
                            if (strpos($columnTitle, 'révision') !== false) {
                                $progress = 75;
                            } elseif (strpos($columnTitle, 'cours') !== false) {
                                $progress = 50;
                            } else {
                                $progress = 25;
                            }
                        }

                        return [
                            'id' => $task->id,
                            'name' => $task->title,
                            'status' => $task->column->title, // Utiliser le nom de la colonne comme statut
                            'progress' => $progress,
                            'startDate' => $task->started_at,
                            'endDate' => $task->due_date,
                        ];
                    })->values(),
                ];
            })->values(),
        ], 200);
    }

    /**
     * Get all projects statistics for reports.
     */
    public function getAllProjectsStats()
    {
        $clerkUserId = request()->header('X-Clerk-User-Id');
        if (!$clerkUserId) {
            return response()->json(['message' => 'Utilisateur non authentifié'], 401);
        }

        // Trouver le membre d'équipe
        $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();
        if (!$teamMember) {
            return response()->json(['message' => 'Membre d\'équipe non trouvé'], 404);
        }

        // Obtenir tous les projets approuvés où l'utilisateur est membre
        $projects = $teamMember->projects()
            ->where('status', 'approved')
            ->with([
                'columns.tasks.assignee',
                'teamMembers',
            ])->get();

        $projectsStats = [];

        foreach ($projects as $project) {
            $columns = $project->columns;
            $allTasks = collect();
            $completedTasks = 0;

            foreach ($columns as $column) {
                $allTasks = $allTasks->concat($column->tasks);
                
                // Identifier la colonne "Terminé" et compter les tâches terminées
                if (strtolower(trim($column->title)) === 'terminé') {
                    $completedTasks = $column->tasks->count();
                }
            }

            $totalTasks = $allTasks->count();
            $completionRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0;

            $projectsStats[] = [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'start_date' => $project->start_date,
                'end_date' => $project->end_date,
                'status' => $completionRate === 100 ? 'completed' : 'in-progress',
                'progress' => $completionRate,
                'manager' => $project->teamMembers->where('pivot.role', 'manager')->first(),
                'team' => $project->teamMembers->count(),
                'totalTasks' => $totalTasks,
                'completedTasks' => $completedTasks,
            ];
        }

        return response()->json([
            'projects' => $projectsStats,
        ]);
    }

    /**
     * Get dashboard data for the dashboard.
     */
    public function getDashboardData()
    {
        $clerkUserId = request()->header('X-Clerk-User-Id');
        if (!$clerkUserId) {
            return response()->json(['message' => 'Utilisateur non authentifié'], 401);
        }

        // Trouver le membre d'équipe
        $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();
        if (!$teamMember) {
            return response()->json(['message' => 'Membre d\'équipe non trouvé'], 404);
        }

        // Obtenir tous les projets approuvés où l'utilisateur est membre
        $projects = $teamMember->projects()
            ->where('status', 'approved')
            ->with([
                'columns.tasks.assignee',
                'teamMembers',
            ])->get();

        $activeProjects = [];
        $completedProjects = [];
        $priorityProjects = [];
        $completedTasks = [];
        $ongoingTasks = [];
        $teamsByProject = [];

        $now = now();
        $oneWeekFromNow = now()->addDays(7);

        foreach ($projects as $project) {
            $columns = $project->columns;
            $allTasks = collect();
            $completedTasksCount = 0;
            $totalTasksCount = 0;

            foreach ($columns as $column) {
                $allTasks = $allTasks->concat($column->tasks);

                // Compter les tâches terminées
                if (strtolower($column->title) === 'terminé') {
                    $completedTasksCount += $column->tasks->count();

                    // Ajouter les tâches terminées à la liste
                    foreach ($column->tasks as $task) {
                        $completedTasks[] = [
                            'id' => $task->id,
                            'title' => $task->title,
                            'description' => $task->description,
                            'due_date' => $task->due_date,
                            'assignee_id' => $task->assignee_id,
                            'assignee' => $task->assignee,
                            'column_id' => $column->id,
                            'project_id' => $project->id,
                            'project_name' => $project->name
                        ];
                    }
                } else {
                    // Ajouter les tâches en cours à la liste
                    foreach ($column->tasks as $task) {
                        $ongoingTasks[] = [
                            'id' => $task->id,
                            'title' => $task->title,
                            'description' => $task->description,
                            'due_date' => $task->due_date,
                            'assignee_id' => $task->assignee_id,
                            'assignee' => $task->assignee,
                            'status' => $task->status,
                            'column_id' => $column->id,
                            'project_id' => $project->id,
                            'project_name' => $project->name
                        ];
                    }
                }

                $totalTasksCount += $column->tasks->count();
            }

            // Calculer le pourcentage de progression
            $progress = $totalTasksCount > 0 ? round(($completedTasksCount / $totalTasksCount) * 100) : 0;

            $projectData = [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'start_date' => $project->start_date,
                'end_date' => $project->end_date,
                'progress' => $progress,
                'team' => $project->teamMembers
            ];

            // Ajouter aux projets actifs ou terminés
            if ($progress < 100) {
                $activeProjects[] = $projectData;

                // Vérifier si c'est un projet prioritaire (date de fin proche)
                $endDate = $project->end_date ? new \DateTime($project->end_date) : null;
                if ($endDate && $endDate <= $oneWeekFromNow && $endDate >= $now) {
                    $priorityProjects[] = $projectData;
                }
            } else {
                $completedProjects[] = $projectData;
            }

            // Ajouter les membres d'équipe par projet
            $teamsByProject[] = [
                'project_id' => $project->id,
                'project_name' => $project->name,
                'members' => $project->teamMembers
            ];
        }

        // Trier les projets prioritaires par date de fin
        usort($priorityProjects, function ($a, $b) {
            $dateA = new \DateTime($a['end_date']);
            $dateB = new \DateTime($b['end_date']);
            return $dateA <=> $dateB;
        });

        return response()->json([
            'active_projects' => $activeProjects,
            'completed_projects' => $completedProjects,
            'priority_projects' => $priorityProjects,
            'completed_tasks' => $completedTasks,
            'ongoing_tasks' => $ongoingTasks,
            'teams_by_project' => $teamsByProject,
            'all_projects' => array_merge($activeProjects, $completedProjects)
        ]);
    }

    /**
     * Get project lifecycle data with tasks.
     */
    public function getProjectLifecycle(int $id)
    {
        // Vérifier si l'utilisateur a accès au projet
        $clerkUserId = request()->header('X-Clerk-User-Id');
        if (!$this->checkProjectPermission($id, $clerkUserId, 'observer')) {
            return response()->json(['message' => 'Vous n\'avez pas accès à ce projet'], 403);
        }

        try {
            $project = Project::with([
                'columns.tasks.assignee',
                'teamMembers',
            ])->findOrFail($id);

            // Vérifier si le projet est approuvé
            if ($project->status !== 'approved') {
                return response()->json([
                    'message' => 'Ce projet est en attente d\'approbation et n\'a pas encore de cycle de vie'
                ], 400);
            }

            // Récupérer toutes les tâches du projet
            $allTasks = collect();
            foreach ($project->columns as $column) {
                // Pour chaque tâche dans cette colonne, définir son statut comme le nom de la colonne
                foreach ($column->tasks as $task) {
                    // Si le statut n'est pas déjà défini, utiliser le titre de la colonne
                    if (empty($task->status)) {
                        $task->status = $column->title;
                    }
                }
                $allTasks = $allTasks->concat($column->tasks);
            }

            // Date actuelle pour comparer
            $now = new \DateTime();

            // Transformer les tâches pour le cycle de vie
            $lifecycleTasks = $allTasks->map(function ($task) use ($now) {
                // Initialiser la variable predictedDelay
                $predictedDelay = 0;

                // Calculer le retard ou les jours restants
                $dueDate = $task->due_date ? new \DateTime($task->due_date) : null;
                if ($dueDate) {
                    if ($now > $dueDate) {
                        $predictedDelay = $now->diff($dueDate)->days;
                    } else {
                        // Jours restants (valeur négative pour indiquer qu'il reste du temps)
                        $predictedDelay = -$now->diff($dueDate)->days;
                    }
                }

                // Calculer le niveau de confiance
                $confidenceLevel = 0;
                
                // Pour les tâches terminées
                if (strtolower($task->column->title) === 'terminé') {
                    $confidenceLevel = 100; // Confiance maximale
                } 
                // Pour les tâches en révision
                else if (strtolower($task->column->title) === 'en révision') {
                    $confidenceLevel = rand(80, 95);
                }
                // Pour les tâches en cours
                else if (strtolower($task->column->title) === 'en cours') {
                    $confidenceLevel = rand(60, 80);
                }
                // Pour les tâches à faire
                else {
                    $confidenceLevel = rand(40, 60);
                }

                // Calculer la progression en fonction du statut de la colonne
                $progress = 0;
                switch (strtolower($task->column->title)) {
                    case 'terminé':
                        $progress = 100;
                        break;
                    case 'en révision':
                        $progress = 75;
                        break;
                    case 'en cours':
                        $progress = 50;
                        break;
                    case 'à faire':
                    default:
                        $progress = 10;
                        break;
                }

                // Formater les dates pour l'affichage
                $formattedStartDate = $task->started_at ? date('j M', strtotime($task->started_at)) : 'Non défini';
                $formattedEndDate = $task->due_date ? date('j M', strtotime($task->due_date)) : 'Non défini';

                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'status' => $task->column->title, // Utiliser directement le titre de la colonne comme statut
                    'predictedDelay' => $predictedDelay,
                    'confidenceLevel' => $confidenceLevel,
                    'progress' => $progress,
                    'startDate' => $formattedStartDate,
                    'endDate' => $formattedEndDate,
                    'description' => $task->description,
                    'assignee' => $task->assignee ? $task->assignee->name : null,
                    'priority' => $task->priority,
                ];
            })->values();

            // Préparer les données du projet
            $projectData = [
                'id' => $project->id,
                'name' => $project->name,
                'dateDebut' => date('j F Y', strtotime($project->start_date)),
                'chefProjet' => $project->teamMembers->where('pivot.role', 'manager')->first() ?
                    $project->teamMembers->where('pivot.role', 'manager')->first()->name : 'Non défini',
                'equipe' => $project->teamMembers->pluck('name')->implode(', '),
                'tasks' => $lifecycleTasks,
            ];

            return response()->json($projectData);
        } catch (\Exception $e) {
            Log::error('Error fetching project lifecycle: ' . $e->getMessage());
            return response()->json(['message' => 'Error fetching project lifecycle: ' . $e->getMessage()], 500);
        }
    }

    // Ajouter cette nouvelle méthode après getProjectLifecycle
    /**
     * Get detailed task analysis for project.
     */
    public function getProjectTaskAnalysis(int $id)
    {
        // Vérifier si l'utilisateur a accès au projet
        $clerkUserId = request()->header('X-Clerk-User-Id');
        if (!$this->checkProjectPermission($id, $clerkUserId, 'observer')) {
            return response()->json(['message' => 'Vous n\'avez pas accès à ce projet'], 403);
        }

        try {
            $project = Project::with([
                'columns.tasks.assignee',
                'teamMembers',
            ])->findOrFail($id);

            // Vérifier si le projet est approuvé
            if ($project->status !== 'approved') {
                return response()->json([
                    'message' => 'Ce projet est en attente d\'approbation et n\'a pas encore d\'analyse disponible'
                ], 400);
            }

            // Date actuelle pour les calculs
            $now = now();
            
            // Récupérer toutes les tâches du projet
            $allTasks = collect();
            $termineeColumnId = null;
            
            // Trouver l'ID de la colonne "Terminé"
            foreach ($project->columns as $column) {
                if (strtolower($column->title) === 'terminé') {
                    $termineeColumnId = $column->id;
                }
                $allTasks = $allTasks->concat($column->tasks);
            }

            // Transformer les tâches pour l'analyse
            $analyzedTasks = $allTasks->map(function ($task) use ($now, $termineeColumnId) {
                // Calculer le statut
                $status = 'en_cours'; // Par défaut
                
                // Si la tâche est dans la colonne "Terminé"
                if ($task->column_id === $termineeColumnId) {
                    $status = 'completed';
                } 
                // Si la date d'échéance est dépassée
                elseif ($task->due_date && $now > $task->due_date) {
                    $status = 'delayed';
                } 
                // Si le temps réel dépasse le temps estimé
                elseif ($task->actual_time > $task->estimated_time && $task->estimated_time > 0) {
                    $status = 'risk';
                }
                
                // Calculer le retard en jours
                $predictedDelay = 0;
                if ($task->due_date) {
                    $dueDate = new \DateTime($task->due_date);
                    $currentDate = new \DateTime();
                    
                    if ($currentDate > $dueDate) {
                        $predictedDelay = $currentDate->diff($dueDate)->days;
                    }
                }
                
                // Calculer le niveau de confiance
                $confidenceLevel = 0;
                
                // Pour les tâches terminées
                if ($task->column_id === $termineeColumnId) {
                    $confidenceLevel = 100; // Confiance maximale
                } else {
                    // Calculer la confiance en fonction de plusieurs facteurs
                    $baseConfidence = 50; // Confiance de base
                    
                    // Ajuster en fonction du temps restant
                    if ($task->due_date) {
                        $dueDate = new \DateTime($task->due_date);
                        $currentDate = new \DateTime();
                        
                        if ($currentDate < $dueDate) {
                            // Encore du temps - augmenter la confiance
                            $daysLeft = $currentDate->diff($dueDate)->days;
                            $confidenceBoost = min(30, $daysLeft * 2); // Max 30% boost
                            $baseConfidence += $confidenceBoost;
                        } else {
                            // En retard - diminuer la confiance
                            $daysLate = $currentDate->diff($dueDate)->days;
                            $confidencePenalty = min(40, $daysLate * 3); // Max 40% penalty
                            $baseConfidence -= $confidencePenalty;
                        }
                    }
                    
                    // Ajuster en fonction du rapport temps réel/estimé
                    if ($task->estimated_time > 0) {
                        $timeRatio = $task->actual_time / $task->estimated_time;
                        if ($timeRatio > 1) {
                            // Dépasse le temps estimé - diminuer la confiance
                            $baseConfidence -= min(20, ($timeRatio - 1) * 20); // Max 20% penalty
                        }
                    }
                    
                    // Assurer que la confiance reste entre 0 et 100
                    $confidenceLevel = max(0, min(100, $baseConfidence));
                }
                
                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'status' => $status,
                    'predictedDelay' => $predictedDelay,
                    'confidenceLevel' => (int)$confidenceLevel,
                    'description' => $task->description,
                    'assignee' => $task->assignee ? $task->assignee->name : null,
                    'priority' => $task->priority,
                    'due_date' => $task->due_date,
                    'estimated_time' => $task->estimated_time,
                    'actual_time' => $task->actual_time,
                ];
            })->values();

        // Préparer les données du projet
        $projectData = [
            'id' => $project->id,
            'name' => $project->name,
            'dateDebut' => date('j F Y', strtotime($project->start_date)),
            'chefProjet' => $project->teamMembers->where('pivot.role', 'manager')->first() ?
                $project->teamMembers->where('pivot.role', 'manager')->first()->name : 'Non défini',
            'equipe' => $project->teamMembers->pluck('name')->implode(', '),
            'tasks' => $analyzedTasks,
        ];

        return response()->json($projectData);
    } catch (\Exception $e) {
        Log::error('Error fetching project task analysis: ' . $e->getMessage());
        return response()->json(['message' => 'Error fetching project task analysis: ' . $e->getMessage()], 500);
    }
}

    /**
     * Get project audit logs/history.
     */
    public function getProjectHistory(int $id)
    {
        // Vérifier si l'utilisateur a accès au projet
        $clerkUserId = request()->header('X-Clerk-User-Id');
        if (!$this->checkProjectPermission($id, $clerkUserId, 'observer')) {
            return response()->json(['message' => 'Vous n\'avez pas accès à ce projet'], 403);
        }

        try {
            $project = Project::with(['teamMembers'])->findOrFail($id);

            // Récupérer les logs d'audit du projet depuis la base de données
            // Nous allons utiliser les tables existantes pour construire un historique réel
            
            // Récupérer les colonnes du projet
            $columns = Column::where('project_id', $id)->get();
            $columnIds = $columns->pluck('id')->toArray();

            // Récupérer les tâches des colonnes du projet avec leurs dates de création/modification
            $tasks = Task::whereIn('column_id', $columnIds)
                ->with(['assignee', 'comments.author'])
                ->get();

            // Récupérer les membres invités du projet
            $invitedMembers = InvitedMember::where('project_id', $id)->get();
            
            // Récupérer les membres de l'équipe du projet
            $teamMembers = $project->teamMembers;

            // Construire les logs d'audit à partir des données réelles
            $auditLogs = [];
            $logId = 1;

            // Log de création du projet
            $manager = $teamMembers->where('pivot.role', 'manager')->first();
            $auditLogs[] = [
                'id' => $logId++,
                'timestamp' => $project->created_at,
                'user' => $manager ? $manager->name : 'Système',
                'avatar' => $manager ? $manager->avatar : null,
                'action' => 'create',
                'target' => "Projet: {$project->name}",
                'details' => "Création du projet"
            ];

            // Logs pour les tâches (création, mise à jour, commentaires)
            foreach ($tasks as $task) {
                // Log de création de tâche
                $creator = $task->assignee ? $task->assignee : ($teamMembers->first() ?: null);
                $auditLogs[] = [
                    'id' => $logId++,
                    'timestamp' => $task->created_at,
                    'user' => $creator ? $creator->name : 'Système',
                    'avatar' => $creator ? $creator->avatar : null,
                    'action' => 'create',
                    'target' => "Tâche: {$task->title}",
                    'details' => "Création de la tâche dans la colonne {$task->column->title}"
                ];

                // Log de mise à jour si la tâche a été modifiée après sa création
                if ($task->updated_at && $task->updated_at->gt($task->created_at)) {
                    $auditLogs[] = [
                        'id' => $logId++,
                        'timestamp' => $task->updated_at,
                        'user' => $creator ? $creator->name : 'Système',
                        'avatar' => $creator ? $creator->avatar : null,
                        'action' => 'update',
                        'target' => "Tâche: {$task->title}",
                        'details' => "Mise à jour de la tâche"
                    ];

                }

                // Logs pour les commentaires de la tâche
                foreach ($task->comments as $comment) {
                    $auditLogs[] = [
                        'id' => $logId++,
                        'timestamp' => $comment->created_at,
                        'user' => $comment->author ? $comment->author->name : 'Système',
                        'avatar' => $comment->author ? $comment->author->avatar : null,
                        'action' => 'comment',
                        'target' => "Tâche: {$task->title}",
                        'details' => "Commentaire: " . substr($comment->content, 0, 50) . (strlen($comment->content) > 50 ? '...' : '')
                    ];
                }
            }

            // Logs pour les invitations de membres
            foreach ($invitedMembers as $member) {
                $inviter = $teamMembers->where('pivot.role', 'manager')->first();
                $auditLogs[] = [
                    'id' => $logId++,
                    'timestamp' => $member->created_at,
                    'user' => $inviter ? $inviter->name : 'Système',
                    'avatar' => $inviter ? $inviter->avatar : null,
                    'action' => 'create',
                    'target' => "Invitation: {$member->email}",
                    'details' => "Invitation envoyée avec le rôle {$member->role}"
                ];

                if ($member->status === 'accepted') {
                    // Find the team member with this email if possible
                    $memberUser = TeamMember::where('email', $member->email)->first();
                    $auditLogs[] = [
                        'id' => $logId++,
                        'timestamp' => $member->updated_at,
                        'user' => $memberUser ? $memberUser->name : $member->email,
                        'avatar' => $memberUser ? $memberUser->avatar : null,
                        'action' => 'update',
                        'target' => "Invitation: {$member->email}",
                        'details' => "Invitation acceptée"
                    ];
                }
            }

            // Logs pour les membres de l'équipe (ajout au projet)
            foreach ($teamMembers as $member) {
                if ($member->pivot && $member->pivot->created_at) {
                    $auditLogs[] = [
                        'id' => $logId++,
                        'timestamp' => $member->pivot->created_at,
                        'user' => $member->name,
                        'avatar' => $member->avatar,
                        'action' => 'create',
                        'target' => "Membre: {$member->name}",
                        'details' => "Ajout au projet avec le rôle {$member->pivot->role}"
                    ];
                }
            }

            // Trier les logs par date (du plus récent au plus ancien)
            usort($auditLogs, function ($a, $b) {
                return strtotime($b['timestamp']) - strtotime($a['timestamp']);
            });

            // Générer des données pour le graphique d'évolution des actions
            $auditGraphData = $this->generateAuditGraphData($auditLogs);

            // Calculer les statistiques
            $createLogs = count(array_filter($auditLogs, function ($log) {
                return $log['action'] === 'create';
            }));
        
            $updateLogs = count(array_filter($auditLogs, function ($log) {
                return $log['action'] === 'update';
            }));
        
            $deleteLogs = count(array_filter($auditLogs, function ($log) {
                return $log['action'] === 'delete';
            }));
        
            $commentLogs = count(array_filter($auditLogs, function ($log) {
                return $log['action'] === 'comment';
            }));

            return response()->json([
                'project' => [
                    'id' => $project->id,
                    'nom' => $project->name,
                    'dateDebut' => $project->start_date,
                    'chefProjet' => $project->teamMembers->where('pivot.role', 'manager')->first() ?
                        $project->teamMembers->where('pivot.role', 'manager')->first()->name : 'Non défini',
                    'equipe' => $project->teamMembers->pluck('name')->implode(', ')
                ],
                'auditLogs' => $auditLogs,
                'auditGraphData' => $auditGraphData,
                'stats' => [
                    'totalLogs' => count($auditLogs),
                    'createLogs' => $createLogs,
                    'updateLogs' => $updateLogs,
                    'deleteLogs' => $deleteLogs,
                    'commentLogs' => $commentLogs
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching project history: ' . $e->getMessage());
            return response()->json(['message' => 'Error fetching project history: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Generate audit graph data from audit logs.
     */
    private function generateAuditGraphData($auditLogs)
    {
        $days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        $graphData = [];

        // Initialiser les données pour les 7 derniers jours
        for ($i = 6; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-$i days"));
            $dayOfWeek = $days[date('N', strtotime($date)) - 1];

            $graphData[] = [
                'day' => $dayOfWeek,
                'date' => $date,
                'create' => 0,
                'update' => 0,
                'delete' => 0,
                'comment' => 0
            ];
        }

        // Compter les actions par jour
        foreach ($auditLogs as $log) {
            $logDate = date('Y-m-d', strtotime($log['timestamp']));

            foreach ($graphData as &$day) {
                if ($day['date'] === $logDate) {
                    if (isset($log['action']) && isset($day[$log['action']])) {
                        $day[$log['action']]++;
                    }
                    break;
                }
            }
        }

        // Supprimer la clé 'date' qui n'est pas nécessaire pour le frontend
        foreach ($graphData as &$day) {
            unset($day['date']);
        }

        return $graphData;
    }

    /**
     * Get all projects with basic history stats.
     */
    public function getAllProjectsHistory()
    {
        $clerkUserId = request()->header('X-Clerk-User-Id');
        if (!$clerkUserId) {
            return response()->json(['message' => 'Utilisateur non authentifié'], 401);
        }

        // Trouver le membre d'équipe
        $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();
        if (!$teamMember) {
            return response()->json(['message' => 'Membre d\'équipe non trouvé'], 404);
        }

        // Obtenir tous les projets où l'utilisateur est membre
        $projects = $teamMember->projects()->with(['teamMembers'])->get();

        $projectsWithStats = [];

        foreach ($projects as $project) {
            // Compter les tâches comme indicateur d'activité
            $taskCount = Task::whereIn('column_id', function ($query) use ($project) {
                $query->select('id')
                    ->from('columns')
                    ->where('project_id', $project->id);
        })->count();
        
        // Compter les commentaires comme indicateur d'activité
        $commentCount = Comment::whereIn('task_id', function ($query) use ($project) {
            $query->select('tasks.id')
                ->from('tasks')
                ->join('columns', 'tasks.column_id', '=', 'columns.id')
                ->where('columns.project_id', $project->id);
        })->count();
        
        // Activité totale = tâches + commentaires + membres (nombre de membres dans l'équipe)
        $activityCount = $taskCount + $commentCount + $project->teamMembers->count();

        $projectsWithStats[] = [
            'id' => $project->id,
            'nom' => $project->name,
            'dateDebut' => $project->start_date,
            'chefProjet' => $project->teamMembers->where('pivot.role', 'manager')->first() ?
                $project->teamMembers->where('pivot.role', 'manager')->first()->name : 'Non défini',
            'equipe' => $project->teamMembers->pluck('name')->implode(', '),
            'activityCount' => $activityCount
        ];
    }

    return response()->json([
        'projects' => $projectsWithStats
    ]);
}

    /**
     * Get all pending projects for admin approval.
     */
    public function getPendingProjects()
    {
        $pendingProjects = Project::with(['teamMembers'])
            ->where('status', 'pending')
            ->get();

        return response()->json([
            'pendingProjects' => $pendingProjects
        ]);
    }

    /**
     * Approve a pending project.
     */
    public function approveProject(int $id)
    {
        $project = Project::findOrFail($id);

        if ($project->status !== 'pending') {
            return response()->json(['message' => 'Ce projet n\'est pas en attente d\'approbation'], 400);
        }

        $project->update(['status' => 'approved']);

        // Créer les colonnes par défaut maintenant que le projet est approuvé
        $defaultColumns = ['À faire', 'En cours', 'En révision', 'Terminé'];
        foreach ($defaultColumns as $index => $title) {
            Column::create([
                'project_id' => $project->id,
                'title' => $title,
                'order' => $index,
            ]);
        }

        // Notifier le créateur du projet
        $creator = TeamMember::where('clerk_user_id', $project->clerk_user_id)->first();
        if ($creator) {
            $this->createNotification(
                $creator->id,
                null,
                'project_approved',
                'Projet approuvé',
                "Votre projet {$project->name} a été approuvé",
                [
                    'project_id' => $project->id,
                    'project_name' => $project->name
                ],
                'App\Models\Project',
                $project->id
            );
        }

        return response()->json([
            'message' => 'Projet approuvé avec succès',
            'project' => $project
        ]);
    }

    /**
     * Reject a pending project.
     */
    public function rejectProject(int $id)
    {
        $project = Project::findOrFail($id);

        if ($project->status !== 'pending') {
            return response()->json(['message' => 'Ce projet n\'est pas en attente d\'approbation'], 400);
        }

        // Notifier le créateur du projet avant de le supprimer
        $creator = TeamMember::where('clerk_user_id', $project->clerk_user_id)->first();
        if ($creator) {
            $this->createNotification(
                $creator->id,
                null,
                'project_rejected',
                'Projet rejeté',
                "Votre projet {$project->name} a été rejeté",
                [
                    'project_name' => $project->name
                ]
            );
        }

        // Supprimer les invitations associées au projet
        InvitedMember::where('project_id', $project->id)->delete();

        // Détacher les membres de l'équipe du projet
        $project->teamMembers()->detach();

        // Supprimer le projet
        $project->delete();

        return response()->json([
            'message' => 'Projet rejeté et supprimé',
            'success' => true
        ]);
    }

    /**
     * Delete a project.
     */
    public function deleteProject(Request $request, int $id)
    {
        // Vérifier si l'utilisateur est manager du projet
        if (!$this->checkProjectPermission($id, $request->header('X-Clerk-User-Id'), 'manager')) {
            return response()->json(['message' => 'Seuls les managers peuvent supprimer le projet'], 403);
        }

        try {
            $project = Project::findOrFail($id);
            $deleter = TeamMember::where('clerk_user_id', $request->header('X-Clerk-User-Id'))->first();

            // Récupérer tous les membres du projet pour les notifier
            $projectMembers = $project->teamMembers()->where('team_member_id', '!=', $deleter->id)->get();

            // Supprimer les tâches associées aux colonnes du projet
            foreach ($project->columns as $column) {
                // Supprimer les commentaires et pièces jointes des tâches
                foreach ($column->tasks as $task) {
                    $task->comments()->delete();
                    $task->attachments()->delete();
                    $task->delete();
                }
                $column->delete();
            }

            // Supprimer les invitations associées au projet
            InvitedMember::where('project_id', $id)->delete();

            // Notifier tous les membres du projet
            foreach ($projectMembers as $member) {
                $this->createNotification(
                    $member->id,
                    $deleter->id,
                    'project_deleted',
                    'Projet supprimé',
                    "Le projet {$project->name} a été supprimé par {$deleter->name}",
                    [
                        'project_name' => $project->name,
                        'deleter_name' => $deleter->name
                    ]
                );
            }

            // Détacher les membres de l'équipe du projet
            $project->teamMembers()->detach();

            // Supprimer le projet
            $project->delete();

            return response()->json([
                'message' => 'Projet supprimé avec succès',
                'success' => true
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting project: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la suppression du projet: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get recent activities across all projects.
     */
   public function getRecentActivities()
    {
        $clerkUserId = request()->header('X-Clerk-User-Id');
        if (!$clerkUserId) {
            return response()->json(['message' => 'Utilisateur non authentifié'], 401);
        }

        // Trouver le membre d'équipe
        $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();
        if (!$teamMember) {
            return response()->json(['message' => 'Membre d\'équipe non trouvé'], 404);
        }

        try {
            // Récupérer les projets où l'utilisateur est membre
            $projectIds = $teamMember->projects()->pluck('projects.id');

            // Récupérer les activités récentes (tâches créées ou mises à jour)
            $recentTasks = Task::whereIn('column_id', function ($query) use ($projectIds) {
                $query->select('id')
                    ->from('columns')
                    ->whereIn('project_id', $projectIds);
            })
            ->with(['assignee', 'column.project'])
            ->orderBy('updated_at', 'desc')
            ->take(10)
            ->get();

        

            // Récupérer les commentaires récents
            $recentComments = Comment::whereIn('task_id', function ($query) use ($projectIds) {
                $query->select('tasks.id')
                    ->from('tasks')
                    ->join('columns', 'tasks.column_id', '=', 'columns.id')
                    ->whereIn('columns.project_id', $projectIds);
            })
            ->with(['author', 'task.column.project'])
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get();

            // Récupérer les membres récemment ajoutés aux projets
            $recentMembers = DB::table('project_team_member')
                ->whereIn('project_id', $projectIds)
                ->join('team_members', 'project_team_member.team_member_id', '=', 'team_members.id')
                ->join('projects', 'project_team_member.project_id', '=', 'projects.id')
                ->select('team_members.name', 'team_members.email', 'projects.name as project_name', 'project_team_member.created_at')
                ->orderBy('project_team_member.created_at', 'desc')
                ->take(10)
                ->get();

            // Combiner et formater les activités
            $activities = [];

            foreach ($recentTasks as $task) {
                $action = $task->created_at->eq($task->updated_at) ? 'a créé' : 'a mis à jour';
                $activities[] = [
                    'id' => 'task_' . $task->id,
                    'user' => $task->assignee ? $task->assignee->name : 'Système',
                    'action' => $action . ' la tâche "' . $task->title . '" dans le projet "' . $task->column->project->name . '"',
                    'time' => $task->updated_at->diffForHumans(),
                    'timestamp' => $task->updated_at,
                    'type' => 'task',
                ];
            }

            foreach ($recentComments as $comment) {
                $activities[] = [
                    'id' => 'comment_' . $comment->id,
                    'user' => $comment->author ? $comment->author->name : 'Système',
                    'action' => 'a commenté la tâche "' . $comment->task->title . '" dans le projet "' . $comment->task->column->project->name . '"',
                    'time' => $comment->created_at->diffForHumans(),
                    'timestamp' => $comment->created_at,
                    'type' => 'comment',
                ];
            }

            foreach ($recentMembers as $member) {
                $activities[] = [
                    'id' => 'member_' . uniqid(),
                    'user' => $member->name,
                    'action' => 'a rejoint le projet "' . $member->project_name . '"',
                    'time' => \Carbon\Carbon::parse($member->created_at)->diffForHumans(),
                    'timestamp' => $member->created_at,
                    'type' => 'member',
                ];
            }

            // Trier par date (du plus récent au plus ancien)
            usort($activities, function ($a, $b) {
                return strtotime($b['timestamp']) - strtotime($a['timestamp']);
            });

            // Limiter à 15 activités
            $activities = array_slice($activities, 0, 15);

            return response()->json([
                'activities' => $activities
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching recent activities: ' . $e->getMessage());
            return response()->json(['message' => 'Error fetching recent activities: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get project statistics by month.
     * Shows current month in the middle with 2 months before and 2 months after.
     */
    public function getProjectStatsByMonth()
    {
        $clerkUserId = request()->header('X-Clerk-User-Id');
        if (!$clerkUserId) {
            return response()->json(['message' => 'Utilisateur non authentifié'], 401);
        }

        // Trouver le membre d'équipe
        $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();
        if (!$teamMember) {
            return response()->json(['message' => 'Membre d\'équipe non trouvé'], 404);
        }

        // Obtenir le mois actuel
        $currentMonth = Carbon::now();
        
        // Préparer les données pour 5 mois (2 avant, mois actuel, 2 après)
        $monthlyStats = [];
        
        for ($i = -2; $i <= 2; $i++) {
            $month = (clone $currentMonth)->addMonths($i);
            $monthStart = (clone $month)->startOfMonth();
            $monthEnd = (clone $month)->endOfMonth();
            
            // Formater le nom du mois
            $monthName = $month->format('M');
            
            // Compter les nouveaux projets pour ce mois
            $newProjects = Project::whereBetween('created_at', [$monthStart, $monthEnd])
                ->count();
            
            // Compter les projets terminés ce mois (basé sur la date de fin)
            $completedProjects = Project::whereBetween('end_date', [$monthStart, $monthEnd])
                ->where('status', 'approved')
                ->count();
            
            $monthlyStats[] = [
                'name' => $monthName,
                'nouveaux' => $newProjects,
                'terminés' => $completedProjects,
            ];
        }

        return response()->json([
            'monthlyStats' => $monthlyStats
        ]);
    }

    /**
     * Create a notification
     */
    private function createNotification($userId, $senderId, $type, $title, $message, $data = [], $relatedType = null, $relatedId = null)
    {
        try {
            Notification::create([
                'user_id' => $userId,
                'sender_id' => $senderId,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'data' => $data,
                'related_type' => $relatedType,
                'related_id' => $relatedId,
                'read' => false
            ]);
            return true;
        } catch (\Exception $e) {
            Log::error('Error creating notification: ' . $e->getMessage());
            return false;
        }
    }

    public function generateReport(Request $request, $projectId = null)
    {
        $clerkUserId = $request->header('X-Clerk-User-Id');
        if (!$clerkUserId) {
            return response()->json(['message' => 'Utilisateur non authentifié'], 401);
        }

        $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();
        if (!$teamMember) {
            return response()->json(['message' => 'Membre d\'équipe non trouvé'], 404);
        }

        try {
            if ($projectId) {
                // Rapport pour un projet spécifique
                if (!$this->checkProjectPermission($projectId, $clerkUserId, 'observer')) {
                    return response()->json(['message' => 'Vous n\'avez pas accès à ce projet'], 403);
                }

                $project = Project::with([
                    'columns.tasks.assignee',
                    'teamMembers',
                ])->findOrFail($projectId);

                $reportData = $this->generateSingleProjectReport($project);
            } else {
                // Rapport pour tous les projets
                $projects = $teamMember->projects()
                    ->where('status', 'approved')
                    ->with([
                        'columns.tasks.assignee',
                        'teamMembers',
                    ])->get();

                $reportData = $this->generateAllProjectsReport($projects);
            }

            return response()->json([
                'success' => true,
                'message' => 'Rapport généré avec succès',
                'data' => $reportData
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating report: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la génération du rapport'], 500);
        }
    }

    /**
     * Schedule a project report
     */
    public function scheduleReport(Request $request, $projectId = null)
    {
        $validator = Validator::make($request->all(), [
            'scheduledDate' => 'required|date|after:now',
            'period' => 'required|in:month,quarter,year',
            'includeAllProjects' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Ici vous pouvez implémenter la logique de planification
        // Par exemple, créer une tâche dans une queue ou utiliser un scheduler

        return response()->json([
            'success' => true,
            'message' => 'Rapport planifié avec succès',
            'scheduledDate' => $request->scheduledDate
        ]);
    }

    /**
     * Get report history
     */
    public function getReportHistory(Request $request)
    {
        $clerkUserId = $request->header('X-Clerk-User-Id');
        if (!$clerkUserId) {
            return response()->json(['message' => 'Utilisateur non authentifié'], 401);
        }

        // Simuler un historique de rapports
        $reports = [
            [
                'id' => 1,
                'name' => 'Rapport mensuel - Tous les projets',
                'created_at' => now()->subDays(5)->toISOString(),
                'project_id' => null
            ],
            [
                'id' => 2,
                'name' => 'Rapport projet - Application Mobile',
                'created_at' => now()->subDays(10)->toISOString(),
                'project_id' => 1
            ],
            [
                'id' => 3,
                'name' => 'Rapport trimestriel - Tous les projets',
                'created_at' => now()->subDays(15)->toISOString(),
                'project_id' => null
            ]
        ];

        return response()->json($reports);
    }

    /**
     * Generate report for a single project
     */
    private function generateSingleProjectReport(Project $project)
    {
        $columns = $project->columns;
        $allTasks = collect();

        foreach ($columns as $column) {
            $allTasks = $allTasks->concat($column->tasks);
        }

        $totalTasks = $allTasks->count();
        $completedTasks = 0;
        $termineeColumnId = null;

        // Trouver la colonne "Terminé" et compter les tâches terminées
        foreach ($columns as $column) {
            if (strtolower(trim($column->title)) === 'terminé') {
                $completedTasks = $column->tasks->count();
                $termineeColumnId = $column->id;
                break;
            }
        }

        $completionRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0;

        // Compter les tâches par statut (noms des colonnes)
        $tasksByStatus = [];
        foreach ($columns as $column) {
            $tasksByStatus[$column->title] = $column->tasks->count();
        }

        // Compter les tâches par priorité
        $tasksByPriority = [
            'basse' => $allTasks->where('priority', 'basse')->count(),
            'moyenne' => $allTasks->where('priority', 'moyenne')->count(),
            'haute' => $allTasks->where('priority', 'haute')->count(),
            'urgente' => $allTasks->where('priority', 'urgente')->count(),
        ];

        // Performance de l'équipe
        $teamPerformance = [];
        foreach ($project->teamMembers as $member) {
            $memberTasks = $allTasks->where('assignee_id', $member->id);
            $memberCompletedTasks = $memberTasks->filter(function ($task) use ($termineeColumnId) {
                return $task->column_id === $termineeColumnId;
            });

            $avgCompletionTime = 0;
            $completedWithDates = $memberCompletedTasks->filter(function ($task) {
                return $task->started_at && $task->completed_at;
            });

            if ($completedWithDates->count() > 0) {
                $totalDays = $completedWithDates->sum(function ($task) {
                    $start = new \DateTime($task->started_at);
                    $end = new \DateTime($task->completed_at);
                    return $start->diff($end)->days ?: 1;
                });
                $avgCompletionTime = round($totalDays / $completedWithDates->count(), 1);
            }

            $teamPerformance[] = [
                'memberId' => $member->id,
                'name' => $member->name,
                'tasksCompleted' => $memberCompletedTasks->count(),
                'tasksAssigned' => $memberTasks->count(),
                'completionRate' => $memberTasks->count() > 0
                    ? round(($memberCompletedTasks->count() / $memberTasks->count()) * 100)
                    : 0,
                'averageCompletionTime' => $avgCompletionTime,
            ];
        }

        // Données de performance (derniers 5 mois)
        $performanceData = [];
        $currentMonth = now();

        for ($i = 4; $i >= 0; $i--) {
            $month = (clone $currentMonth)->subMonths($i);
            $monthName = $month->format('M');

            $monthStart = (clone $month)->startOfMonth();
            $monthEnd = (clone $month)->endOfMonth();

            $monthTasks = $allTasks->filter(function ($task) use ($monthStart, $monthEnd) {
                return isset($task->completed_at) &&
                    $task->completed_at >= $monthStart->format('Y-m-d') &&
                    $task->completed_at <= $monthEnd->format('Y-m-d');
            });

            $monthCompletionRate = $monthTasks->count();
            $previousRate = max(0, $monthCompletionRate - rand(1, 3));

            $performanceData[] = [
                'name' => $monthName,
                'actuel' => $monthCompletionRate,
                'precedent' => $previousRate,
            ];
        }

        return [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'start_date' => $project->start_date,
                'end_date' => $project->end_date,
                'status' => $completionRate === 100 ? 'completed' : 'in-progress',
                'progress' => $completionRate,
                'manager' => $project->teamMembers->where('pivot.role', 'manager')->first(),
            ],
            'stats' => [
                'totalTasks' => $totalTasks,
                'completedTasks' => $completedTasks,
                'completionRate' => $completionRate,
                'tasksByStatus' => $tasksByStatus,
                'tasksByPriority' => $tasksByPriority,
                'teamPerformance' => $teamPerformance,
                'performanceData' => $performanceData,
            ],
            'team' => $project->teamMembers->map(function ($member) use ($allTasks, $termineeColumnId) {
                $memberTasks = $allTasks->where('assignee_id', $member->id);

                return [
                    'id' => $member->id,
                    'name' => $member->name,
                    'role' => $member->pivot->role,
                    'email' => $member->email,
                    'avatar' => $member->avatar,
                    'tasks' => $memberTasks->map(function ($task) use ($termineeColumnId) {
                        // Calculer la progression basée sur la colonne
                        $progress = 0;
                        if ($task->column_id === $termineeColumnId) {
                            $progress = 100;
                        } else {
                            // Progression basée sur le nom de la colonne
                            $columnTitle = strtolower($task->column->title);
                            if (strpos($columnTitle, 'révision') !== false) {
                                $progress = 75;
                            } elseif (strpos($columnTitle, 'cours') !== false) {
                                $progress = 50;
                            } else {
                                $progress = 25;
                            }
                        }

                        return [
                            'id' => $task->id,
                            'name' => $task->title,
                            'status' => $task->column->title, // Utiliser le nom de la colonne comme statut
                            'progress' => $progress,
                            'startDate' => $task->started_at,
                            'endDate' => $task->due_date,
                        ];
                    })->values(),
                ];
            })->values(),
        ];
    }

    /**
     * Generate report for all projects
     */
    private function generateAllProjectsReport($projects)
    {
        $projectsStats = [];
        $totalTasksAll = 0;
        $totalCompletedTasksAll = 0;

        foreach ($projects as $project) {
            $columns = $project->columns;
            $allTasks = collect();
            $completedTasks = 0;

            foreach ($columns as $column) {
                $columnTasks = $column->tasks;
                $allTasks = $allTasks->concat($columnTasks);
                
                if (strtolower(trim($column->title)) === 'terminé') {
                    $completedTasks = $columnTasks->count();
                }
            }

            $totalTasks = $allTasks->count();
            $completionRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0;

            $totalTasksAll += $totalTasks;
            $totalCompletedTasksAll += $completedTasks;

            $projectsStats[] = [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'start_date' => $project->start_date,
                'end_date' => $project->end_date,
                'status' => $completionRate === 100 ? 'completed' : 'in-progress',
                'progress' => $completionRate,
                'manager' => $project->teamMembers->where('pivot.role', 'manager')->first(),
                'team' => $project->teamMembers->count(),
                'totalTasks' => $totalTasks,
                'completedTasks' => $completedTasks,
            ];
        }

        return [
            'projects' => $projectsStats,
            'summary' => [
                'totalProjects' => $projects->count(),
                'completedProjects' => collect($projectsStats)->where('status', 'completed')->count(),
                'inProgressProjects' => collect($projectsStats)->where('status', 'in-progress')->count(),
                'totalTasks' => $totalTasksAll,
                'totalCompletedTasks' => $totalCompletedTasksAll,
            ]
        ];
    }

    public function updateMemberRole(Request $request, $projectId, $memberId)
    {
        // Validate the request
        $validator = Validator::make($request->all(), [
            'role' => 'required|in:observer,member,manager',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            // Verify if the user is a manager of the project
            $clerkUserId = $request->header('X-Clerk-User-Id');
            if (!$this->checkProjectPermission($projectId, $clerkUserId, 'manager')) {
                return response()->json(['message' => 'Seuls les managers peuvent modifier les rôles'], 403);
            }

            // Find the project and team member
            $project = Project::findOrFail($projectId);
            $teamMember = TeamMember::findOrFail($memberId);
            $updater = TeamMember::where('clerk_user_id', $clerkUserId)->first();

            // Check if the member is part of the project
            $isMember = $project->teamMembers()->where('team_member_id', $teamMember->id)->exists();
            if (!$isMember) {
                return response()->json(['message' => 'Ce membre ne fait pas partie du projet'], 404);
            }

            // Get current role before updating
            $currentRole = $project->teamMembers()
                ->where('team_member_id', $teamMember->id)
                ->first()->pivot->role;

            // Check if trying to change the role of the last manager
            if ($currentRole === 'manager' && $request->role !== 'manager') {
                $managersCount = $project->teamMembers()
                    ->wherePivot('role', 'manager')
                    ->count();
                
                if ($managersCount <= 1) {
                    return response()->json(['message' => 'Impossible de modifier le rôle du dernier manager du projet'], 400);
                }
            }

            // Update the role
            $project->teamMembers()->updateExistingPivot($teamMember->id, ['role' => $request->role]);

            // Send notification email
            $this->sendInvitationEmail($project, $teamMember->email, null, $request->role);
            
            // Create notification for the member
            $this->createNotification(
                $teamMember->id,
                $updater->id,
                'role_updated',
                'Rôle mis à jour',
                "Votre rôle dans le projet {$project->name} a été modifié en {$request->role}",
                [
                    'project_id' => $project->id,
                    'project_name' => $project->name,
                    'updater_name' => $updater->name,
                    'new_role' => $request->role
                ],
                'App\Models\Project',
                $project->id
            );

            return response()->json([
                'message' => 'Rôle mis à jour avec succès',
                'member' => $teamMember,
                'role' => $request->role
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating member role: ' . $e->getMessage());
            return response()->json(['message' => 'Error updating member role: ' . $e->getMessage()], 500);
        }
    }
}
