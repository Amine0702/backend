"use client";

import type React from "react";
import type { Task, TeamMember } from "../types/kanban";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Share2,
  GripVertical,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface TaskCardProps {
  task: Task;
  assignee?: TeamMember;
  onShare: () => void;
  onTaskClick: () => void;
  userRole: string;
  currentUserId: string;
  canUserModifyTask: (task: any) => boolean;
  isDraggable?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  assignee,
  onShare,
  onTaskClick,
  userRole,
  currentUserId,
  canUserModifyTask,
  isDraggable = false,
}) => {
  // Format pour l'affichage de la date
  const formatDate = (date?: Date) => {
    if (!date) return "";
    return format(new Date(date), "dd/MM/yyyy");
  };

  // Formatter le temps pour l'affichage
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}m` : ""}`;
  };

  // Calculer le temps écoulé pour les tâches actives
  const getElapsedTime = () => {
    if (!task.timerActive || !task.startedAt)
      return formatTime(task.actualTime);

    const now = new Date();
    const started = new Date(task.startedAt);
    const elapsedMinutes =
      task.actualTime + Math.floor((now.getTime() - started.getTime()) / 60000);
    return formatTime(elapsedMinutes);
  };

  // Déterminer la couleur et l'icône en fonction de la priorité
  const getPriorityBadge = () => {
    switch (task.priority) {
      case "urgente":
        return (
          <span className="flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
            <AlertCircle size={12} className="mr-1" />
            Urgent
          </span>
        );
      case "haute":
        return (
          <span className="flex items-center rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
            <AlertCircle size={12} className="mr-1" />
            Haute
          </span>
        );
      case "moyenne":
        return (
          <span className="flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <AlertCircle size={12} className="mr-1" />
            Moyenne
          </span>
        );
      case "basse":
        return (
          <span className="flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle size={12} className="mr-1" />
            Basse
          </span>
        );
      default:
        return null;
    }
  };

  // Gérer le partage
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher le déclenchement du onClick du parent

    if (!canUserModifyTask(task)) {
      toast.error("Vous n'avez pas la permission de partager cette tâche");
      return;
    }

    onShare();
  };

  const handleClick = () => {
    onTaskClick();
  };

  // Utiliser isDraggable directement au lieu de recalculer
  return (
    <div
      className={`task-card relative rounded-lg border bg-white p-3 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${
        isDraggable
          ? "cursor-grab border-l-4 border-l-violet-400"
          : "cursor-pointer"
      }`}
      onClick={handleClick}
    >
      {/* Indicateur visuel de drag and drop */}
      {isDraggable && (
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 transform rounded-full bg-violet-100 p-1 text-violet-600 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-violet-900/30 dark:text-violet-300">
          <GripVertical size={16} />
        </div>
      )}

      <h3 className="mb-2 pr-16 text-base font-medium text-gray-800 dark:text-gray-200">
        {task.title}
      </h3>

      {/* Description tronquée */}
      {task.description && (
        <p className="mb-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
          {task.description}
        </p>
      )}

      <div className="mb-2 flex flex-wrap gap-2">
        {getPriorityBadge()}

        {task.dueDate && (
          <span className="flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            <Calendar size={12} className="mr-1" />
            {formatDate(task.dueDate)}
          </span>
        )}

        <span className="flex items-center rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
          <Clock size={12} className="mr-1" />
          {formatTime(task.estimatedTime)}
        </span>
      </div>

      {/* Tags de la tâche */}
      {task.tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.tags.map((tag, index) => (
            <span
              key={index}
              className="tag dark:bg-violet-900/30 dark:text-violet-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Indicateur visuel pour les tâches assignées à l'utilisateur actuel */}
      {assignee && assignee.clerk_user_id === currentUserId && (
        <div className="mb-2 flex items-center">
          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
            Assignée à vous
          </span>
        </div>
      )}

      {/* Footer avec l'info de l'assigné et les actions */}
      <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-700">
        {/* Assigné */}
        {assignee ? (
          <div className="flex items-center">
            <div className="avatar-sm mr-2">
              <img
                src={assignee.avatar || "/placeholder.svg"}
                alt={assignee.name}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="max-w-[100px] truncate text-xs text-gray-600 dark:text-gray-400">
              {assignee.name}
            </span>
          </div>
        ) : (
          <span className="text-xs italic text-gray-400 dark:text-gray-500">
            Non assigné
          </span>
        )}

        {/* Actions */}
        {canUserModifyTask(task) && (
          <div className="flex space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={handleShare}
              className="rounded-full p-1 text-gray-500 hover:bg-violet-50 hover:text-violet-600 dark:text-gray-400 dark:hover:bg-violet-900/30 dark:hover:text-violet-400"
              title="Partager"
            >
              <Share2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
