"use client";

import type React from "react";
import { useState } from "react";
import { FilterIcon } from "lucide-react";
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  PlayIcon,
  EllipsisHorizontalIcon,
  XMarkIcon,
  InformationCircleIcon,
  ArrowLeftIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetProjectLifecycleQuery,
  useGetAllProjectsStatsQuery,
} from "@/app/state/api";
import { useRouter } from "next/navigation";

// Couleurs personnalisées
const couleurPrimaire = "#b03ff3"; // Touche mauve
const vertAccent = "#4CAF50";
const orangeAccent = "#FF9800";
const bleuAccent = "#3B82F6"; // Pour harmoniser la palette

// Étiquettes de statut pour affichage
const libellesStatut: Record<string, string> = {
  all: "Tous",
  Terminé: "Terminée",
  "En cours": "En cours",
  "En révision": "En révision",
  "À faire": "À faire",
};

// Interfaces pour les données
interface Task {
  id: string | number;
  title: string;
  status: string;
  predictedDelay: number;
  confidenceLevel: number;
  progress: number;
  startDate: string;
  endDate: string;
  description?: string;
  assignee?: string;
  priority?: string;
}

interface Project {
  id: number;
  name: string;
  dateDebut: string;
  chefProjet: string;
  equipe: string;
  tasks: Task[];
}

// Fonction pour vérifier si une tâche est terminée
const isTaskCompleted = (status: string) => {
  return (
    status.toLowerCase() === "terminé" || status.toLowerCase() === "completed"
  );
};

