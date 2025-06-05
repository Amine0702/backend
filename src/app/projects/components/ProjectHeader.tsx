"use client";

import type React from "react";
import { useState, useEffect } from "react";
import type { Project } from "../types/kanban";
import {
  Plus,
  List,
  Table,
  LayoutGrid,
  Clock,
  Share,
  X,
  Calendar,
  UserCog,
  Info,
  AlertCircle,
  Bot,
  Trash,
} from "lucide-react";
import TeamAvatars from "./TeamAvatars";
import { format } from "date-fns";
import { Button } from "@/app/components/ui/button";
import { Toggle } from "@/app/components/ui/toggle";
import ProjectShareModal from "./ProjectShareModal";
import ChatbotModal from "./ChatbotModal";
import { toast } from "sonner";
import { useRemoveMemberFromProjectMutation } from "@/app/state/api";
import ConfirmationModal from "./ConfirmationModal";

interface ProjectHeaderProps {
  project: Project;
  onNewTask: () => void;
  currentView: "kanban" | "list" | "table" | "timeline";
  onViewChange: (view: "kanban" | "list" | "table" | "timeline") => void;
  userRole: string;
  onDeleteProject?: () => void;
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  onNewTask,
  currentView,
  onViewChange,
  userRole,
  onDeleteProject,
}) => {
  const totalTasks = project.columns.reduce(
    (acc, col) => acc + col.tasks.length,
    0,
  );
  const [showTeamDetails, setShowTeamDetails] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showDeleteProjectConfirmation, setShowDeleteProjectConfirmation] =
    useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | number | null>(
    null,
  );
  const [showRemoveMemberConfirmation, setShowRemoveMemberConfirmation] =
    useState(false);
  const [removeMemberFromProject, { isLoading: isRemovingMember }] =
    useRemoveMemberFromProjectMutation();
  const [formattedCreatedDate, setFormattedCreatedDate] = useState<
    string | null
  >(null);
  const [formattedUpdatedDate, setFormattedUpdatedDate] = useState<
    string | null
  >(null);

  // Formater les dates du projet
  useEffect(() => {
    // Fonction pour formater une date avec gestion d'erreur
    const formatDateSafely = (
      dateValue: any,
      formatString: string,
    ): string | null => {
      if (!dateValue) return null;

      try {
        // Si c'est une chaîne de caractères, essayer de la convertir en Date
        const date =
          typeof dateValue === "string" ? new Date(dateValue) : dateValue;

        // Vérifier si la date est valide
        if (isNaN(date.getTime())) {
          console.error("Date invalide:", dateValue);
          return null;
        }

        return format(date, formatString);
      } catch (error) {
        console.error("Erreur lors du formatage de la date:", error);
        return null;
      }
    };

    // Formater les dates avec le format court pour l'en-tête
    if (project.createdAt) {
      setFormattedCreatedDate(
        formatDateSafely(project.createdAt, "dd/MM/yyyy"),
      );
    }

    if (project.updatedAt) {
      setFormattedUpdatedDate(
        formatDateSafely(project.updatedAt, "dd/MM/yyyy"),
      );
    }
  }, [project.createdAt, project.updatedAt]);

  const projectManager = project.team.find(
    (member) => member.role === "manager",
  );

  // Assurons-nous que le bouton de partage dans ProjectHeader fonctionne correctement
  const handleShare = () => {
    // Vérifier si l'utilisateur est un manager
    if (userRole !== "manager") {
      toast.error("Seuls les managers peuvent partager le projet");
      return;
    }

    // Ouvrir le modal de partage
    setShowShareModal(true);
  };

  const handleNewTask = () => {
    // Vérifier si l'utilisateur a le droit de créer des tâches
    if (userRole === "observer") {
      toast.error("Les observateurs ne peuvent pas créer de tâches");
      return;
    }

    onNewTask();
  };

  const closeTeamDetails = () => {
    setShowTeamDetails(false);
  };

  const closeProjectDetails = () => {
    setShowProjectDetails(false);
  };

  const handleDeleteProject = () => {
    // Vérifier si l'utilisateur est un manager
    if (userRole !== "manager") {
      toast.error("Seuls les managers peuvent supprimer le projet");
      return;
    }

    // Vérifier si la fonction de suppression est disponible
    if (onDeleteProject) {
      setShowDeleteProjectConfirmation(true);
    }
  };

  const handleRemoveMember = (memberId: string | number) => {
    if (userRole !== "manager") {
      toast.error("Seuls les managers peuvent supprimer des membres");
      return;
    }

    setMemberToRemove(memberId);
    setShowRemoveMemberConfirmation(true);
  };

  const confirmRemoveMember = async () => {
    if (memberToRemove === null) return;

    try {
      await removeMemberFromProject({
        projectId: project.id,
        memberId: memberToRemove,
      }).unwrap();
      toast.success("Membre supprimé du projet avec succès");
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error(
        typeof error === "object" && error !== null && "data" in error
          ? (error.data as any)?.message ||
              "Erreur lors de la suppression du membre"
          : "Erreur lors de la suppression du membre",
      );
    }

    setShowRemoveMemberConfirmation(false);
    setMemberToRemove(null);
  };

  // Fonction pour formater une date pour l'affichage détaillé
  const formatDetailDate = (dateValue: any): string => {
    if (!dateValue) return "Non définie";

    try {
      // Si c'est une chaîne de caractères, essayer de la convertir en Date
      const date =
        typeof dateValue === "string" ? new Date(dateValue) : dateValue;

      // Vérifier si la date est valide
      if (isNaN(date.getTime())) {
        return "Non définie";
      }

      return format(date, "dd MMMM yyyy");
    } catch (error) {
      console.error("Erreur lors du formatage de la date détaillée:", error);
      return "Non définie";
    }
  };

  const confirmDeleteProject = () => {
    if (onDeleteProject) {
      onDeleteProject();
      setShowDeleteProjectConfirmation(false);
      toast.success("Projet supprimé avec succès");
    }
  };

  return (
    <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-violet-800 dark:text-violet-300">
            {project.name}
          </h1>
          <button
            onClick={() => setShowProjectDetails(true)}
            className="rounded-full p-1 text-violet-500 hover:bg-violet-50 hover:text-violet-700 dark:text-violet-400 dark:hover:bg-violet-900/20 dark:hover:text-violet-300"
            title="Détails du projet"
          >
            <Info size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center space-x-2">
          <div className="project-meta mr-4">
            <div className="project-meta-item flex items-center text-sm text-gray-600 dark:text-gray-300">
              <Calendar size={14} className="mr-1" />
              <span>Créé le {formattedCreatedDate || "Non défini"}</span>
            </div>

            <div className="project-meta-item flex items-center text-sm text-gray-600 dark:text-gray-300">
              <UserCog size={14} className="mr-1" />
              <span>Manager: {projectManager?.name || "Non défini"}</span>
            </div>
          </div>

          <div
            className="mr-4 cursor-pointer"
            onClick={() => setShowTeamDetails(true)}
            title="Voir l'équipe"
          >
            <TeamAvatars members={project.team} />
          </div>

          <Button
            onClick={() => setShowChatbot(true)}
            variant="outline"
            size="sm"
            className="mr-2 flex items-center rounded-md border border-blue-300 bg-white px-3 py-2 text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-600 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
          >
            <Bot size={16} className="mr-1" />
            Assistant IA
          </Button>

          <div className="flex items-center space-x-2">
            {userRole === "manager" && (
              <Button
                onClick={handleShare}
                variant="outline"
                size="sm"
                className="flex items-center rounded-md border border-violet-300 bg-white px-3 py-2 text-violet-600 transition-colors hover:bg-violet-50 dark:border-violet-600 dark:bg-gray-800 dark:text-violet-400 dark:hover:bg-violet-900/20"
              >
                <Share size={16} className="mr-1" />
                Partager
              </Button>
            )}

            {userRole !== "observer" && (
              <Button
                onClick={handleNewTask}
                size="sm"
                className="flex items-center rounded-md bg-violet-500 px-4 py-2 text-white transition-colors hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-700"
              >
                <Plus size={16} className="mr-1" />
                Nouvelle tâche
              </Button>
            )}

            {userRole === "manager" && onDeleteProject && (
              <Button
                onClick={handleDeleteProject}
                size="sm"
                variant="destructive"
                className="flex items-center rounded-md bg-red-500 px-3 py-2 text-white transition-colors hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
              >
                <Trash size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex space-x-1">
          <Toggle
            pressed={currentView === "kanban"}
            onClick={() => onViewChange("kanban")}
            className={`flex items-center rounded-md p-2 text-sm transition-colors ${
              currentView === "kanban"
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <LayoutGrid size={16} className="mr-1" />
            Kanban
          </Toggle>
          <Toggle
            pressed={currentView === "list"}
            onClick={() => onViewChange("list")}
            className={`flex items-center rounded-md p-2 text-sm transition-colors ${
              currentView === "list"
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <List size={16} className="mr-1" />
            Liste
          </Toggle>
          <Toggle
            pressed={currentView === "table"}
            onClick={() => onViewChange("table")}
            className={`flex items-center rounded-md p-2 text-sm transition-colors ${
              currentView === "table"
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <Table size={16} className="mr-1" />
            Tableau
          </Toggle>
          <Toggle
            pressed={currentView === "timeline"}
            onClick={() => onViewChange("timeline")}
            className={`flex items-center rounded-md p-2 text-sm transition-colors ${
              currentView === "timeline"
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <Clock size={16} className="mr-1" />
            Chronologie
          </Toggle>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-medium">{totalTasks}</span> tâches au total
        </div>
      </div>

      {/* Modal pour les détails du projet */}
      {showProjectDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-violet-800 dark:text-violet-300">
                Détails du projet
              </h2>
              <button
                onClick={closeProjectDetails}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-700 dark:text-gray-300">
                  Description
                </h3>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  {project.description || "Aucune description disponible"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300">
                    Date de création
                  </h3>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {formatDetailDate(project.createdAt)}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300">
                    Dernière modification
                  </h3>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {formatDetailDate(project.updatedAt)}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300">
                    Chef de projet
                  </h3>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {projectManager?.name || "Non défini"}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300">
                    Statut
                  </h3>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {project.status || "En cours"}
                  </p>
                </div>
              </div>

              {project.notes && (
                <div className="rounded-md border border-violet-200 bg-violet-50 p-3 dark:border-violet-700 dark:bg-violet-900/20">
                  <div className="flex items-center">
                    <AlertCircle
                      size={18}
                      className="mr-2 text-violet-600 dark:text-violet-400"
                    />
                    <h3 className="font-medium text-violet-700 dark:text-violet-300">
                      Notes importantes
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-violet-600 dark:text-violet-400">
                    {project.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal pour les détails de l'équipe */}
      {showTeamDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-violet-800 dark:text-violet-300">
                Équipe du projet
              </h2>
              <button
                onClick={closeTeamDetails}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {project.team.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-md bg-gray-50 p-3 transition-colors hover:bg-violet-50 dark:bg-gray-700 dark:hover:bg-violet-900/20"
                >
                  <div className="flex items-center">
                    <div className="mr-4 h-12 w-12 overflow-hidden rounded-full">
                      <img
                        src={member.avatar || "/placeholder.svg"}
                        alt={member.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-medium text-violet-800 dark:text-violet-300">
                        {member.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {member.role}
                      </p>
                    </div>
                  </div>

                  {userRole === "manager" && member.role !== "manager" && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={isRemovingMember}
                      className="rounded-full p-2 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      title="Supprimer du projet"
                    >
                      <Trash size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation pour supprimer un membre */}
      <ConfirmationModal
        isOpen={showRemoveMemberConfirmation}
        onClose={() => {
          setShowRemoveMemberConfirmation(false);
          setMemberToRemove(null);
        }}
        onConfirm={confirmRemoveMember}
        title="Supprimer un membre"
        message="Êtes-vous sûr de vouloir retirer ce membre du projet ?"
        confirmButtonText="Supprimer"
        confirmButtonVariant="destructive"
      />

      {/* Modal de confirmation pour supprimer le projet */}
      <ConfirmationModal
        isOpen={showDeleteProjectConfirmation}
        onClose={() => setShowDeleteProjectConfirmation(false)}
        onConfirm={confirmDeleteProject}
        title="Supprimer le projet"
        message="Êtes-vous sûr de vouloir supprimer ce projet ? "
        confirmButtonText="Supprimer"
        confirmButtonVariant="destructive"
      />

      {/* Modal pour le partage */}
      {showShareModal && (
        <ProjectShareModal
          onClose={() => setShowShareModal(false)}
          projectName={project.name}
          projectId={project.id}
        />
      )}

      {/* Modal pour le chatbot */}
      {showChatbot && <ChatbotModal onClose={() => setShowChatbot(false)} />}
    </div>
  );
};

export default ProjectHeader;
