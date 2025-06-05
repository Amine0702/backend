"use client";

import { type JSX, useState, useEffect } from "react";
import {
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  TableCellsIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";
import { motion } from "framer-motion";
import {
  useGetAllProjectsStatsQuery,
  useGetProjectTaskAnalysisQuery,
} from "@/app/state/api";

// Palette de couleurs
const primaryColor = "#b03ff3"; // mauve dominant
const accentYellow = "#FFC107";
const accentGreen = "#4CAF50";
const accentOrange = "#FF9800";

// Définition du type Task
type Task = {
  id: number;
  title: string;
  status: "on-track" | "risk" | "delayed" | "completed" | "active" | "planned";
  predictedDelay?: number;
  confidenceLevel?: number;
  duration?: number;
  issues?: number;
  progress?: number;
  startDate?: string;
  endDate?: string;
  description?: string;
  assignee?: string;
  priority?: string;
};

// Définition du type Projet
type Projet = {
  id: number;
  name: string;
  dateDebut: string;
  chefProjet: string;
  equipe: string;
  tasks?: Task[];
};

// Fonction pour vérifier si une tâche est terminée
const isTaskCompleted = (status: Task["status"]) => {
  return status === "completed";
};

// Modifier le composant RiskBadge pour afficher correctement les statuts
const RiskBadge = ({ status }: { status: Task["status"] }) => {
  const statusConfig = {
    "on-track": {
      color: "bg-green-100 text-green-800",
      label: "En_cours",
    },
    risk: { color: "bg-yellow-100 text-yellow-800", label: "À risque" },
    delayed: { color: "bg-orange-100 text-orange-800", label: "En retard" },
    completed: { color: "bg-green-100 text-green-800", label: "Terminé" },
    active: { color: "bg-blue-100 text-blue-800", label: "En_cours" },
    planned: { color: "bg-purple-100 text-purple-800", label: "Planifié" },
  };

  const config = statusConfig[status] || statusConfig["on-track"];

  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
};

// Tooltip personnalisé pour le graphique
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded border border-gray-300 bg-white p-2 shadow dark:border-gray-600 dark:bg-slate-700">
        <p className="text-sm font-medium text-gray-800 dark:text-white">
          {label}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-300">
          Retard : {payload[0].value} j
        </p>
      </div>
    );
  }
  return null;
};

// Graphique des retards prédis (exclut les tâches terminées)
const DelayChart = ({ tasks }: { tasks: Task[] }) => {
  const chartData = tasks
    .filter(
      (task) =>
        task.predictedDelay !== undefined &&
        task.predictedDelay > 0 &&
        !isTaskCompleted(task.status),
    )
    .map((task) => ({
      name: task.title,
      delay: task.predictedDelay,
    }));

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-slate-800">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white">
          <ChartBarIcon className="h-6 w-6" style={{ color: primaryColor }} />
          Retards Prédits
        </h2>
        <div className="flex h-[180px] items-center justify-center">
          <p className="text-gray-500">Aucune tâche en retard détectée</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-slate-800">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white">
        <ChartBarIcon className="h-6 w-6" style={{ color: primaryColor }} />
        Retards Prédits (Tâches en cours)
      </h2>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" stroke={primaryColor} tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="delay" fill={primaryColor} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Composant de carte statistique avec couleurs soft
const StatsCard = ({
  title,
  value,
  icon,
  bgClass,
}: {
  title: string;
  value: string;
  icon: JSX.Element;
  bgClass: string;
}) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className={`flex items-center p-4 ${bgClass} rounded-xl text-gray-800 shadow-lg`}
  >
    <div className="mr-4 rounded-full bg-white bg-opacity-30 p-3">{icon}</div>
    <div>
      <p className="text-sm">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </motion.div>
);

