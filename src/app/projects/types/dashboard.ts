import type React from "react"
export interface Task {
  id: number
  title: string
  description: string
  status: string
  priority: string
  dueDate: string
  userId: number
  projectId: number
  columnName?: string
}

export interface Project {
  id: number
  title: string
  description: string
  startDate: string
  endDate?: string
  clerkUserId: string
  status: string
  progress: number
  isActive?: boolean
}

export interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
  onClick?: () => void
}