// Composant affichant le cycle de vie d'un projet
function ProjectCycleCard({
  project,
  onBack,
}: {
  project: Project;
  onBack: () => void;
}) {
  const [filterStatus, setFilterStatus] = useState<
    "all" | "Terminé" | "En révision" | "En cours" | "À faire"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Calcul de la progression globale
  const overallProgress =
    project.tasks.length > 0
      ? Math.round(
          project.tasks.reduce((acc, task) => acc + task.progress, 0) /
            project.tasks.length,
        )
      : 0;

  // Filtrage des tâches
  const filteredTasks = project.tasks.filter((task) => {
    const statutOk =
      filterStatus === "all" ? true : task.status === filterStatus;
    const rechercheOk = task.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return statutOk && rechercheOk;
  });

  return (
    <section className="space-y-6 rounded-xl bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 p-6 shadow-2xl transition-all duration-300 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
      <button
        onClick={onBack}
        className="flex items-center text-sm text-purple-600 transition-colors hover:underline"
      >
        <ArrowLeftIcon className="mr-1 h-4 w-4" /> Retour à la liste des projets
      </button>
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center text-2xl font-bold text-slate-800 dark:text-white">
          <ArrowPathIcon
            className="mr-2 h-8 w-8"
            style={{ color: couleurPrimaire }}
          />
          {project.name}
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <p>Début : {project.dateDebut}</p>
          <p>Chef de projet : {project.chefProjet}</p>
          <p>Équipe : {project.equipe}</p>
        </div>
      </div>

      {/* Progression globale */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between rounded-lg bg-gray-100 p-4 shadow-md transition-all duration-300 dark:bg-slate-700"
      >
        <div className="flex items-center">
          <InformationCircleIcon
            className="mr-2 h-6 w-6"
            style={{ color: couleurPrimaire }}
          />
          <div className="text-slate-800 dark:text-white">
            <p className="text-sm">Progression globale</p>
            <p className="text-2xl font-bold">{overallProgress}%</p>
          </div>
        </div>
      </motion.div>

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex items-center">
          <FilterIcon className="absolute left-3 h-5 w-5 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher une tâche…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-lg border border-gray-300 py-3 pl-12 pr-4 text-lg transition-all duration-300 focus:outline-none focus:ring-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            style={
              { "--tw-ring-color": couleurPrimaire } as React.CSSProperties
            }
          />
        </div>
        <div className="flex flex-wrap gap-4">
          {(
            ["all", "Terminé", "En révision", "En cours", "À faire"] as const
          ).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={
                filterStatus === status
                  ? { backgroundColor: couleurPrimaire, color: "white" }
                  : {}
              }
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                filterStatus === status
                  ? ""
                  : "bg-purple-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300"
              }`}
            >
              {libellesStatut[status]}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline des tâches */}
      <div className="relative overflow-x-auto pb-4">
        <div className="grid min-w-[800px] grid-cols-1 gap-4 md:min-w-0 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTasks.map((task) => {
            const { border, bg, progress } = getStatusStyles(task.status);
            const taskCompleted = isTaskCompleted(task.status);

            return (
              <motion.div
                key={task.id}
                className="group relative cursor-pointer transition-transform duration-300"
                onClick={() => setSelectedTask(task)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.05 }}
              >
                <div
                  className={`border-2 p-4 ${border} rounded-lg transition-all duration-300 ${bg} hover:border-[${couleurPrimaire}] dark:hover:border-[${couleurPrimaire}]`}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(task.status)}
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                        {task.title}
                      </h3>
                    </div>
                    <span className={`h-3 w-3 rounded-full ${progress}`} />
                  </div>
                  <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                    {task.startDate} – {task.endDate}
                  </p>
                  {task.assignee && (
                    <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
                      Assigné à: {task.assignee}
                    </p>
                  )}
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <motion.div
                      className={`h-full rounded-full ${progress}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${task.progress}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                  {/* Affichage conditionnel du retard - seulement pour les tâches non terminées */}
                  {!taskCompleted && task.predictedDelay !== 0 && (
                    <div
                      className={`mt-2 flex items-center gap-2 ${task.predictedDelay > 0 ? "text-rose-600" : "text-green-600"}`}
                    >
                      {task.predictedDelay > 0 ? (
                        <>
                          <ExclamationTriangleIcon className="h-4 w-4" />
                          <span className="text-sm">
                            Retard: {task.predictedDelay} jour
                            {task.predictedDelay > 1 ? "s" : ""}
                          </span>
                        </>
                      ) : (
                        <>
                          <CalendarIcon className="h-4 w-4" />
                          <span className="text-sm">
                            Reste: {Math.abs(task.predictedDelay)} jour
                            {Math.abs(task.predictedDelay) > 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  {/* Affichage pour les tâches terminées */}
                  {taskCompleted && (
                    <div className="mt-2 flex items-center gap-2 text-green-600">
                      <CheckCircleIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Tâche terminée
                      </span>
                    </div>
                  )}
                </div>
                {/* Info-bulle */}
                {task.description && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="max-w-xs rounded bg-white p-2 text-xs text-slate-800 shadow-md dark:bg-slate-700 dark:text-slate-200">
                      {task.description}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Légende */}
      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-200">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-green-400" /> Terminée
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-blue-400" /> En révision
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: couleurPrimaire }}
          />{" "}
          En cours
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-gray-300" /> À faire
        </div>
      </div>

      {/* Modal détails tâche */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-800"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <button
                onClick={() => setSelectedTask(null)}
                className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-slate-800 dark:text-white">
                {getStatusIcon(selectedTask.status)}
                <span className="ml-2">{selectedTask.title}</span>
              </h2>
              <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
                Statut :{" "}
                <span className="font-medium">
                  {libellesStatut[selectedTask.status]}
                </span>
              </p>
              <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
                Période : {selectedTask.startDate} – {selectedTask.endDate}
              </p>
              <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
                Progression : {selectedTask.progress}%
              </p>
              {selectedTask.assignee && (
                <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
                  Assigné à : {selectedTask.assignee}
                </p>
              )}
              {selectedTask.priority && (
                <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
                  Priorité : {selectedTask.priority}
                </p>
              )}
              {/* Affichage conditionnel du retard dans le modal - seulement pour les tâches non terminées */}
              {!isTaskCompleted(selectedTask.status) &&
                selectedTask.predictedDelay !== 0 && (
                  <p
                    className={`mb-2 text-sm ${selectedTask.predictedDelay > 0 ? "text-rose-600" : "text-green-600"}`}
                  >
                    {selectedTask.predictedDelay > 0 ? (
                      <>
                        Retard : {selectedTask.predictedDelay} jour
                        {selectedTask.predictedDelay > 1 ? "s" : ""}
                      </>
                    ) : (
                      <>
                        Reste : {Math.abs(selectedTask.predictedDelay)} jour
                        {Math.abs(selectedTask.predictedDelay) > 1 ? "s" : ""}
                      </>
                    )}
                    <span className="ml-2 text-xs text-slate-500">
                      (confiance: {selectedTask.confidenceLevel}%)
                    </span>
                  </p>
                )}
              {/* Message pour les tâches terminées */}
              {isTaskCompleted(selectedTask.status) && (
                <p className="mb-2 text-sm font-medium text-green-600">
                  ✅ Tâche terminée avec succès
                </p>
              )}
              {selectedTask.description && (
                <div className="mt-4">
                  <h3 className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Description:
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {selectedTask.description}
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// Liste des projets
function ProjectList({ onSelect }: { onSelect: (projectId: number) => void }) {
  const {
    data: projectsData,
    isLoading,
    error,
  } = useGetAllProjectsStatsQuery({});

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 p-6 shadow-2xl dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !projectsData) {
    return (
      <div className="rounded-xl bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 p-6 shadow-2xl dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
        <h1 className="text-xl text-red-500">
          Erreur lors du chargement des projets
        </h1>
      </div>
    );
  }

  // Vérifier si nous avons des projets
  if (!projectsData.projects || projectsData.projects.length === 0) {
    return (
      <div className="rounded-xl bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 p-6 shadow-2xl dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
        <h1 className="text-xl font-bold">Aucun projet approuvé disponible</h1>
        <p className="mt-2">
          Vous n'avez pas encore de projets approuvés pour visualiser leur cycle
          de vie.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-xl bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 p-6 shadow-2xl transition-all duration-300 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
      <h1 className="flex items-center bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-4xl font-extrabold text-transparent">
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: couleurPrimaire + "20" }}
        />
        <span className="ml-4">
          Sélectionnez un projet pour voir son cycle de vie
        </span>
      </h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projectsData.projects.map((project: any) => (
          <motion.div
            key={project.id}
            whileHover={{ scale: 1.03 }}
            onClick={() => onSelect(project.id)}
            className="cursor-pointer rounded-2xl border border-transparent bg-white p-6 shadow-xl transition-all duration-300 hover:border-2 hover:border-[#b03ff3] dark:bg-slate-700"
          >
            <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
              {project.name}
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <p>Début : {project.start_date}</p>
              <p>Chef : {project.manager?.name || "Non assigné"}</p>
              <p>Équipe : {project.team} membres</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Styles dynamiques selon le statut
const getStatusStyles = (status: string) => {
  switch (status.toLowerCase()) {
    case "terminé":
      return {
        border: "border-green-300 dark:border-green-400",
        bg: "bg-green-50 dark:bg-green-900/20",
        progress: "bg-green-400",
      };
    case "en révision":
      return {
        border: "border-blue-300 dark:border-blue-400",
        bg: "bg-blue-50 dark:bg-blue-900/20",
        progress: "bg-blue-400",
      };
    case "en cours":
      return {
        border: "border-purple-300 dark:border-purple-400",
        bg: "bg-purple-50 dark:bg-purple-900/20",
        progress: "bg-purple-400",
      };
    case "à faire":
      return {
        border: "border-gray-200 dark:border-slate-700",
        bg: "bg-gray-50 dark:bg-slate-700",
        progress: "bg-gray-300",
      };
    default:
      return {
        border: "border-gray-200 dark:border-slate-700",
        bg: "bg-gray-50 dark:bg-slate-700",
        progress: "bg-gray-300",
      };
  }
};

// Icône selon le statut de la tâche
const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case "terminé":
      return (
        <CheckCircleIcon className="h-5 w-5" style={{ color: vertAccent }} />
      );
    case "en révision":
      return (
        <ArrowPathIcon className="h-5 w-5" style={{ color: bleuAccent }} />
      );
    case "en cours":
      return (
        <PlayIcon className="h-5 w-5" style={{ color: couleurPrimaire }} />
      );
    case "à faire":
      return <EllipsisHorizontalIcon className="h-5 w-5 text-gray-500" />;
    default:
      return <EllipsisHorizontalIcon className="h-5 w-5 text-gray-500" />;
  }
};

// Composant principal
export default function GlobalProjectDashboard() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null,
  );
  const {
    data: projectData,
    isLoading,
    error,
  } = useGetProjectLifecycleQuery(selectedProjectId || 0, {
    skip: !selectedProjectId,
  });
  const router = useRouter();

  if (selectedProjectId && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6 dark:bg-gray-900">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-purple-500"></div>
      </div>
    );
  }

  // Gérer l'erreur spécifique pour les projets en attente d'approbation
  if (selectedProjectId && error) {
    const errorData = error as any;
    const errorMessage =
      errorData?.data?.message ||
      "Erreur lors du chargement des données du projet";

    return (
      <div className="min-h-screen bg-gray-100 p-6 dark:bg-gray-900">
        <div className="rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
          <h2 className="text-xl text-red-500">{errorMessage}</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            {errorData?.status === 400
              ? "Ce projet est en attente d'approbation par l'administrateur et n'a pas encore de cycle de vie."
              : "Veuillez réessayer plus tard ou contacter l'administrateur."}
          </p>
          <button
            onClick={() => setSelectedProjectId(null)}
            className="mt-4 rounded-lg bg-purple-500 px-4 py-2 text-white hover:bg-purple-600"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 transition-colors duration-300 dark:bg-gray-900">
      {!selectedProjectId ? (
        <ProjectList onSelect={(id) => setSelectedProjectId(id)} />
      ) : projectData ? (
        <ProjectCycleCard
          project={projectData}
          onBack={() => setSelectedProjectId(null)}
        />
      ) : (
        <div className="rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
          <h2 className="text-xl text-red-500">
            Erreur lors du chargement des données du projet
          </h2>
          <button
            onClick={() => setSelectedProjectId(null)}
            className="mt-4 rounded-lg bg-purple-500 px-4 py-2 text-white hover:bg-purple-600"
          >
            Retour à la liste
          </button>
        </div>
      )}
    </div>
  );
}
