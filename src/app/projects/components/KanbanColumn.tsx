"use client";

import type React from "react";
import { useState, useEffect } from "react";
import type { Column, Task, TeamMember } from "../types/kanban";
import TaskCard from "./TaskCard";
import { Trash, Clock } from "lucide-react";
import TaskAICreationModal from "./TaskAICreationModal";
import { toast } from "sonner";

interface KanbanColumnProps {
  column: Column;
  teamMembers: TeamMember[];
  onTaskMove: (
    taskId: string,
    sourceColumnId: string,
    targetColumnId: string,
  ) => void;
  columnColor: string;
  openTaskModal: (taskId: string) => void;
  userRole: string;
  currentUserId: string;
  canUserModifyTask: (task: any) => boolean;
  canDragTask: (taskId: string) => boolean;
  onDeleteColumn: (columnId: string) => void;
  onColumnDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onColumnDragEnd?: () => void;
  isColumnDraggable?: boolean;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  teamMembers,
  onTaskMove,
  columnColor,
  openTaskModal,
  userRole,
  currentUserId,
  canUserModifyTask,
  canDragTask,
  onDeleteColumn,
  onColumnDragStart,
  onColumnDragEnd,
  isColumnDraggable = false,
}) => {
  const [showTaskOptions, setShowTaskOptions] = useState(false);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, string>>({});
  const [timerTick, setTimerTick] = useState(0);

  // Mettre à jour les temps écoulés toutes les secondes
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick((prev) => prev + 1);
      updateAllElapsedTimes();
    }, 1000);

    return () => clearInterval(interval);
  }, [column.tasks]);

  // Mettre à jour tous les temps écoulés
  const updateAllElapsedTimes = () => {
    const newElapsedTimes: Record<string, string> = {};

    column.tasks.forEach((task) => {
      newElapsedTimes[task.id] = calculateElapsedTime(task);
    });

    setElapsedTimes(newElapsedTimes);
  };

  // Initialiser les temps écoulés au chargement
  useEffect(() => {
    updateAllElapsedTimes();
  }, [column.tasks]);

  // Fonction simplifiée pour gérer le début du drag
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    // Utiliser la fonction simplifiée canDragTask pour vérifier les permissions
    if (!canDragTask(taskId)) {
      e.preventDefault();
      toast.error("Vous n'avez pas la permission de déplacer cette tâche");
      return;
    }

    // Si on arrive ici, l'utilisateur peut déplacer la tâche
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.setData("sourceColId", column.id);
    e.dataTransfer.setData("type", "task"); // Identifier que c'est une tâche qui est déplacée
    e.currentTarget.classList.add("opacity-75", "scale-95");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("opacity-75", "scale-95");
    setDraggedOverIndex(null);
  };

  // Autoriser le drop
  const handleDragOver = (e: React.DragEvent, index?: number) => {
    e.preventDefault();

    // Vérifier si c'est une tâche qui est déplacée
    const dataType =
      e.dataTransfer.types.includes("type") &&
      e.dataTransfer.getData("type") === "task";

    if (!dataType) return; // Si ce n'est pas une tâche, ne rien faire ici

    e.dataTransfer.dropEffect = "move";
    if (typeof index === "number") {
      setDraggedOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverIndex(null);
  };

  // Fonction simplifiée pour gérer le drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    // Vérifier si c'est une tâche qui est déplacée
    if (
      !e.dataTransfer.types.includes("type") ||
      e.dataTransfer.getData("type") !== "task"
    ) {
      return; // Si ce n'est pas une tâche, ne rien faire ici
    }

    const taskId = e.dataTransfer.getData("taskId");
    const sourceColId = e.dataTransfer.getData("sourceColId");

    setDraggedOverIndex(null);

    // Vérifier que les données nécessaires sont présentes
    if (!taskId || !sourceColId) {
      toast.error("Données de glisser-déposer incomplètes");
      return;
    }

    // Vérifier que la tâche n'est pas déjà dans cette colonne
    if (sourceColId === column.id) {
      return;
    }

    // Appeler la fonction de déplacement
    // Le backend mettra automatiquement à jour le statut de la tâche en fonction du titre de la colonne
    onTaskMove(taskId, sourceColId, column.id);
  };

  // Modifier la fonction calculateElapsedTime pour corriger le calcul du temps
  const calculateElapsedTime = (task: Task): string => {
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

      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    } catch (error) {
      console.error("Erreur lors du calcul du temps écoulé:", error);
      return "00:00:00";
    }
  };

  // Gérer le clic sur le bouton Plus
  const handleAddTaskClick = () => {
    if (userRole === "observer") {
      toast.error("Les observateurs ne peuvent pas créer de tâches");
      return;
    }

    setShowTaskOptions(true);
  };

  // Fermer le modal des options
  const closeTaskOptions = () => {
    setShowTaskOptions(false);
  };

  // Gérer le partage d'une tâche
  const handleShareTask = (taskId: string) => {
    if (userRole !== "manager") {
      toast.error("Seuls les managers peuvent partager des tâches");
      return;
    }

    toast.success("Tâche partagée avec l'équipe");
  };

  // Obtenir le style de la bordure selon la couleur
  const getColumnBorderStyle = () => {
    return `border-l-4 border-l-${columnColor}-400`;
  };

  // Obtenir le style du header selon la couleur
  const getColumnHeaderStyle = () => {
    return `bg-${columnColor}-50 dark:bg-${columnColor}-900/20`;
  };

  return (
    <div
      className={`kanban-column relative flex h-full flex-col dark:border-gray-700 dark:bg-gray-800 ${getColumnBorderStyle()}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={`kanban-column-header mb-4 flex items-center justify-between dark:bg-gray-700 ${getColumnHeaderStyle()} ${isColumnDraggable ? "cursor-move" : ""}`}
        draggable={isColumnDraggable}
        onDragStart={onColumnDragStart}
        onDragEnd={onColumnDragEnd}
      >
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          {column.title}{" "}
          <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">
            ({column.tasks.length})
          </span>
        </h2>

        {userRole === "manager" && (
          <button
            onClick={() => onDeleteColumn(column.id)}
            className="kanban-column-delete-btn rounded-full p-1.5 text-red-700 transition-colors hover:bg-red-300 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700"
            title="Supprimer la colonne"
          >
            <Trash size={15} />
          </button>
        )}
      </div>

      <div className="kanban-column-body scrollbar-none flex-grow space-y-3 overflow-y-auto px-2 pb-4 dark:bg-gray-800/90">
        {column.tasks.map((task, index) => {
          const assignee = task.assigneeId
            ? teamMembers.find((member) => member.id === task.assigneeId)
            : undefined;
          const isDraggable = canDragTask(task.id);

          return (
            <div
              key={task.id}
              draggable={isDraggable}
              onDragStart={(e) => handleDragStart(e, task.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              className={`task-drag-container relative ${draggedOverIndex === index ? "scale-105 transform border-2 border-violet-400" : ""}`}
            >
              <TaskCard
                task={task}
                assignee={assignee}
                onShare={() => handleShareTask(task.id)}
                onTaskClick={() => openTaskModal(task.id)}
                userRole={userRole}
                currentUserId={currentUserId}
                canUserModifyTask={canUserModifyTask}
                isDraggable={isDraggable}
              />

              {/* Affichage du timer avec cercle clignotant et bouton de contrôle */}
              <div className="task-timer absolute right-0 top-0 flex items-center rounded-bl-md rounded-tr-md bg-gradient-to-r from-violet-500 to-violet-600 px-2 py-1 text-xs text-white shadow-sm dark:from-violet-700 dark:to-violet-800">
                {task.timerActive && (
                  <span className="mr-1 h-2 w-2 animate-pulse rounded-full bg-red-500"></span>
                )}
                <Clock size={12} className="mr-1" />
                <span className="font-mono">
                  {elapsedTimes[task.id] || calculateElapsedTime(task)}
                </span>
              </div>
            </div>
          );
        })}

        {column.tasks.length === 0 && (
          <div className="kanban-column-empty rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm italic text-gray-400 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700/50">
            Déposez une tâche ici
          </div>
        )}
      </div>

      {/* Modal pour choisir le type de création de tâche */}
      {showTaskOptions && (
        <TaskAICreationModal
          onClose={closeTaskOptions}
          onSelectOption={() => {}}
        />
      )}
    </div>
  );
};

export default KanbanColumn;
