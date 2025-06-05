"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import {
  useGetUserNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
} from "@/app/state/api";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    data: notificationsData,
    isLoading,
    refetch,
  } = useGetUserNotificationsQuery();
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unread_count || 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".notification-dropdown")) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsRead(id).unwrap();
      refetch();
    } catch (error) {
      console.error(
        "Erreur lors du marquage de la notification comme lue",
        error,
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead().unwrap();
      refetch();
    } catch (error) {
      console.error(
        "Erreur lors du marquage de toutes les notifications comme lues",
        error,
      );
    }
  };

  const handleDeleteNotification = async (id: number) => {
    try {
      await deleteNotification(id).unwrap();
      refetch();
    } catch (error) {
      console.error("Erreur lors de la suppression de la notification", error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: fr,
      });
    } catch (error) {
      return "Date inconnue";
    }
  };

  return (
    <div className="notification-dropdown relative">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "relative h-9 w-9 rounded-full transition-all",
          isOpen ? "bg-purple-100 dark:bg-purple-900/20" : "",
          unreadCount > 0 ? "animate-pulse" : "",
        )}
        onClick={handleToggleDropdown}
        aria-label="Notifications"
      >
        <Bell
          className={cn(
            "h-5 w-5 transition-colors",
            isOpen ? "text-purple-600 dark:text-purple-400" : "",
            unreadCount > 0 ? "text-purple-600 dark:text-purple-400" : "",
          )}
        />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-600 px-[0.35rem] text-xs font-medium hover:bg-purple-700"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-96 rounded-lg border bg-white shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-purple-100 p-4 dark:border-purple-900/20">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                >
                  {unreadCount} {unreadCount > 1 ? "nouvelles" : "nouvelle"}
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-medium text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20 dark:hover:text-purple-300"
                onClick={handleMarkAllAsRead}
              >
                Tout marquer comme lu
              </Button>
            )}
          </div>

          <ScrollArea className="h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
                <Bell className="h-12 w-12 text-purple-200 dark:text-purple-800/50" />
                <p className="text-gray-500 dark:text-gray-400">
                  Aucune notification
                </p>
              </div>
            ) : (
              <div>
                {notifications.map((notification: any) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "group relative border-b border-purple-100/50 p-4 transition-colors hover:bg-purple-50/50 dark:border-purple-800/20 dark:hover:bg-purple-900/10",
                      !notification.read
                        ? "bg-purple-50/50 dark:bg-purple-900/20"
                        : "",
                    )}
                  >
                    {!notification.read && (
                      <div className="absolute bottom-0 left-0 top-0 w-1 bg-purple-500 dark:bg-purple-400"></div>
                    )}
                    <div className="mb-1 flex items-start justify-between">
                      <h4 className="line-clamp-1 font-medium text-gray-800 dark:text-gray-200">
                        {notification.title}
                      </h4>
                      <div className="flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30"
                            onClick={() => handleMarkAsRead(notification.id)}
                            title="Marquer comme lu"
                          >
                            <Check className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20"
                          onClick={() =>
                            handleDeleteNotification(notification.id)
                          }
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                        </Button>
                      </div>
                    </div>
                    <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                      {notification.message}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {formatTimeAgo(notification.created_at)}
                      </span>
                      {notification.sender && (
                        <span className="max-w-[150px] truncate text-xs font-medium text-purple-600/80 dark:text-purple-400/80">
                          {notification.sender.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="border-t border-purple-100 p-2 text-center dark:border-purple-900/20">
            <Button
              variant="link"
              className="text-xs text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
              onClick={() => setIsOpen(false)}
            >
              Fermer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
