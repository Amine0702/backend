<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\TeamMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    /**
     * Get user notifications
     */
    public function getUserNotifications(Request $request)
    {
        $clerkUserId = $request->header('X-Clerk-User-Id');
        if (!$clerkUserId) {
            return response()->json(['message' => 'Utilisateur non authentifié'], 401);
        }

        // Trouver le membre d'équipe
        $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();
        if (!$teamMember) {
            return response()->json(['message' => 'Membre d\'équipe non trouvé'], 404);
        }

        try {
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
                'notifications' => $transformedNotifications,
                'unread_count' => $unreadCount
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching notifications: ' . $e->getMessage());
            return response()->json(['message' => 'Error fetching notifications: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(Request $request, $id)
    {
        $clerkUserId = $request->header('X-Clerk-User-Id');
        if (!$clerkUserId) {
            return response()->json(['message' => 'Utilisateur non authentifié'], 401);
        }

        // Trouver le membre d'équipe
        $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();
        if (!$teamMember) {
            return response()->json(['message' => 'Membre d\'équipe non trouvé'], 404);
        }

        try {
            $notification = Notification::where('id', $id)
                ->where('user_id', $teamMember->id)
                ->first();

            if (!$notification) {
                return response()->json(['message' => 'Notification non trouvée'], 404);
            }

            $notification->update(['read' => true]);

            return response()->json([
                'message' => 'Notification marquée comme lue',
                'notification' => $notification
            ]);
        } catch (\Exception $e) {
            Log::error('Error marking notification as read: ' . $e->getMessage());
            return response()->json(['message' => 'Error marking notification as read: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request)
    {
        $clerkUserId = $request->header('X-Clerk-User-Id');
        if (!$clerkUserId) {
            return response()->json(['message' => 'Utilisateur non authentifié'], 401);
        }

        // Trouver le membre d'équipe
        $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();
        if (!$teamMember) {
            return response()->json(['message' => 'Membre d\'équipe non trouvé'], 404);
        }

        try {
            Notification::where('user_id', $teamMember->id)
                ->where('read', false)
                ->update(['read' => true]);

            return response()->json([
                'message' => 'Toutes les notifications ont été marquées comme lues'
            ]);
        } catch (\Exception $e) {
            Log::error('Error marking all notifications as read: ' . $e->getMessage());
            return response()->json(['message' => 'Error marking all notifications as read: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete a notification
     */
    public function deleteNotification(Request $request, $id)
    {
        $clerkUserId = $request->header('X-Clerk-User-Id');
        if (!$clerkUserId) {
            return response()->json(['message' => 'Utilisateur non authentifié'], 401);
        }

        // Trouver le membre d'équipe
        $teamMember = TeamMember::where('clerk_user_id', $clerkUserId)->first();
        if (!$teamMember) {
            return response()->json(['message' => 'Membre d\'équipe non trouvé'], 404);
        }

        try {
            $notification = Notification::where('id', $id)
                ->where('user_id', $teamMember->id)
                ->first();

            if (!$notification) {
                return response()->json(['message' => 'Notification non trouvée'], 404);
            }

            $notification->delete();

            return response()->json([
                'message' => 'Notification supprimée avec succès'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting notification: ' . $e->getMessage());
            return response()->json(['message' => 'Error deleting notification: ' . $e->getMessage()], 500);
        }
    }
}
