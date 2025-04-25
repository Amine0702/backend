<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Models\TeamMember;
use App\Models\Report;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class ReportController extends Controller
{
    /**
     * Obtenir les statistiques d'un projet
     */
    public function getProjectStats($projectId)
    {
        $project = Project::with(['columns.tasks'])->findOrFail($projectId);

        // Collecter toutes les tâches du projet
        $tasks = collect();
        foreach ($project->columns as $column) {
            $tasks = $tasks->concat($column->tasks);
        }

        // Calculer les statistiques
        $totalTasks = $tasks->count();
        $completedTasks = $tasks->where('status', 'terminé')->count();
        $completionRate = $totalTasks > 0 ? $completedTasks / $totalTasks : 0;

        // Compter les tâches par statut
        $tasksByStatus = [
            'à_faire' => $tasks->where('status', 'à_faire')->count(),
            'en_cours' => $tasks->where('status', 'en_cours')->count(),
            'en_révision' => $tasks->where('status', 'en_révision')->count(),
            'terminé' => $completedTasks,
        ];

        // Compter les tâches par priorité
        $tasksByPriority = [
            'basse' => $tasks->where('priority', 'basse')->count(),
            'moyenne' => $tasks->where('priority', 'moyenne')->count(),
            'haute' => $tasks->where('priority', 'haute')->count(),
            'urgente' => $tasks->where('priority', 'urgente')->count(),
        ];

        // Générer des données de performance (exemple)
        $performanceData = $this->generatePerformanceData();

        // Générer des données de budget (exemple)
        $budgetData = $this->generateBudgetData();

        return response()->json([
            'totalTasks' => $totalTasks,
            'completedTasks' => $completedTasks,
            'completionRate' => $completionRate,
            'tasksByStatus' => $tasksByStatus,
            'tasksByPriority' => $tasksByPriority,
            'performanceData' => $performanceData,
            'budgetData' => $budgetData,
        ]);
    }

    /**
     * Générer un rapport pour un ou plusieurs projets
     */
    public function generateProjectsReport(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'projectId' => 'required|string',
            'period' => 'required|in:week,month,quarter,year',
            'reportType' => 'required|in:summary,detailed,analytics',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $projectId = $request->query('projectId');
        $period = $request->query('period');
        $reportType = $request->query('reportType');

        // Déterminer la période de date
        $endDate = Carbon::now();
        $startDate = $this->getStartDateFromPeriod($period);

        // Si on demande tous les projets
        if ($projectId === 'all') {
            // Récupérer tous les projets de l'utilisateur
            $clerkUserId = $request->header('X-Clerk-User-Id');
            $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();

            if (!$teamMember) {
                return response()->json(['message' => 'Utilisateur non trouvé'], 404);
            }

            $projects = $teamMember->projects;

            // Collecter les statistiques pour chaque projet
            $projectsStats = [];
            $globalStats = [
                'totalTasks' => 0,
                'completedTasks' => 0,
                'tasksByStatus' => [
                    'à_faire' => 0,
                    'en_cours' => 0,
                    'en_révision' => 0,
                    'terminé' => 0,
                ],
                'tasksByPriority' => [
                    'basse' => 0,
                    'moyenne' => 0,
                    'haute' => 0,
                    'urgente' => 0,
                ],
            ];

            foreach ($projects as $project) {
                $stats = $this->calculateProjectStats($project, $startDate, $endDate);
                $projectsStats[] = [
                    'id' => $project->id,
                    'name' => $project->name,
                    'stats' => $stats,
                ];

                // Agréger les statistiques globales
                $globalStats['totalTasks'] += $stats['totalTasks'];
                $globalStats['completedTasks'] += $stats['completedTasks'];
                $globalStats['tasksByStatus']['à_faire'] += $stats['tasksByStatus']['à_faire'];
                $globalStats['tasksByStatus']['en_cours'] += $stats['tasksByStatus']['en_cours'];
                $globalStats['tasksByStatus']['en_révision'] += $stats['tasksByStatus']['en_révision'];
                $globalStats['tasksByStatus']['terminé'] += $stats['tasksByStatus']['terminé'];
                $globalStats['tasksByPriority']['basse'] += $stats['tasksByPriority']['basse'];
                $globalStats['tasksByPriority']['moyenne'] += $stats['tasksByPriority']['moyenne'];
                $globalStats['tasksByPriority']['haute'] += $stats['tasksByPriority']['haute'];
                $globalStats['tasksByPriority']['urgente'] += $stats['tasksByPriority']['urgente'];
            }

            // Calculer le taux de complétion global
            $globalStats['completionRate'] = $globalStats['totalTasks'] > 0
                ? $globalStats['completedTasks'] / $globalStats['totalTasks']
                : 0;

            // Ajouter les données de performance et de budget
            $globalStats['performanceData'] = $this->generatePerformanceData();
            $globalStats['budgetData'] = $this->generateBudgetData();

            return response()->json([
                'stats' => $globalStats,
                'projects' => $projectsStats,
            ]);
        } else {
            // Récupérer un projet spécifique
            $project = Project::findOrFail($projectId);
            $stats = $this->calculateProjectStats($project, $startDate, $endDate);

            // Ajouter les données de performance et de budget
            $stats['performanceData'] = $this->generatePerformanceData();
            $stats['budgetData'] = $this->generateBudgetData();

            return response()->json([
                'stats' => $stats,
            ]);
        }
    }

    /**
     * Calculer les statistiques d'un projet pour une période donnée
     */
    private function calculateProjectStats($project, $startDate, $endDate)
    {
        // Collecter toutes les tâches du projet dans la période
        $tasks = collect();
        foreach ($project->columns as $column) {
            $periodTasks = $column->tasks->filter(function ($task) use ($startDate, $endDate) {
                $taskDate = Carbon::parse($task->created_at);
                return $taskDate->between($startDate, $endDate);
            });
            $tasks = $tasks->concat($periodTasks);
        }

        // Calculer les statistiques
        $totalTasks = $tasks->count();
        $completedTasks = $tasks->where('status', 'terminé')->count();
        $completionRate = $totalTasks > 0 ? $completedTasks / $totalTasks : 0;

        // Compter les tâches par statut
        $tasksByStatus = [
            'à_faire' => $tasks->where('status', 'à_faire')->count(),
            'en_cours' => $tasks->where('status', 'en_cours')->count(),
            'en_révision' => $tasks->where('status', 'en_révision')->count(),
            'terminé' => $completedTasks,
        ];

        // Compter les tâches par priorité
        $tasksByPriority = [
            'basse' => $tasks->where('priority', 'basse')->count(),
            'moyenne' => $tasks->where('priority', 'moyenne')->count(),
            'haute' => $tasks->where('priority', 'haute')->count(),
            'urgente' => $tasks->where('priority', 'urgente')->count(),
        ];

        return [
            'totalTasks' => $totalTasks,
            'completedTasks' => $completedTasks,
            'completionRate' => $completionRate,
            'tasksByStatus' => $tasksByStatus,
            'tasksByPriority' => $tasksByPriority,
        ];
    }

    /**
     * Obtenir la date de début en fonction de la période
     */
    private function getStartDateFromPeriod($period)
    {
        $now = Carbon::now();

        switch ($period) {
            case 'week':
                return $now->copy()->subWeek();
            case 'month':
                return $now->copy()->subMonth();
            case 'quarter':
                return $now->copy()->subMonths(3);
            case 'year':
                return $now->copy()->subYear();
            default:
                return $now->copy()->subMonth();
        }
    }

    /**
     * Générer des données de performance (exemple)
     */
    private function generatePerformanceData()
    {
        return [
            ['name' => 'Jan', 'actuel' => rand(50, 90), 'precedent' => rand(40, 80)],
            ['name' => 'Fév', 'actuel' => rand(50, 90), 'precedent' => rand(40, 80)],
            ['name' => 'Mar', 'actuel' => rand(50, 90), 'precedent' => rand(40, 80)],
            ['name' => 'Avr', 'actuel' => rand(50, 90), 'precedent' => rand(40, 80)],
            ['name' => 'Mai', 'actuel' => rand(50, 90), 'precedent' => rand(40, 80)],
        ];
    }

    /**
     * Générer des données de budget (exemple)
     */
    private function generateBudgetData()
    {
        return [
            ['name' => 'Développement', 'value' => rand(300, 500)],
            ['name' => 'Marketing', 'value' => rand(200, 400)],
            ['name' => 'Support', 'value' => rand(100, 300)],
            ['name' => 'Infrastructure', 'value' => rand(100, 200)],
        ];
    }

    /**
     * Obtenir l'historique des rapports générés
     */
    public function getHistoricalReports($clerkUserId)
    {
        // Cette fonction est un exemple et devrait être adaptée à votre modèle de données
        // Ici, nous simulons des rapports historiques
        $reports = [
            [
                'id' => 1,
                'name' => 'Rapport mensuel - Tous les projets',
                'date' => Carbon::now()->subDays(5)->toDateTimeString(),
                'projectId' => 'all',
                'period' => 'month',
                'reportType' => 'summary',
            ],
            [
                'id' => 2,
                'name' => 'Rapport détaillé - Projet Alpha',
                'date' => Carbon::now()->subDays(10)->toDateTimeString(),
                'projectId' => '1',
                'period' => 'quarter',
                'reportType' => 'detailed',
            ],
            [
                'id' => 3,
                'name' => 'Rapport analytique - Projet Beta',
                'date' => Carbon::now()->subDays(15)->toDateTimeString(),
                'projectId' => '2',
                'period' => 'year',
                'reportType' => 'analytics',
            ],
        ];

        return response()->json($reports);
    }

    /**
     * Planifier un rapport
     */
    public function scheduleReport(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'clerkUserId' => 'required|string',
            'projectId' => 'required|string',
            'period' => 'required|in:week,month,quarter,year',
            'reportType' => 'required|in:summary,detailed,analytics',
            'scheduledDate' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Ici, vous pourriez enregistrer la planification dans votre base de données
        // et configurer une tâche cron pour générer le rapport à la date spécifiée

        return response()->json([
            'message' => 'Rapport planifié avec succès',
            'scheduledDate' => $request->scheduledDate,
        ]);
    }

    /**
     * Debug endpoint to check if the API is working
     */
    public function debug()
    {
        return response()->json([
            'status' => 'success',
            'message' => 'Report API is working',
            'time' => Carbon::now()->toDateTimeString(),
        ]);
    }
}
