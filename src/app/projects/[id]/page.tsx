"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import "./kan.css";
import {
  useGetProjectQuery,
  useToggleTaskTimerMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useAddCommentMutation,
  useAddAttachmentMutation,
  useMoveTaskMutation,
  useAddColumnMutation,
  useUpdateColumnOrderMutation,
  useAcceptInvitationMutation,
  useDeleteProjectMutation,
  useDeleteColumnMutation,
} from "@/app/state/api";
import ProjectHeader from "../components/ProjectHeader";
import KanbanView from "../components/KanbanView";
import ListView from "../components/ListView";
import TableView from "../components/TableView";
import TimelineView from "../components/TimelineView";
import TaskModal from "../components/TaskModal";
import TaskAICreationModal from "../components/TaskAICreationModal";
import NewTaskModal from "../components/NewTaskModal";
import ChatbotModal from "../components/ChatbotModal";
import { Bot } from "lucide-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

const ProjectPage = () => {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const projectId = Array.isArray(id) ? id[0] : id;
  const invitationToken = searchParams.get("token");
  const { user, isLoaded: userLoaded } = useUser();

  // API queries and mutations
  const {
    data: project,
    isLoading,
    error,
    refetch,
  } = useGetProjectQuery(projectId, {
    pollingInterval: 30000, // Poll every 30 seconds for updates
  });
  const [toggleTaskTimer] = useToggleTaskTimerMutation();
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [addComment] = useAddCommentMutation();
  const [addAttachment] = useAddAttachmentMutation();
  const [moveTask] = useMoveTaskMutation();
  const [addColumn] = useAddColumnMutation();
  const [updateColumnOrder] = useUpdateColumnOrderMutation();
  const [acceptInvitation, { isLoading: isAcceptingInvitation }] =
    useAcceptInvitationMutation();
  const [deleteProject] = useDeleteProjectMutation();
  const [deleteColumn] = useDeleteColumnMutation();
  const router = useRouter();

  // Local state
  const [view, setView] = useState<"kanban" | "list" | "table" | "timeline">(
    "kanban",
  );
  const [showNewTaskOptions, setShowNewTaskOptions] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isAITaskCreationSelected, setIsAITaskCreationSelected] =
    useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [invitationAccepted, setInvitationAccepted] = useState(false);
  const [userRole, setUserRole] = useState<string>("observer");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [formattedProject, setFormattedProject] = useState<any>(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [currentTeamMemberId, setCurrentTeamMemberId] = useState<string | null>(
    null,
  );

  // Créer un map des tâches draggables pour éviter les calculs répétés
  const [draggableTasksMap, setDraggableTasksMap] = useState<
    Record<string, boolean>
  >({});

  // Handle invitation token if present
  useEffect(() => {
    if (invitationToken && userLoaded && user && !invitationAccepted) {
      const acceptProjectInvitation = async () => {
        try {
          const result = await acceptInvitation({
            token: invitationToken,
            clerkUserId: user.id,
          }).unwrap();

          // Stocker le rôle attribué lors de l'invitation
          if (result && result.role) {
            localStorage.setItem(`projectRole_${projectId}`, result.role);
            setUserRole(result.role);
          }

          toast.success("Invitation acceptée avec succès!");
          setInvitationAccepted(true);
          refetch();
        } catch (error) {
          console.error("Erreur lors de l'acceptation de l'invitation:", error);
          toast.error(
            "Impossible d'accepter l'invitation. Veuillez réessayer.",
          );
        }
      };

      acceptProjectInvitation();
    }
  }, [
    invitationToken,
    userLoaded,
    user,
    invitationAccepted,
    acceptInvitation,
    refetch,
    projectId,
  ]);

  // Stocker l'ID de l'utilisateur actuel
  useEffect(() => {
    if (userLoaded && user) {
      setCurrentUserId(user.id);
      localStorage.setItem("currentUserId", user.id);
    }
  }, [userLoaded, user]);

  // Formater les données du projet lorsqu'elles sont disponibles
  useEffect(() => {
    if (project) {
      // Afficher les données brutes du projet pour le débogage
      console.log("Données brutes du projet:", project);

      const formatted = {
        id: project.id.toString(),
        name: project.name,
        description: project.description,
        // Ajouter les dates directement depuis le backend
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        status: project.status || "En cours",
        notes: project.notes,
        team:
          project.team_members?.map(
            (member: {
              id: { toString: () => any };
              name: any;
              avatar: any;
              clerk_user_id: any;
              pivot: { role: any };
            }) => ({
              id: member.id.toString(),
              name: member.name,
              avatar: member.avatar,
              clerk_user_id: member.clerk_user_id,
              role: member.pivot?.role || "member",
            }),
          ) || [],
        columns:
          project.columns?.map(
            (column: {
              id: { toString: () => any };
              title: any;
              tasks: any[];
            }) => ({
              id: column.id.toString(),
              title: column.title,
              tasks:
                column.tasks?.map(
                  (task: {
                    id: { toString: () => any };
                    title: any;
                    description: any;
                    status: any;
                    priority: any;
                    assignee_id: { toString: () => any };
                    creator_id: any;
                    estimated_time: any;
                    actual_time: any;
                    due_date: string | number | Date;
                    started_at: string | number | Date;
                    completed_at: string | number | Date;
                    timer_active: any;
                    tags: any;
                    attachments: any[];
                    comments: any[];
                  }) => ({
                    id: task.id.toString(),
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    priority: task.priority,
                    assigneeId: task.assignee_id?.toString(),
                    creatorId: task.creator_id,
                    estimatedTime: task.estimated_time,
                    actualTime: task.actual_time,
                    dueDate: task.due_date
                      ? new Date(task.due_date)
                      : undefined,
                    startedAt: task.started_at
                      ? new Date(task.started_at)
                      : undefined,
                    completedAt: task.completed_at
                      ? new Date(task.completed_at)
                      : undefined,
                    timerActive: task.timer_active,
                    tags: task.tags || [],
                    attachments:
                      task.attachments?.map(
                        (attachment: {
                          id: { toString: () => any };
                          name: any;
                          type: any;
                          url: any;
                          size: any;
                        }) => ({
                          id: attachment.id.toString(),
                          name: attachment.name,
                          type: attachment.type,
                          url: attachment.url,
                          size: attachment.size,
                        }),
                      ) || [],
                    comments:
                      task.comments?.map(
                        (comment: {
                          id: { toString: () => any };
                          author_id: { toString: () => any };
                          text: any;
                          created_at: string | number | Date;
                        }) => ({
                          id: comment.id.toString(),
                          authorId: comment.author_id.toString(),
                          text: comment.text,
                          createdAt: new Date(comment.created_at),
                        }),
                      ) || [],
                  }),
                ) || [],
            }),
          ) || [],
      };

      // Afficher le projet formaté pour le débogage
      console.log("Projet formaté:", formatted);
      console.log("Dates du projet:", {
        createdAt: formatted.createdAt,
        updatedAt: formatted.updatedAt,
      });

      setFormattedProject(formatted);

      // Trouver l'ID du membre d'équipe correspondant à l'utilisateur actuel
      if (userLoaded && user) {
        const currentMember = formatted.team.find(
          (member: any) => member.clerk_user_id === user.id,
        );
        if (currentMember) {
          setCurrentTeamMemberId(currentMember.id);
        }
      }
    }
  }, [project, userLoaded, user]);

  // Déterminer le rôle de l'utilisateur dans le projet
  useEffect(() => {
    if (project && userLoaded && user) {
      // Si pas de rôle stocké, déterminer le rôle à partir des données du projet
      const clerkUserId = user.id;

      // Trouver le membre d'équipe correspondant à l'utilisateur actuel
      const userTeamMember = project.team_members?.find(
        (member: any) => member.clerk_user_id === clerkUserId,
      );

      if (userTeamMember) {
        // Définir le rôle à partir des données du projet
        const role = userTeamMember.pivot?.role || "observer";
        setUserRole(role);
        console.log(`Rôle de l'utilisateur dans ce projet: ${role}`);
      } else {
        // Si l'utilisateur n'est pas membre du projet, il est observateur par défaut
        setUserRole("observer");
        console.log(
          "L'utilisateur n'est pas membre du projet, rôle par défaut: observer",
        );
      }
    }
  }, [project, user, userLoaded]);

  // Gérer les paramètres d'URL
  useEffect(() => {
    // Récupérer l'ID de la tâche depuis les paramètres d'URL
    const taskId = searchParams.get("taskId");

    // Si un ID de tâche est présent dans l'URL, ouvrir le modal correspondant
    if (taskId) {
      setSelectedTaskId(taskId);
    }
  }, [searchParams]);

  // Calculer les tâches draggables une seule fois quand les données nécessaires sont disponibles
  useEffect(() => {
    if (formattedProject && currentTeamMemberId && userRole) {
      const newDraggableTasksMap: Record<string, boolean> = {};

      // Parcourir toutes les tâches et déterminer si elles sont draggables
      formattedProject.columns.forEach((column: any) => {
        column.tasks.forEach((task: any) => {
          // Les managers peuvent déplacer toutes les tâches
          if (userRole === "manager") {
            newDraggableTasksMap[task.id] = true;
          }
          // Les membres ne peuvent déplacer que les tâches qui leur sont assignées ou qu'ils ont créées
          else if (userRole === "member") {
            // Vérifier si l'utilisateur est le créateur
            const isCreator = task.creatorId === currentUserId;

            // Vérifier si l'utilisateur est assigné à la tâche
            const isAssigned = task.assigneeId === currentTeamMemberId;

            // CORRECTION: Ne pas autoriser le déplacement des tâches IA sauf si l'utilisateur est créateur ou assigné
            newDraggableTasksMap[task.id] = isCreator || isAssigned;
          }
          // Les observateurs ne peuvent déplacer aucune tâche
          else {
            newDraggableTasksMap[task.id] = false;
          }
        });
      });

      setDraggableTasksMap(newDraggableTasksMap);
    }
  }, [formattedProject, currentTeamMemberId, userRole, currentUserId]);

  // Derived state
  const selectedTask =
    selectedTaskId && formattedProject
      ? formattedProject.columns
          ?.flatMap((col: { tasks: any }) => col.tasks)
          .find((task: { id: string }) => task.id === selectedTaskId)
      : null;

  // Nouvelle fonction simplifiée pour vérifier si une tâche peut être déplacée
  const canDragTask = useCallback(
    (taskId: string) => {
      return draggableTasksMap[taskId] || false;
    },
    [draggableTasksMap],
  );

  // Fonction pour vérifier si l'utilisateur peut modifier une tâche
  const canUserModifyTask = useCallback(
    (task: any) => {
      if (!task) return false;

      // Si l'utilisateur est manager du projet, il peut tout faire
      if (userRole === "manager") {
        return true;
      }

      // Si l'utilisateur est observateur, il ne peut rien modifier
      if (userRole === "observer") {
        return false;
      }

      // Si l'utilisateur est membre, il peut modifier la tâche s'il en est le créateur ou s'il est assigné à cette tâche
      if (userRole === "member") {
        // Vérifier si l'utilisateur est le créateur de la tâche
        if (task.creatorId === currentUserId) {
          return true;
        }

        // CORRECTION: Ne pas autoriser tous les membres à modifier les tâches générées par l'IA
        // Supprimer cette vérification qui autorisait tous les membres à modifier les tâches IA
        // if (task.tags && Array.isArray(task.tags)) {
        //   if (task.tags.includes("generer_ia") || task.tags.includes("généré_par_ia")) {
        //     return true;
        //   }
        // }

        // Vérifier si l'utilisateur est assigné à la tâche
        if (task.assigneeId && currentTeamMemberId) {
          return task.assigneeId === currentTeamMemberId;
        }
      }

      return false;
    },
    [userRole, currentUserId, currentTeamMemberId],
  );

  // Handlers
  const handleNewTask = () => {
    // Vérifier si l'utilisateur a le droit de créer des tâches
    if (userRole === "observer") {
      toast.error("Les observateurs ne peuvent pas créer de tâches");
      return;
    }

    setShowNewTaskOptions(true);
  };

  const closeNewTaskOptions = () => {
    setShowNewTaskOptions(false);
  };

  const handleViewChange = (
    newView: "kanban" | "list" | "table" | "timeline",
  ) => {
    setView(newView);
  };

  const openTaskModal = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  const closeTaskModal = () => {
    setSelectedTaskId(null);
  };

  const openNewTaskModal = (useAI: boolean) => {
    // Vérifier si l'utilisateur a le droit de créer des tâches
    if (userRole === "observer") {
      toast.error("Les observateurs ne peuvent pas créer de tâches");
      return;
    }

    setIsAITaskCreationSelected(useAI);
    setIsNewTaskModalOpen(true);
  };

  const closeNewTaskModal = () => {
    setIsNewTaskModalOpen(false);
  };

  const handleToggleTimer = async (taskId: string) => {
    if (!formattedProject) return;

    const task = formattedProject.columns
      ?.flatMap((col: { tasks: any }) => col.tasks)
      .find((t: { id: string }) => t.id === taskId);

    if (!task || !canUserModifyTask(task)) {
      toast.error("Vous n'avez pas la permission de modifier cette tâche");
      return;
    }

    try {
      await toggleTaskTimer(taskId).unwrap();
      // Ne pas afficher de toast pour ne pas perturber l'utilisateur
    } catch (error) {
      toast.error("Erreur lors de la gestion du chronomètre");
      console.error("Error toggling timer:", error);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: any) => {
    if (!formattedProject) return;

    const task = formattedProject.columns
      ?.flatMap((col: { tasks: any }) => col.tasks)
      .find((t: { id: string }) => t.id === taskId);

    if (!task || !canUserModifyTask(task)) {
      toast.error("Vous n'avez pas la permission de modifier cette tâche");
      return;
    }

    try {
      // Assurons-nous que les noms des champs correspondent à ce que le backend attend
      const updatedData = {
        ...updates,
        // Assurez-vous que ces champs sont correctement nommés pour le backend
        due_date: updates.due_date || updates.dueDate,
        assignee_id: updates.assignee_id || updates.assigneeId,
      };

      // Supprimons les champs qui pourraient causer des conflits
      if (updatedData.dueDate) delete updatedData.dueDate;
      if (updatedData.assigneeId) delete updatedData.assigneeId;

      await updateTask({ id: taskId, ...updatedData }).unwrap();
      toast.success("Tâche mise à jour avec succès");

      // Forcer un rafraîchissement des données
      await refetch();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour de la tâche");
      console.error("Error updating task:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!formattedProject) return;

    const task = formattedProject.columns
      ?.flatMap((col: { tasks: any }) => col.tasks)
      .find((t: { id: string }) => t.id === taskId);

    if (!task || !canUserModifyTask(task)) {
      toast.error("Vous n'avez pas la permission de supprimer cette tâche");
      return;
    }

    try {
      await deleteTask(taskId).unwrap();
      setSelectedTaskId(null);
      toast.success("Tâche supprimée avec succès");
    } catch (error) {
      toast.error("Erreur lors de la suppression de la tâche");
      console.error("Error deleting task:", error);
    }
  };

  const handleAddComment = async (taskId: string, comment: any) => {
    if (!formattedProject) return;

    const task = formattedProject.columns
      ?.flatMap((col: { tasks: any }) => col.tasks)
      .find((t: { id: string }) => t.id === taskId);

    if (!task || !canUserModifyTask(task)) {
      toast.error(
        "Vous n'avez pas la permission d'ajouter des commentaires à cette tâche",
      );
      return;
    }

    try {
      await addComment({
        taskId,
        author_id: comment.authorId,
        text: comment.text,
      }).unwrap();

      toast.success("Commentaire ajouté avec succès");
      await refetch();
    } catch (error) {
      toast.error("Erreur lors de l'ajout du commentaire");
      console.error("Error adding comment:", error);
    }
  };

  const handleAddAttachment = async (taskId: string, attachment: any) => {
    if (!formattedProject) return;

    const task = formattedProject.columns
      ?.flatMap((col: { tasks: any }) => col.tasks)
      .find((t: { id: string }) => t.id === taskId);

    if (!task || !canUserModifyTask(task)) {
      toast.error(
        "Vous n'avez pas la permission d'ajouter des pièces jointes à cette tâche",
      );
      return;
    }

    try {
      await addAttachment({ taskId, ...attachment }).unwrap();
      toast.success("Pièce jointe ajoutée avec succès");
    } catch (error) {
      toast.error("Erreur lors de l'ajout de la pièce jointe");
      console.error("Error adding attachment:", error);
    }
  };

  // Fonction simplifiée pour déplacer une tâche
  const handleMoveTask = async (
    taskId: string,
    sourceColId: string,
    targetColId: string,
  ) => {
    if (!formattedProject) return;

    console.log("Tentative de déplacement de tâche:", {
      taskId,
      sourceColId,
      targetColId,
      canDrag: canDragTask(taskId),
    });

    // Vérifier si l'utilisateur peut déplacer cette tâche avec la nouvelle fonction simplifiée
    if (!canDragTask(taskId)) {
      toast.error("Vous n'avez pas la permission de déplacer cette tâche");
      return;
    }

    try {
      // Trouver la colonne cible pour afficher son nom dans le message de succès
      const targetColumn = formattedProject.columns.find(
        (col: { id: string }) => col.id === targetColId,
      );
      const targetColumnName = targetColumn
        ? targetColumn.title
        : "nouvelle colonne";

      await moveTask({
        task_id: taskId,
        source_column_id: sourceColId,
        target_column_id: targetColId,
      }).unwrap();

      toast.success(`Tâche déplacée vers "${targetColumnName}" avec succès`);
      // Le statut de la tâche est automatiquement mis à jour par le backend en fonction du titre de la colonne
      // Forcer un rafraîchissement des données
      await refetch();
    } catch (error: any) {
      console.error("Error moving task:", error);
      toast.error(
        `Erreur lors du déplacement de la tâche: ${error?.data?.message || "Erreur inconnue"}`,
      );
    }
  };

  const handleAddColumn = async (columnData: any) => {
    if (userRole !== "manager") {
      toast.error("Seuls les managers peuvent ajouter des colonnes");
      return;
    }

    try {
      await addColumn({
        project_id: projectId,
        title: columnData.title,
        order: columnData.order,
      }).unwrap();
      toast.success("Colonne ajoutée avec succès");
    } catch (error) {
      toast.error("Erreur lors de l'ajout de la colonne");
      console.error("Error adding column:", error);
    }
  };

  const handleReorderColumns = async (columns: any[]) => {
    if (userRole !== "manager") {
      toast.error("Seuls les managers peuvent réorganiser les colonnes");
      return;
    }

    try {
      await updateColumnOrder({
        project_id: projectId,
        columns: columns.map((col, index) => ({
          id: col.id,
          order: index,
        })),
      }).unwrap();
      toast.success("Colonnes réorganisées avec succès");
    } catch (error) {
      toast.error("Erreur lors de la réorganisation des colonnes");
      console.error("Error reordering columns:", error);
    }
  };

  const handleDeleteProject = async () => {
    if (userRole !== "manager") {
      toast.error("Seuls les managers peuvent supprimer le projet");
      return;
    }

    try {
      await deleteProject(projectId).unwrap();
      toast.success("Projet supprimé avec succès");
      // Rediriger vers la page des projets
      router.push("/home");
    } catch (error) {
      toast.error("Erreur lors de la suppression du projet");
      console.error("Error deleting project:", error);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (userRole !== "manager") {
      toast.error("Seuls les managers peuvent supprimer des colonnes");
      return;
    }

    try {
      await deleteColumn(columnId).unwrap();
      toast.success("Colonne supprimée avec succès");
      // Forcer un rafraîchissement des données
      await refetch();
    } catch (error) {
      toast.error("Erreur lors de la suppression de la colonne");
      console.error("Error deleting column:", error);
    }
  };

  // Loading state
  if (isLoading || isAcceptingInvitation) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-violet-500" />
          <h1 className="mb-2 text-xl font-medium text-gray-800 dark:text-gray-200">
            {isAcceptingInvitation
              ? "Acceptation de l'invitation..."
              : "Chargement du projet..."}
          </h1>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="mb-2 text-xl font-medium text-red-600 dark:text-red-400">
            Erreur lors du chargement du projet
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {JSON.stringify(error)}
          </p>
        </div>
      </div>
    );
  }

  // If no project is loaded, display a message
  if (!project || !formattedProject) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="mb-2 text-xl font-medium text-gray-800 dark:text-gray-200">
            Aucun projet disponible
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Veuillez créer un nouveau projet pour commencer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <ProjectHeader
        project={formattedProject}
        onNewTask={handleNewTask}
        currentView={view}
        onViewChange={handleViewChange}
        userRole={userRole}
        onDeleteProject={handleDeleteProject}
      />

      {/* Bouton flottant pour le chatbot */}
      <button
        onClick={() => setShowChatbot(true)}
        className="fixed bottom-6 right-6 z-20 rounded-full bg-violet-500 p-4 text-white shadow-lg transition-colors hover:bg-violet-600"
        title="Assistant IA"
      >
        <Bot size={24} />
      </button>

      <div className="flex-grow overflow-hidden">
        {view === "kanban" && (
          <KanbanView
            project={formattedProject}
            onMoveTask={handleMoveTask}
            onAddColumn={handleAddColumn}
            onReorderColumns={handleReorderColumns}
            onTaskClick={openTaskModal}
            userRole={userRole}
            currentUserId={currentUserId}
            canUserModifyTask={canUserModifyTask}
            canDragTask={canDragTask}
            onDeleteColumn={handleDeleteColumn}
          />
        )}
        {view === "list" && (
          <ListView project={formattedProject} onTaskClick={openTaskModal} />
        )}
        {view === "table" && (
          <TableView project={formattedProject} onTaskClick={openTaskModal} />
        )}
        {view === "timeline" && (
          <TimelineView
            project={formattedProject}
            onTaskClick={openTaskModal}
          />
        )}
      </div>

      {/* Modal for task details */}
      {selectedTaskId && selectedTask && (
        <TaskModal
          task={selectedTask}
          teamMembers={formattedProject.team}
          onClose={closeTaskModal}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onToggleTimer={handleToggleTimer}
          onAddComment={handleAddComment}
          onAddAttachment={handleAddAttachment}
          userRole={userRole}
          currentUserId={currentUserId}
          canUserModifyTask={canUserModifyTask}
        />
      )}

      {/* Modal for choosing task creation type */}
      {showNewTaskOptions && (
        <TaskAICreationModal
          onClose={closeNewTaskOptions}
          onSelectOption={openNewTaskModal}
        />
      )}

      {/* Modal for creating a new task */}
      {isNewTaskModalOpen && (
        <NewTaskModal
          teamMembers={formattedProject.team}
          isAIMode={isAITaskCreationSelected}
          onClose={closeNewTaskModal}
          projectId={projectId}
          columns={formattedProject.columns}
          userRole={userRole}
          currentUserId={currentUserId}
        />
      )}

      {/* Modal du chatbot */}
      {showChatbot && <ChatbotModal onClose={() => setShowChatbot(false)} />}
    </div>
  );
};

export default ProjectPage;
