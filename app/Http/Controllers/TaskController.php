<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\Comment;
use App\Models\Attachment;
use App\Models\TeamMember;
use App\Models\Notification;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

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

        // Si l'utilisateur est un membre, il peut modifier ses propres tâches ou les tâches qui lui sont assignées
        if ($projectMember->pivot->role === 'member') {
            // Vérifier si l'utilisateur est le créateur de la tâche
            if ($task->creator_id === $clerkUserId) {
                return true;
            }
            
            // Vérifier si l'utilisateur est assigné à la tâche
            if ($task->assignee_id) {
                // Comparer l'ID du membre d'équipe avec l'ID de l'assigné
                return $task->assignee_id == $teamMember->id;
            }
            
            // Vérifier si la tâche a été générée par l'IA
            if (is_array($task->tags) && (in_array('generer_ia', $task->tags) || in_array('généré_par_ia', $task->tags))) {
                return true;
            }
        }

        // Si l'utilisateur est un observateur, il n'a aucune permission de modification
        return false;
    }

    /**
     * Vérifier si un utilisateur a la permission de modifier une tâche
     * Cette méthode est exposée via l'API
     */
    public function checkUserTaskPermission(Request $request, $taskId)
    {
        $clerkUserId = $request->header('X-Clerk-User-Id');
        if (!$clerkUserId) {
            return response()->json(['message' => 'Utilisateur non authentifié'], 401);
        }

        try {
            $task = Task::findOrFail($taskId);
        
        // Récupérer la colonne et le projet associés
        $column = $task->column;
        $project = $column->project;
        
        // Récupérer le membre d'équipe
        $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();
        
        if (!$teamMember) {
            return response()->json([
                'canView' => false,
                'canEdit' => false,
                'canDelete' => false,
                'canAddComment' => false,
                'canAddAttachment' => false,
                'canToggleTimer' => false,
                'message' => 'Utilisateur non trouvé'
            ]);
        }
        
        // Vérifier si l'utilisateur est membre du projet
        $projectMember = $project->teamMembers()
            ->where('team_member_id', $teamMember->id)
            ->first();
        
        if (!$projectMember) {
            return response()->json([
                'canView' => false,
                'canEdit' => false,
                'canDelete' => false,
                'canAddComment' => false,
                'canAddAttachment' => false,
                'canToggleTimer' => false,
                'message' => 'Utilisateur non membre du projet'
            ]);
        }
        
        // Déterminer les permissions
        $role = $projectMember->pivot->role;
        $isCreator = $task->creator_id === $clerkUserId;
        $isAssignee = $task->assignee_id === $teamMember->id;
        
        $canView = true; // Tous les membres du projet peuvent voir les tâches
        $canEdit = false;
        $canDelete = false;
        $canAddComment = false;
        $canAddAttachment = false;
        $canToggleTimer = false;
        
        // Vérifier si la tâche a été générée par l'IA
        $isAIGenerated = false;
        if (is_array($task->tags)) {
            $isAIGenerated = in_array('generer_ia', $task->tags) || in_array('généré_par_ia', $task->tags);
        }
        
        // Définir les permissions selon le rôle
        if ($role === 'manager') {
            $canEdit = true;
            $canDelete = true;
            $canAddComment = true;
            $canAddAttachment = true;
            $canToggleTimer = true;
        } else if ($role === 'member') {
            $canEdit = $isCreator || $isAssignee || $isAIGenerated;
            $canDelete = $isCreator;
            $canAddComment = true;
            $canAddAttachment = $isCreator || $isAssignee;
            $canToggleTimer = $isCreator || $isAssignee;
        }
        // Les observateurs ne peuvent ni modifier ni supprimer
        
        return response()->json([
            'canView' => $canView,
            'canEdit' => $canEdit,
            'canDelete' => $canDelete,
            'canAddComment' => $canAddComment,
            'canAddAttachment' => $canAddAttachment,
            'canToggleTimer' => $canToggleTimer,
            'role' => $role,
            'isCreator' => $isCreator,
            'isAssignee' => $isAssignee,
            'isAIGenerated' => $isAIGenerated,
            'teamMemberId' => $teamMember->id,
            'taskAssigneeId' => $task->assignee_id,
            'taskCreatorId' => $task->creator_id
        ]);
    } catch (\Exception $e) {
        Log::error('Error checking task permission: ' . $e->getMessage());
        return response()->json([
            'canView' => false,
            'canEdit' => false,
            'canDelete' => false,
            'canAddComment' => false,
            'canAddAttachment' => false,
            'canToggleTimer' => false,
            'message' => 'Erreur: ' . $e->getMessage()
        ], 500);
    }
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

        // Déterminer le statut en fonction de la colonne
        $column = \App\Models\Column::findOrFail($request->column_id);
        $status = $this->convertColumnTitleToStatus($column->title);

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

        // Récupérer les tags ou initialiser un tableau vide
        $tags = $request->tags ?? [];
        
        // Si la tâche est générée par l'IA, ajouter le tag "generer_ia"
        if ($request->has('is_ai_generated') && $request->is_ai_generated) {
            if (!in_array('generer_ia', $tags)) {
                $tags[] = 'generer_ia';
            }
        }

        // Créer la tâche avec les tags mis à jour et le statut dérivé de la colonne
        $task = Task::create([
            'column_id' => $request->column_id,
            'title' => $request->title,
            'description' => $request->description,
            'status' => $status, // Utiliser le statut dérivé de la colonne
            'priority' => $request->priority ?? 'moyenne',
            'assignee_id' => $request->assignee_id,
            'estimated_time' => $request->estimated_time ?? 0,
            'actual_time' => $request->actual_time ?? 0,
            'due_date' => $request->due_date,
            'started_at' => now(),
            'timer_active' => true,
            'tags' => $tags,
            'creator_id' => $request->creator_id,
        ]);

        Log::info('Tâche créée avec succès', [
            'task_id' => $task->id,
            'title' => $task->title,
            'tags' => $task->tags,
            'is_ai_generated' => $request->has('is_ai_generated') ? $request->is_ai_generated : false
        ]);

        // Notifier les membres du projet de la création de la tâche
        $this->notifyProjectMembers($project, $teamMember, $task, 'task_created');

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
        $oldTask = clone $task;

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

        // Si la colonne a changé, mettre à jour le statut en fonction de la nouvelle colonne
        if (isset($request->column_id) && $task->column_id != $request->column_id) {
            $newColumn = \App\Models\Column::findOrFail($request->column_id);
            $request->merge(['status' => $this->convertColumnTitleToStatus($newColumn->title)]);
        }

        $updater = TeamMember::where('clerk_user_id', $request->header('X-Clerk-User-Id'))->first();
        $task->update($validator->validated());

        // Vérifier si l'assigné a changé
        if (isset($request->assignee_id) && $oldTask->assignee_id != $request->assignee_id && $request->assignee_id) {
            $newAssignee = TeamMember::find($request->assignee_id);
            if ($newAssignee) {
                // Notifier le nouvel assigné
                $this->createNotification(
                    $newAssignee->id,
                    $updater->id,
                    'task_assigned',
                    'Tâche assignée',
                    "Vous avez été assigné à la tâche \"{$task->title}\"",
                    [
                        'task_id' => $task->id,
                        'task_title' => $task->title,
                        'project_id' => $task->column->project->id,
                        'project_name' => $task->column->project->name,
                        'assigner_name' => $updater->name
                    ],
                    'App\Models\Task',
                    $task->id
                );
            }
        }

        // Vérifier si le statut a changé
        if (isset($request->status) && $oldTask->status != $request->status) {
            // Notifier le créateur et l'assigné (s'ils sont différents de l'updater)
            $this->notifyTaskStatusChange($task, $oldTask->status, $request->status, $updater);
        }

        // Vérifier si la priorité a changé
        if (isset($request->priority) && $oldTask->priority != $request->priority) {
            // Notifier l'assigné si différent de l'updater
            if ($task->assignee_id && $task->assignee_id != $updater->id) {
                $this->createNotification(
                    $task->assignee_id,
                    $updater->id,
                    'task_priority_changed',
                    'Priorité modifiée',
                    "La priorité de la tâche \"{$task->title}\" a été modifiée en {$request->priority}",
                    [
                        'task_id' => $task->id,
                        'task_title' => $task->title,
                        'project_id' => $task->column->project->id,
                        'project_name' => $task->column->project->name,
                        'old_priority' => $oldTask->priority,
                        'new_priority' => $request->priority,
                        'updater_name' => $updater->name
                    ],
                    'App\Models\Task',
                    $task->id
                );
            }
        }

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

        $task = Task::with(['column.project', 'assignee'])->findOrFail($id);
        $deleter = TeamMember::where('clerk_user_id', request()->header('X-Clerk-User-Id'))->first();
        
        // Récupérer les informations avant suppression
        $taskTitle = $task->title;
        $projectId = $task->column->project->id;
        $projectName = $task->column->project->name;
        $assigneeId = $task->assignee_id;
        
        // Supprimer la tâche
        $task->delete();
        
        // Notifier l'assigné si différent du supprimeur
        if ($assigneeId && $assigneeId != $deleter->id) {
            $this->createNotification(
                $assigneeId,
                $deleter->id,
                'task_deleted',
                'Tâche supprimée',
                "La tâche \"{$taskTitle}\" a été supprimée",
                [
                    'task_title' => $taskTitle,
                    'project_id' => $projectId,
                    'project_name' => $projectName,
                    'deleter_name' => $deleter->name
                ]
            );
        }

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
        $clerkUserId = $request->header('X-Clerk-User-Id');
        if (!$clerkUserId) {
            return response()->json(['message' => 'Utilisateur non authentifié'], 401);
        }

        try {
            // Récupérer la tâche
            $task = Task::findOrFail($request->task_id);
            $oldStatus = $task->status;
            
            // Récupérer le membre d'équipe
            $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();
            if (!$teamMember) {
                return response()->json(['message' => 'Membre d\'équipe non trouvé'], 404);
            }

            // Récupérer la colonne et le projet associés
            $column = $task->column;
            $project = $column->project;

            // Vérifier si l'utilisateur est membre du projet
            $projectMember = $project->teamMembers()
                ->where('team_member_id', $teamMember->id)
                ->first();

            if (!$projectMember) {
                return response()->json(['message' => 'Vous n\'êtes pas membre de ce projet'], 403);
            }

            // Vérifier le rôle
            $role = $projectMember->pivot->role;

            // Vérifier si l'utilisateur est le créateur ou l'assigné de la tâche
            $isCreator = $task->creator_id === $clerkUserId;
            $isAssignee = $task->assignee_id == $teamMember->id;
            $isAIGenerated = is_array($task->tags) && (in_array('generer_ia', $task->tags) || in_array('généré_par_ia', $task->tags));

            // Ajouter des logs pour déboguer
            Log::info('Tentative de déplacement de tâche', [
                'task_id' => $task->id,
                'task_title' => $task->title,
                'user_id' => $clerkUserId,
                'user_role' => $role,
                'is_creator' => $isCreator,
                'is_assignee' => $isAssignee,
                'is_ai_generated' => $isAIGenerated,
                'assignee_id' => $task->assignee_id,
                'team_member_id' => $teamMember->id
            ]);

            // Les managers peuvent tout faire
            if ($role === 'manager') {
                // Continuer l'exécution
            } 
            // Les membres peuvent déplacer leurs propres tâches ou les tâches qui leur sont assignées
            else if ($role === 'member') {
                if (!($isCreator || $isAssignee || $isAIGenerated)) {
                    return response()->json([
                        'message' => 'Vous n\'avez pas la permission de déplacer cette tâche',
                        'details' => [
                            'is_creator' => $isCreator,
                            'is_assignee' => $isAssignee,
                            'is_ai_generated' => $isAIGenerated
                        ]
                    ], 403);
                }
            } 
            // Les observateurs ne peuvent rien modifier
            else {
                return response()->json(['message' => 'Les observateurs ne peuvent pas déplacer de tâches'], 403);
            }

            // Update the task's column
            $task->column_id = $request->target_column_id;

            // Update the task's status based on the target column
            $targetColumn = \App\Models\Column::findOrFail($request->target_column_id);
            $oldStatus = $task->status;

            // Convertir le titre de la colonne en statut
            $newStatus = $this->convertColumnTitleToStatus($targetColumn->title);
            $task->status = $newStatus;

            // Ajouter un log pour déboguer
            Log::info('Statut de tâche mis à jour', [
                'task_id' => $task->id,
                'column_title' => $targetColumn->title,
                'old_status' => $oldStatus,
                'new_status' => $newStatus
            ]);

            // Si la tâche est marquée comme terminée, mettre à jour completed_at
            if ($newStatus === 'termine') {
                $task->completed_at = now();
            }

            $task->save();

            // Notifier les membres concernés du déplacement de la tâche
            $this->notifyTaskStatusChange($task, $oldStatus, $newStatus, $teamMember);

            Log::info('Tâche déplacée avec succès', [
                'task_id' => $task->id,
                'new_column_id' => $request->target_column_id,
                'new_status' => $task->status
            ]);

            return response()->json([
                'message' => 'Task moved successfully',
                'task' => $task,
            ]);
        } catch (\Exception $e) {
            Log::error('Error moving task: ' . $e->getMessage(), [
                'task_id' => $request->task_id,
                'source_column_id' => $request->source_column_id,
                'target_column_id' => $request->target_column_id,
                'error' => $e
            ]);
            return response()->json(['message' => 'Error moving task: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Convertir le titre d'une colonne en statut de tâche
     */
    private function convertColumnTitleToStatus($columnTitle)
    {
        // Normaliser le titre de la colonne (minuscules)
        $normalizedTitle = mb_strtolower(trim($columnTitle), 'UTF-8');
        
        // Remplacer les caractères accentués par leurs équivalents non accentués
        $normalizedTitle = $this->removeAccents($normalizedTitle);
        
        // Convertir les espaces en underscores et supprimer les caractères spéciaux
        $status = preg_replace('/[^a-z0-9_]/', '_', $normalizedTitle);
        
        // Assurer qu'il n'y a pas d'underscores multiples consécutifs
        $status = preg_replace('/_+/', '_', $status);
        
        // Supprimer les underscores au début et à la fin
        $status = trim($status, '_');
        
        // Si le statut est vide après nettoyage, utiliser un statut par défaut
        if (empty($status)) {
            return 'autre';
        }
        
        // Mapper certains statuts spécifiques pour maintenir la compatibilité
        $statusMap = [
            'a_faire' => 'a_faire',
            'en_cours' => 'en_cours',
            'en_revision' => 'en_revision',
            'termine' => 'termine',
        ];
        
        return $statusMap[$status] ?? $status;
    }

    /**
     * Supprimer les accents d'une chaîne
     */
    private function removeAccents($string) 
    {
        if (!preg_match('/[\x80-\xff]/', $string)) {
            return $string;
        }

        $accents = [
            'à' => 'a', 'á' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a', 'å' => 'a', 'æ' => 'ae',
            'ç' => 'c',
            'è' => 'e', 'é' => 'e', 'ê' => 'e', 'ë' => 'e',
            'ì' => 'i', 'í' => 'i', 'î' => 'i', 'ï' => 'i',
            'ñ' => 'n',
            'ò' => 'o', 'ó' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o', 'ø' => 'o',
            'ù' => 'u', 'ú' => 'u', 'û' => 'u', 'ü' => 'u',
            'ý' => 'y', 'ÿ' => 'y',
            'À' => 'A', 'Á' => 'A', 'Â' => 'A', 'Ã' => 'A', 'Ä' => 'A', 'Å' => 'A', 'Æ' => 'AE',
            'Ç' => 'C',
            'È' => 'E', 'É' => 'E', 'Ê' => 'E', 'Ë' => 'E',
            'Ì' => 'I', 'Í' => 'I', 'Î' => 'I', 'Ï' => 'I',
            'Ñ' => 'N',
            'Ò' => 'O', 'Ó' => 'O', 'Ô' => 'O', 'Õ' => 'O', 'Ö' => 'O', 'Ø' => 'O',
            'Ù' => 'U', 'Ú' => 'U', 'Û' => 'U', 'Ü' => 'U',
            'Ý' => 'Y'
        ];
        
        return strtr($string, $accents);
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
        $teamMember = TeamMember::where('clerk_user_id', request()->header('X-Clerk-User-Id'))->first();

        if ($task->timer_active) {
            // Stop the timer
            $startedAt = new \DateTime($task->started_at);
            $now = new \DateTime();
            $elapsedMinutes = floor(($now->getTimestamp() - $startedAt->getTimestamp()) / 60);

            $task->update([
                'timer_active' => false,
                'actual_time' => $task->actual_time + $elapsedMinutes,
            ]);
            
            // Notifier le créateur si différent de l'utilisateur actuel
            if ($task->creator_id != request()->header('X-Clerk-User-Id')) {
                $creator = TeamMember::where('clerk_user_id', $task->creator_id)->first();
                if ($creator) {
                    $this->createNotification(
                        $creator->id,
                        $teamMember->id,
                        'timer_stopped',
                        'Timer arrêté',
                        "{$teamMember->name} a arrêté le timer sur la tâche \"{$task->title}\"",
                        [
                            'task_id' => $task->id,
                            'task_title' => $task->title,
                            'project_id' => $task->column->project->id,
                            'project_name' => $task->column->project->name,
                            'elapsed_minutes' => $elapsedMinutes
                        ],
                        'App\Models\Task',
                        $task->id
                    );
                }
            }
        } else {
            // Start the timer
            $task->update([
                'timer_active' => true,
                'started_at' => now(),
            ]);
            
            // Notifier le créateur si différent de l'utilisateur actuel
            if ($task->creator_id != request()->header('X-Clerk-User-Id')) {
                $creator = TeamMember::where('clerk_user_id', $task->creator_id)->first();
                if ($creator) {
                    $this->createNotification(
                        $creator->id,
                        $teamMember->id,
                        'timer_started',
                        'Timer démarré',
                        "{$teamMember->name} a démarré le timer sur la tâche \"{$task->title}\"",
                        [
                            'task_id' => $task->id,
                            'task_title' => $task->title,
                            'project_id' => $task->column->project->id,
                            'project_name' => $task->column->project->name
                        ],
                        'App\Models\Task',
                        $task->id
                    );
                }
            }
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

        // Notifier l'assigné et le créateur de la tâche
        $author = TeamMember::find($request->author_id);
        
        // Notifier l'assigné s'il est différent de l'auteur du commentaire
        if ($task->assignee_id && $task->assignee_id != $author->id) {
            $this->createNotification(
                $task->assignee_id,
                $author->id,
                'comment_added',
                'Nouveau commentaire',
                "{$author->name} a commenté la tâche \"{$task->title}\"",
                [
                    'task_id' => $task->id,
                    'task_title' => $task->title,
                    'project_id' => $task->column->project->id,
                    'project_name' => $task->column->project->name,
                    'comment_text' => $request->text
                ],
                'App\Models\Task',
                $task->id
            );
        }
        
        // Notifier le créateur s'il est différent de l'auteur du commentaire et de l'assigné
        $creator = TeamMember::where('clerk_user_id', $task->creator_id)->first();
        if ($creator && $creator->id != $author->id && $creator->id != $task->assignee_id) {
            $this->createNotification(
                $creator->id,
                $author->id,
                'comment_added',
                'Nouveau commentaire',
                "{$author->name} a commenté la tâche \"{$task->title}\"",
                [
                    'task_id' => $task->id,
                    'task_title' => $task->title,
                    'project_id' => $task->column->project->id,
                    'project_name' => $task->column->project->name,
                    'comment_text' => $request->text
                ],
                'App\Models\Task',
                $task->id
            );
        }

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

            // Notifier l'assigné et le créateur de la tâche
            $uploader = TeamMember::where('clerk_user_id', $request->header('X-Clerk-User-Id'))->first();
            
            // Notifier l'assigné s'il est différent de l'uploader
            if ($task->assignee_id && $task->assignee_id != $uploader->id) {
                $this->createNotification(
                    $task->assignee_id,
                    $uploader->id,
                    'attachment_added',
                    'Nouvelle pièce jointe',
                    "{$uploader->name} a ajouté une pièce jointe à la tâche \"{$task->title}\"",
                    [
                        'task_id' => $task->id,
                        'task_title' => $task->title,
                        'project_id' => $task->column->project->id,
                        'project_name' => $task->column->project->name,
                        'attachment_name' => $attachment->name
                    ],
                    'App\Models\Task',
                    $task->id
                );
            }
            
            // Notifier le créateur s'il est différent de l'uploader et de l'assigné
            $creator = TeamMember::where('clerk_user_id', $task->creator_id)->first();
            if ($creator && $creator->id != $uploader->id && $creator->id != $task->assignee_id) {
                $this->createNotification(
                    $creator->id,
                    $uploader->id,
                    'attachment_added',
                    'Nouvelle pièce jointe',
                    "{$uploader->name} a ajouté une pièce jointe à la tâche \"{$task->title}\"",
                    [
                        'task_id' => $task->id,
                        'task_title' => $task->title,
                        'project_id' => $task->column->project->id,
                        'project_name' => $task->column->project->name,
                        'attachment_name' => $attachment->name
                    ],
                    'App\Models\Task',
                    $task->id
                );
            }

            return response()->json([
                'message' => 'Attachment added successfully',
                'attachment' => $attachment,
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error uploading file: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get all AI generated tasks.
     */
    public function getAIGeneratedTasks()
    {
        try {
            // Find tasks with the 'generer_ia' tag
            $tasks = Task::whereJsonContains('tags', 'generer_ia')
                ->with(['assignee', 'column.project'])
                ->orderBy('created_at', 'desc')
                ->get();

            Log::info('Récupération des tâches générées par IA', [
                'count' => $tasks->count(),
                'task_ids' => $tasks->pluck('id')->toArray()
            ]);

            // Transform the tasks to include project information
            $transformedTasks = $tasks->map(function ($task) {
                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'status' => $task->status,
                    'priority' => $task->priority,
                    'created_at' => $task->created_at,
                    'assignee' => $task->assignee ? [
                        'id' => $task->assignee->id,
                        'name' => $task->assignee->name,
                        'avatar' => $task->assignee->avatar,
                    ] : null,
                    'project' => $task->column->project ? [
                        'id' => $task->column->project->id,
                        'name' => $task->column->project->name,
                    ] : null,
                    'column' => [
                        'id' => $task->column->id,
                        'title' => $task->column->title,
                    ],
                    'tags' => $task->tags,
                ];
            });

            return response()->json([
                'message' => 'AI generated tasks retrieved successfully',
                'tasks' => $transformedTasks
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching AI generated tasks: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error fetching AI generated tasks',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Notifier les membres du projet de la création d'une tâche
     */
    private function notifyProjectMembers($project, $creator, $task, $type)
    {
        // Récupérer tous les membres du projet
        $projectMembers = $project->teamMembers()->where('team_member_id', '!=', $creator->id)->get();
        
        foreach ($projectMembers as $member) {
            // Ne pas notifier les observateurs pour les tâches créées
            if ($member->pivot->role === 'observer') {
                continue;
            }
            
            $this->createNotification(
                $member->id,
                $creator->id,
                $type,
                'Nouvelle tâche',
                "{$creator->name} a créé une nouvelle tâche \"{$task->title}\" dans le projet \"{$project->name}\"",
                [
                    'task_id' => $task->id,
                    'task_title' => $task->title,
                    'project_id' => $project->id,
                    'project_name' => $project->name,
                    'creator_name' => $creator->name
                ],
                'App\Models\Task',
                $task->id
            );
        }
    }

    /**
     * Notifier les membres concernés du changement de statut d'une tâche
     */
    private function notifyTaskStatusChange($task, $oldStatus, $newStatus, $updater)
    {
        // Récupérer le projet
        $project = $task->column->project;
        
        // Récupérer le créateur de la tâche
        $creator = TeamMember::where('clerk_user_id', $task->creator_id)->first();
        
        // Notifier le créateur si différent de l'updater
        if ($creator && $creator->id != $updater->id) {
            $this->createNotification(
                $creator->id,
                $updater->id,
                'task_status_changed',
                'Statut de tâche modifié',
                "Le statut de la tâche \"{$task->title}\" a été modifié de {$oldStatus} à {$newStatus}",
                [
                    'task_id' => $task->id,
                    'task_title' => $task->title,
                    'project_id' => $project->id,
                    'project_name' => $project->name,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'updater_name' => $updater->name
                ],
                'App\Models\Task',
                $task->id
            );
        }
        
        // Notifier l'assigné si différent de l'updater et du créateur
        if ($task->assignee_id && $task->assignee_id != $updater->id && (!$creator || $task->assignee_id != $creator->id)) {
            $this->createNotification(
                $task->assignee_id,
                $updater->id,
                'task_status_changed',
                'Statut de tâche modifié',
                "Le statut de la tâche \"{$task->title}\" a été modifié de {$oldStatus} à {$newStatus}",
                [
                    'task_id' => $task->id,
                    'task_title' => $task->title,
                    'project_id' => $project->id,
                    'project_name' => $project->name,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'updater_name' => $updater->name
                ],
                'App\Models\Task',
                $task->id
            );
        }
        
        // Si la tâche est terminée, notifier les managers du projet
        if ($newStatus === 'termine') {
            $projectManagers = $project->teamMembers()
                ->wherePivot('role', 'manager')
                ->where('team_member_id', '!=', $updater->id)
                ->get();
                
            foreach ($projectManagers as $manager) {
                // Éviter les doublons si le manager est aussi le créateur ou l'assigné
                if (($creator && $manager->id === $creator->id) || $manager->id === $task->assignee_id) {
                    continue;
                }
                
                $this->createNotification(
                    $manager->id,
                    $updater->id,
                    'task_completed',
                    'Tâche terminée',
                    "La tâche \"{$task->title}\" a été marquée comme terminée par {$updater->name}",
                    [
                        'task_id' => $task->id,
                        'task_title' => $task->title,
                        'project_id' => $project->id,
                        'project_name' => $project->name,
                        'completer_name' => $updater->name
                    ],
                    'App\Models\Task',
                    $task->id
                );
            }
        }
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
}
