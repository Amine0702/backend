/**
 * Converts a backend task to the frontend task format
 */

interface BackendTask {
  id: number
  title: string
  description: string
  status: string
  priority: string
  assignee_id?: number
  estimated_time: number
  actual_time: number
  due_date?: string | null
  started_at?: string | null
  completed_at?: string | null
  timer_active: number
  tags: string[]
  attachments: {
    id: number
    name: string
    type: string
    url: string
    size: number
  }[]
  comments: {
    id: number
    author_id: number
    text: string
    created_at: string
  }[]
}

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  assigneeId?: string
  estimatedTime: number
  actualTime: number
  dueDate?: Date
  startedAt?: Date
  completedAt?: Date
  timerActive: boolean
  tags: string[]
  attachments: {
    id: string
    name: string
    type: string
    url: string
    size: number
  }[]
  comments: {
    id: string
    authorId: string
    text: string
    createdAt: Date
  }[]
}

export function convertBackendTask(backendTask: BackendTask): Task {
  // Vérifier et convertir les valeurs pour éviter les erreurs
  const actualTime = typeof backendTask.actual_time === "number" ? backendTask.actual_time : 0
  const estimatedTime = typeof backendTask.estimated_time === "number" ? backendTask.estimated_time : 0
  const timerActive = Boolean(backendTask.timer_active)

  // Convertir les dates de manière sécurisée
  const convertDate = (dateStr: string | null | undefined): Date | undefined => {
    if (!dateStr) return undefined
    try {
      const date = new Date(dateStr)
      return isNaN(date.getTime()) ? undefined : date
    } catch (e) {
      console.error("Erreur de conversion de date:", e)
      return undefined
    }
  }

  return {
    id: backendTask.id.toString(),
    title: backendTask.title,
    description: backendTask.description,
    status: backendTask.status,
    priority: backendTask.priority,
    assigneeId: backendTask.assignee_id?.toString(),
    estimatedTime: estimatedTime,
    actualTime: actualTime,
    dueDate: convertDate(backendTask.due_date),
    startedAt: convertDate(backendTask.started_at),
    completedAt: convertDate(backendTask.completed_at),
    timerActive: timerActive,
    tags: Array.isArray(backendTask.tags) ? backendTask.tags : [],
    attachments: Array.isArray(backendTask.attachments)
      ? backendTask.attachments.map((att) => ({
          id: att.id.toString(),
          name: att.name,
          type: att.type,
          url: att.url,
          size: att.size,
        }))
      : [],
    comments: Array.isArray(backendTask.comments)
      ? backendTask.comments.map((comment) => ({
          id: comment.id.toString(),
          authorId: comment.author_id.toString(),
          text: comment.text,
          createdAt: new Date(comment.created_at),
        }))
      : [],
  }
}
