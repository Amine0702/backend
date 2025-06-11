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
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    /**
     * Create or update a user from Clerk authentication.
     */
    public function createOrUpdateUser(Request $request)
    {
        try {
            Log::info('Creating/updating user with data:', $request->all());

            $validator = Validator::make($request->all(), [
                'email' => 'required|email',
                'name' => 'required|string|max:255',
                'clerkUserId' => 'required|string',
                'profilePictureUrl' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                Log::error('Validation failed:', $validator->errors()->toArray());
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            try {
                // Chercher l'utilisateur par clerk_user_id
                $user = User::where('clerk_user_id', $request->clerkUserId)->first();

                if ($user) {
                    Log::info('User exists, updating:', ['user_id' => $user->id]);
                    
                    // Mettre à jour l'utilisateur existant
                    $user->update([
                        'name' => $request->name,
                        'email' => $request->email,
                        'profile_picture_url' => $request->profilePictureUrl,
                    ]);

                    // Mettre à jour le team member si il existe
                    $teamMember = TeamMember::where('clerk_user_id', $request->clerkUserId)->first();
                    if ($teamMember) {
                        $teamMember->update([
                            'name' => $request->name,
                            'email' => $request->email,
                            'avatar' => $request->profilePictureUrl,
                        ]);
                    }
                } else {
                    Log::info('Creating new user');

                    // Vérifier si un utilisateur existe déjà avec cet email
                    $existingUserByEmail = User::where('email', $request->email)->first();
                    
                    if ($existingUserByEmail) {
                        // Mettre à jour l'utilisateur existant avec le nouveau clerk_user_id
                        $existingUserByEmail->update([
                            'name' => $request->name,
                            'clerk_user_id' => $request->clerkUserId,
                            'profile_picture_url' => $request->profilePictureUrl,
                        ]);
                        $user = $existingUserByEmail;
                        Log::info('Updated existing user with new clerk_user_id:', ['user_id' => $user->id]);
                    } else {
                        // Créer un nouvel utilisateur
                        $user = User::create([
                            'name' => $request->name,
                            'email' => $request->email,
                            'clerk_user_id' => $request->clerkUserId,
                            'profile_picture_url' => $request->profilePictureUrl,
                            'role' => $request->email === 'amineabdallah2k23@gmail.com' ? 'admin' : 'user',
                            'phone' => null,
                            'job_title' => null,
                            'company' => null,
                            'location' => null,
                            'bio' => null,
                            'skills' => null,
                            'website' => null,
                            'linkedin' => null,
                            'github' => null,
                            'twitter' => null,
                        ]);
                        Log::info('Created new user:', ['user_id' => $user->id]);
                    }

                    // Créer ou mettre à jour le team member
                    $teamMember = TeamMember::where('clerk_user_id', $request->clerkUserId)->first();
                    if (!$teamMember) {
                        $teamMember = TeamMember::where('email', $request->email)->first();
                        if ($teamMember) {
                            // Mettre à jour avec le clerk_user_id
                            $teamMember->update([
                                'name' => $request->name,
                                'clerk_user_id' => $request->clerkUserId,
                                'avatar' => $request->profilePictureUrl,
                            ]);
                            Log::info('Updated existing team member with clerk_user_id');
                        } else {
                            // Créer un nouveau team member
                            TeamMember::create([
                                'name' => $request->name,
                                'email' => $request->email,
                                'avatar' => $request->profilePictureUrl,
                                'clerk_user_id' => $request->clerkUserId,
                            ]);
                            Log::info('Created new team member');
                        }
                    }

                    // Vérifier les invitations en attente
                    $pendingInvitation = UserInvitation::where('email', $request->email)
                        ->where('status', 'pending')
                        ->first();

                    if ($pendingInvitation) {
                        $pendingInvitation->update(['status' => 'accepted']);
                        Log::info('Updated invitation status to accepted');
                    }
                }

                DB::commit();
                Log::info('User creation/update completed successfully');

                return response()->json([
                    'success' => true,
                    'message' => 'User created/updated successfully',
                    'user' => $user->fresh(),
                    'role' => $user->role,
                ], 200);

            } catch (\Exception $e) {
                DB::rollback();
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('Error in createOrUpdateUser:', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'request_data' => $request->all()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de la création/mise à jour de l\'utilisateur',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get user by Clerk ID.
     */
    public function getUserByClerkId(string $clerkUserId)
    {
        try {
            $user = User::where('clerk_user_id', $clerkUserId)->first();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'user' => $user,
                'role' => $user->role,
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getUserByClerkId:', [
                'message' => $e->getMessage(),
                'clerk_user_id' => $clerkUserId
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving user',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user details by ID.
     */
    public function getUserDetailsById($id)
    {
        try {
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
        } catch (\Exception $e) {
            Log::error('Error in getUserDetailsById:', [
                'message' => $e->getMessage(),
                'user_id' => $id
            ]);
            
            return response()->json([
                'message' => 'Error retrieving user details',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update user profile.
     */
    public function updateUserProfile(Request $request, string $clerkUserId)
    {
        try {
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
        } catch (\Exception $e) {
            Log::error('Error in updateUserProfile:', [
                'message' => $e->getMessage(),
                'clerk_user_id' => $clerkUserId
            ]);
            
            return response()->json([
                'message' => 'Error updating user profile',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all users with their roles.
     */
    public function getAllUsers()
    {
        try {
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
        } catch (\Exception $e) {
            Log::error('Error in getAllUsers:', [
                'message' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => 'Error retrieving users',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update user role.
     */
    public function updateUserRole(Request $request, $id)
    {
        try {
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
        } catch (\Exception $e) {
            Log::error('Error in updateUserRole:', [
                'message' => $e->getMessage(),
                'user_id' => $id
            ]);
            
            return response()->json([
                'message' => 'Error updating user role',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a user.
     */
    public function deleteUser($id)
    {
        try {
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
        } catch (\Exception $e) {
            Log::error('Error in deleteUser:', [
                'message' => $e->getMessage(),
                'user_id' => $id
            ]);
            
            return response()->json([
                'message' => 'Error deleting user',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user statistics.
     */
    public function getUserStats()
    {
        try {
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
        } catch (\Exception $e) {
            Log::error('Error in getUserStats:', [
                'message' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => 'Error retrieving user statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Invite a user to join the application.
     */
    public function inviteUser(Request $request)
    {
        try {
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
        } catch (\Exception $e) {
            Log::error('Error in inviteUser:', [
                'message' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => 'Error sending invitation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all pending invitations.
     */
    public function getPendingInvitations()
    {
        try {
            $invitations = UserInvitation::where('status', 'pending')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'invitations' => $invitations
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getPendingInvitations:', [
                'message' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => 'Error retrieving pending invitations',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel a pending invitation.
     */
    public function cancelInvitation($id)
    {
        try {
            $invitation = UserInvitation::findOrFail($id);
            
            if ($invitation->status !== 'pending') {
                return response()->json(['message' => 'Cette invitation ne peut plus être annulée'], 400);
            }

            $invitation->update(['status' => 'cancelled']);

            return response()->json([
                'message' => 'Invitation annulée avec succès',
                'invitation' => $invitation
            ]);
        } catch (\Exception $e) {
            Log::error('Error in cancelInvitation:', [
                'message' => $e->getMessage(),
                'invitation_id' => $id
            ]);
            
            return response()->json([
                'message' => 'Error cancelling invitation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify and process an invitation token during registration.
     */
    public function verifyInvitationToken(Request $request)
    {
        try {
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
        } catch (\Exception $e) {
            Log::error('Error in verifyInvitationToken:', [
                'message' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => 'Error verifying invitation token',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Complete user registration from invitation.
     */
    public function registerFromInvitation(Request $request)
    {
        try {
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

            DB::beginTransaction();

            try {
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

                DB::commit();

                return response()->json([
                    'message' => 'Inscription réussie',
                    'user' => $user,
                    'role' => $user->role,
                ], 201);
            } catch (\Exception $e) {
                DB::rollback();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('Error in registerFromInvitation:', [
                'message' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => 'Error completing registration',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
