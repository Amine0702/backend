<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Column;
use App\Models\Project;
use App\Models\TeamMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ColumnController extends Controller
{
    /**
     * Vérifier si l'utilisateur est manager du projet
     */
    private function isProjectManager($projectId, $clerkUserId)
    {
        $project = Project::findOrFail($projectId);
        $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();

        if (!$teamMember) {
            return false;
        }

        $projectMember = $project->teamMembers()
            ->where('team_member_id', $teamMember->id)
            ->first();

        return $projectMember && $projectMember->pivot->role === 'manager';
    }

    /**
     * Create a new column.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'project_id' => 'required|exists:projects,id',
            'title' => 'required|string|max:255',
            'order' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Vérifier si l'utilisateur est manager du projet
        if (!$this->isProjectManager($request->project_id, $request->header('X-Clerk-User-Id'))) {
            return response()->json(['message' => 'Seuls les managers peuvent ajouter des colonnes'], 403);
        }

        // If order is not provided, set it to the highest order + 1
        if (!$request->has('order')) {
            $maxOrder = Column::where('project_id', $request->project_id)
                ->max('order') ?? -1;
            $request->merge(['order' => $maxOrder + 1]);
        }

        $column = Column::create($validator->validated());

        return response()->json([
            'message' => 'Column created successfully',
            'column' => $column,
        ], 201);
    }

    /**
     * Update column order.
     */
    public function updateOrder(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'columns' => 'required|array',
            'columns.*.id' => 'required|exists:columns,id',
            'columns.*.order' => 'required|integer',
            'project_id' => 'required|exists:projects,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Vérifier si l'utilisateur est manager du projet
        if (!$this->isProjectManager($request->project_id, $request->header('X-Clerk-User-Id'))) {
            return response()->json(['message' => 'Seuls les managers peuvent réorganiser les colonnes'], 403);
        }

        foreach ($request->columns as $columnData) {
            Column::where('id', $columnData['id'])
                ->update(['order' => $columnData['order']]);
        }

        return response()->json([
            'message' => 'Column order updated successfully',
        ]);
    }

    /**
     * Delete a column.
     */
    public function destroy($id, Request $request)
    {
        $column = Column::findOrFail($id);
        
        // Vérifier si l'utilisateur est manager du projet
        if (!$this->isProjectManager($column->project_id, $request->header('X-Clerk-User-Id'))) {
            return response()->json(['message' => 'Seuls les managers peuvent supprimer des colonnes'], 403);
        }

        // Supprimer la colonne
        $column->delete();

        return response()->json([
            'message' => 'Column deleted successfully',
        ]);
    }
}
