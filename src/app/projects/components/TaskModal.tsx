"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import type { Task, TeamMember } from "../types/kanban";
import {
  X,
  Clock,
  Calendar,
  Tag,
  Paperclip,
  MessageSquare,
  Trash2,
  Edit,
  Save,
  Upload,
  Play,
  Pause,
  Loader2,
  Download,
} from "lucide-react";
import { format, type Locale } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { useLazyDownloadAttachmentQuery } from "@/app/state/api";

// Fonction de formatage sécurisée
const safeFormat = (
  dateInput: string | Date | undefined | null,
  formatStr: string,
  options?: { locale?: Locale },
): string => {
  try {
    const date = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(date.getTime())) throw new Error("Date invalide");
    return format(date, formatStr, options);
  } catch (error) {
    console.error("Erreur de formatage de date:", error);
    return "Date invalide";
  }
};

interface TaskModalProps {
  task: Task;
  teamMembers: TeamMember[];
  onClose: () => void;
  onUpdateTask: (taskId: string, updates: any) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onToggleTimer: (taskId: string) => Promise<void>;
  onAddComment: (taskId: string, comment: any) => Promise<void>;
  onAddAttachment: (taskId: string, attachment: any) => Promise<void>;
  userRole: string;
  currentUserId: string;
  canUserModifyTask: (task: any) => boolean;
}