// En-tête de la page d'analyse avec informations du projet
const Header = ({ projet }: { projet: Projet }) => {
  const currentDate = new Date();
  return (
    <div className="mb-8">
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 text-3xl font-bold"
        style={{ color: primaryColor }}
      >
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: primaryColor + "20" }}
        >
          <SparklesIcon className="h-8 w-8" style={{ color: primaryColor }} />
        </div>
        <span className="flex items-center bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-4xl font-extrabold text-transparent">
          Analyse du {projet.name}
        </span>
      </motion.h1>
      <p className="text-gray-600 dark:text-gray-300">
        Début : {projet.dateDebut} • Chef de projet : {projet.chefProjet} •
        Équipe : {projet.equipe}
      </p>
      <p className="mt-2 text-lg font-medium text-gray-700 dark:text-gray-400">
        Aujourd'hui, c'est le{" "}
        {currentDate.toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
    </div>
  );
};

// Section des statistiques (exclut les tâches terminées pour le calcul des retards)
const Statistics = ({ tasks }: { tasks: Task[] }) => {
  // Calculate statistics based on non-completed tasks only
  const activeTasks = tasks.filter((task) => !isTaskCompleted(task.status));
  const tasksWithDelay = activeTasks.filter(
    (task) => task.predictedDelay !== undefined && task.predictedDelay > 0,
  );
  const totalDelay = tasksWithDelay.reduce(
    (acc, task) => acc + (task.predictedDelay || 0),
    0,
  );
  const averageDelay =
    tasksWithDelay.length > 0
      ? (totalDelay / tasksWithDelay.length).toFixed(1)
      : "0.0";

  const tasksWithConfidence = activeTasks.filter(
    (task) => task.confidenceLevel !== undefined && task.confidenceLevel > 0,
  );
  const averageConfidence =
    tasksWithConfidence.length > 0
      ? (
          tasksWithConfidence.reduce(
            (acc, task) => acc + (task.confidenceLevel || 0),
            0,
          ) / tasksWithConfidence.length
        ).toFixed(0)
      : "0";

  // Estimate time saved (this is a placeholder calculation)
  const completedTasks = tasks.filter((task) =>
    isTaskCompleted(task.status),
  ).length;
  const timeSaved = `${completedTasks * 3}h`;

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatsCard
        title="Retard moyen  (tâches actives)"
        value={`${averageDelay} j`}
        icon={
          <ExclamationTriangleIcon
            className="h-6 w-6"
            style={{ color: accentOrange }}
          />
        }
        bgClass="bg-orange-100"
      />
    </div>
  );
};

