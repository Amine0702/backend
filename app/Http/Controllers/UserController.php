<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\TeamMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\UserInvitation;
use App\Mail\UserInvitationMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Carbon\Carbon;

class UserController extends Controller
{
    /**
     * Create or update a user from Clerk authentication.
     */
    public function createOrUpdateUser(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'name' => 'required|string|max:255',
            'clerkUserId' => 'required|string',
            'profilePictureUrl' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check if user exists
        $user = User::where('clerk_user_id', $request->clerkUserId)->first();

        if ($user) {
            // Update existing user
            $user->update([
                'name' => $request->name,
                'email' => $request->email,
                'profile_picture_url' => $request->profilePictureUrl,
            ]);
        } else {
            // Create new user
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'clerk_user_id' => $request->clerkUserId,
                'profile_picture_url' => $request->profilePictureUrl,
                'role' => $request->email === 'amineabdallah2k23@gmail.com' ? 'admin' : 'user',
            ]);

            // Also create a team member record
            TeamMember::create([
                'name' => $request->name,
                'email' => $request->email,
                'avatar' => $request->profilePictureUrl,
                'clerk_user_id' => $request->clerkUserId,
            ]);

            // Check if there was a pending invitation for this email
            $pendingInvitation = UserInvitation::where('email', $request->email)
                ->where('status', 'pending')
                ->first();

