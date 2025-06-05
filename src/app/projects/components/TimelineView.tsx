"use client";

import type React from "react";
import type { Project, Task } from "../types/kanban";
import { addDays, format, differenceInDays, isAfter } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, Calendar, AlertTriangle } from "lucide-react";

interface TimelineViewProps {
  project: Project;
  onTaskClick: (taskId: string) => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({
  project,
  onTaskClick,
}) => {
  // Rassembler toutes les tâches qui ont une date d'échéance
  const tasksWithDates = project.columns
    .flatMap((col) => col.tasks)
    .filter((task) => task.dueDate)
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    });

  // Filtrer les tâches sans date d'échéance
  const tasksWithoutDates = project.columns
    .flatMap((col) => col.tasks)
    .filter((task) => !task.dueDate);

  // Définir les dates pour la timeline
  const today = new Date();
  const startDate = today;
  const endDate = addDays(today, 30); // Timeline sur 30 jours

  // Formatage du temps
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}m` : ""}`;
  };

  // Générer les dates de la timeline
  const timelineDates = Array.from({ length: 31 }, (_, i) =>
    addDays(startDate, i),
  );

  // Calculer la position en pourcentage pour une tâche
  const getTaskPosition = (dueDate: Date): number => {
    const totalDays = differenceInDays(endDate, startDate);
    const taskDays = differenceInDays(dueDate, startDate);
    return Math.max(0, Math.min(100, (taskDays / totalDays) * 100));
  };

  // Obtenir la classe CSS en fonction de la priorité
  const getPriorityColor = (priority: Task["priority"]): string => {
    switch (priority) {
      case "basse":
        return "bg-blue-500";
      case "moyenne":
        return "bg-green-500";
      case "haute":
        return "bg-orange-500";
      case "urgente":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  // Obtenir la classe CSS pour le texte en fonction de la priorité
  const getPriorityTextColor = (priority: Task["priority"]): string => {
    switch (priority) {
      case "basse":
        return "text-blue-700";
      case "moyenne":
        return "text-green-700";
      case "haute":
        return "text-orange-700";
      case "urgente":
        return "text-red-700";
      default:
        return "text-gray-700";
    }
  };

  return (
    <div className="h-[calc(100vh-180px)] overflow-y-auto p-4">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="mb-4 flex items-center text-lg font-medium">
          <Calendar size={18} className="mr-2 text-violet-500" />
          Chronologie des tâches (30 jours)
        </h2>

        {/* Timeline header avec les dates */}
        <div className="relative mb-2 h-10 border-b border-gray-200">
          <div className="absolute inset-0 flex">
            {timelineDates.map((date, index) => (
              <div
                key={index}
                className={`flex-1 text-center text-xs ${
                  format(date, "dd/MM") === format(today, "dd/MM")
                    ? "font-semibold text-violet-600"
                    : "text-gray-500"
                }`}
              >
                {index % 3 === 0 && (
                  <>
                    <div>{format(date, "dd")}</div>
                    <div>{format(date, "MMM", { locale: fr })}</div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Ligne verticale pour aujourd'hui */}
          <div
            className="absolute bottom-0 top-0 w-px bg-violet-500"
            style={{ left: `${(1 / 30) * 100}%` }}
          />
        </div>

        {/* Timeline des tâches */}
        <div className="space-y-3">
          {tasksWithDates.map((task) => {
            const dueDate = new Date(task.dueDate as Date);
            const position = getTaskPosition(dueDate);
            const isOverdue = isAfter(today, dueDate);
            const assignee = task.assigneeId
              ? project.team.find((member) => member.id === task.assigneeId)
              : undefined;

            return (
              <div
                key={task.id}
                className="relative h-16 rounded-md bg-gray-50"
              >
                {/* Point sur la timeline */}
                <div
                  className={`absolute top-0 h-4 w-4 rounded-full ${getPriorityColor(task.priority)} -mt-2`}
                  style={{ left: `${position}%` }}
                />

                {/* Ligne de la date d'échéance */}
                <div
                  className={`absolute bottom-0 top-0 w-px ${isOverdue ? "bg-red-500" : "bg-gray-300"}`}
                  style={{ left: `${position}%` }}
                />

                {/* Contenu de la tâche */}
                <div
                  className="absolute inset-0 flex cursor-pointer items-center rounded-md p-2 hover:bg-gray-100"
                  onClick={() => onTaskClick(task.id)}
                >
                  <div className="min-w-0">
                    <div className="flex items-center">
                      <span
                        className={`text-xs font-medium ${getPriorityTextColor(task.priority)}`}
                      >
                        {task.priority.charAt(0).toUpperCase() +
                          task.priority.slice(1)}
                      </span>

                      {isOverdue && (
                        <span className="ml-2 flex items-center text-xs text-red-500">
                          <AlertTriangle size={12} className="mr-1" />
                          En retard
                        </span>
                      )}

                      <span className="ml-2 text-xs text-gray-500">
                        {format(dueDate, "dd MMM yyyy", { locale: fr })}
                      </span>
                    </div>
                    <div className="truncate font-medium text-gray-900">
                      {task.title}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock size={12} className="mr-1" />
                      {formatTime(task.estimatedTime)}

                      {assignee && (
                        <div className="ml-3 flex items-center">
                          <img
                            src={assignee.avatar || "/placeholder.svg"}
                            alt={assignee.name}
                            className="mr-1 h-4 w-4 rounded-full"
                          />
                          {assignee.name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tâches sans date d'échéance */}
        {tasksWithoutDates.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-medium text-gray-700">
              Tâches sans date d'échéance ({tasksWithoutDates.length})
            </h3>
            <div className="rounded-md bg-gray-50 p-3">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {tasksWithoutDates.map((task) => (
                  <div
                    key={task.id}
                    className="cursor-pointer rounded-md bg-white p-2 shadow-sm hover:bg-gray-50"
                    onClick={() => onTaskClick(task.id)}
                  >
                    <div className="truncate font-medium text-gray-900">
                      {task.title}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <span
                        className={`mr-2 ${getPriorityTextColor(task.priority)}`}
                      >
                        {task.priority.charAt(0).toUpperCase() +
                          task.priority.slice(1)}
                      </span>
                      <Clock size={12} className="mr-1" />
                      {formatTime(task.estimatedTime)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineView;
