<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\Comment;
use App\Models\Attachment;
use App\Models\TeamMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class TaskController extends Controller
{
    // Ajouter cette méthode en haut de la classe pour vérifier les permissions
    private function checkTaskPermission($taskId, $clerkUserId, $requiredRole = 'member')
    {
        // Récupérer la tâche
        $task = Task::findOrFail($taskId);

        // Récupérer la colonne et le projet associés
        $column = $task->column;
        $project = $column->project;

        // Récupérer le membre d'équipe
        $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();

        if (!$teamMember) {
            return false;
        }

        // Vérifier si l'utilisateur est membre du projet
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

        // Si l'utilisateur est un membre, il peut modifier ses propres tâches
        if ($projectMember->pivot->role === 'member') {
            // Vérifier si l'utilisateur est le créateur ou l'assigné de la tâche
            return $task->creator_id === $clerkUserId || $task->assignee_id === $teamMember->id;
        }

        // Si l'utilisateur est un observateur, il n'a aucune permission de modification
        return false;
    }

    /**
     * Create a new task.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'column_id' => 'required|exists:columns,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|string',
            'priority' => 'nullable|string',
            'assignee_id' => 'nullable|exists:team_members,id',
            'estimated_time' => 'nullable|integer',
            'actual_time' => 'nullable|integer',
            'due_date' => 'nullable|date',
            'tags' => 'nullable|array',
            'creator_id' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Vérifier si l'utilisateur a le droit de créer une tâche dans cette colonne
        $column = \App\Models\Column::findOrFail($request->column_id);
        $project = $column->project;
        $teamMember = TeamMember::where('clerk_user_id', $request->creator_id)->first();

        if (!$teamMember) {
            return response()->json(['message' => 'Utilisateur non trouvé'], 404);
        }

        $projectMember = $project->teamMembers()
            ->where('team_member_id', $teamMember->id)
            ->first();

        if (!$projectMember) {
            return response()->json(['message' => 'Vous n\'êtes pas membre de ce projet'], 403);
        }

        // Vérifier le rôle
        if ($projectMember->pivot->role === 'observer') {
            return response()->json(['message' => 'Les observateurs ne peuvent pas créer de tâches'], 403);
        }

        $task = Task::create([
            'column_id' => $request->column_id,
            'title' => $request->title,
            'description' => $request->description,
            'status' => $request->status ?? 'à_faire',
            'priority' => $request->priority ?? 'moyenne',
            'assignee_id' => $request->assignee_id,
            'estimated_time' => $request->estimated_time ?? 0,
            'actual_time' => $request->actual_time ?? 0,
            'due_date' => $request->due_date,
            'started_at' => now(),
            'timer_active' => true,
            'tags' => $request->tags ?? [],
            'creator_id' => $request->creator_id,
        ]);

        return response()->json([
            'message' => 'Task created successfully',
            'task' => $task,
        ], 201);
    }

    /**
     * Update a task.
     */
    public function update(Request $request, int $id)
    {
        // Vérifier les permissions
        if (!$this->checkTaskPermission($id, $request->header('X-Clerk-User-Id'))) {
            return response()->json(['message' => 'Vous n\'avez pas la permission de modifier cette tâche'], 403);
        }

        $task = Task::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'column_id' => 'nullable|exists:columns,id',
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|string',
            'priority' => 'nullable|string',
            'assignee_id' => 'nullable|exists:team_members,id',
            'estimated_time' => 'nullable|integer',
            'actual_time' => 'nullable|integer',
            'due_date' => 'nullable|date',
            'started_at' => 'nullable|date',
            'completed_at' => 'nullable|date',
            'timer_active' => 'nullable|boolean',
            'tags' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $task->update($validator->validated());

        return response()->json([
            'message' => 'Task updated successfully',
            'task' => $task,
        ]);
    }

    /**
     * Delete a task.
     */
    public function destroy(int $id)
    {
        // Vérifier les permissions
        if (!$this->checkTaskPermission($id, request()->header('X-Clerk-User-Id'))) {
            return response()->json(['message' => 'Vous n\'avez pas la permission de supprimer cette tâche'], 403);
        }

        $task = Task::findOrFail($id);
        $task->delete();

        return response()->json([
            'message' => 'Task deleted successfully',
        ]);
    }

    /**
     * Move a task to another column.
     */
    public function moveTask(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'task_id' => 'required|exists:tasks,id',
            'source_column_id' => 'required|exists:columns,id',
            'target_column_id' => 'required|exists:columns,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Vérifier les permissions
        if (!$this->checkTaskPermission($request->task_id, $request->header('X-Clerk-User-Id'))) {
            return response()->json(['message' => 'Vous n\'avez pas la permission de déplacer cette tâche'], 403);
        }

        try {
            $task = Task::findOrFail($request->task_id);

            // Vérifier que la tâche appartient bien à la colonne source
            if ($task->column_id != $request->source_column_id) {
                return response()->json(['message' => 'La tâche n\'appartient pas à la colonne source'], 400);
            }

            // Update the task's column
            $task->column_id = $request->target_column_id;

            // Update the task's status based on the target column
            $targetColumn = \App\Models\Column::findOrFail($request->target_column_id);

            switch (strtolower($targetColumn->title)) {
                case 'à faire':
                    $task->status = 'à_faire';
                    break;
                case 'en cours':
                    $task->status = 'en_cours';
                    break;
                case 'en révision':
                    $task->status = 'en_révision';
                    break;
                case 'terminé':
                    $task->status = 'terminé';
                    break;
            }

            $task->save();

            return response()->json([
                'message' => 'Task moved successfully',
                'task' => $task,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error moving task: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Toggle task timer.
     */
    public function toggleTimer(int $id)
    {
        // Vérifier les permissions
        if (!$this->checkTaskPermission($id, request()->header('X-Clerk-User-Id'))) {
            return response()->json(['message' => 'Vous n\'avez pas la permission de modifier le timer de cette tâche'], 403);
        }

        $task = Task::findOrFail($id);

        if ($task->timer_active) {
            // Stop the timer
            $startedAt = new \DateTime($task->started_at);
            $now = new \DateTime();
            $elapsedMinutes = floor(($now->getTimestamp() - $startedAt->getTimestamp()) / 60);

            $task->update([
                'timer_active' => false,
                'actual_time' => $task->actual_time + $elapsedMinutes,
            ]);
        } else {
            // Start the timer
            $task->update([
                'timer_active' => true,
                'started_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Timer toggled successfully',
            'task' => $task,
        ]);
    }

    /**
     * Add a comment to a task.
     */
    public function addComment(Request $request, int $id)
    {
        // Vérifier les permissions
        if (!$this->checkTaskPermission($id, $request->header('X-Clerk-User-Id'))) {
            return response()->json(['message' => 'Vous n\'avez pas la permission d\'ajouter des commentaires à cette tâche'], 403);
        }

        $task = Task::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'author_id' => 'required|exists:team_members,id',
            'text' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $comment = Comment::create([
            'task_id' => $task->id,
            'author_id' => $request->author_id,
            'text' => $request->text,
        ]);

        return response()->json([
            'message' => 'Comment added successfully',
            'comment' => $comment,
        ], 201);
    }

    /**
     * Add an attachment to a task.
     */
    public function addAttachment(Request $request, int $id)
    {
        // Vérifier les permissions
        if (!$this->checkTaskPermission($id, $request->header('X-Clerk-User-Id'))) {
            return response()->json(['message' => 'Vous n\'avez pas la permission d\'ajouter des pièces jointes à cette tâche'], 403);
        }

        $task = Task::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:10240', // 10MB max
            'name' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $file = $request->file('file');

            // Vérifier si le répertoire existe, sinon le créer
            if (!Storage::disk('public')->exists('attachments')) {
                Storage::disk('public')->makeDirectory('attachments');
            }

            $path = $file->store('attachments', 'public');
            $url = Storage::url($path);

            $attachment = Attachment::create([
                'task_id' => $task->id,
                'name' => $request->name ?? $file->getClientOriginalName(),
                'type' => $file->getMimeType(),
                'url' => $url,
                'size' => $file->getSize(),
            ]);

            return response()->json([
                'message' => 'Attachment added successfully',
                'attachment' => $attachment,
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error uploading file: ' . $e->getMessage()], 500);
        }
    }
}
