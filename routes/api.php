<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TeamMemberController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ColumnController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\UserController;

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

// Middleware pour ajouter le header Clerk User ID à toutes les requêtes
Route::middleware(['api'])->group(function () {
    // User Routes
    Route::post('/users', [UserController::class, 'createOrUpdateUser']);
    Route::get('/users/clerk/{clerkUserId}', [UserController::class, 'getUserByClerkId']);

    // Team Member Routes
    Route::post('/team-members', [TeamMemberController::class, 'store']);
    Route::get('/team-members/clerk/{clerkUserId}', [TeamMemberController::class, 'getByClerkId']);

    // Project Routes
    Route::get('/projects/user/{clerkUserId}', [ProjectController::class, 'getUserProjects']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects/{id}', [ProjectController::class, 'show']);
    Route::get('/projects/{id}/tasks', [ProjectController::class, 'getTasks']);
    Route::get('/projects/{id}/stats', [ProjectController::class, 'getStats']);
    Route::post('/projects/invitation/{token}', [ProjectController::class, 'acceptInvitation']);
    Route::post('/projects/{id}/invite', [ProjectController::class, 'inviteUsers']); // New route for inviting users

    // Column Routes
    Route::post('/columns', [ColumnController::class, 'store']);
    Route::put('/columns/order', [ColumnController::class, 'updateOrder']);

    // Task Routes
    Route::post('/tasks', [TaskController::class, 'store']);
    Route::put('/tasks/{id}', [TaskController::class, 'update']);
    Route::delete('/tasks/{id}', [TaskController::class, 'destroy']);
    Route::post('/tasks/move', [TaskController::class, 'moveTask']);
    Route::post('/tasks/{id}/toggle-timer', [TaskController::class, 'toggleTimer']);
    Route::post('/tasks/{id}/comments', [TaskController::class, 'addComment']);
    Route::post('/tasks/{id}/attachments', [TaskController::class, 'addAttachment']);
    Route::get('/tasks/search', [TaskController::class, 'search']);
});
