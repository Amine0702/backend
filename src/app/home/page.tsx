"use client";
import "./home.css";
import { useState, useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/(components)/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/(components)/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/(components)/ui/sheet";
import { Badge } from "@/app/(components)/ui/badge";
import TaskEditor from "@/app/(components)/TaskEditor";
import {
  PlusSquare,
  CalendarDays,
  BarChart3,
  Clock,
  Info,
  FileText,
  AlertCircle,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/app/(components)/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/(components)/ui/table";
import { useToast } from "@/app/(components)/ui/use-toast";
import StatCard from "@/app/(components)/StatCard";
import DashboardCard from "@/app/(components)/DashboardCard";
import PriorityTaskList from "@/app/(components)/PriorityTaskList";
import type { Task, Project } from "@/app/projects/types/dashboard";
import {
  calculateProjectStatus,
  getUpcomingTasks,
  formatDateFr,
  translateStatus,
  getProjectById,
  getStatusColorClass,
} from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import {
  useGetUserProjectsQuery,
  useGetUserPendingProjectsQuery,
  useGetProjectQuery,
  useUpdateTaskMutation,
} from "@/app/state/api";
import ModalNewProject from "@/app/(components)/ModalNewProject";

// Composant principal
const Index = () => {
  const { toast } = useToast();
  const [isModalNewProjectOpen, setIsModalNewProjectOpen] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null,
  );
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [isProjectsDetailOpen, setIsProjectsDetailOpen] = useState(false);
  const [isPendingProjectsOpen, setIsPendingProjectsOpen] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [projectFilter, setProjectFilter] = useState<"all" | "active">("all");

  // Get the current user
  const { user, isLoaded } = useUser();
  const clerkUserId = user?.id || "";

  // Fetch user projects from the API
  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    error: projectsError,
    refetch: refetchProjects,
  } = useGetUserProjectsQuery(clerkUserId, {
    skip: !clerkUserId,
  });

  // Fetch pending projects using RTK Query for the specific user
  const {
    data: pendingProjectsData,
    isLoading: isLoadingPendingProjects,
    error: pendingProjectsError,
  } = useGetUserPendingProjectsQuery(clerkUserId, {
    skip: !clerkUserId,
  });

  // Get selected project details if a project is selected
  const { data: selectedProjectData, isLoading: isLoadingSelectedProject } =
    useGetProjectQuery(selectedProjectId || "", {
      skip: !selectedProjectId,
    });

  // Update task mutation
  const [updateTask] = useUpdateTaskMutation();

  // Initialize projects and tasks state
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingProjects, setPendingProjects] = useState<Project[]>([]);
  const [rejectedProjects, setRejectedProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Debug logs
  useEffect(() => {
    console.log("=== DEBUG PENDING PROJECTS ===");
    console.log("clerkUserId:", clerkUserId);
    console.log("pendingProjectsData:", pendingProjectsData);
    console.log("isLoadingPendingProjects:", isLoadingPendingProjects);
    console.log("pendingProjectsError:", pendingProjectsError);
    console.log("===============================");
  }, [
    clerkUserId,
    pendingProjectsData,
    isLoadingPendingProjects,
    pendingProjectsError,
  ]);

  // Process pending projects data when it's loaded
  useEffect(() => {
    console.log("Processing pending projects data...");

    if (pendingProjectsData) {
      console.log("Pending projects data received:", pendingProjectsData);

      if (
        pendingProjectsData.pendingProjects &&
        Array.isArray(pendingProjectsData.pendingProjects)
      ) {
        const formattedPendingProjects =
          pendingProjectsData.pendingProjects.map((project: any) => ({
            id: project.id,
            title: project.name || "Projet sans nom",
            description: project.description || "Aucune description disponible",
            startDate: project.start_date || null,
            endDate: project.end_date || null,
            clerkUserId: project.clerk_user_id || "",
            status: "EN_ATTENTE",
            progress: 0,
            isActive: false,
            createdAt: project.created_at || null,
            team_members: project.team_members || [],
          }));

        console.log("Formatted pending projects:", formattedPendingProjects);
        setPendingProjects(formattedPendingProjects);
      } else {
        console.log("No pending projects found in data");
        setPendingProjects([]);
      }
    } else {
      console.log("No pending projects data");
      setPendingProjects([]);
    }
  }, [pendingProjectsData]);

  // Process the projects data when it's loaded
  useEffect(() => {
    if (projectsData) {
      console.log("Données brutes des projets:", projectsData);

      // Combine manager and invited projects
      const allProjects = [
        ...(projectsData.managerProjects || []),
        ...(projectsData.invitedProjects || []),
      ].map((project) => ({
        id: project.id,
        title: project.name,
        description: project.description,
        startDate: project.start_date,
        endDate: project.end_date,
        clerkUserId: project.clerk_user_id,
        status: "ACTIF", // Par défaut, on considère le projet comme actif
        progress: calculateProjectProgress(project),
        isActive: true, // Par défaut, on considère le projet comme actif
      }));

      // Process rejected projects
      const rejectedProjectsList = (
        Array.isArray(projectsData.rejectedProjects)
          ? projectsData.rejectedProjects
          : projectsData.rejectedProjects
            ? [projectsData.rejectedProjects]
            : []
      ).map(
        (project: {
          id: any;
          name: any;
          description: any;
          start_date: any;
          end_date: any;
          clerk_user_id: any;
        }) => ({
          id: project.id,
          title: project.name,
          description: project.description,
          startDate: project.start_date,
          endDate: project.end_date,
          clerkUserId: project.clerk_user_id,
          status: "REJETÉ",
          progress: 0,
          isActive: false,
        }),
      );

      setProjects(allProjects);
      setRejectedProjects(rejectedProjectsList);

      // Fetch tasks for each project
      const fetchAllProjectDetails = async () => {
        const allTasks: Task[] = [];
        let currentUserTeamMemberId: number | null = null;

        // For each project, fetch its details including tasks
        for (let index = 0; index < allProjects.length; index++) {
          const project = allProjects[index];
          try {
            // Use RTK Query to get project details
            const projectDetails = await fetch(
              `https://backend-production-96a2.up.railway.app/api/projects/${project.id}`,
            ).then((res) => res.json());

            if (projectDetails) {
              // Find the current user's team member ID
              if (projectDetails.team_members) {
                const currentUserMember = projectDetails.team_members.find(
                  (member: any) => member.clerk_user_id === clerkUserId,
                );

                if (currentUserMember) {
                  currentUserTeamMemberId = currentUserMember.id;
                }
              }

              // Puis, dans la fonction fetchAllProjectDetails, après avoir récupéré les détails du projet, ajoutons:
              if (projectDetails && projectDetails.columns) {
                let allTasksCompleted = true;
                let hasTasks = false;

                // Vérifier si toutes les tâches sont dans une colonne "terminé"
                projectDetails.columns.forEach(
                  (column: { tasks: any[]; title: string }) => {
                    if (column.tasks && column.tasks.length > 0) {
                      hasTasks = true;
                      const isCompletedColumn =
                        column.title.toLowerCase().includes("terminé") ||
                        column.title.toLowerCase().includes("termine");

                      // Si on trouve des tâches dans une colonne qui n'est pas "terminé", le projet est actif
                      if (!isCompletedColumn) {
                        allTasksCompleted = false;
                      }
                    }
                  },
                );

                // Si le projet a des tâches et qu'elles ne sont pas toutes terminées, il est actif
                if (hasTasks) {
                  const projectIndex = allProjects.findIndex(
                    (p) => p.id === project.id,
                  );
                  if (projectIndex !== -1) {
                    allProjects[projectIndex].status = allTasksCompleted
                      ? "TERMINÉ"
                      : "ACTIF";
                    allProjects[projectIndex].isActive = !allTasksCompleted;
                  }
                }
              }

              if (projectDetails.columns) {
                let hasNonCompletedTasks = false;

                // Extract tasks from all columns
                projectDetails.columns.forEach(
                  (column: { tasks: any[]; title: string }) => {
                    // Check if this column is not a "terminé" column
                    const isNotCompletedColumn =
                      !column.title.toLowerCase().includes("terminé") &&
                      !column.title.toLowerCase().includes("termine");

                    // If we find a non-completed column with tasks, mark the project as active
                    if (
                      isNotCompletedColumn &&
                      column.tasks &&
                      column.tasks.length > 0
                    ) {
                      hasNonCompletedTasks = true;
                    }

                    if (column.tasks && column.tasks.length > 0) {
                      const mappedTasks = column.tasks.map(
                        (task: {
                          id: any;
                          title: any;
                          description: any;
                          priority: any;
                          due_date: any;
                          assignee_id: any;
                          status: any;
                        }) => ({
                          id: task.id,
                          title: task.title,
                          description: task.description,
                          status: task.status || column.title || "À faire",
                          priority: mapPriority(task.priority),
                          dueDate: task.due_date,
                          userId: task.assignee_id,
                          projectId: project.id,
                          columnName: column.title,
                        }),
                      );
                      allTasks.push(...mappedTasks);
                    }
                  },
                );

                // Update the project's active status based on task completion
                allProjects[index] = {
                  ...allProjects[index],
                  isActive: hasNonCompletedTasks,
                  status: hasNonCompletedTasks ? "ACTIF" : "TERMINÉ",
                };
              }
            }
          } catch (error) {
            console.error(
              `Error fetching details for project ${project.id}:`,
              error,
            );
          }
        }

        // Update projects with the correct active status
        setProjects(allProjects);

        // Filter tasks to only include those assigned to the current user
        const userAssignedTasks = allTasks.filter(
          (task) =>
            task.userId &&
            currentUserTeamMemberId &&
            task.userId === currentUserTeamMemberId,
        );

        setTasks(userAssignedTasks);
        setIsDataLoaded(true);
      };

      fetchAllProjectDetails();
    }
  }, [projectsData, clerkUserId]);

  // Function to calculate project progress based on task completion
  const calculateProjectProgress = (project: any): number => {
    if (project.end_date) return 100;

    // If we have columns data, calculate based on completed tasks
    if (project.columns && project.columns.length > 0) {
      const allTasks = project.columns.flatMap((col: any) => col.tasks || []);
      const totalTasks = allTasks.length;

      if (totalTasks === 0) return 0;

      const completedTasks = allTasks.filter(
        (task: any) =>
          task.status === "terminé" ||
          task.column_title === "terminé" ||
          task.column_title === "Terminé",
      ).length;

      return Math.round((completedTasks / totalTasks) * 100);
    }

    // Default progress if we can't calculate
    return 30;
  };

  // Function to standardize priority values
  const mapPriority = (priority: string): string => {
    if (!priority) return "MEDIUM";

    const priorityLower = priority.toLowerCase();
    if (priorityLower.includes("urgente")) {
      return "URGENT";
    } else if (
      priorityLower.includes("haute") ||
      priorityLower.includes("high")
    ) {
      return "HIGH";
    } else if (
      priorityLower.includes("basse") ||
      priorityLower.includes("low")
    ) {
      return "LOW";
    } else {
      return "MEDIUM";
    }
  };

  // Function to calculate task completion rate
  const calculateTaskCompletionRate = (tasks: Task[]): number => {
    if (tasks.length === 0) return 0;

    const completedTasks = tasks.filter(
      (task) =>
        task.status.toLowerCase().includes("terminé") ||
        task.status.toLowerCase().includes("termine") ||
        (task.columnName &&
          (task.columnName.toLowerCase().includes("terminé") ||
            task.columnName.toLowerCase().includes("termine"))),
    ).length;

    return Math.round((completedTasks / tasks.length) * 100);
  };

  const calculateDashboardStats = (tasks: Task[], projects: Project[]) => {
    // Identifier les tâches urgentes (priorité URGENT ou HIGH)
    const urgentTasks = tasks.filter(
      (t) => t.priority === "URGENT" || t.priority === "HIGH",
    );

    return {
      activeProjects: projects.filter((p) => p.isActive).length,
      totalProjects: projects.length,
      urgentTasks: urgentTasks.length,
      taskCompletionRate: calculateTaskCompletionRate(tasks),
      pendingProjects: pendingProjects.length,
    };
  };

  useEffect(() => {
    setAnimateIn(true);
  }, []);

  // Add a loading state
  if (!isLoaded || isLoadingProjects || !isDataLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] text-violet-600 motion-reduce:animate-[spin_1.5s_linear_infinite] dark:text-violet-400"></div>
          <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">
            Chargement de vos données...
          </p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (projectsError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-md rounded-lg bg-white p-6 text-center shadow-lg dark:bg-gray-800">
          <h2 className="mb-4 text-2xl font-bold text-red-600 dark:text-red-400">
            Erreur de chargement
          </h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            Impossible de charger vos projets. Veuillez réessayer plus tard.
          </p>
          <Button onClick={() => window.location.reload()}>Réessayer</Button>
        </div>
      </div>
    );
  }

  // Animation à l'entrée

  // Ajouter un nouveau projet
  const handleAddProject = (newProject: Project) => {
    setProjects((prev) => [...prev, newProject]);
    // Refresh the projects data
    setTimeout(() => {
      if (clerkUserId) {
        refetchProjects();
      }
    }, 500);
  };

  // Mettre à jour une tâche
  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      // Use RTK Query mutation to update the task
      await updateTask({
        id: updatedTask.id,
        title: updatedTask.title,
        description: updatedTask.description,
        priority: updatedTask.priority,
        due_date: updatedTask.dueDate,
        // Add other fields as needed
      }).unwrap();

      // Update local state
      setTasks((prev) =>
        prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
      );

      toast({
        title: "Tâche mise à jour",
        description: "Les modifications ont été enregistrées avec succès.",
      });
    } catch (error) {
      console.error("Failed to update task:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la tâche.",
        variant: "destructive",
      });
    }
  };

  // Préparation des données
  const projectStatusData = calculateProjectStatus(projects);
  const dashboardStats = calculateDashboardStats(tasks, projects);
  const upcomingTasks = getUpcomingTasks(tasks); // This now only includes the user's tasks

  // Préparation des données pour la distribution des priorités
  const taskPriorityData = (() => {
    const priorityCounts = {
      URGENT: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    tasks.forEach((task) => {
      if (
        priorityCounts[task.priority as keyof typeof priorityCounts] !==
        undefined
      ) {
        priorityCounts[task.priority as keyof typeof priorityCounts]++;
      }
    });

    return [
      { name: "Urgente", count: priorityCounts.URGENT, color: "#ef4444" }, // Rouge pour URGENT
      { name: "Haute", count: priorityCounts.HIGH, color: "#f97316" }, // Orange pour HIGH
      { name: "Moyenne", count: priorityCounts.MEDIUM, color: "#f59e0b" }, // Ambre pour MEDIUM
      { name: "Basse", count: priorityCounts.LOW, color: "#10b981" }, // Vert pour LOW
    ];
  })();

  // Obtenir les tâches urgentes (priorité URGENT ou HIGH)
  const urgentTasks = tasks.filter(
    (task) => task.priority === "URGENT" || task.priority === "HIGH",
  );

  // Filtrer les tâches en fonction du statut
  const filteredTasks =
    filterStatus === "all"
      ? tasks
      : filterStatus === "urgent"
        ? urgentTasks // Utiliser directement les tâches urgentes
        : tasks.filter(
            (task) =>
              task.status.toLowerCase() === filterStatus.toLowerCase() ||
              task.columnName?.toLowerCase() === filterStatus.toLowerCase(),
          );

  // Filtrer les projets
  const filteredProjects =
    projectFilter === "all"
      ? projects
      : projects.filter((project) => project.isActive);

  // Obtenir les détails d'une tâche sélectionnée
  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId)
    : null;
  const selectedTaskProject = selectedTask
    ? getProjectById(selectedTask.projectId, projects)
    : null;

  // Obtenir les détails d'un projet sélectionné
  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)
    : null;
  const projectTasks = selectedProject
    ? tasks.filter((t) => t.projectId === selectedProject.id)
    : [];

  // Colonnes pour le tableau des tâches
  const taskColumns = [
    { id: "title", span: "Titre", minWidth: 170 },
    { id: "status", span: "Statut", minWidth: 100 },
    { id: "priority", span: "Priorité", minWidth: 100 },
    { id: "dueDate", span: "Échéance", minWidth: 120 },
  ];

  // Fonction pour afficher les détails du projet en fonction du filtre
  const showProjectDetails = (filter: "active" | "all") => {
    setProjectFilter(filter);
    setIsProjectsDetailOpen(true);
  };

  // Fonction pour formater la date de création
  const formatCreationDate = (project: any) => {
    if (project.createdAt) {
      return formatDateFr(project.createdAt);
    } else if (project.created_at) {
      return formatDateFr(project.created_at);
    } else if (project.startDate) {
      return formatDateFr(project.startDate);
    } else if (project.start_date) {
      return formatDateFr(project.start_date);
    } else {
      return "Date inconnue";
    }
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 transition-opacity duration-1000 dark:from-gray-900 dark:to-gray-800 ${animateIn ? "opacity-100" : "opacity-0"}`}
    >
      {/* En-tête créatif */}
      <div className="container mx-auto px-4 py-6 sm:px-6">
        <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div>
            <h1 className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
              Tableau de Bord
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Bienvenue, {user?.firstName || "Utilisateur"} |{" "}
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              className="flex transform items-center rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-5 py-3 text-white shadow-2xl transition hover:scale-105"
              onClick={() => setIsModalNewProjectOpen(true)}
            >
              <PlusSquare className="mr-2 h-6 w-6" /> Nouveau Projet
            </button>
          </div>
        </div>

        {/* Debug info - Remove in production */}
        {process.env.NODE_ENV === "development" && (
          <div className="mb-4 rounded bg-gray-100 p-4 text-sm dark:bg-gray-800 dark:text-gray-300">
            <p>
              <strong>Debug Info:</strong>
            </p>
            <p>User ID: {clerkUserId}</p>
            <p>Pending Projects Count: {pendingProjects.length}</p>
            <p>Loading Pending: {isLoadingPendingProjects ? "Yes" : "No"}</p>
            <p>Pending Projects Data: {JSON.stringify(pendingProjectsData)}</p>
          </div>
        )}

        {/* Statistiques rapides */}
        <div
          className="mb-8 grid animate-fade-in grid-cols-1 gap-4 opacity-0 sm:grid-cols-2 lg:grid-cols-4"
          style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
        >
          <StatCard
            title="Projets actifs"
            value={dashboardStats.activeProjects}
            icon={<BarChart3 size={24} />}
            trend={{ value: 12, isPositive: true }}
            className="cursor-pointer"
            onClick={() => showProjectDetails("active")}
          />
          <StatCard
            title="Projets en attente"
            value={dashboardStats.pendingProjects}
            icon={<Clock size={24} />}
            trend={{
              value:
                dashboardStats.pendingProjects > 0
                  ? dashboardStats.pendingProjects
                  : 0,
              isPositive: false,
            }}
            className="cursor-pointer bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-800/20"
            onClick={() => setIsPendingProjectsOpen(true)}
          />
          <StatCard
            title="Tâches urgentes"
            value={dashboardStats.urgentTasks}
            icon={<Clock size={24} />}
            trend={{ value: 3, isPositive: false }}
            className="cursor-pointer"
            onClick={() => {
              setFilterStatus("urgent");
              window.scrollTo({
                top: document.body.scrollHeight,
                behavior: "smooth",
              });
            }}
          />
          <StatCard
            title="Total des projets"
            value={dashboardStats.totalProjects}
            icon={<FileText size={24} />}
            className="cursor-pointer"
            onClick={() => showProjectDetails("all")}
          />
        </div>

        {/* Grille de cartes */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-12">
          {/* Distribution des tâches par priorité */}
          <div
            className="animate-fade-in opacity-0 md:col-span-1 xl:col-span-6"
            style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
          >
            <DashboardCard title="Distribution des priorités">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={taskPriorityData}>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    stroke="#e0e0e0"
                    className="dark:stroke-gray-600"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#718096"
                    className="dark:stroke-gray-400"
                  />
                  <YAxis stroke="#718096" className="dark:stroke-gray-400" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                    wrapperClassName="dark:[&_.recharts-tooltip-wrapper]:!bg-gray-800 dark:[&_.recharts-tooltip-wrapper]:!text-gray-200 dark:[&_.recharts-tooltip-wrapper]:!border-gray-600"
                    formatter={(value) => [`${value} tâches`, "Quantité"]}
                    labelFormatter={(name) => `Priorité: ${name}`}
                  />
                  <Legend formatter={(value) => `${value}`} />
                  <Bar dataKey="count" name="Nombre de tâches">
                    {taskPriorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </DashboardCard>
          </div>

          {/* Statut des projets */}
          <div
            className="animate-fade-in opacity-0 md:col-span-1 xl:col-span-6"
            style={{ animationDelay: "0.6s", animationFillMode: "forwards" }}
          >
            <DashboardCard title="Statut des projets">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    dataKey="count"
                    data={projectStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {projectStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} projets`, "Quantité"]}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                    wrapperClassName="dark:[&_.recharts-tooltip-wrapper]:!bg-gray-800 dark:[&_.recharts-tooltip-wrapper]:!text-gray-200 dark:[&_.recharts-tooltip-wrapper]:!border-gray-600"
                  />
                  <Legend formatter={(value) => `${value}`} />
                </PieChart>
              </ResponsiveContainer>
            </DashboardCard>
          </div>

          {/* Tâches à venir */}
          <div
            className="animate-fade-in opacity-0 md:col-span-1 xl:col-span-6"
            style={{ animationDelay: "0.8s", animationFillMode: "forwards" }}
          >
            <DashboardCard title="Tâches à venir (7 jours)">
              <div className="max-h-[300px] space-y-4 overflow-y-auto pr-2">
                {upcomingTasks.length > 0 ? (
                  upcomingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                      onClick={() => {
                        setSelectedTaskId(task.id);
                        setIsTaskDetailsOpen(true);
                      }}
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
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {task.title}
                        </h4>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDateFr(task.dueDate)}
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
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-[250px] flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                    <CalendarDays className="mb-2 h-10 w-10 text-gray-400 dark:text-gray-500" />
                    <p className="text-center">
                      Aucune tâche à venir cette semaine
                    </p>
                  </div>
                )}
              </div>
            </DashboardCard>
          </div>

          {/* Tâches prioritaires */}
          <div
            className="animate-fade-in opacity-0 md:col-span-1 xl:col-span-6"
            style={{ animationDelay: "0.9s", animationFillMode: "forwards" }}
          >
            <PriorityTaskList
              tasks={urgentTasks} // Utiliser les tâches urgentes ici
              projects={projects}
              onTaskClick={(taskId) => {
                setSelectedTaskId(taskId);
                setIsTaskDetailsOpen(true);
              }}
            />
          </div>

          {/* Tableau des tâches */}
          <div
            className="animate-fade-in opacity-0 md:col-span-2 xl:col-span-12"
            style={{ animationDelay: "1.0s", animationFillMode: "forwards" }}
          >
            <DashboardCard title="Vos Tâches Assignées">
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    filterStatus === "all"
                      ? "bg-violet-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  Toutes
                </button>
                <button
                  onClick={() => setFilterStatus("à faire")}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    filterStatus === "à faire"
                      ? "bg-yellow-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  À faire
                </button>
                <button
                  onClick={() => setFilterStatus("en cours")}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    filterStatus === "en cours"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  En cours
                </button>
                <button
                  onClick={() => setFilterStatus("terminé")}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    filterStatus === "terminé"
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  Terminées
                </button>
                <button
                  onClick={() => setFilterStatus("urgent")}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    filterStatus === "urgent"
                      ? "bg-red-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  Urgentes
                </button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {taskColumns.map((column) => (
                        <TableHead
                          key={column.id}
                          style={{ minWidth: column.minWidth }}
                        >
                          {column.span}
                        </TableHead>
                      ))}
                      <TableHead>Projet</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => {
                      const project = projects.find(
                        (p) => p.id === task.projectId,
                      );
                      return (
                        <TableRow
                          key={task.id}
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <TableCell className="font-medium">
                            {task.title}
                          </TableCell>
                          <TableCell>
                            <div
                              className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getStatusColorClass(task.status, task.columnName)}`}
                            >
                              {task.columnName || task.status}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div
                              className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
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
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <CalendarDays
                                size={16}
                                className="mr-2 text-gray-500 dark:text-gray-400"
                              />
                              <span className="text-gray-700 dark:text-gray-300">
                                {formatDateFr(task.dueDate)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {project?.title || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => {
                                setSelectedTaskId(task.id);
                                setIsTaskDetailsOpen(true);
                              }}
                              className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Info
                                size={16}
                                className="text-violet-600 dark:text-violet-400"
                              />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </DashboardCard>
          </div>
        </div>
      </div>

      {/* Modal Nouveau Projet */}
      <ModalNewProject
        isOpen={isModalNewProjectOpen}
        onClose={() => setIsModalNewProjectOpen(false)}
      />

      {/* Modal Projets en attente */}
      <Dialog
        open={isPendingProjectsOpen}
        onOpenChange={setIsPendingProjectsOpen}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-center text-2xl font-bold text-transparent">
              Projets en attente d'approbation
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600 dark:text-gray-400">
              Ces projets sont en attente d'approbation par un administrateur.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto pr-2">
            {pendingProjects.length > 0 ? (
              pendingProjects.map((project) => (
                <Card
                  key={project.id}
                  className="cursor-pointer border-violet-200 transition-all hover:shadow-md dark:border-violet-700"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="mr-2 h-3 w-3 rounded-full bg-violet-500" />
                        {project.title || "Projet sans nom"}
                      </div>
                      <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100">
                        En attente
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Créé le {formatCreationDate(project)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="line-clamp-2 text-sm">
                      {project.description || "Aucune description disponible"}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {project.startDate
                          ? `Début prévu: ${formatDateFr(project.startDate)}`
                          : "Date de début: Non définie"}
                      </span>
                      <span className="rounded-full bg-violet-50 px-2 py-1 text-xs text-violet-800 dark:bg-violet-900/20 dark:text-violet-100">
                        En attente d'approbation
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="pb-2 pt-0">
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {project.endDate
                          ? `Fin prévue: ${formatDateFr(project.endDate)}`
                          : "Date de fin: Non définie"}
                      </span>
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-violet-500" />
                        <span className="text-xs text-violet-600 dark:text-violet-400">
                          En attente de validation
                        </span>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="py-8 text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <ClipboardCheck className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  Aucun projet en attente d'approbation
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Détails de tâche */}
      <Sheet open={isTaskDetailsOpen} onOpenChange={setIsTaskDetailsOpen}>
        <SheetContent className="w-[90%] overflow-y-auto sm:w-[600px]">
          <SheetHeader>
            <SheetTitle className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-2xl font-bold text-transparent">
              {isEditingTask ? "Modifier la tâche" : "Détails de la tâche"}
            </SheetTitle>
          </SheetHeader>
          {selectedTask && (
            <div className="mt-6 space-y-6">
              {isEditingTask ? (
                <TaskEditor
                  task={selectedTask}
                  projects={projects}
                  onClose={() => setIsEditingTask(false)}
                  onSave={handleUpdateTask}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <div
                        className={`mr-2 h-3 w-3 rounded-full ${
                          selectedTask.priority === "URGENT"
                            ? "bg-red-500"
                            : selectedTask.priority === "HIGH"
                              ? "bg-orange-500"
                              : selectedTask.priority === "MEDIUM"
                                ? "bg-violet-500"
                                : "bg-green-500"
                        }`}
                      />
                      {selectedTask.title}
                    </CardTitle>
                    <CardDescription>
                      Créée le {formatDateFr(new Date().toISOString())}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Description
                      </h4>
                      <p className="mt-1 text-gray-700 dark:text-gray-300">
                        {selectedTask.description ||
                          "Aucune description disponible."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Statut
                        </h4>
                        <div
                          className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-medium ${getStatusColorClass(selectedTask.status, selectedTask.columnName)}`}
                        >
                          {selectedTask.columnName || selectedTask.status}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Priorité
                        </h4>
                        <div
                          className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                            selectedTask.priority === "URGENT"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : selectedTask.priority === "HIGH"
                                ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                                : selectedTask.priority === "MEDIUM"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          }`}
                        >
                          {translateStatus(selectedTask.priority)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Date d'échéance
                      </h4>
                      <p className="mt-1 flex items-center text-gray-700 dark:text-gray-300">
                        <CalendarDays
                          size={16}
                          className="mr-2 text-gray-500 dark:text-gray-400"
                        />
                        {formatDateFr(selectedTask.dueDate)}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Projet associé
                      </h4>
                      {selectedTaskProject ? (
                        <div className="mt-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">
                            {selectedTaskProject.title}
                          </h5>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {selectedTaskProject.description}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Du {formatDateFr(selectedTaskProject.startDate)}
                            {selectedTaskProject.endDate
                              ? ` au ${formatDateFr(selectedTaskProject.endDate)}`
                              : ""}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-1 text-gray-500 dark:text-gray-400">
                          Aucun projet associé
                        </p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setIsTaskDetailsOpen(false)}
                    >
                      Fermer
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Liste des projets */}
      <Sheet open={isProjectsDetailOpen} onOpenChange={setIsProjectsDetailOpen}>
        <SheetContent className="w-[90%] overflow-y-auto sm:w-[600px]">
          <SheetHeader>
            <SheetTitle className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-2xl font-bold text-transparent">
              {selectedProject
                ? `Projet: ${selectedProject.title}`
                : projectFilter === "active"
                  ? "Projets actifs"
                  : "Tous les projets"}
            </SheetTitle>
            <SheetDescription>
              {selectedProject
                ? selectedProject.description
                : projectFilter === "active"
                  ? `${projects.filter((p) => !p.endDate).length} projets actifs`
                  : `${projects.length} projets au total, dont ${projects.filter((p) => !p.endDate).length} actifs`}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Vue détaillée d'un projet */}
            {selectedProject ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedProject.title}</CardTitle>
                    <CardDescription>
                      {selectedProject.endDate
                        ? `Complété: ${formatDateFr(selectedProject.startDate)} - ${formatDateFr(selectedProject.endDate)}`
                        : `Démarré le ${formatDateFr(selectedProject.startDate)}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                      {selectedProject.description}
                    </p>

                    <h4 className="mb-2 flex items-center font-medium text-gray-900 dark:text-gray-100">
                      <FileText size={16} className="mr-2" />
                      Tâches du projet ({projectTasks.length})
                    </h4>

                    <div className="mt-4 space-y-3">
                      {projectTasks.length > 0 ? (
                        projectTasks.map((task) => (
                          <div
                            key={task.id}
                            className="cursor-pointer rounded-lg bg-gray-50 p-3 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                            onClick={() => {
                              setSelectedTaskId(task.id);
                              setIsProjectsDetailOpen(false);
                              setTimeout(() => setIsTaskDetailsOpen(true), 100);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <h5 className="flex items-center font-medium text-gray-900 dark:text-gray-100">
                                <div
                                  className={`mr-2 h-2 w-2 rounded-full ${
                                    task.priority === "URGENT"
                                      ? "bg-red-500"
                                      : task.priority === "HIGH"
                                        ? "bg-orange-500"
                                        : task.priority === "MEDIUM"
                                          ? "bg-amber-500"
                                          : "bg-green-500"
                                  }`}
                                />
                                {task.title}
                              </h5>
                              <div
                                className={`rounded-full px-2 py-1 text-xs ${getStatusColorClass(task.status, task.columnName)}`}
                              >
                                {task.columnName || task.status}
                              </div>
                            </div>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {formatDateFr(task.dueDate)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                          Aucune tâche trouvée pour ce projet
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedProjectId(null)}
                    >
                      Retour aux projets
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            ) : (
              /* Liste de tous les projets */
              <div className="space-y-4">
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => (
                    <Card
                      key={project.id}
                      className="cursor-pointer transition-all hover:shadow-md"
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center">
                          <div
                            className={`mr-2 h-3 w-3 rounded-full ${project.endDate ? "bg-green-500" : "bg-blue-500"}`}
                          />
                          {project.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <p className="line-clamp-2 text-sm text-gray-700 dark:text-gray-300">
                          {project.description}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {project.endDate
                              ? `Terminé le ${formatDateFr(project.endDate)}`
                              : `Démarré le ${formatDateFr(project.startDate)}`}
                          </span>
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            {
                              tasks.filter((t) => t.projectId === project.id)
                                .length
                            }{" "}
                            tâches
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="p-10 text-center text-gray-500 dark:text-gray-400">
                    <p>
                      Aucun projet {projectFilter === "active" ? "actif" : ""}{" "}
                      trouvé
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Index;
