"use client";

import type React from "react";
import { useState } from "react";
import type { Project, Task } from "../types/kanban";
import { Clock, Calendar, ArrowUp, ArrowDown, Search } from "lucide-react";
import { format, isAfter } from "date-fns";
import { fr } from "date-fns/locale";

interface TableViewProps {
  project: Project;
  onTaskClick: (taskId: string) => void;
}

type SortField =
  | "title"
  | "priority"
  | "status"
  | "assignee"
  | "time"
  | "dueDate";
type SortDirection = "asc" | "desc";

// Définir des types plus précis pour les valeurs possibles
type TaskPriority = "urgente" | "haute" | "moyenne" | "basse";
type TaskStatus =
  | "à_faire"
  | "en_cours"
  | "en_révision"
  | "terminé"
  | "a_faire"
  | "en_revision"
  | "termine";

const TableView: React.FC<TableViewProps> = ({ project, onTaskClick }) => {
  const [sortField, setSortField] = useState<SortField>("dueDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchTerm, setSearchTerm] = useState("");

  // Rassembler toutes les tâches dans un seul tableau
  const allTasks = project.columns.flatMap((col) =>
    col.tasks.map((task) => ({ ...task, columnTitle: col.title })),
  );

  // Filtrer les tâches en fonction du terme de recherche
  const filteredTasks = allTasks.filter(
    (task) =>
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );

  // Trier les tâches
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
      case "priority":
        const priorityOrder: Record<TaskPriority, number> = {
          urgente: 3,
          haute: 2,
          moyenne: 1,
          basse: 0,
        };
        comparison =
          (priorityOrder[a.priority as TaskPriority] || 0) -
          (priorityOrder[b.priority as TaskPriority] || 0);
        break;
      case "status":
        const statusOrder: Record<TaskStatus, number> = {
          à_faire: 0,
          a_faire: 0,
          en_cours: 1,
          en_révision: 2,
          en_revision: 2,
          terminé: 3,
          termine: 3,
        };
        comparison =
          (statusOrder[a.status as TaskStatus] || 0) -
          (statusOrder[b.status as TaskStatus] || 0);
        break;
      case "assignee":
        const aName = a.assigneeId
          ? project.team.find((m) => m.id === a.assigneeId)?.name || ""
          : "";
        const bName = b.assigneeId
          ? project.team.find((m) => m.id === b.assigneeId)?.name || ""
          : "";
        comparison = aName.localeCompare(bName);
        break;
      case "time":
        comparison = a.estimatedTime - b.estimatedTime;
        break;
      case "dueDate":
        if (a.dueDate && b.dueDate) {
          comparison =
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        } else if (a.dueDate) {
          comparison = -1;
        } else if (b.dueDate) {
          comparison = 1;
        }
        break;
      default:
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Changer le tri
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Format du temps (minutes -> heures/minutes)
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}m` : ""}`;
  };

  // Obtenir l'icône de tri
  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return null;

    return sortDirection === "asc" ? (
      <ArrowUp size={14} className="ml-1" />
    ) : (
      <ArrowDown size={14} className="ml-1" />
    );
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
      case "à_faire":
        return "bg-blue-100 text-blue-700";
      case "en_cours":
        return "bg-violet-100 text-violet-700";
      case "en_revision":
      case "en_révision":
        return "bg-yellow-100 text-yellow-700";
      case "termine":
      case "terminé":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Formater l'état pour l'affichage
  const formatStatus = (status: Task["status"]): string => {
    switch (status) {
      case "à_faire":
      case "a_faire":
        return "À faire";
      case "en_cours":
        return "En cours";
      case "en_révision":
      case "en_revision":
        return "En révision";
      case "terminé":
      case "termine":
        return "Terminé";
      default:
        return status;
    }
  };

  return (
    <div className="h-[calc(100vh-180px)] overflow-y-auto p-4">
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="border-b p-4">
          <div className="flex items-center">
            <div className="relative max-w-lg flex-grow">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400"
              />
              <input
                type="text"
                placeholder="Rechercher des tâches..."
                className="w-full rounded-md border py-2 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-violet-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="ml-4 text-sm text-gray-600">
              {filteredTasks.length} tâche
              {filteredTasks.length !== 1 ? "s" : ""} trouvée
              {filteredTasks.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                onClick={() => handleSort("title")}
              >
                <div className="flex items-center">
                  Tâche {getSortIcon("title")}
                </div>
              </th>
              <th
                scope="col"
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center">
                  État {getSortIcon("status")}
                </div>
              </th>
              <th
                scope="col"
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                onClick={() => handleSort("priority")}
              >
                <div className="flex items-center">
                  Priorité {getSortIcon("priority")}
                </div>
              </th>
              <th
                scope="col"
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                onClick={() => handleSort("assignee")}
              >
                <div className="flex items-center">
                  Assigné à {getSortIcon("assignee")}
                </div>
              </th>
              <th
                scope="col"
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                onClick={() => handleSort("time")}
              >
                <div className="flex items-center">
                  Temps {getSortIcon("time")}
                </div>
              </th>
              <th
                scope="col"
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                onClick={() => handleSort("dueDate")}
              >
                <div className="flex items-center">
                  Échéance {getSortIcon("dueDate")}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {sortedTasks.map((task) => {
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
                        <div className="mt-1 flex flex-wrap gap-1">
                          {task.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700"
                            >
                              {tag}
                            </span>
                          ))}
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
                      </span>
                      {task.timerActive && (
                        <span className="relative ml-2 inline-block flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500"></span>
                        </span>
                      )}
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
                </tr>
              );
            })}

            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <Search size={24} className="mb-2 text-gray-400" />
                    <p>Aucune tâche trouvée</p>
                    {searchTerm && (
                      <p className="mt-1 text-sm">
                        Essayez de modifier votre recherche ou d'effacer les
                        filtres
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableView;
