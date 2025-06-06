<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ColumnController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\TeamMemberController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\AIController;
use App\Http\Controllers\NotificationController;




/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// User routes
Route::get('/users', [UserController::class, 'getAllUsers']);
Route::post('/users', [UserController::class, 'createOrUpdateUser']);
Route::get('/users/clerk/{clerkUserId}', [UserController::class, 'getUserByClerkId']);
Route::put('/users/{clerkUserId}/profile', [UserController::class, 'updateUserProfile']);
Route::put('/users/{id}/role', [UserController::class, 'updateUserRole']);
Route::delete('/users/{id}', [UserController::class, 'deleteUser']);
Route::get('/users/stats', [UserController::class, 'getUserStats']);

// User invitation routes
Route::post('/users/invite', [UserController::class, 'inviteUser']);
Route::get('/users/invitations', [UserController::class, 'getPendingInvitations']);
Route::delete('/users/invitations/{id}', [UserController::class, 'cancelInvitation']);
Route::post('/users/invitations/verify', [UserController::class, 'verifyInvitationToken']);
Route::post('/users/invitations/register', [UserController::class, 'registerFromInvitation']);

// Project routes
Route::get('/projects/user/{clerkUserId}', [ProjectController::class, 'getUserProjects']);
Route::post('/projects', [ProjectController::class, 'store']);
Route::get('/projects/{id}', [ProjectController::class, 'show']);
Route::delete('/projects/{id}', [ProjectController::class, 'deleteProject']);
Route::post('/projects/invitation/{token}', [ProjectController::class, 'acceptInvitation']);
Route::get('/projects/{id}/stats', [ProjectController::class, 'getProjectStats']);
Route::get('/projects/stats/all', [ProjectController::class, 'getAllProjectsStats']);
Route::get('/projects/{id}/lifecycle', [ProjectController::class, 'getProjectLifecycle']);
Route::get('/projects/{id}/history', [ProjectController::class, 'getProjectHistory']);
Route::get('/projects/history/all', [ProjectController::class, 'getAllProjectsHistory']);
Route::post('/projects/{id}/invite', [ProjectController::class, 'inviteUsers']);
Route::delete('/projects/{projectId}/members/{memberId}', [ProjectController::class, 'removeMember']);
// Ajout de la route pour vérifier les permissions d'un utilisateur sur un projet
Route::get('/projects/{projectId}/check-permission', [ProjectController::class, 'checkUserProjectPermission']);
Route::put('/projects/{projectId}/members/{memberId}/permission', [ProjectController::class, 'updateMemberPermission']);
Route::get('/activities/recent', [ProjectController::class, 'getRecentActivities']);
Route::put('/projects/{projectId}/members/{memberId}/role', [ProjectController::class, 'updateMemberRole']);

// Report routes
Route::post('/projects/reports/generate', [ProjectController::class, 'generateReport']);
Route::post('/projects/{id}/reports/generate', [ProjectController::class, 'generateReport']);
Route::post('/projects/reports/schedule', [ProjectController::class, 'scheduleReport']);
Route::post('/projects/{id}/reports/schedule', [ProjectController::class, 'scheduleReport']);
Route::get('/reports/history', [ProjectController::class, 'getReportHistory']);


// Dashboard routes
Route::get('/dashboard/data', [ProjectController::class, 'getDashboardData']);



// Column routes
Route::post('/columns', [ColumnController::class, 'store']);
Route::put('/columns/order', [ColumnController::class, 'updateOrder']);
Route::delete('/columns/{id}', [ColumnController::class, 'destroy']);

// Task routes
Route::post('/tasks', [TaskController::class, 'store']);
Route::put('/tasks/{id}', [TaskController::class, 'update']);
Route::delete('/tasks/{id}', [TaskController::class, 'destroy']);
Route::post('/tasks/move', [TaskController::class, 'moveTask']);
Route::post('/tasks/{id}/toggle-timer', [TaskController::class, 'toggleTimer']);
Route::post('/tasks/{taskId}/comments', [TaskController::class, 'addComment']);
Route::post('/tasks/{taskId}/attachments', [TaskController::class, 'addAttachment']);
// Ajout de la route pour vérifier les permissions d'un utilisateur sur une tâche
Route::get('/tasks/{taskId}/check-permission', [TaskController::class, 'checkUserTaskPermission']);

// Team routes
Route::get('/teams', [TeamController::class, 'index']);
Route::get('/teams/{id}', [TeamController::class, 'show']);
Route::get('/teams/stats/summary', [TeamController::class, 'getStats']);
Route::post('/teams', [TeamController::class, 'store']);
Route::put('/teams/{id}', [TeamController::class, 'update']);
Route::delete('/teams/{id}', [TeamController::class, 'destroy']);
Route::post('/teams/{teamId}/members', [TeamController::class, 'addMembers']);
Route::delete('/teams/{teamId}/members', [TeamMemberController::class, 'removeMembers']);
Route::get('/teams/{teamId}/export-members', [TeamController::class, 'exportMembers']);
Route::get('/teams/{teamId}/performance', [TeamController::class, 'getPerformance']);

// Team member routes
Route::get('/team-members/{memberId}/performance', [TeamMemberController::class, 'getPerformance']);

// Note routes
Route::get('/notes/user/{clerkUserId}', [NoteController::class, 'getUserNotes']);
Route::post('/notes', [NoteController::class, 'store']);
Route::put('/notes/{id}', [NoteController::class, 'update']);
Route::delete('/notes/{id}', [NoteController::class, 'destroy']);
Route::get('/notes/search', [NoteController::class, 'search']);





// AI routes
Route::post('/ai/generate-task', [AIController::class, 'generateTask']);
Route::get('/ai/generated-tasks', [AIController::class, 'getAIGeneratedTasks']);
Route::post('/ai/chat', [AIController::class, 'chat']);


// Routes pour l'approbation des projets
Route::get('/admin/projects/pending', [ProjectController::class, 'getPendingProjects']);
Route::post('/admin/projects/{id}/approve', [ProjectController::class, 'approveProject']);
Route::post('/admin/projects/{id}/reject', [ProjectController::class, 'rejectProject']);


// Routes pour les notifications
Route::get('/notifications', [NotificationController::class, 'getUserNotifications']);
Route::put('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
Route::delete('/notifications/{id}', [NotificationController::class, 'deleteNotification']);

// Route pour récupérer les détails d'un utilisateur par ID
Route::get('/users/{id}/details', [UserController::class, 'getUserDetailsById']);

// Route pour récupérer les statistiques de projets par mois
Route::get('/projects/stats/monthly', [ProjectController::class, 'getProjectStatsByMonth']);
Route::get('/projects/{id}/task-analysis', [ProjectController::class, 'getProjectTaskAnalysis']);






