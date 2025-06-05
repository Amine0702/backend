"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/app/(components)/ui/button"
import type { Task, Project } from "@/app/projects/types/dashboard"
import { Textarea } from "@/app/(components)/ui/textarea"

interface TaskEditorProps {
  task: Task
  projects: Project[]
  onClose: () => void
  onSave: (updatedTask: Task) => void
}

const TaskEditor = ({ task, projects, onClose, onSave }: TaskEditorProps) => {
  const [formData, setFormData] = useState<Task>({ ...task })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    onClose()
  }

  const inputStyles =
    "w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="title" className="block text-sm font-medium">
          Titre
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className={inputStyles}
          value={formData.title}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium">
          Description
        </label>
        <Textarea
          id="description"
          name="description"
          className={inputStyles}
          value={formData.description}
          onChange={handleChange}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="status" className="block text-sm font-medium">
            Statut
          </label>
          <select id="status" name="status" className={inputStyles} value={formData.status} onChange={handleChange}>
            <option value="BACKLOG">À faire</option>
            <option value="PENDING">En attente</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="COMPLETED">Terminé</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="priority" className="block text-sm font-medium">
            Priorité
          </label>
          <select
            id="priority"
            name="priority"
            className={inputStyles}
            value={formData.priority}
            onChange={handleChange}
          >
            <option value="LOW">Faible</option>
            <option value="MEDIUM">Moyenne</option>
            <option value="HIGH">Haute</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="dueDate" className="block text-sm font-medium">
            Date d'échéance
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            className={inputStyles}
            value={formData.dueDate.split("T")[0]}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="projectId" className="block text-sm font-medium">
            Projet
          </label>
          <select
            id="projectId"
            name="projectId"
            className={inputStyles}
            value={formData.projectId}
            onChange={(e) => setFormData((prev) => ({ ...prev, projectId: Number.parseInt(e.target.value) }))}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
          Enregistrer
        </Button>
      </div>
    </form>
  )
}

export default TaskEditor
