<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ColumnController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TeamMemberController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\AIController;
use App\Http\Controllers\NoteController;

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
Route::post('/users', [UserController::class, 'createOrUpdateUser']);
Route::get('/users/clerk/{clerkUserId}', [UserController::class, 'getUserByClerkId']);
Route::put('/users/{clerkUserId}/profile', [UserController::class, 'updateUserProfile']);

// Project routes
Route::get('/projects/user/{clerkUserId}', [ProjectController::class, 'getUserProjects']);
Route::post('/projects', [ProjectController::class, 'store']);
Route::get('/projects/{id}', [ProjectController::class, 'show']);
Route::post('/projects/invitation/{token}', [ProjectController::class, 'acceptInvitation']);
Route::get('/projects/{id}/stats', [ProjectController::class, 'getProjectStats']);

// Column routes
Route::post('/columns', [ColumnController::class, 'store']);
Route::put('/columns/order', [ColumnController::class, 'updateOrder']);

// Task routes
Route::post('/tasks', [TaskController::class, 'store']);
Route::put('/tasks/{id}', [TaskController::class, 'update']);
Route::delete('/tasks/{id}', [TaskController::class, 'destroy']);
Route::post('/tasks/move', [TaskController::class, 'moveTask']);
Route::post('/tasks/{id}/toggle-timer', [TaskController::class, 'toggleTimer']);
Route::post('/tasks/{taskId}/comments', [TaskController::class, 'addComment']);
Route::post('/tasks/{taskId}/attachments', [TaskController::class, 'addAttachment']);

// AI routes
Route::post('/ai/generate-task', [AIController::class, 'generateTask']);

// Report routes
Route::get('/reports/projects', [ReportController::class, 'getProjectsReport']);
Route::get('/reports/tasks', [ReportController::class, 'getTasksReport']);
Route::get('/reports/history/{clerkUserId}', [ReportController::class, 'getHistoricalReports']);
Route::post('/reports/generate', [ReportController::class, 'generateReport']);
Route::post('/reports/schedule', [ReportController::class, 'scheduleReport']);

// Note routes
Route::get('/notes/user/{clerkUserId}', [NoteController::class, 'getUserNotes']);
Route::post('/notes', [NoteController::class, 'store']);
Route::put('/notes/{id}', [NoteController::class, 'update']);
Route::delete('/notes/{id}', [NoteController::class, 'destroy']);
