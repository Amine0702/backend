"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import KanbanColumn from "./KanbanColumn";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { toast } from "sonner";

interface KanbanViewProps {
  project: any;
  onMoveTask: (
    taskId: string,
    sourceColumnId: string,
    targetColumnId: string,
  ) => void;
  onAddColumn: (columnData: any) => void;
  onReorderColumns: (columns: any[]) => void;
  onTaskClick: (taskId: string) => void;
  userRole: string;
  currentUserId: string;
  canUserModifyTask: (task: any) => boolean;
  canDragTask: (taskId: string) => boolean;
  onDeleteColumn: (columnId: string) => void;
}

const KanbanView: React.FC<KanbanViewProps> = ({
  project,
  onMoveTask,
  onAddColumn,
  onReorderColumns,
  onTaskClick,
  userRole,
  currentUserId,
  canUserModifyTask,
  canDragTask,
  onDeleteColumn,
}) => {
  const [columns, setColumns] = useState<any[]>([]);
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [columnColors] = useState<string[]>([
    "blue",
    "green",
    "purple",
    "orange",
    "pink",
    "indigo",
    "teal",
    "red",
  ]);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Initialiser les colonnes à partir des données du projet
  useEffect(() => {
    if (project && project.columns) {
      setColumns(project.columns);
    }
  }, [project]);

  // Gérer le déplacement d'une tâche
  const handleTaskMove = (
    taskId: string,
    sourceColumnId: string,
    targetColumnId: string,
  ) => {
    onMoveTask(taskId, sourceColumnId, targetColumnId);
  };

  // Ouvrir le modal d'ajout de colonne
  const openAddColumnModal = () => {
    if (userRole !== "manager") {
      toast.error("Seuls les managers peuvent ajouter des colonnes");
      return;
    }
    setIsAddColumnModalOpen(true);
  };

  // Fermer le modal d'ajout de colonne
  const closeAddColumnModal = () => {
    setIsAddColumnModalOpen(false);
    setNewColumnTitle("");
  };

  // Ajouter une nouvelle colonne
  const handleAddColumn = () => {
    if (!newColumnTitle.trim()) {
      toast.error("Le titre de la colonne ne peut pas être vide");
      return;
    }

    const newColumnData = {
      title: newColumnTitle,
      order: columns.length,
    };

    onAddColumn(newColumnData);
    closeAddColumnModal();
  };

  // Obtenir la couleur pour une colonne
  const getColumnColor = (index: number) => {
    return columnColors[index % columnColors.length];
  };

  // Fonctions pour le drag and drop des colonnes
  const handleColumnDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    columnId: string,
  ) => {
    if (userRole !== "manager") {
      e.preventDefault();
      toast.error("Seuls les managers peuvent réorganiser les colonnes");
      return;
    }

    e.dataTransfer.setData("columnId", columnId);
    e.dataTransfer.setData("type", "column"); // Identifier que c'est une colonne qui est déplacée
    setDraggedColumn(columnId);

    // Ajouter un délai pour l'effet visuel
    setTimeout(() => {
      if (columnRefs.current.has(columnId)) {
        const el = columnRefs.current.get(columnId);
        if (el) {
          el.style.opacity = "0.4";
        }
      }
    }, 0);
  };

  const handleColumnDragEnd = (columnId: string) => {
    setDraggedColumn(null);
    setDragOverColumn(null);

    if (columnRefs.current.has(columnId)) {
      const el = columnRefs.current.get(columnId);
      if (el) {
        el.style.opacity = "1";
      }
    }
  };

  const handleColumnDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    columnId: string,
  ) => {
    e.preventDefault();

    // Vérifier si c'est une colonne qui est déplacée
    const dataType =
      e.dataTransfer.types.includes("type") &&
      e.dataTransfer.getData("type") === "column";

    if (!dataType) return; // Si ce n'est pas une colonne, ne rien faire ici

    if (draggedColumn === columnId) return;
    setDragOverColumn(columnId);
  };

  const handleColumnDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleColumnDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetColumnId: string,
  ) => {
    e.preventDefault();

    // Vérifier si c'est une colonne qui est déplacée
    if (
      !e.dataTransfer.types.includes("type") ||
      e.dataTransfer.getData("type") !== "column"
    ) {
      return; // Si ce n'est pas une colonne, ne rien faire ici
    }

    const sourceColumnId = e.dataTransfer.getData("columnId");

    if (!sourceColumnId || sourceColumnId === targetColumnId) {
      return;
    }

    // Réorganiser les colonnes
    const updatedColumns = [...columns];
    const sourceIndex = updatedColumns.findIndex(
      (col) => col.id === sourceColumnId,
    );
    const targetIndex = updatedColumns.findIndex(
      (col) => col.id === targetColumnId,
    );

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const [movedColumn] = updatedColumns.splice(sourceIndex, 1);
      updatedColumns.splice(targetIndex, 0, movedColumn);

      // Mettre à jour l'ordre des colonnes
      const reorderedColumns = updatedColumns.map((col, index) => ({
        ...col,
        order: index,
      }));

      setColumns(reorderedColumns);
      onReorderColumns(reorderedColumns);
    }

    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Référencer un élément de colonne
  const setColumnRef = (columnId: string, element: HTMLDivElement | null) => {
    if (element) {
      columnRefs.current.set(columnId, element);
    } else {
      columnRefs.current.delete(columnId);
    }
  };

  return (
    <div className="kanban-view h-full overflow-x-auto p-4">
      <div className="flex h-full space-x-4">
        {columns.map((column, index) => (
          <div
            key={column.id}
            className={`kanban-column-wrapper h-full min-w-[300px] ${dragOverColumn === column.id ? "rounded-lg border-2 border-violet-500" : ""}`}
            ref={(el) => setColumnRef(column.id, el)}
            onDragOver={(e) => handleColumnDragOver(e, column.id)}
            onDragLeave={handleColumnDragLeave}
            onDrop={(e) => handleColumnDrop(e, column.id)}
          >
            <KanbanColumn
              column={column}
              teamMembers={project.team}
              onTaskMove={handleTaskMove}
              columnColor={getColumnColor(index)}
              openTaskModal={onTaskClick}
              userRole={userRole}
              currentUserId={currentUserId}
              canUserModifyTask={canUserModifyTask}
              canDragTask={canDragTask}
              onDeleteColumn={onDeleteColumn}
              onColumnDragStart={(e) => handleColumnDragStart(e, column.id)}
              onColumnDragEnd={() => handleColumnDragEnd(column.id)}
              isColumnDraggable={userRole === "manager"}
            />
          </div>
        ))}

        {/* Bouton pour ajouter une nouvelle colonne */}
        {userRole === "manager" && (
          <div className="flex h-full min-w-[300px] items-start justify-center pt-12">
            <button
              onClick={openAddColumnModal}
              className="flex items-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <Plus className="mr-2 h-5 w-5" />
              Ajouter une colonne
            </button>
          </div>
        )}
      </div>

      {/* Modal pour ajouter une nouvelle colonne */}
      <Dialog
        open={isAddColumnModalOpen}
        onOpenChange={setIsAddColumnModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une nouvelle colonne</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="column-title">Titre de la colonne</Label>
              <Input
                id="column-title"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                placeholder="Ex: À faire, En cours, Terminé..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAddColumnModal}>
              Annuler
            </Button>
            <Button onClick={handleAddColumn}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KanbanView;
