<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\Task;
use App\Models\Project;
use App\Models\Column;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TeamController extends Controller
{
    /**
     * Détermine le taux de progression d'une tâche en fonction de son statut et de sa colonne
     * 
     * @param string $status Le statut de la tâche
     * @param string $columnTitle Le titre de la colonne
     * @return int Le pourcentage de progression (0, 25, 50, 75 ou 100)
     */
    private function getTaskProgressByColumn($status, $columnTitle)
    {
        // Normaliser les chaînes pour la comparaison
        $status = strtolower(trim($status));
        $columnTitle = strtolower(trim($columnTitle));
        
        // Vérifier d'abord si le statut indique que la tâche est terminée
        if ($status === 'completed' || 
            $status === 'terminé' || 
            $status === 'terminée' || 
            $status === 'done' ||
            strpos($status, 'termin') !== false || 
            strpos($status, 'complet') !== false || 
            strpos($status, 'done') !== false) {
            return 100;
        }
        
        // Sinon, déterminer la progression en fonction du titre de la colonne
        if (strpos($columnTitle, 'faire') !== false || 
            strpos($columnTitle, 'todo') !== false || 
            strpos($columnTitle, 'backlog') !== false || 
            strpos($columnTitle, 'à faire') !== false) {
            return 0;
        } 
        else if (strpos($columnTitle, 'cours') !== false || 
                strpos($columnTitle, 'progress') !== false || 
                strpos($columnTitle, 'doing') !== false || 
                strpos($columnTitle, 'en cours') !== false) {
            return 50;
        } 
        else if (strpos($columnTitle, 'révision') !== false || 
                strpos($columnTitle, 'review') !== false || 
                strpos($columnTitle, 'validation') !== false || 
                strpos($columnTitle, 'test') !== false) {
            return 75;
        } 
        else if (strpos($columnTitle, 'terminé') !== false || 
                strpos($columnTitle, 'done') !== false || 
                strpos($columnTitle, 'complet') !== false || 
                strpos($columnTitle, 'fini') !== false) {
            return 100;
        } 
        else {
            // Pour toute autre colonne
            return 25;
        }
    }

    /**
     * Get all teams.
     */
    public function index(Request $request)
    {
        try {
            // Récupérer l'ID utilisateur Clerk depuis les headers
            $clerkUserId = $request->header('X-Clerk-User-Id');
            
            Log::info('Requête de récupération des équipes pour l\'utilisateur', ['clerk_user_id' => $clerkUserId]);
            
            // Si l'ID utilisateur est fourni, filtrer les projets par utilisateur
            $projectsQuery = Project::with(['teamMembers' => function($query) {
                $query->withPivot('role');
            }]);
            
            if ($clerkUserId) {
                // Récupérer uniquement les projets où l'utilisateur est membre
                $projectsQuery->whereHas('teamMembers', function($query) use ($clerkUserId) {
                    $query->where('clerk_user_id', $clerkUserId);
                });
            }
            
            $projects = $projectsQuery->get();
            
            Log::info('Projets récupérés', ['count' => $projects->count()]);

            $teams = [];
            
            foreach ($projects as $project) {
                // Trouver le manager (chef de projet)
                $leader = $project->teamMembers->firstWhere('pivot.role', 'manager');
                
                // Récupérer les colonnes du projet
                $columns = Column::where('project_id', $project->id)->get();
                $columnIds = $columns->pluck('id')->toArray();
                
                // Calculer le taux de complétion du projet et déterminer son statut
                $totalTasks = 0;
                $totalProgress = 0;

                if (!empty($columnIds)) {
                    // Récupérer toutes les tâches pour ce projet
                    $tasks = Task::whereIn('column_id', $columnIds)->get();
                    $totalTasks = $tasks->count();
                    
                    // Calculer la progression totale en fonction des colonnes
                    foreach ($tasks as $task) {
                        // Trouver la colonne de cette tâche
                        $column = $columns->firstWhere('id', $task->column_id);
                        $columnTitle = $column ? $column->title : '';
                        
                        // Calculer la progression de cette tâche
                        $progress = $this->getTaskProgressByColumn($task->status, $columnTitle);
                        $totalProgress += $progress;
                    }
                }

                // S'assurer que nous avons des tâches avant de calculer
                if ($totalTasks > 0) {
                    $completionRate = round(($totalProgress / ($totalTasks * 100)) * 100);
                    // Déterminer si le projet est terminé (toutes les tâches sont à 100%)
                    $isCompleted = ($totalProgress === $totalTasks * 100);
                } else {
                    // Si pas de tâches mais que le projet existe, on considère qu'il est à 0% de complétion
                    $completionRate = 0;
                    $isCompleted = false;
                }

                $projectStatus = $isCompleted ? 'completed' : 'active';

                // Créer une équipe à partir du projet
                $team = [
                    'id' => $project->id,
                    'name' => $project->name,
                    'description' => $project->description,
                    'status' => $projectStatus,
                    'leader' => $leader ? [
                        'id' => $leader->id,
                        'name' => $leader->name,
                        'email' => $leader->email,
                        'avatar' => $leader->avatar,
                        'role' => 'manager'
                    ] : null,
                    'members' => $project->teamMembers->map(function($member) use ($project, $columnIds, $columns) {
                        // Récupérer les informations utilisateur depuis la table users
                        $user = User::where('clerk_user_id', $member->clerk_user_id)->first();
                        
                        // Récupérer les tâches assignées à ce membre pour ce projet
                        $tasks = Task::whereIn('column_id', $columnIds)
                            ->where('assignee_id', $member->id)
                            ->select('id', 'title', 'status', 'priority', 'column_id', 'due_date')
                            ->get();
                        
                        // Calculer la progression pour chaque tâche
                        $tasks->each(function ($task) use ($columns) {
                            // Trouver la colonne de cette tâche
                            $column = $columns->firstWhere('id', $task->column_id);
                            $columnTitle = $column ? $column->title : '';
                            
                            // Calculer la progression de cette tâche
                            $task->progress = $this->getTaskProgressByColumn($task->status, $columnTitle);
                        });
                        
                        return [
                            'id' => $member->id,
                            'name' => $member->name,
                            'email' => $member->email,
                            'avatar' => $member->avatar,
                            'role' => $member->pivot->role,
                            'job_title' => $user ? $user->job_title : null,
                            'tasks' => $tasks
                        ];
                    })->values()->toArray(),
                    'completion_rate' => $completionRate,
                    'active_projects_count' => 1, // Chaque équipe correspond à un projet
                    'created_at' => $project->created_at,
                    'updated_at' => $project->updated_at
                ];
                
                // Appliquer les filtres si fournis
                $addTeam = true;
                
                if ($request->has('status') && !in_array($team['status'], explode(',', $request->status))) {
                    $addTeam = false;
                }
                
                if ($request->has('completion_min') && $request->has('completion_max')) {
                    if ($team['completion_rate'] < $request->completion_min || $team['completion_rate'] > $request->completion_max) {
                        $addTeam = false;
                    }
                }
                
                if ($request->has('search')) {
                    $search = strtolower($request->search);
                    $nameMatch = str_contains(strtolower($team['name']), $search);
                    $leaderMatch = $team['leader'] && str_contains(strtolower($team['leader']['name']), $search);
                    
                    if (!$nameMatch && !$leaderMatch) {
                        $addTeam = false;
                    }
                }
                
                if ($addTeam) {
                    $teams[] = $team;
                }
            }

            // Log pour déboguer
            Log::info('Teams data being returned:', ['teams_count' => count($teams)]);

            return response()->json($teams);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des équipes: ' . $e->getMessage());
            return response()->json(['error' => 'Une erreur est survenue lors de la récupération des équipes'], 500);
        }
    }

    /**
     * Get a specific team with its members.
     */
    public function show(Request $request, $id)
    {
        try {
            // Récupérer l'ID utilisateur Clerk depuis les headers
            $clerkUserId = $request->header('X-Clerk-User-Id');
            
            // Récupérer le projet avec ses membres d'équipe
            $projectQuery = Project::with(['teamMembers' => function($query) {
                $query->withPivot('role');
            }]);
            
            // Si l'ID utilisateur est fourni, vérifier que l'utilisateur est membre du projet
            if ($clerkUserId) {
                $projectQuery->whereHas('teamMembers', function($query) use ($clerkUserId) {
                    $query->where('clerk_user_id', $clerkUserId);
                });
            }
            
            $project = $projectQuery->findOrFail($id);
            
            // Trouver le manager (chef de projet)
            $leader = $project->teamMembers->firstWhere('pivot.role', 'manager');
            
            // Récupérer les colonnes du projet
            $columns = Column::where('project_id', $project->id)->get();
            $columnIds = $columns->pluck('id')->toArray();
            
            // Calculer le taux de complétion du projet et déterminer son statut
            $totalTasks = 0;
            $totalProgress = 0;

            if (!empty($columnIds)) {
                // Récupérer toutes les tâches pour ce projet
                $tasks = Task::whereIn('column_id', $columnIds)->get();
                $totalTasks = $tasks->count();
                
                // Calculer la progression totale en fonction des colonnes
                foreach ($tasks as $task) {
                    // Trouver la colonne de cette tâche
                    $column = $columns->firstWhere('id', $task->column_id);
                    $columnTitle = $column ? $column->title : '';
                    
                    // Calculer la progression de cette tâche
                    $progress = $this->getTaskProgressByColumn($task->status, $columnTitle);
                    $totalProgress += $progress;
                }
            }

            // S'assurer que nous avons des tâches avant de calculer
            if ($totalTasks > 0) {
                $completionRate = round(($totalProgress / ($totalTasks * 100)) * 100);
                // Déterminer si le projet est terminé (toutes les tâches sont à 100%)
                $isCompleted = ($totalProgress === $totalTasks * 100);
            } else {
                // Si pas de tâches mais que le projet existe, on considère qu'il est à 0% de complétion
                $completionRate = 0;
                $isCompleted = false;
            }

            $projectStatus = $isCompleted ? 'completed' : 'active';
            
            // Créer une équipe à partir du projet
            $team = [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'status' => $projectStatus,
                'leader' => $leader ? [
                    'id' => $leader->id,
                    'name' => $leader->name,
                    'email' => $leader->email,
                    'avatar' => $leader->avatar,
                    'role' => 'manager'
                ] : null,
                'members' => $project->teamMembers->map(function($member) use ($project, $columnIds, $columns) {
                    // Récupérer les informations utilisateur depuis la table users
                    $user = User::where('clerk_user_id', $member->clerk_user_id)->first();
                    
                    // Récupérer les tâches assignées à ce membre pour ce projet
                    $tasks = Task::whereIn('column_id', $columnIds)
                        ->where('assignee_id', $member->id)
                        ->select('id', 'title', 'status', 'priority', 'column_id', 'due_date')
                        ->get();
                    
                    // Calculer la progression pour chaque tâche
                    $tasks->each(function ($task) use ($columns) {
                        // Trouver la colonne de cette tâche
                        $column = $columns->firstWhere('id', $task->column_id);
                        $columnTitle = $column ? $column->title : '';
                        
                        // Calculer la progression de cette tâche
                        $task->progress = $this->getTaskProgressByColumn($task->status, $columnTitle);
                    });
                    
                    return [
                        'id' => $member->id,
                        'name' => $member->name,
                        'email' => $member->email,
                        'avatar' => $member->avatar,
                        'role' => $member->pivot->role,
                        'job_title' => $user ? $user->job_title : null,
                        'tasks' => $tasks
                    ];
                })->values()->toArray(),
                'completion_rate' => $completionRate,
                'active_projects_count' => 1, // Chaque équipe correspond à un projet
                'created_at' => $project->created_at,
                'updated_at' => $project->updated_at
            ];

            // Log pour déboguer
            Log::info('Team data being returned:', ['team_id' => $team['id'], 'completion_rate' => $team['completion_rate']]);

            return response()->json($team);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération de l\'équipe: ' . $e->getMessage());
            return response()->json(['error' => 'Une erreur est survenue lors de la récupération de l\'équipe'], 500);
        }
    }

    /**
     * Get team statistics.
     */
    public function getStats(Request $request)
    {
        try {
            // Récupérer l'ID utilisateur Clerk depuis les headers
            $clerkUserId = $request->header('X-Clerk-User-Id');
            
            // Préparer la requête de base pour les projets
            $projectsQuery = Project::query();
            
            // Si l'ID utilisateur est fourni, filtrer les projets par utilisateur
            if ($clerkUserId) {
                $projectsQuery->whereHas('teamMembers', function($query) use ($clerkUserId) {
                    $query->where('clerk_user_id', $clerkUserId);
                });
            }
            
            // Compter les projets comme des équipes
            $projectsCount = $projectsQuery->count();
            
            // Récupérer tous les projets filtrés
            $projects = $projectsQuery->get();
            
            // Compter les projets terminés (tous les projets dont toutes les tâches sont à 100%)
            $completedProjectsCount = 0;

            foreach ($projects as $project) {
                $columns = Column::where('project_id', $project->id)->get();
                $columnIds = $columns->pluck('id')->toArray();
                
                if (!empty($columnIds)) {
                    // Récupérer toutes les tâches pour ce projet
                    $tasks = Task::whereIn('column_id', $columnIds)->get();
                    $totalTasks = $tasks->count();
                    
                    if ($totalTasks > 0) {
                        // Calculer la progression totale
                        $totalProgress = 0;
                        foreach ($tasks as $task) {
                            // Trouver la colonne de cette tâche
                            $column = $columns->firstWhere('id', $task->column_id);
                            $columnTitle = $column ? $column->title : '';
                            
                            // Calculer la progression de cette tâche
                            $progress = $this->getTaskProgressByColumn($task->status, $columnTitle);
                            $totalProgress += $progress;
                        }
                        
                        // Vérifier si toutes les tâches sont à 100%
                        if ($totalProgress === $totalTasks * 100) {
                            $completedProjectsCount++;
                        }
                    }
                }
            }
            
            // Les projets actifs sont ceux qui ne sont pas terminés
            $activeProjectsCount = $projectsCount - $completedProjectsCount;
            
            // Compter les membres uniques dans les projets de l'utilisateur
            $uniqueMembersQuery = DB::table('project_team_member')
                ->select('team_member_id')
                ->distinct();
                
            if ($clerkUserId) {
                // Récupérer uniquement les projets où l'utilisateur est membre
                $userProjects = $projectsQuery->pluck('id')->toArray();
                if (!empty($userProjects)) {
                    $uniqueMembersQuery->whereIn('project_id', $userProjects);
                }
            }
            
            $uniqueMembers = $uniqueMembersQuery->count();
            
            $stats = [
                'total_teams' => $projectsCount,
                'active_teams' => $activeProjectsCount,
                'completed_teams' => $completedProjectsCount,
                'total_members' => $uniqueMembers,
                'total_active_projects' => $activeProjectsCount,
            ];

            // Log pour déboguer
            Log::info('Team stats being returned:', ['stats' => $stats]);

            return response()->json($stats);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des statistiques d\'équipe: ' . $e->getMessage());
            return response()->json(['error' => 'Une erreur est survenue lors de la récupération des statistiques d\'équipe'], 500);
        }
    }

    // Les autres méthodes restent inchangées...
    /**
     * Create a new team.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:active,paused',
            'priority' => 'nullable|string|in:high,medium,low',
            'leader_id' => 'nullable|exists:team_members,id',
            'member_ids' => 'nullable|array',
            'member_ids.*' => 'exists:team_members,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            $team = Team::create([
                'name' => $request->name,
                'description' => $request->description,
                'status' => $request->status ?? 'active',
                'priority' => $request->priority ?? 'medium',
                'leader_id' => $request->leader_id,
                'completion_rate' => 0,
                'last_updated_at' => now(),
            ]);

            // Add members if provided
            if ($request->has('member_ids') && is_array($request->member_ids)) {
                $memberData = [];
                foreach ($request->member_ids as $memberId) {
                    $memberData[$memberId] = ['role' => 'member'];
                }

                // Add leader as a member if not already included
                if ($request->leader_id && !in_array($request->leader_id, $request->member_ids)) {
                    $memberData[$request->leader_id] = ['role' => 'leader'];
                }

                $team->members()->attach($memberData);
            }

            DB::commit();

            return response()->json([
                'message' => 'Team created successfully',
                'team' => $team,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create team', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update a team.
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:active,paused',
            'priority' => 'nullable|string|in:high,medium,low',
            'leader_id' => 'nullable|exists:team_members,id',
            'completion_rate' => 'nullable|integer|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $team = Team::findOrFail($id);

        $team->update([
            'name' => $request->name ?? $team->name,
            'description' => $request->description ?? $team->description,
            'status' => $request->status ?? $team->status,
            'priority' => $request->priority ?? $team->priority,
            'leader_id' => $request->leader_id ?? $team->leader_id,
            'completion_rate' => $request->completion_rate ?? $team->completion_rate,
            'last_updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Team updated successfully',
            'team' => $team,
        ]);
    }

    /**
     * Delete a team.
     */
    public function destroy($id)
    {
        $team = Team::findOrFail($id);
        $team->delete();

        return response()->json([
            'message' => 'Team deleted successfully',
        ]);
    }

    /**
     * Add members to a team.
     */
    public function addMembers(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'member_ids' => 'required|array',
            'member_ids.*' => 'exists:team_members,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $team = Team::findOrFail($id);

        $memberData = [];
        foreach ($request->member_ids as $memberId) {
            $memberData[$memberId] = ['role' => 'member'];
        }

        $team->members()->attach($memberData);

        return response()->json([
            'message' => 'Members added successfully',
        ]);
    }

    /**
     * Remove members from a team.
     */
    public function removeMembers(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'member_ids' => 'required|array',
            'member_ids.*' => 'exists:team_members,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $team = Team::findOrFail($id);
        $team->members()->detach($request->member_ids);

        return response()->json([
            'message' => 'Members removed successfully',
        ]);
    }

    /**
     * Export team members data as CSV.
     */
    public function exportMembers($id)
    {
        $team = Team::with(['members.tasks'])->findOrFail($id);

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="team_' . $team->id . '_members.csv"',
        ];

        $callback = function () use ($team) {
            $file = fopen('php://output', 'w');

            // Add CSV header
            fputcsv($file, ['ID', 'Name', 'Role', 'Email', 'Job Title', 'Tasks']);

            // Add member data
            foreach ($team->members as $member) {
                $tasks = $member->tasks->map(function ($task) {
                    return $task->title . ' (' . $task->progress . '%)';
                })->join('; ');

                fputcsv($file, [
                    $member->id,
                    $member->name,
                    $member->pivot->role,
                    $member->email,
                    $member->job_title ?? 'Non défini',
                    $tasks
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function getTeamStats()
    {
        $user = auth()->user();
        
        // Compter les équipes
        $teams = Team::whereHas('members', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })->get();
        
        $totalTeams = $teams->count();
        $activeTeams = $teams->where('status', 'active')->count();
        $completedTeams = $teams->where('status', 'completed')->count();
        
        // Compter les membres d'équipe uniques
        $teamMembers = TeamMember::whereIn('team_id', $teams->pluck('id'))->distinct('user_id')->count();
        
        // Compter les projets actifs
        $activeProjects = Project::whereIn('team_id', $teams->pluck('id'))
                            ->where('status', 'active')
                            ->count();
        
        // Compter les projets terminés
        $completedProjects = Project::whereIn('team_id', $teams->pluck('id'))
                              ->where('status', 'completed')
                              ->count();
        
        return response()->json([
            'total_teams' => $totalTeams,
            'active_teams' => $activeTeams,
            'completed_teams' => $completedProjects, // Utiliser le nombre de projets terminés
            'total_members' => $teamMembers,
            'total_active_projects' => $activeProjects,
        ]);
    }
}
