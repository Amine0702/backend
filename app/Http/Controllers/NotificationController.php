<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    /**
     * Get user notifications
     */
    public function getUserNotifications(Request $request)
    {
        try {
            $clerkUserId = $request->header('X-Clerk-User-Id');
            
            if (!$clerkUserId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié',
                    'notifications' => [],
                    'unread_count' => 0
                ], 401);
            }

            // Vérifier si l'utilisateur existe
            $user = User::where('clerk_user_id', $clerkUserId)->first();
            
            if (!$user) {
                Log::warning('User not found for notifications:', ['clerk_user_id' => $clerkUserId]);
                return response()->json([
                    'success' => true,
                    'message' => 'User not found, returning empty notifications',
                    'notifications' => [],
                    'unread_count' => 0
                ], 200);
            }

            // Trouver le membre d'équipe
            $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();
            
            if (!$teamMember) {
                Log::warning('Team member not found for notifications:', ['clerk_user_id' => $clerkUserId]);
                return response()->json([
                    'success' => true,
                    'message' => 'Team member not found, returning empty notifications',
                    'notifications' => [],
                    'unread_count' => 0
                ], 200);
            }

            // Récupérer les notifications non lues en premier, puis les notifications lues
            $notifications = Notification::where('user_id', $teamMember->id)
                ->with('sender')
                ->orderBy('read', 'asc')
                ->orderBy('created_at', 'desc')
                ->take(20)
                ->get();

            // Transformer les notifications pour inclure des informations sur l'expéditeur
            $transformedNotifications = $notifications->map(function ($notification) {
                return [
                    'id' => $notification->id,
                    'type' => $notification->type,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'data' => $notification->data,
                    'read' => $notification->read,
                    'created_at' => $notification->created_at,
                    'time_ago' => $notification->created_at->diffForHumans(),
                    'sender' => $notification->sender ? [
                        'id' => $notification->sender->id,
                        'name' => $notification->sender->name,
                        'avatar' => $notification->sender->avatar,
                    ] : null,
                ];
            });

            // Compter les notifications non lues
            $unreadCount = $notifications->where('read', false)->count();

            return response()->json([
                'success' => true,
                'notifications' => $transformedNotifications,
                'unread_count' => $unreadCount
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching notifications: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching notifications',
                'notifications' => [],
                'unread_count' => 0,
                'error' => $e->getMessage()
            ], 200); // 200 au lieu de 500
        }
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(Request $request, $id)
    {
        try {
            $clerkUserId = $request->header('X-Clerk-User-Id');
            
            if (!$clerkUserId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié'
                ], 401);
            }

            // Vérifier si l'utilisateur existe
            $user = User::where('clerk_user_id', $clerkUserId)->first();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non trouvé'
                ], 404);
            }

            // Trouver le membre d'équipe
            $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();
            
            if (!$teamMember) {
                return response()->json([
                    'success' => false,
                    'message' => 'Membre d\'équipe non trouvé'
                ], 404);
            }

            $notification = Notification::where('id', $id)
                ->where('user_id', $teamMember->id)
                ->first();

            if (!$notification) {
                return response()->json([
                    'success' => false,
                    'message' => 'Notification non trouvée'
                ], 404);
            }

            $notification->update(['read' => true]);

            return response()->json([
                'success' => true,
                'message' => 'Notification marquée comme lue',
                'notification' => $notification
            ]);
        } catch (\Exception $e) {
            Log::error('Error marking notification as read: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error marking notification as read',
                'error' => $e->getMessage()
            ], 200); // 200 au lieu de 500
        }
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request)
    {
        try {
            $clerkUserId = $request->header('X-Clerk-User-Id');
            
            if (!$clerkUserId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié'
                ], 401);
            }

            // Vérifier si l'utilisateur existe
            $user = User::where('clerk_user_id', $clerkUserId)->first();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non trouvé'
                ], 404);
            }

            // Trouver le membre d'équipe
            $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();
            
            if (!$teamMember) {
                return response()->json([
                    'success' => false,
                    'message' => 'Membre d\'équipe non trouvé'
                ], 404);
            }

            Notification::where('user_id', $teamMember->id)
                ->where('read', false)
                ->update(['read' => true]);

            return response()->json([
                'success' => true,
                'message' => 'Toutes les notifications ont été marquées comme lues'
            ]);
        } catch (\Exception $e) {
            Log::error('Error marking all notifications as read: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error marking all notifications as read',
                'error' => $e->getMessage()
            ], 200); // 200 au lieu de 500
        }
    }

    /**
     * Delete a notification
     */
    public function deleteNotification(Request $request, $id)
    {
        try {
            $clerkUserId = $request->header('X-Clerk-User-Id');
            
            if (!$clerkUserId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié'
                ], 401);
            }

            // Vérifier si l'utilisateur existe
            $user = User::where('clerk_user_id', $clerkUserId)->first();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non trouvé'
                ], 404);
            }

            // Trouver le membre d'équipe
            $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();
            
            if (!$teamMember) {
                return response()->json([
                    'success' => false,
                    'message' => 'Membre d\'équipe non trouvé'
                ], 404);
            }

            $notification = Notification::where('id', $id)
                ->where('user_id', $teamMember->id)
                ->first();

            if (!$notification) {
                return response()->json([
                    'success' => false,
                    'message' => 'Notification non trouvée'
                ], 404);
            }

            $notification->delete();

            return response()->json([
                'success' => true,
                'message' => 'Notification supprimée avec succès'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting notification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error deleting notification',
                'error' => $e->getMessage()
            ], 200); // 200 au lieu de 500
        }
    }
}
