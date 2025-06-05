import type { Task } from "@/app/projects/types/dashboard"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Add these utility functions to better handle the Kanban data structure

// Calculate task priority distribution
export const calculateTaskPriorityDistribution = (tasks: Task[]) => {
  const priorityCounts = {
    URGENT: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  }

  tasks.forEach((task) => {
    if (priorityCounts[task.priority as keyof typeof priorityCounts] !== undefined) {
      priorityCounts[task.priority as keyof typeof priorityCounts]++
    }
  })

  return [
    { name: "Urgente", count: priorityCounts.URGENT, color: "#ef4444" }, // Violet pour URGENT
    { name: "Haute", count: priorityCounts.HIGH, color: "#f97316" }, // Rouge pour HIGH
    { name: "Moyenne", count: priorityCounts.MEDIUM, color: "#f59e0b" }, // Ambre pour MEDIUM
    { name: "Basse", count: priorityCounts.LOW, color: "#10b981" }, // Vert pour LOW
  ]
}

// Calculate project status distribution
export function calculateProjectStatus(projects: any[]) {
  const statusCounts = {
    ACTIF: 0,
    TERMINÉ: 0,
  }

  projects.forEach((project) => {
    const status = project.status || "ACTIF"
    if (statusCounts.hasOwnProperty(status)) {
      statusCounts[status as keyof typeof statusCounts]++
    }
  })

  return [
    { name: "Actifs", count: statusCounts.ACTIF, color: "#3b82f6" },
    { name: "Terminés", count: statusCounts.TERMINÉ, color: "#10b981" },
  ]
}

// Calculate dashboard statistics
export function calculateDashboardStats(tasks: any[], projects: any[]) {
  const activeProjects = projects.filter((p) => !p.endDate).length
  const totalProjects = projects.length

  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length
  const totalTasks = tasks.length

  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const urgentTasks = tasks.filter((t) => t.priority === "HIGH").length

  return {
    activeProjects,
    totalProjects,
    taskCompletionRate,
    urgentTasks,
  }
}

// Get upcoming tasks (due in the next 7 days)
export function getUpcomingTasks(tasks: any[]) {
  const now = new Date()
  const sevenDaysLater = new Date()
  sevenDaysLater.setDate(now.getDate() + 7)

  return tasks
    .filter((task) => {
      if (!task.dueDate) return false
      const dueDate = new Date(task.dueDate)
      return dueDate >= now && dueDate <= sevenDaysLater
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5) // Get top 5 upcoming tasks
}

// Ajoutons ou modifions la fonction formatDateFr pour qu'elle gère mieux les valeurs nulles ou undefined

export const formatDateFr = (dateString: string | null | undefined): string => {
  if (!dateString) return "Non définie"

  try {
    const date = new Date(dateString)
    // Vérifier si la date est valide
    if (isNaN(date.getTime())) return "Non définie"

    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch (error) {
    console.error("Erreur lors du formatage de la date:", error)
    return "Non définie"
  }
}

// Translate status and priority values to French
export function translateStatus(status: string) {
  const translations: Record<string, string> = {
    // Status translations
    PENDING: "En attente",
    IN_PROGRESS: "En cours",
    COMPLETED: "Terminé",

    // Priority translations
    URGENT: "Urgente",
    HIGH: "Haute",
    MEDIUM: "Moyenne",
    LOW: "Basse",

    // French status values (already translated)
    à_faire: "À faire",
    en_cours: "En cours",
    en_révision: "En révision",
    terminé: "Terminé",

    // French priority values (already translated)
    basse: "Basse",
    moyenne: "Moyenne",
    haute: "Haute",
    urgente: "Urgente",
  }

  return translations[status] || status
}

// Get project by ID
export function getProjectById(projectId: number, projects: any[]) {
  return projects.find((p) => p.id === projectId)
}

// Ajoutez cette fonction pour obtenir la couleur de statut en fonction du nom de colonne
export function getStatusColorClass(status: string, columnName?: string): string {
  const statusLower = (status || "").toLowerCase()
  const columnLower = (columnName || "").toLowerCase()

  if (statusLower.includes("termin") || statusLower === "completed" || columnLower.includes("termin")) {
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
  } else if (statusLower.includes("cours") || statusLower === "in_progress" || columnLower.includes("cours")) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
  } else if (statusLower.includes("révision") || columnLower.includes("révision")) {
    return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
  } else {
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
  }
}
