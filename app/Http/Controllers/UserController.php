<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\TeamMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

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
}
