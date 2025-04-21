<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\TeamMember;
use App\Models\Project;
use App\Models\Column;
use App\Models\Task;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create users
        $users = [
            [
                'name' => 'Thomas Dubois',
                'email' => 'thomas@example.com',
                'clerk_user_id' => 'user_1',
                'profile_picture_url' => 'https://randomuser.me/api/portraits/men/41.jpg',
                'role' => 'admin',
            ],
            [
                'name' => 'Marie Laurent',
                'email' => 'marie@example.com',
                'clerk_user_id' => 'user_2',
                'profile_picture_url' => 'https://randomuser.me/api/portraits/women/31.jpg',
                'role' => 'user',
            ],
            [
                'name' => 'Lucas Martin',
                'email' => 'lucas@example.com',
                'clerk_user_id' => 'user_3',
                'profile_picture_url' => 'https://randomuser.me/api/portraits/men/22.jpg',
                'role' => 'user',
            ],
            [
                'name' => 'Sophie Mercier',
                'email' => 'sophie@example.com',
                'clerk_user_id' => 'user_4',
                'profile_picture_url' => 'https://randomuser.me/api/portraits/women/44.jpg',
                'role' => 'user',
            ],
            [
                'name' => 'Alexandre Petit',
                'email' => 'alexandre@example.com',
                'clerk_user_id' => 'user_5',
                'profile_picture_url' => 'https://randomuser.me/api/portraits/men/36.jpg',
                'role' => 'user',
            ],
        ];

        foreach ($users as $userData) {
            User::create($userData);
        }

        // Create team members
        $teamMembers = [
            [
                'name' => 'Thomas Dubois',
                'email' => 'thomas@example.com',
                'avatar' => 'https://randomuser.me/api/portraits/men/41.jpg',
                'clerk_user_id' => 'user_1',
            ],
            [
                'name' => 'Marie Laurent',
                'email' => 'marie@example.com',
                'avatar' => 'https://randomuser.me/api/portraits/women/31.jpg',
                'clerk_user_id' => 'user_2',
            ],
            [
                'name' => 'Lucas Martin',
                'email' => 'lucas@example.com',
                'avatar' => 'https://randomuser.me/api/portraits/men/22.jpg',
                'clerk_user_id' => 'user_3',
            ],
            [
                'name' => 'Sophie Mercier',
                'email' => 'sophie@example.com',
                'avatar' => 'https://randomuser.me/api/portraits/women/44.jpg',
                'clerk_user_id' => 'user_4',
            ],
            [
                'name' => 'Alexandre Petit',
                'email' => 'alexandre@example.com',
                'avatar' => 'https://randomuser.me/api/portraits/men/36.jpg',
                'clerk_user_id' => 'user_5',
            ],
        ];

        foreach ($teamMembers as $memberData) {
            TeamMember::create($memberData);
        }

        // Create a project
        $project = Project::create([
            'name' => 'Projet Refonte Site Web',
            'description' => 'Refonte complète du site web vitrine et de la plateforme e-commerce associée.',
            'start_date' => now(),
            'end_date' => now()->addMonths(3),
            'clerk_user_id' => 'user_1',
        ]);

        // Attach team members to the project
        $project->teamMembers()->attach(1, ['role' => 'manager']); // Thomas as manager
        $project->teamMembers()->attach(2, ['role' => 'member']); // Marie as member
        $project->teamMembers()->attach(3, ['role' => 'member']); // Lucas as member
        $project->teamMembers()->attach(4, ['role' => 'member']); // Sophie as member
        $project->teamMembers()->attach(5, ['role' => 'member']); // Alexandre as member

        // Create columns
        $columns = [
            ['title' => 'À faire', 'order' => 0],
            ['title' => 'En cours', 'order' => 1],
            ['title' => 'En révision', 'order' => 2],
            ['title' => 'Terminé', 'order' => 3],
        ];

        foreach ($columns as $columnData) {
            $column = Column::create([
                'project_id' => $project->id,
                'title' => $columnData['title'],
                'order' => $columnData['order'],
            ]);

            // Add tasks to the column
            if ($column->title === 'À faire') {
                Task::create([
                    'column_id' => $column->id,
                    'title' => 'Concevoir la maquette du site',
                    'description' => 'Créer les wireframes et le design du site web en suivant la charte graphique.',
                    'status' => 'à_faire',
                    'priority' => 'haute',
                    'assignee_id' => 2, // Marie
                    'estimated_time' => 480, // 8 hours
                    'actual_time' => 0,
                    'due_date' => now()->addDays(7),
                    'timer_active' => false,
                    'tags' => ['design', 'ui/ux'],
                ]);

                Task::create([
                    'column_id' => $column->id,
                    'title' => 'Analyse des besoins clients',
                    'description' => 'Recueillir et analyser les exigences du client pour le projet.',
                    'status' => 'à_faire',
                    'priority' => 'moyenne',
                    'assignee_id' => 1, // Thomas
                    'estimated_time' => 360, // 6 hours
                    'actual_time' => 0,
                    'due_date' => now()->addDays(3),
                    'timer_active' => false,
                    'tags' => ['analyse', 'client'],
                ]);
            } elseif ($column->title === 'En cours') {
                Task::create([
                    'column_id' => $column->id,
                    'title' => 'Développer la page d\'accueil',
                    'description' => 'Implémenter la page d\'accueil selon les maquettes approuvées.',
                    'status' => 'en_cours',
                    'priority' => 'haute',
                    'assignee_id' => 3, // Lucas
                    'estimated_time' => 720, // 12 hours
                    'actual_time' => 240, // 4 hours
                    'started_at' => now()->subDays(2),
                    'timer_active' => true,
                    'tags' => ['développement', 'frontend'],
                ]);
            } elseif ($column->title === 'En révision') {
                Task::create([
                    'column_id' => $column->id,
                    'title' => 'Configuration de la base de données',
                    'description' => 'Mettre en place la structure de la base de données et les migrations.',
                    'status' => 'en_révision',
                    'priority' => 'urgente',
                    'assignee_id' => 4, // Sophie
                    'estimated_time' => 240, // 4 hours
                    'actual_time' => 300, // 5 hours
                    'started_at' => now()->subDays(4),
                    'timer_active' => false,
                    'tags' => ['backend', 'database'],
                ]);
            } elseif ($column->title === 'Terminé') {
                Task::create([
                    'column_id' => $column->id,
                    'title' => 'Définir l\'architecture technique',
                    'description' => 'Choisir les technologies et définir l\'architecture globale du projet.',
                    'status' => 'terminé',
                    'priority' => 'haute',
                    'assignee_id' => 1, // Thomas
                    'estimated_time' => 300, // 5 hours
                    'actual_time' => 270, // 4.5 hours
                    'started_at' => now()->subDays(10),
                    'completed_at' => now()->subDays(8),
                    'timer_active' => false,
                    'tags' => ['architecture', 'planification'],
                ]);
            }
        }
    }
}
