<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\TeamMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TeamMemberController extends Controller
{
    /**
     * Create a new team member.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:team_members,email',
            'avatar' => 'nullable|string',
            'clerk_user_id' => 'nullable|string|unique:team_members,clerk_user_id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $teamMember = TeamMember::create($validator->validated());

        return response()->json([
            'message' => 'Team member created successfully',
            'user' => $teamMember,
            'role' => 'member', // Default role
        ], 201);
    }

    /**
     * Get a team member by Clerk user ID.
     */
    public function getByClerkId(string $clerkUserId)
    {
        $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();

        if (!$teamMember) {
            return response()->json(['message' => 'Team member not found'], 404);
        }

        return response()->json($teamMember);
    }
}
