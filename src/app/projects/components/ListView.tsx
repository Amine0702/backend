"use client";

import type React from "react";
import type { Project, Task } from "../types/kanban";
import { Clock, Calendar, MessageSquare, Paperclip } from "lucide-react";
import { format, isAfter } from "date-fns";
import { fr } from "date-fns/locale";

interface ListViewProps {
  project: Project;
  onTaskClick: (taskId: string) => void;
}

const ListView: React.FC<ListViewProps> = ({ project, onTaskClick }) => {
  // Rassembler toutes les tâches dans un seul tableau
  const allTasks = project.columns.flatMap((col) =>
    col.tasks.map((task) => ({ ...task, columnTitle: col.title })),
  );

  // Formatage du temps
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}m` : ""}`;
  };

  // Obtenir la classe CSS en fonction de la priorité
  const getPriorityClass = (priority: Task["priority"]): string => {
    switch (priority) {
      case "basse":
        return "bg-blue-100 text-blue-700";
      case "moyenne":
        return "bg-green-100 text-green-700";
      case "haute":
        return "bg-orange-100 text-orange-700";
      case "urgente":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Obtenir la classe CSS en fonction de l'état
  const getStatusClass = (status: Task["status"]): string => {
    switch (status) {
      case "a_faire":
        return "bg-blue-100 text-blue-700";
      case "en_cours":
        return "bg-violet-100 text-violet-700";
      case "en_revision":
        return "bg-yellow-100 text-yellow-700";
      case "termine":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Formater l'état pour l'affichage
  const formatStatus = (status: Task["status"]): string => {
    switch (status) {
      case "à_faire":
        return "À faire";
      case "en_cours":
        return "En cours";
      case "en_révision":
        return "En révision";
      case "terminé":
        return "Terminé";
      default:
        return status;
    }
  };

  return (
    <div className="h-[calc(100vh-180px)] overflow-y-auto p-4">
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Tâche
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                État
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Priorité
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Assigné à
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Temps
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Échéance
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Détails
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {allTasks.map((task) => {
              const assignee = task.assigneeId
                ? project.team.find((member) => member.id === task.assigneeId)
                : undefined;

              return (
                <tr
                  key={task.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => onTaskClick(task.id)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-start">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {task.title}
                        </div>
                        <div className="line-clamp-1 text-sm text-gray-500">
                          {task.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${getStatusClass(task.status)}`}
                    >
                      {formatStatus(task.status)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${getPriorityClass(task.priority)}`}
                    >
                      {task.priority.charAt(0).toUpperCase() +
                        task.priority.slice(1)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {assignee ? (
                      <div className="flex items-center">
                        <div className="h-8 w-8 flex-shrink-0">
                          <img
                            src={assignee.avatar || "/placeholder.svg"}
                            alt={assignee.name}
                            className="h-8 w-8 rounded-full"
                          />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {assignee.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {assignee.role}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Non assigné</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock size={14} className="mr-1" />
                      <span>
                        {formatTime(task.estimatedTime)}
                        {task.actualTime > 0 &&
                          ` / ${formatTime(task.actualTime)}`}
                        {task.timerActive && (
                          <span className="relative ml-2 inline-block flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500"></span>
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {task.dueDate ? (
                      <div
                        className={`flex items-center text-sm ${
                          isAfter(new Date(), new Date(task.dueDate))
                            ? "text-red-500"
                            : "text-gray-500"
                        }`}
                      >
                        <Calendar size={14} className="mr-1" />
                        {format(new Date(task.dueDate), "dd MMM yyyy", {
                          locale: fr,
                        })}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Non définie</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      {task.comments.length > 0 && (
                        <div
                          className="flex items-center"
                          title={`${task.comments.length} commentaire(s)`}
                        >
                          <MessageSquare size={14} className="mr-1" />
                          {task.comments.length}
                        </div>
                      )}
                      {task.attachments.length > 0 && (
                        <div
                          className="flex items-center"
                          title={`${task.attachments.length} pièce(s) jointe(s)`}
                        >
                          <Paperclip size={14} className="mr-1" />
                          {task.attachments.length}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListView;