const TaskModal: React.FC<TaskModalProps> = ({
  task,
  teamMembers,
  onClose,
  onUpdateTask,
  onDeleteTask,
  onToggleTimer,
  onAddComment,
  onAddAttachment,
  userRole,
  currentUserId,
  canUserModifyTask,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task);
  const [newComment, setNewComment] = useState("");
  const [elapsedTime, setElapsedTime] = useState("0h");
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<
    string | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // RTK Query hook pour télécharger les pièces jointes
  const [downloadAttachment, { isFetching: isDownloading }] =
    useLazyDownloadAttachmentQuery();

  // Déterminer les permissions en fonction du rôle et de la propriété de la tâche
  const canEdit = canUserModifyTask(task);
  const canDelete = canUserModifyTask(task);
  const canAddComment = userRole !== "observer"; // Tous sauf observateurs peuvent commenter
  const canAddAttachment = canUserModifyTask(task);
  const canToggleTimer = canUserModifyTask(task);

  // Seul le manager peut modifier la date d'échéance et l'assignation
  const isManager = userRole === "manager";

  // Mettre à jour le temps écoulé en temps réel
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    // Fonction pour calculer et mettre à jour le temps écoulé
    const updateElapsedTime = () => {
      try {
        let totalSeconds = (task.actualTime || 0) * 60; // Convertir les minutes en secondes

        // Si le timer est actif, ajouter le temps écoulé depuis le démarrage
        if (task.timerActive && task.startedAt) {
          const now = new Date();
          const started = new Date(task.startedAt);

          // Vérifier si la date est valide
          if (!isNaN(started.getTime())) {
            const elapsedSeconds = Math.floor(
              (now.getTime() - started.getTime()) / 1000,
            );
            totalSeconds += elapsedSeconds;
          }
        }

        // Formater le temps en heures:minutes:secondes
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

        setElapsedTime(formattedTime);
      } catch (error) {
        console.error("Erreur lors du calcul du temps écoulé:", error);
        setElapsedTime("00:00:00");
      }
    };

    // Mettre à jour immédiatement
    updateElapsedTime();

    // Si le timer est actif, mettre à jour toutes les secondes
    if (task.timerActive) {
      interval = setInterval(() => {
        updateElapsedTime();
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [task.timerActive, task.startedAt, task.actualTime, timerSeconds]);

  // Obtenir l'assigné de la tâche
  const assignee = task.assigneeId
    ? teamMembers.find((member) => member.id === task.assigneeId)
    : undefined;

  // Gérer le timer
  const handleToggleTimer = async () => {
    if (!canToggleTimer) {
      toast.error(
        "Vous n'avez pas la permission de modifier le chronomètre de cette tâche",
      );
      return;
    }

    try {
      setIsLoading(true);

      // Appeler l'API pour basculer le timer
      await onToggleTimer(task.id);

      // Afficher un toast pour indiquer le succès
      if (!task.timerActive) {
        toast.success("Chronomètre démarré");
      } else {
        toast.info("Chronomètre mis en pause");
      }
    } catch (error) {
      console.error("Error toggling timer:", error);
      toast.error("Erreur lors de la modification du chronomètre");
    } finally {
      setIsLoading(false);
    }
  };

  // Couleur en fonction de la priorité
  const getPriorityColor = () => {
    switch (task.priority) {
      case "basse":
        return "bg-blue-100 text-blue-700";
      case "moyenne":
        return "bg-green-100 text-green-700";
      case "haute":
        return "bg-orange-100 text-orange-700";
      case "urgente":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Gérer la soumission des modifications
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canEdit) {
      toast.error("Vous n'avez pas la permission de modifier cette tâche");
      return;
    }

    setIsLoading(true);

    try {
      // Formater correctement les données avant l'envoi
      const updatedTask = {
        ...editedTask,
        // Convertir la date en format ISO pour le backend ou null si pas de date
        due_date: editedTask.dueDate
          ? new Date(editedTask.dueDate).toISOString()
          : null,
        // S'assurer que assigneeId est correctement formaté (null si non assigné)
        assignee_id: editedTask.assigneeId || null,
      };

      console.log("Données envoyées au backend:", updatedTask);

      await onUpdateTask(task.id, updatedTask);
      setIsEditing(false);
      toast.success("Tâche mise à jour avec succès");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Erreur lors de la mise à jour de la tâche");
    } finally {
      setIsLoading(false);
    }
  };

  // Gérer l'ajout d'un commentaire
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canAddComment) {
      toast.error(
        "Vous n'avez pas la permission d'ajouter des commentaires à cette tâche",
      );
      return;
    }

    if (!newComment.trim()) return;

    setIsLoading(true);

    try {
      // Trouver le membre d'équipe correspondant à l'utilisateur actuel
      const currentTeamMember = teamMembers.find(
        (member) => member.clerk_user_id === currentUserId,
      );
      const authorId = currentTeamMember
        ? currentTeamMember.id
        : teamMembers[0].id;

      const comment = {
        authorId: authorId,
        text: newComment,
      };

      await onAddComment(task.id, comment);
      setNewComment(""); // Réinitialiser le champ de commentaire
      toast.success("Commentaire ajouté avec succès");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Erreur lors de l'ajout du commentaire");
    } finally {
      setIsLoading(false);
    }
  };

  // Gérer le téléchargement de fichier
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canAddAttachment) {
      toast.error(
        "Vous n'avez pas la permission d'ajouter des pièces jointes à cette tâche",
      );
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    try {
      // Simuler un téléchargement
      const attachment = {
        name: file.name,
        type: file.type,
        file: file,
        size: file.size,
      };

      await onAddAttachment(task.id, attachment);
      toast.success("Pièce jointe ajoutée avec succès");

      // Réinitialiser l'input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Erreur lors de l'ajout de la pièce jointe");
    } finally {
      setIsLoading(false);
    }
  };

  // Formater la taille du fichier
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " octets";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " Ko";
    return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
  };

  // Supprimer la tâche
  const handleDelete = async () => {
    if (!canDelete) {
      toast.error("Vous n'avez pas la permission de supprimer cette tâche");
      return;
    }

    // Open the confirmation dialog instead of window.confirm
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setIsLoading(true);

    try {
      await onDeleteTask(task.id);
      toast.success("Tâche supprimée avec succès");
      onClose();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Erreur lors de la suppression de la tâche");
    } finally {
      setIsLoading(false);
    }
  };

  // Trouver l'auteur d'un commentaire de manière sécurisée
  const findCommentAuthor = (comment: any) => {
    // Si le commentaire a déjà un auteur chargé depuis le backend
    if (comment.author && comment.author.name) {
      return comment.author;
    }

    // Sinon, essayer de trouver l'auteur dans la liste des membres d'équipe
    if (comment.authorId) {
      // Convertir les IDs en string pour la comparaison
      const authorIdStr = String(comment.authorId);
      const author = teamMembers.find(
        (member) => String(member.id) === authorIdStr,
      );
      if (author) return author;
    }

    // Si aucun auteur n'est trouvé
    return null;
  };

  // Fonction pour télécharger une pièce jointe avec RTK Query
  const handleDownloadAttachment = async (
    attachmentId: string,
    fileName: string,
  ) => {
    try {
      console.log(
        "Début du téléchargement pour l'attachment ID:",
        attachmentId,
      );
      setDownloadingAttachmentId(attachmentId);

      // Utiliser RTK Query pour télécharger le fichier
      const result = await downloadAttachment(attachmentId);

      console.log("Résultat du téléchargement:", result);

      if (result.error) {
        console.error("Erreur RTK Query:", result.error);
        let errorMessage = "Erreur lors du téléchargement du fichier";

        if ("status" in result.error) {
          if (result.error.status === 404) {
            errorMessage = "Fichier non trouvé sur le serveur";
          } else if (result.error.status === 403) {
            errorMessage =
              "Vous n'avez pas la permission d'accéder à ce fichier";
          } else if (result.error.status === 401) {
            errorMessage = "Authentification requise";
          }
        }

        throw new Error(errorMessage);
      }

      if (!result.data) {
        throw new Error("Aucune donnée reçue du serveur");
      }

      console.log(
        "Blob reçu, taille:",
        result.data.size,
        "Type:",
        result.data.type,
      );

      if (result.data.size === 0) {
        throw new Error("Le fichier téléchargé est vide");
      }

      // Créer un URL temporaire pour le blob
      const blobUrl = window.URL.createObjectURL(result.data);

      // Créer un élément <a> temporaire pour déclencher le téléchargement
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = "none";

      // Ajouter au DOM, cliquer, puis supprimer
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Nettoyer l'URL du blob après un délai
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 100);

      toast.success("Fichier téléchargé avec succès");
    } catch (error) {
      console.error("Error downloading attachment:", error);
      toast.error(
        `Erreur lors du téléchargement: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
      );
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b bg-violet-50 p-4">
          <div className="flex items-center space-x-2">
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${getPriorityColor()}`}
            >
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
            {task.dueDate && (
              <span className="flex items-center text-xs text-gray-500">
                <Calendar size={14} className="mr-1" />
                {safeFormat(task.dueDate, "dd MMMM yyyy", { locale: fr })}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Compteur de temps avec bouton toggle */}
            <div className="flex items-center rounded-md bg-violet-100 px-3 py-1.5 text-sm text-violet-600">
              <Clock size={16} className="mr-2" />
              <span className="font-mono">{elapsedTime}</span>
              {canToggleTimer && (
                <button
                  onClick={handleToggleTimer}
                  disabled={isLoading}
                  className="ml-3 rounded-full p-1.5 transition-colors hover:bg-violet-200 disabled:opacity-50"
                  title={task.timerActive ? "Arrêter" : "Démarrer"}
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : task.timerActive ? (
                    <Pause size={16} />
                  ) : (
                    <Play size={16} />
                  )}
                </button>
              )}
            </div>

            {!isEditing ? (
              <>
                {canEdit && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center rounded-md bg-violet-500 p-2 text-white transition-colors hover:bg-violet-600"
                    title="Modifier"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <Edit size={18} className="mr-1" /> Modifier
                      </>
                    )}
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    className="rounded-full bg-red-100 p-2 text-red-600 hover:bg-red-200"
                    title="Supprimer"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={handleSubmit}
                className="rounded-full bg-violet-100 p-2 text-violet-600 hover:bg-violet-200"
                title="Enregistrer"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-gray-100"
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-4">
          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="title"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Titre
                </label>
                <input
                  type="text"
                  id="title"
                  value={editedTask.title}
                  onChange={(e) =>
                    setEditedTask({ ...editedTask, title: e.target.value })
                  }
                  className="w-full rounded-md border p-2"
                  required
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="description"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  value={editedTask.description}
                  onChange={(e) =>
                    setEditedTask({
                      ...editedTask,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-md border p-2"
                  rows={4}
                />
              </div>

              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="assignee"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Assigné à {!isManager && "(Réservé aux managers)"}
                  </label>
                  <select
                    id="assignee"
                    value={editedTask.assigneeId || ""}
                    onChange={(e) => {
                      const newAssigneeId = e.target.value || undefined;
                      console.log("Nouvel assigné sélectionné:", newAssigneeId);
                      setEditedTask({
                        ...editedTask,
                        assigneeId: newAssigneeId,
                      });
                    }}
                    className={`w-full rounded-md border p-2 ${!isManager ? "cursor-not-allowed bg-gray-100" : ""}`}
                    disabled={!isManager}
                  >
                    <option value="">Non assigné</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="priority"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Priorité
                  </label>
                  <select
                    id="priority"
                    value={editedTask.priority}
                    onChange={(e) =>
                      setEditedTask({
                        ...editedTask,
                        priority: e.target.value as Task["priority"],
                      })
                    }
                    className="w-full rounded-md border p-2"
                  >
                    <option value="basse">Basse</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="col-span-2 mt-2">
                <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  <p>
                    Note: Le statut de la tâche est automatiquement déterminé
                    par la colonne dans laquelle elle se trouve.
                  </p>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="estimatedTime"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Temps estimé (minutes)
                  </label>
                  <input
                    type="number"
                    id="estimatedTime"
                    value={editedTask.estimatedTime}
                    onChange={(e) =>
                      setEditedTask({
                        ...editedTask,
                        estimatedTime: Number.parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-md border p-2"
                    min="0"
                  />
                </div>

                <div>
                  <label
                    htmlFor="dueDate"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Date d'échéance {!isManager && "(Réservé aux managers)"}
                  </label>
                  <input
                    type="date"
                    id="dueDate"
                    value={
                      editedTask.dueDate
                        ? format(new Date(editedTask.dueDate), "yyyy-MM-dd")
                        : ""
                    }
                    onChange={(e) => {
                      if (isManager) {
                        const newDate = e.target.value
                          ? new Date(e.target.value)
                          : undefined;
                        console.log(
                          "Nouvelle date sélectionnée:",
                          e.target.value,
                          "convertie en:",
                          newDate,
                        );
                        setEditedTask({
                          ...editedTask,
                          dueDate: newDate,
                        });
                      }
                    }}
                    className={`w-full rounded-md border p-2 ${!isManager ? "cursor-not-allowed bg-gray-100" : ""}`}
                    disabled={!isManager}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="tags"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Tags (séparés par des virgules)
                </label>
                <input
                  type="text"
                  id="tags"
                  value={editedTask.tags.join(", ")}
                  onChange={(e) =>
                    setEditedTask({
                      ...editedTask,
                      tags: e.target.value
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full rounded-md border p-2"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="mr-2 rounded-md bg-gray-100 px-4 py-2 text-gray-700"
                  disabled={isLoading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex items-center rounded-md bg-violet-500 px-4 py-2 text-white hover:bg-violet-600"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    "Enregistrer"
                  )}
                </button>
              </div>
            </form>
          ) : (
            <>
              <h2 className="mb-4 text-xl font-semibold">{task.title}</h2>

              <div className="mb-6">
                <p className="whitespace-pre-line text-gray-700">
                  {task.description}
                </p>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <Clock size={18} className="mr-2 text-violet-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">
                      Temps
                    </div>
                    <div className="text-sm text-gray-600">
                      Temps écoulé: {elapsedTime}
                    </div>
                  </div>
                </div>

                {assignee && (
                  <div className="flex items-center">
                    <div className="mr-2 h-8 w-8">
                      <img
                        src={assignee.avatar || "/placeholder.svg"}
                        alt={assignee.name}
                        className="h-full w-full rounded-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        Assigné à
                      </div>
                      <div className="text-sm text-gray-600">
                        {assignee.name}
                      </div>
                    </div>
                  </div>
                )}

                {task.dueDate && (
                  <div className="flex items-center">
                    <Calendar size={18} className="mr-2 text-violet-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        Échéance
                      </div>
                      <div className="text-sm text-gray-600">
                        {safeFormat(task.dueDate, "dd MMMM yyyy", {
                          locale: fr,
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {task.tags.length > 0 && (
                  <div className="flex items-start">
                    <Tag size={18} className="mr-2 mt-0.5 text-violet-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        Tags
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {task.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8">
                <div className="mb-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center text-lg font-medium">
                      <Paperclip size={18} className="mr-2 text-violet-500" />
                      Pièces jointes
                    </h3>
                    {canAddAttachment && (
                      <>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center rounded-md bg-violet-100 px-3 py-1.5 text-sm text-violet-700 transition-colors hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-800/40"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 size={16} className="mr-1 animate-spin" />
                          ) : (
                            <Upload size={16} className="mr-1" />
                          )}
                          Ajouter un fichier
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </>
                    )}
                  </div>

                  {task.attachments.length > 0 ? (
                    <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border p-2">
                      {task.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center rounded-md bg-gray-50 p-3 dark:bg-gray-800"
                        >
                          <div className="mr-2 text-gray-500">
                            <Paperclip size={16} />
                          </div>
                          <div className="flex-grow">
                            <div className="text-sm font-medium dark:text-white">
                              {attachment.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {formatFileSize(attachment.size)}
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              handleDownloadAttachment(
                                attachment.id,
                                attachment.name,
                              )
                            }
                            disabled={
                              downloadingAttachmentId === attachment.id ||
                              isDownloading
                            }
                            className="flex items-center rounded-md bg-violet-100 px-2 py-1 text-sm text-violet-700 transition-colors hover:bg-violet-200 disabled:opacity-50 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-800/40"
                          >
                            {downloadingAttachmentId === attachment.id ? (
                              <Loader2
                                size={16}
                                className="mr-1 animate-spin"
                              />
                            ) : (
                              <Download size={16} className="mr-1" />
                            )}
                            Télécharger
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-md bg-gray-50 p-3 text-sm italic text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      Aucune pièce jointe. Ajoutez des fichiers pour partager
                      des ressources.
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="mb-3 flex items-center text-lg font-medium">
                    <MessageSquare size={18} className="mr-2 text-violet-500" />
                    Commentaires ({task.comments.length})
                  </h3>

                  {canAddComment && (
                    <form onSubmit={handleAddComment} className="mb-4">
                      <div className="flex">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Ajouter un commentaire..."
                          className="flex-grow rounded-l-md border border-gray-300 p-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          disabled={isLoading}
                        />
                        <button
                          type="submit"
                          className="flex items-center rounded-r-md bg-violet-500 px-4 py-2 text-white transition-colors hover:bg-violet-600 focus:outline-none"
                          disabled={!newComment.trim() || isLoading}
                        >
                          {isLoading ? (
                            <Loader2 size={16} className="mr-1 animate-spin" />
                          ) : null}
                          Envoyer
                        </button>
                      </div>
                    </form>
                  )}

                  {task.comments.length > 0 ? (
                    <div className="max-h-60 space-y-4 overflow-y-auto rounded-md border p-2">
                      {task.comments.map((comment) => {
                        const author = findCommentAuthor(comment);

                        return (
                          <div
                            key={comment.id}
                            className="flex rounded-md bg-gray-50 p-3 dark:bg-gray-800"
                          >
                            {author ? (
                              <div className="mr-3 h-10 w-10 flex-shrink-0">
                                <img
                                  src={author.avatar || "/placeholder.svg"}
                                  alt={author.name}
                                  className="h-full w-full rounded-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="mr-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-300">
                                <span className="text-gray-600">?</span>
                              </div>
                            )}
                            <div className="flex-grow">
                              <div className="mb-1 flex items-center">
                                <span className="mr-2 text-sm font-medium">
                                  {author ? author.name : "Utilisateur inconnu"}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {safeFormat(
                                    comment.createdAt,
                                    "dd MMM yyyy à HH:mm",
                                    { locale: fr },
                                  )}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {comment.text}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-md bg-gray-50 p-3 text-sm italic text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      Aucun commentaire. Soyez le premier à commenter !
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <div>
        {/* Alert Dialog for Delete Confirmation */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmation de suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer cette tâche ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default TaskModal;