            if ($pendingInvitation) {
                // Update invitation status to accepted
                $pendingInvitation->update(['status' => 'accepted']);
            }
        }

        return response()->json([
            'message' => 'User created/updated successfully',
            'user' => $user,
            'role' => $user->role,
        ], 200);
    }

    /**
     * Get user by Clerk ID.
     */
    public function getUserByClerkId(string $clerkUserId)
    {
        $user = User::where('clerk_user_id', $clerkUserId)->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        return response()->json([
            'user' => $user,
            'role' => $user->role,
        ]);
    }

    /**
     * Get user details by ID.
     */
    public function getUserDetailsById($id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'job_title' => $user->job_title,
                'company' => $user->company,
                'location' => $user->location,
                'bio' => $user->bio,
                'profile_picture_url' => $user->profile_picture_url,
            ]
        ]);
    }

    /**
     * Update user profile.
     */
    public function updateUserProfile(Request $request, string $clerkUserId)
    {
        $user = User::where('clerk_user_id', $clerkUserId)->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email',
            'bio' => 'nullable|string',
            'jobTitle' => 'nullable|string|max:255',
            'company' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'skills' => 'nullable|string',
            'website' => 'nullable|string|url',
            'linkedin' => 'nullable|string|url',
            'github' => 'nullable|string|url',
            'twitter' => 'nullable|string|url',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Update user profile
        $user->update([
            'name' => $request->name ?? $user->name,
            'email' => $request->email ?? $user->email,
            'bio' => $request->bio,
            'job_title' => $request->jobTitle,
            'company' => $request->company,
            'location' => $request->location,
            'phone' => $request->phone,
            'skills' => $request->skills,
            'website' => $request->website,
            'linkedin' => $request->linkedin,
            'github' => $request->github,
            'twitter' => $request->twitter,
        ]);

        // Update team member record if it exists
        $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();
        if ($teamMember) {
            $teamMember->update([
                'name' => $request->name ?? $teamMember->name,
                'email' => $request->email ?? $teamMember->email,
            ]);
        }

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user,
        ], 200);
    }

    /**
     * Get all users with their roles.
     */
    public function getAllUsers()
    {
        $users = User::select('id', 'name', 'email', 'role', 'profile_picture_url', 'created_at', 'clerk_user_id')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'profile_picture_url' => $user->profile_picture_url,
                    'created_at' => $user->created_at,
                    'clerk_user_id' => $user->clerk_user_id,
                    'status' => 'active', // Default status
                ];
            });

        return response()->json([
            'users' => $users
        ]);
    }

    /**
     * Update user role.
     */
    public function updateUserRole(Request $request, $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'role' => 'required|string|in:admin,user',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user->update([
            'role' => $request->role
        ]);

        return response()->json([
            'message' => 'User role updated successfully',
            'user' => $user
        ]);
    }

    /**
     * Delete a user.
     */
    public function deleteUser($id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        // Delete associated team member if exists
        TeamMember::where('clerk_user_id', $user->clerk_user_id)->delete();

        // Delete the user
        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully'
        ]);
    }

    /**
     * Get user statistics.
     */
    public function getUserStats()
    {
        $totalUsers = User::count();
        $adminUsers = User::where('role', 'admin')->count();
        $regularUsers = User::where('role', 'user')->count();
        $recentUsers = User::orderBy('created_at', 'desc')->take(5)->get();

        return response()->json([
            'total' => $totalUsers,
            'admins' => $adminUsers,
            'users' => $regularUsers,
            'recent' => $recentUsers
        ]);
    }

    /**
     * Invite a user to join the application.
     */
    public function inviteUser(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'role' => 'required|in:user,admin',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check if user already exists
        $existingUser = User::where('email', $request->email)->first();
        if ($existingUser) {
            return response()->json(['message' => 'Un utilisateur avec cet email existe déjà'], 400);
        }

        // Check if there's already a pending invitation
        $existingInvitation = UserInvitation::where('email', $request->email)
            ->where('status', 'pending')
            ->first();

        if ($existingInvitation) {
            return response()->json(['message' => 'Une invitation est déjà en attente pour cet email'], 400);
        }

        // Get inviter details - FIXED: Don't rely on Clerk ID from header
        // Instead, use a default admin user or the first admin in the system
        $inviter = User::where('role', 'admin')->first();
        
        if (!$inviter) {
            // If no admin is found, use the first user
            $inviter = User::first();
            
            if (!$inviter) {
                return response()->json(['message' => 'Aucun utilisateur trouvé pour envoyer l\'invitation'], 404);
            }
        }

        // Generate invitation token
        $invitationToken = Str::random(32);
        
        // Set expiration date (7 days from now)
        $expiresAt = Carbon::now()->addDays(7);

        // Create invitation
        $invitation = UserInvitation::create([
            'email' => $request->email,
            'invitation_token' => $invitationToken,
            'status' => 'pending',
            'role' => $request->role,
            'invited_by' => $inviter->clerk_user_id,
            'expires_at' => $expiresAt,
        ]);

        // Create join link
        $baseUrl = 'https://frontend-production-46b5.up.railway.app/';
        $joinLink = $baseUrl . '/sign-in?token=' . $invitationToken;

        // Send invitation email
        try {
            Mail::to($request->email)->send(new UserInvitationMail(
                $inviter->name,
                $joinLink,
                $request->role,
                $expiresAt
            ));

            return response()->json([
                'message' => 'Invitation envoyée avec succès',
                'invitation' => $invitation
            ], 201);
        } catch (\Exception $e) {
            // Delete the invitation if email fails
            $invitation->delete();
            return response()->json(['message' => 'Erreur lors de l\'envoi de l\'email: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get all pending invitations.
     */
    public function getPendingInvitations()
    {
        $invitations = UserInvitation::where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'invitations' => $invitations
        ]);
    }

    /**
     * Cancel a pending invitation.
     */
    public function cancelInvitation($id)
    {
        $invitation = UserInvitation::findOrFail($id);
        
        if ($invitation->status !== 'pending') {
            return response()->json(['message' => 'Cette invitation ne peut plus être annulée'], 400);
        }

        $invitation->update(['status' => 'cancelled']);

        return response()->json([
            'message' => 'Invitation annulée avec succès',
            'invitation' => $invitation
        ]);
    }

    /**
     * Verify and process an invitation token during registration.
     */
    public function verifyInvitationToken(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $invitation = UserInvitation::where('invitation_token', $request->token)
            ->where('status', 'pending')
            ->first();

        if (!$invitation) {
            return response()->json(['message' => 'Token d\'invitation invalide ou expiré'], 404);
        }

        // Check if invitation has expired
        if (Carbon::now()->gt($invitation->expires_at)) {
            $invitation->update(['status' => 'expired']);
            return response()->json(['message' => 'Cette invitation a expiré'], 400);
        }

        return response()->json([
            'invitation' => [
                'email' => $invitation->email,
                'role' => $invitation->role,
            ]
        ]);
    }

    /**
     * Complete user registration from invitation.
     */
    public function registerFromInvitation(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
            'name' => 'required|string|max:255',
            'clerkUserId' => 'required|string',
            'profilePictureUrl' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $invitation = UserInvitation::where('invitation_token', $request->token)
            ->where('status', 'pending')
            ->first();

        if (!$invitation) {
            return response()->json(['message' => 'Token d\'invitation invalide ou expiré'], 404);
        }

        // Check if invitation has expired
        if (Carbon::now()->gt($invitation->expires_at)) {
            $invitation->update(['status' => 'expired']);
            return response()->json(['message' => 'Cette invitation a expiré'], 400);
        }

        // Create user
        $user = User::create([
            'name' => $request->name,
            'email' => $invitation->email,
            'clerk_user_id' => $request->clerkUserId,
            'profile_picture_url' => $request->profilePictureUrl,
            'role' => $invitation->role,
        ]);

        // Create team member record
        TeamMember::create([
            'name' => $request->name,
            'email' => $invitation->email,
            'avatar' => $request->profilePictureUrl,
            'clerk_user_id' => $request->clerkUserId,
        ]);

        // Update invitation status
        $invitation->update(['status' => 'accepted']);

        return response()->json([
            'message' => 'Inscription réussie',
            'user' => $user,
            'role' => $user->role,
        ], 201);
    }
}