// Tableau des tâches avec colonnes organisées et couleurs soft mauve pastel
const TasksTable = ({ tasks }: { tasks: Task[] }) => {
  const [selectedRisk, setSelectedRisk] = useState<
    "all" | "risk" | "delayed" | "active" | "completed"
  >("all");
  const filteredTasks = tasks.filter((task) =>
    selectedRisk === "all" ? true : task.status === selectedRisk,
  );

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-lg dark:bg-slate-800">
      <div className="flex flex-col items-center justify-between border-b p-4 dark:border-gray-700 sm:flex-row">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
          <TableCellsIcon className="h-6 w-6" />
          Liste des Tâches
        </h2>
        <select
          value={selectedRisk}
          onChange={(e) =>
            setSelectedRisk(
              e.target.value as
                | "all"
                | "risk"
                | "delayed"
                | "active"
                | "completed",
            )
          }
          className="rounded-lg border-gray-300 text-sm focus:border-[#b03ff3] focus:ring-[#b03ff3] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="all">Tous les statuts</option>
          <option value="risk">À risque</option>
          <option value="delayed">En retard</option>
          <option value="active">En_cours</option>
          <option value="completed">Terminé</option>
        </select>
      </div>
      {/* En-têtes horizontaux */}
      <div className="flex bg-purple-50 text-xs font-medium uppercase text-purple-700 dark:bg-purple-900 dark:text-purple-300">
        <div className="flex flex-1 items-center gap-1 px-6 py-3">
          <DocumentTextIcon className="h-4 w-4" /> Tâche
        </div>
        <div className="flex w-32 items-center gap-1 px-6 py-3">
          <ExclamationTriangleIcon className="h-4 w-4" /> Statut
        </div>
        <div className="flex w-32 items-center gap-1 px-6 py-3">
          <ClockIcon className="h-4 w-4" /> Retard
        </div>
        <div className="flex w-32 items-center gap-1 px-6 py-3">
          <ChartBarIcon className="h-4 w-4" /> Confiance
        </div>
      </div>
      {/* Corps du tableau */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {filteredTasks.map((task) => (
          <motion.div
            key={task.id}
            whileHover={{ scale: 1.01 }}
            className="flex items-center p-4 text-sm text-gray-900 hover:bg-purple-50 dark:text-white dark:hover:bg-purple-800"
          >
            <div className="flex-1 px-6">{task.title}</div>
            <div className="w-32 px-6">
              <RiskBadge status={task.status} />
            </div>
            <div className="w-32 px-6">
              {isTaskCompleted(task.status) ? (
                <span className="font-medium text-green-600">Terminée</span>
              ) : (
                <span
                  className={`font-medium ${
                    task.predictedDelay && task.predictedDelay > 10
                      ? "text-red-600"
                      : task.predictedDelay && task.predictedDelay > 5
                        ? "text-orange-500"
                        : "text-gray-700"
                  }`}
                >
                  {task.predictedDelay || 0} j
                </span>
              )}
            </div>
            <div className="w-32 px-6">
              {isTaskCompleted(task.status) ? (
                <span className="font-medium text-green-600">100%</span>
              ) : (
                <div className="flex items-center">
                  <div className="h-2 w-20 rounded-full bg-purple-200">
                    <div
                      className="h-full rounded-full bg-purple-600"
                      style={{ width: `${task.confidenceLevel || 0}%` }}
                    />
                  </div>
                  <span className="ml-2">{task.confidenceLevel || 0}%</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      {filteredTasks.length === 0 && (
        <div className="py-12 text-center">
          <TableCellsIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">
            Aucune tâche correspondante
          </p>
        </div>
      )}
    </div>
  );
};

// Alerte proactive en cas de tâches présentant un risque ou retard (exclut les tâches terminées)
const ProactiveAlert = ({ tasks }: { tasks: Task[] }) => {
  const alertTasks = tasks.filter(
    (task) =>
      !isTaskCompleted(task.status) &&
      (task.status === "risk" || task.status === "delayed"),
  );

  if (alertTasks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-lg bg-red-100 p-4 shadow-lg dark:bg-red-900/30"
    >
      <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
      <span className="text-sm text-red-800 dark:text-red-300">
        Attention : {alertTasks.length} tâche(s) active(s) présentent un risque
        ou sont en retard.
      </span>
    </motion.div>
  );
};

// Composant pour afficher la liste des projets avec un design original
const ProjectList = ({
  onSelect,
  projects,
}: {
  onSelect: (projet: Projet) => void;
  projects: Projet[];
}) => {
  return (
    <div className="space-y-6 rounded-xl bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 p-6 shadow-2xl dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
      <h1 className="flex items-center bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-4xl font-extrabold text-transparent">
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: primaryColor + "20" }}
        ></div>
        <span className="ml-4">
          Sélectionnez un projet pour analyser le retard
        </span>
      </h1>
      {projects.length === 0 ? (
        <div className="py-12 text-center">
          <TableCellsIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">Aucun projet disponible</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((projet) => (
            <motion.div
              key={projet.id}
              whileHover={{ scale: 1.03 }}
              onClick={() => onSelect(projet)}
              className="cursor-pointer rounded-2xl border border-transparent bg-gray-50 p-6 shadow-xl transition hover:border-[3px] hover:border-[#b03ff3] dark:bg-slate-700"
            >
              <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                {projet.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Début : {projet.dateDebut}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Chef : {projet.chefProjet}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Équipe : {projet.equipe}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// Modifier le composant principal pour utiliser la nouvelle API
export default function AnalyseDeRetard() {
  const [selectedProject, setSelectedProject] = useState<Projet | null>(null);
  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
  } = useGetAllProjectsStatsQuery({});
  const {
    data: projectTaskAnalysis,
    isLoading: analysisLoading,
    error: analysisError,
  } = useGetProjectTaskAnalysisQuery(
    selectedProject ? Number(selectedProject.id) : 0,
    { skip: !selectedProject },
  );

  // Ajouter des logs pour déboguer
  useEffect(() => {
    if (projectTaskAnalysis) {
      console.log("Project task analysis data:", projectTaskAnalysis);
      console.log("Tasks:", projectTaskAnalysis.tasks);
    }
  }, [projectTaskAnalysis]);

  // Transform projects data for the project list
  const projects: Projet[] =
    projectsData?.projects?.map((project: any) => ({
      id: Number(project.id),
      name: project.name,
      dateDebut: new Date(project.start_date).toLocaleDateString("fr-FR"),
      chefProjet: project.manager?.name || "Non assigné",
      equipe: `${project.team} membre(s)`,
    })) || [];

  // If a project is selected and we have analysis data
  const selectedProjectWithTasks: Projet | null =
    selectedProject && projectTaskAnalysis
      ? {
          ...selectedProject,
          tasks: projectTaskAnalysis.tasks || [],
        }
      : null;

  if (projectsLoading) {
    return (
      <section className="flex h-screen items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-purple-500"></div>
          <p className="mt-4 text-gray-600">Chargement des projets...</p>
        </div>
      </section>
    );
  }

  if (projectsError) {
    return (
      <section className="p-6">
        <div className="rounded-xl bg-red-100 p-6 shadow-lg">
          <h2 className="text-xl font-bold text-red-800">
            Erreur de chargement
          </h2>
          <p className="text-red-600">
            Impossible de charger les projets. Veuillez réessayer plus tard.
          </p>
        </div>
      </section>
    );
  }

  // Vérifier si nous avons des projets
  if (!projects || projects.length === 0) {
    return (
      <section className="p-6">
        <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-slate-800">
          <h2 className="text-xl font-bold">
            Aucun projet approuvé disponible
          </h2>
          <p className="mt-2">
            Vous n'avez pas encore de projets approuvés pour analyser les
            retards.
          </p>
        </div>
      </section>
    );
  }

  if (!selectedProject) {
    return (
      <section className="p-6">
        <ProjectList
          onSelect={(projet) => setSelectedProject(projet)}
          projects={projects}
        />
      </section>
    );
  }

  if (analysisLoading) {
    return (
      <section className="p-6">
        <button
          onClick={() => setSelectedProject(null)}
          className="mb-4 flex items-center text-sm hover:underline"
          style={{ color: primaryColor }}
        >
          <ArrowLeftIcon className="mr-1 h-4 w-4" /> Retour à la liste des
          projets
        </button>
        <div className="py-12 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-purple-500"></div>
          <p className="mt-4 text-gray-600">
            Chargement des données du projet...
          </p>
        </div>
      </section>
    );
  }

  // Gérer l'erreur spécifique pour les projets en attente d'approbation
  if (analysisError) {
    const errorData = analysisError as any;
    const errorMessage =
      errorData?.data?.message ||
      "Erreur lors du chargement des données du projet";

    return (
      <section className="p-6">
        <button
          onClick={() => setSelectedProject(null)}
          className="mb-4 flex items-center text-sm hover:underline"
          style={{ color: primaryColor }}
        >
          <ArrowLeftIcon className="mr-1 h-4 w-4" /> Retour à la liste des
          projets
        </button>
        <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-slate-800">
          <h2 className="text-xl text-red-500">{errorMessage}</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            {errorData?.status === 400
              ? "Ce projet est en attente d'approbation par l'administrateur et n'a pas encore d'analyse de retard disponible."
              : "Veuillez réessayer plus tard ou contacter l'administrateur."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-800">
      <button
        onClick={() => setSelectedProject(null)}
        className="flex items-center text-sm hover:underline"
        style={{ color: primaryColor }}
      >
        <ArrowLeftIcon className="mr-1 h-4 w-4" /> Retour à la liste des projets
      </button>
      {selectedProjectWithTasks && (
        <>
          <Header projet={selectedProjectWithTasks} />
          <Statistics tasks={selectedProjectWithTasks.tasks || []} />
          <DelayChart tasks={selectedProjectWithTasks.tasks || []} />
          <ProactiveAlert tasks={selectedProjectWithTasks.tasks || []} />
          <TasksTable tasks={selectedProjectWithTasks.tasks || []} />
        </>
      )}
    </section>
  );
}
