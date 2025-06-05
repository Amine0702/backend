"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import { useGetAIGeneratedTasksQuery } from "@/app/state/api";

const primaryColor = "#b03ff3";

interface AIGeneratedTask {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  assignee: {
    id: number;
    name: string;
    avatar: string;
  } | null;
  project: {
    id: number;
    name: string;
  } | null;
  column: {
    id: number;
    title: string;
  };
  tags: string[];
}

type Project = {
  id: number;
  name: string;
  tasks: AIGeneratedTask[];
};

const ProjectList = ({
  projects,
  onSelect,
  isLoading,
}: {
  projects: Project[];
  onSelect: (projet: Project) => void;
  isLoading: boolean;
}) => {
  if (isLoading) {
    return (
      <div className="space-y-6 rounded-xl bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 p-6 shadow-2xl transition-all duration-300 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
        <h1 className="flex items-center bg-gradient-to-r from-[#b03ff3] to-blue-500 bg-clip-text text-4xl font-extrabold text-transparent">
          <div
            className="rounded-xl p-3"
            style={{ backgroundColor: primaryColor + "20" }}
          ></div>
          <span className="ml-4">Chargement des projets...</span>
        </h1>
        <div className="flex h-40 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-6 rounded-xl bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 p-6 shadow-2xl transition-all duration-300 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
        <h1 className="flex items-center bg-gradient-to-r from-[#b03ff3] to-blue-500 bg-clip-text text-4xl font-extrabold text-transparent">
          <div
            className="rounded-xl p-3"
            style={{ backgroundColor: primaryColor + "20" }}
          ></div>
          <span className="ml-4">Journal d'activité IA</span>
        </h1>
        <div className="py-10 text-center">
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Aucune tâche générée par IA n'a été trouvée. Essayez de créer une
            tâche avec l'assistant IA.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-xl bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 p-6 shadow-2xl transition-all duration-300 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
      <h1 className="flex items-center bg-gradient-to-r from-[#b03ff3] to-blue-500 bg-clip-text text-4xl font-extrabold text-transparent">
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: primaryColor + "20" }}
        ></div>
        <span className="ml-4">Journal d'activité IA</span>
      </h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((projet) => (
          <motion.div
            key={projet.id}
            whileHover={{ scale: 1.03 }}
            onClick={() => onSelect(projet)}
            className="cursor-pointer rounded-2xl border border-transparent bg-gray-50 p-6 shadow-xl transition hover:border-[3px] hover:border-[#b03ff3] dark:bg-slate-700 dark:text-white"
          >
            <h3 className="mb-2 text-xl font-bold">{projet.name}</h3>
            <p className="text-sm">
              Tâches générées par IA: {projet.tasks.length}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const ProjectLogs = ({
  projet,
  onBack,
}: {
  projet: Project;
  onBack: () => void;
}) => {
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<AIGeneratedTask | null>(null);

  const filteredLogs = projet.tasks.filter((task) => {
    const matchesSearch = task.title
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesDate = dateFilter
      ? new Date(task.created_at).toDateString() ===
        new Date(dateFilter).toDateString()
      : true;
    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6 rounded-xl bg-white p-6 shadow-2xl transition-all duration-300 dark:bg-slate-800">
      <button
        onClick={onBack}
        className="flex items-center text-sm text-primary transition-colors hover:underline dark:text-white"
      >
        <ArrowLeftIcon className="mr-1 h-4 w-4" /> Retour aux projets
      </button>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h2 className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-3xl font-bold text-transparent">
          Tâches générées par IA - {projet.name}
        </h2>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher une tâche..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 transition-all duration-300 focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-500" />
            <input
              type="date"
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 focus:ring-2 focus:ring-[#b03ff3] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((task) => (
            <motion.div
              key={task.id}
              whileHover={{ scale: 1.01 }}
              className="cursor-pointer rounded-lg border border-gray-100 bg-gray-50 p-4 transition-all duration-300 hover:shadow-lg dark:border-gray-600 dark:bg-slate-700"
              onClick={() => setSelectedLog(task)}
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full">
                  <img
                    src={
                      task.assignee?.avatar ||
                      "https://api.dicebear.com/7.x/avataaars/svg?seed=AI"
                    }
                    alt={task.assignee?.name || "IA"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-grow">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>
                      {new Date(task.created_at).toLocaleString("fr-FR")}
                    </span>
                    <span>•</span>
                    <span>{task.assignee?.name || "Non assigné"}</span>
                    <span>•</span>
                    <span className="capitalize">{task.priority}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <p className="py-8 text-center text-gray-500 dark:text-gray-400">
            Aucune tâche trouvée
          </p>
        )}
      </div>

      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center gap-4">
                <div className="h-12 w-12 overflow-hidden rounded-full">
                  <img
                    src={
                      selectedLog.assignee?.avatar ||
                      "https://api.dicebear.com/7.x/avataaars/svg?seed=AI"
                    }
                    alt={selectedLog.assignee?.name || "IA"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedLog.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(selectedLog.created_at).toLocaleString("fr-FR")} •{" "}
                    {selectedLog.assignee?.name || "Non assigné"}
                  </p>
                </div>
              </div>
              <div className="mb-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    {selectedLog.status}
                  </span>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {selectedLog.priority}
                  </span>
                  {selectedLog.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {selectedLog.description}
                </div>
              </div>
              <div className="mb-6 rounded-lg bg-gray-100 p-3 dark:bg-slate-700">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Colonne: {selectedLog.column.title}
                </p>
              </div>
              <button
                className="w-full rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors duration-300 hover:bg-purple-700"
                onClick={() => setSelectedLog(null)}
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Dashboard() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const { data, isLoading, error } = useGetAIGeneratedTasksQuery();

  // Group tasks by project
  const projectsWithTasks: Project[] = [];

  if (data?.tasks) {
    // Create a map to group tasks by project
    const projectMap = new Map<number, Project>();

    data.tasks.forEach((task: AIGeneratedTask) => {
      if (task.project) {
        const projectId = task.project.id;

        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, {
            id: projectId,
            name: task.project.name,
            tasks: [],
          });
        }

        projectMap.get(projectId)?.tasks.push(task);
      }
    });

    // Convert map to array
    projectMap.forEach((project) => {
      projectsWithTasks.push(project);
    });
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 transition-colors duration-300 dark:bg-slate-900">
        <div className="rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-800">
          <h1 className="mb-4 text-2xl font-bold text-red-600">Erreur</h1>
          <p className="text-gray-700 dark:text-gray-300">
            Une erreur s'est produite lors du chargement des données. Veuillez
            réessayer plus tard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 transition-colors duration-300 dark:bg-slate-900">
      {!selectedProject ? (
        <ProjectList
          projects={projectsWithTasks}
          onSelect={(projet) => setSelectedProject(projet)}
          isLoading={isLoading}
        />
      ) : (
        <ProjectLogs
          projet={selectedProject}
          onBack={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
}
