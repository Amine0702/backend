"use client"

import { formatDateFr, translateStatus } from "@/lib/utils"
import DashboardCard from "./DashboardCard"
import type { Task, Project } from "@/app/projects/types/dashboard"

interface PriorityTaskListProps {
  tasks: Task[]
  projects: Project[]
  onTaskClick: (taskId: number) => void
}

const PriorityTaskList = ({ tasks, projects, onTaskClick }: PriorityTaskListProps) => {
  // Trier les tâches par priorité (URGENT d'abord, puis HIGH)
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.priority === "URGENT" && b.priority !== "URGENT") return -1
    if (a.priority !== "URGENT" && b.priority === "URGENT") return 1
    return 0
  })

  return (
    <DashboardCard title="Tâches prioritaires et urgentes">
      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
        {sortedTasks.length > 0 ? (
          sortedTasks.map((task) => {
            const project = projects.find((p) => p.id === task.projectId)
            return (
              <div
                key={task.id}
                className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => onTaskClick(task.id)}
              >
                <div
                  className={`mt-1 h-3 w-3 flex-shrink-0 rounded-full ${
                    task.priority === "URGENT"
                      ? "bg-red-500"
                      : task.priority === "HIGH"
                        ? "bg-orange-500"
                        : task.priority === "MEDIUM"
                          ? "bg-amber-500"
                          : "bg-green-500"
                  }`}
                />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{task.title}</h4>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {project ? project.title : "Projet inconnu"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        task.priority === "URGENT"
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          : task.priority === "HIGH"
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                            : task.priority === "MEDIUM"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      }`}
                    >
                      {translateStatus(task.priority)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">Échéance: {formatDateFr(task.dueDate)}</div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-[250px] text-gray-500">
            <p className="text-center">Aucune tâche prioritaire ou urgente</p>
          </div>
        )}
      </div>
    </DashboardCard>
  )
}

export default PriorityTaskList
