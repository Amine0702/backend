"use client";
import "./note.css";
import type React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/app/(components)/ui/card";
import { Button } from "@/app/(components)/ui/button";
import { Input } from "@/app/(components)/ui/input";
import { Textarea } from "@/app/(components)/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/app/(components)/ui/tabs";
import { Badge } from "@/app/(components)/ui/badge";
import {
  Check,
  Clock,
  Edit,
  Plus,
  CircleX,
  ArrowUp,
  ArrowDown,
  Search,
  PlayCircle,
  StopCircle,
  RotateCcw,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/(components)/ui/select";
import { useToast } from "@/app/(components)/ui/use-toast";
import {
  useGetUserNotesQuery,
  useCreateNoteMutation,
  useUpdateNoteMutation,
  useDeleteNoteMutation,
} from "@/app/state/api";

type Idea = {
  id: number;
  content: string;
  category: string;
  priority: string;
  status: string;
  color?: string;
  created_at: string;
  updated_at: string;
};

type TimerType = "focus" | "shortBreak" | "longBreak";

const COLORS = [
  "bg-pink-100 border-pink-300",
  "bg-yellow-100 border-yellow-300",
  "bg-green-100 border-green-300",
  "bg-blue-100 border-blue-300",
  "bg-purple-100 border-purple-300",
  "bg-orange-100 border-orange-300",
];

const CATEGORIES = [
  "Collaboration",
  "Support",
  "Design",
  "Development",
  "Marketing",
  "General",
];
const PRIORITIES = ["High", "Medium", "Low"];
const STATUSES = ["New", "In Progress", "Pending", "Completed"];

const Index = () => {
  const { toast } = useToast();
  const [clerkUserId, setClerkUserId] = useState<string | null>(null);

  // Récupérer l'ID utilisateur de Clerk depuis le localStorage
  useEffect(() => {
    // Récupérer l'ID utilisateur depuis le localStorage où il est stocké lors de l'authentification
    const userId = localStorage.getItem("clerkUserId");
    if (userId) {
      setClerkUserId(userId);
      console.log("ID utilisateur Clerk récupéré:", userId);
    } else {
      // Fallback: essayer de récupérer depuis currentUserId (ancienne méthode)
      const currentUserId = localStorage.getItem("currentUserId");
      if (currentUserId) {
        setClerkUserId(currentUserId);
        console.log("ID utilisateur courant récupéré:", currentUserId);
      }
    }
  }, []);

  const [newIdea, setNewIdea] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newPriority, setNewPriority] = useState("Medium");
  const [selectedTab, setSelectedTab] = useState("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "priority">(
    "newest",
  );

  // RTK Query hooks
  const {
    data: notes,
    isLoading: isLoadingNotes,
    error: notesError,
    refetch,
  } = useGetUserNotesQuery(clerkUserId, {
    skip: !clerkUserId,
    // Ajouter un refetchOnMountOrArgChange pour s'assurer que les données sont à jour
    refetchOnMountOrArgChange: true,
  });

  const [createNote, { isLoading: isCreating }] = useCreateNoteMutation();
  const [updateNote, { isLoading: isUpdating }] = useUpdateNoteMutation();
  const [deleteNote, { isLoading: isDeleting }] = useDeleteNoteMutation();

  // Pomodoro Timer State
  const [timerType, setTimerType] = useState<TimerType>("focus");
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes en secondes
  const [isRunning, setIsRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);

  const [isDarkMode, setIsDarkMode] = useState(false);

  // Afficher les erreurs
  useEffect(() => {
    if (notesError) {
      console.error("Erreur lors du chargement des notes:", notesError);
      toast({
        title: "Erreur",
        description:
          "Impossible de charger les notes. Veuillez réessayer plus tard.",
        variant: "destructive",
      });
    }
  }, [notesError, toast]);

  // Toggle du thème
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Effet du minuteur
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);

      if (timerType === "focus") {
        setPomodoroCount((prev) => prev + 1);
        toast({
          title: "Pomodoro terminé!",
          description: "Prenez une pause bien méritée!",
        });

        // Passage à la pause après la période de focus
        if (pomodoroCount % 4 === 3) {
          setTimerType("longBreak");
          setTimeLeft(15 * 60); // 15 minutes
        } else {
          setTimerType("shortBreak");
          setTimeLeft(5 * 60); // 5 minutes
        }
      } else {
        // Retour en focus après la pause
        setTimerType("focus");
        setTimeLeft(25 * 60);
        toast({
          title: "Pause terminée!",
          description: "Retour au travail!",
        });
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, timerType, pomodoroCount, toast]);

  // Réinitialiser le minuteur quand le type change
  useEffect(() => {
    switch (timerType) {
      case "focus":
        setTimeLeft(25 * 60);
        break;
      case "shortBreak":
        setTimeLeft(5 * 60);
        break;
      case "longBreak":
        setTimeLeft(15 * 60);
        break;
    }
    setIsRunning(false);
  }, [timerType]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startTimer = () => setIsRunning(true);
  const pauseTimer = () => setIsRunning(false);
  const resetTimer = () => {
    setIsRunning(false);
    switch (timerType) {
      case "focus":
        setTimeLeft(25 * 60);
        break;
      case "shortBreak":
        setTimeLeft(5 * 60);
        break;
      case "longBreak":
        setTimeLeft(15 * 60);
        break;
    }
  };

  const addIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newIdea.trim() === "" || !clerkUserId) return;

    try {
      await createNote({
        clerkUserId,
        content: newIdea,
        category: newCategory,
        priority: newPriority,
        status: "New",
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }).unwrap();

      setNewIdea("");
      refetch(); // Rafraîchir la liste des notes

      toast({
        title: "Idée ajoutée!",
        description: "Votre nouvelle idée a été ajoutée avec succès.",
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'idée:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'ajout de l'idée.",
        variant: "destructive",
      });
    }
  };

  const editIdea = (id: number) => {
    const idea = notes?.find((idea: { id: number }) => idea.id === id);
    if (idea) {
      setEditingId(id);
      setEditContent(idea.content);
    }
  };

  const saveEdit = async (id: number) => {
    if (editContent.trim() === "") return;

    try {
      await updateNote({
        id,
        content: editContent,
      }).unwrap();

      setEditingId(null);
      setEditContent("");
      refetch(); // Rafraîchir la liste des notes

      toast({
        title: "Idée modifiée!",
        description: "L'idée a été mise à jour avec succès.",
      });
    } catch (error) {
      console.error("Erreur lors de la modification de l'idée:", error);
      toast({
        title: "Erreur",
        description:
          "Une erreur est survenue lors de la modification de l'idée.",
        variant: "destructive",
      });
    }
  };

  const deleteIdea = async (id: number) => {
    try {
      console.log(`Suppression de la note avec ID: ${id}`);

      if (!id || isNaN(id)) {
        console.error("ID de note invalide:", id);
        toast({
          title: "Erreur",
          description: "Impossible de supprimer cette note: ID invalide.",
          variant: "destructive",
        });
        return;
      }

      await deleteNote(id).unwrap();
      refetch(); // Rafraîchir la liste des notes

      toast({
        title: "Idée supprimée",
        description: "L'idée a été supprimée avec succès.",
        variant: "destructive",
      });
    } catch (error) {
      console.error("Erreur lors de la suppression de l'idée:", error);
      toast({
        title: "Erreur",
        description:
          "Une erreur est survenue lors de la suppression de l'idée.",
        variant: "destructive",
      });
    }
  };

  // Modifier la fonction updateStatus pour mieux gérer les erreurs
  const updateStatus = async (id: number, newStatus: string) => {
    try {
      console.log(`Mise à jour du statut de la note ${id} vers ${newStatus}`);

      const result = await updateNote({
        id,
        status: newStatus,
      }).unwrap();

      console.log("Résultat de la mise à jour:", result);

      refetch(); // Rafraîchir la liste des notes

      toast({
        title: "Statut mis à jour",
        description: `Le statut a été changé en "${newStatus}".`,
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      toast({
        title: "Erreur",
        description:
          "Une erreur est survenue lors de la mise à jour du statut.",
        variant: "destructive",
      });
    }
  };

  const updatePriority = async (id: number, newPriority: string) => {
    try {
      await updateNote({
        id,
        priority: newPriority,
      }).unwrap();
      refetch(); // Rafraîchir la liste des notes

      toast({
        title: "Priorité mise à jour",
        description: `La priorité a été changée en "${newPriority}".`,
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la priorité:", error);
      toast({
        title: "Erreur",
        description:
          "Une erreur est survenue lors de la mise à jour de la priorité.",
        variant: "destructive",
      });
    }
  };

  // Filtrage et tri des idées
  const getFilteredIdeas = () => {
    if (!notes) return [];

    let filtered = [...notes];

    // Application du filtre selon l'onglet
    if (selectedTab !== "all") {
      filtered = filtered.filter(
        (idea) => idea.status.toLowerCase() === selectedTab.toLowerCase(),
      );
    }

    // Filtrage par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (idea) =>
          idea.content.toLowerCase().includes(query) ||
          idea.category.toLowerCase().includes(query),
      );
    }

    // Tri
    switch (sortBy) {
      case "newest":
        filtered.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        break;
      case "oldest":
        filtered.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        break;
      case "priority":
        const priorityOrder: Record<string, number> = {
          High: 0,
          Medium: 1,
          Low: 2,
        };
        filtered.sort(
          (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
        );
        break;
    }

    return filtered;
  };

  const filteredIdeas = getFilteredIdeas();

  // Statistiques
  const totalIdeas = notes?.length || 0;
  const completedIdeas =
    notes?.filter((idea: { status: string }) => idea.status === "Completed")
      .length || 0;
  const inProgressIdeas =
    notes?.filter((idea: { status: string }) => idea.status === "In Progress")
      .length || 0;
  const completionRate =
    totalIdeas > 0 ? Math.round((completedIdeas / totalIdeas) * 100) : 0;

  // Dropdown de changement de statut
  const StatusChangeDropdown = ({ idea }: { idea: Idea }) => {
    return (
      <div className="group relative overflow-visible">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 rounded-full p-0 transition-all hover:bg-purple-100 dark:hover:bg-purple-800/30"
        >
          <div className="flex h-full w-full items-center justify-center">
            {idea.status === "Completed" ? (
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : idea.status === "In Progress" ? (
              <Clock className="h-4 w-4 animate-pulse text-blue-600 dark:text-blue-400" />
            ) : idea.status === "Pending" ? (
              <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            ) : (
              <Plus className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            )}
          </div>
        </Button>

        <div className="/* ← on positionne au-dessus du bouton */ /* ← petit espace sous le dropdown */ /* ← s'assure d'être devant tous */ invisible absolute bottom-full right-0 z-50 mb-2 min-w-[160px] rounded-lg border border-purple-200 bg-white p-2 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100 dark:border-purple-800 dark:bg-gray-800">
          {STATUSES.map(
            (status) =>
              status !== idea.status && (
                <Button
                  key={status}
                  size="sm"
                  variant="ghost"
                  onClick={() => updateStatus(idea.id, status)}
                  className="mb-1 w-full justify-start text-gray-700 hover:bg-purple-50 dark:text-gray-200 dark:hover:bg-purple-900/30"
                >
                  {status === "Completed" ? (
                    <Check className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : status === "In Progress" ? (
                    <Clock className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                  ) : status === "Pending" ? (
                    <Clock className="mr-2 h-4 w-4 text-orange-600 dark:text-orange-400" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
                  )}
                  {status === "Completed"
                    ? "Terminé"
                    : status === "In Progress"
                      ? "En cours"
                      : status === "Pending"
                        ? "En attente"
                        : "Nouveau"}
                </Button>
              ),
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-purple-50/30 pb-12 transition-colors duration-300 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="relative mb-8 px-4 pb-6 pt-16 sm:px-6 lg:px-8">
        <div className="mb-6 animate-fade-in rounded-lg border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 p-3 pt-8 shadow-sm dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
          <div className="text-center">
            <div className="mb-4 flex items-center justify-center gap-2">
              <h1 className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-5xl font-black text-transparent dark:from-purple-400 dark:via-violet-400 dark:to-fuchsia-300">
                NOTES
              </h1>
            </div>
            <p className="mx-auto max-w-xl text-lg font-medium text-gray-600 dark:text-gray-300">
              Capturez et organisez toutes vos idées créatives pour vos projets
            </p>
            {/* Toggle thème */}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Colonne de gauche */}
          <div className="space-y-6 md:col-span-2">
            {/* Formulaire d'ajout d'idée */}
            <Card className="overflow-hidden border border-purple-100/50 bg-white/80 shadow-xl shadow-purple-100/20 backdrop-blur-lg dark:border-purple-900/50 dark:bg-gray-800/80 dark:shadow-purple-900/20">
              <CardContent className="pt-6">
                <form onSubmit={addIdea} className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Nouvelle idée..."
                    value={newIdea}
                    onChange={(e) => setNewIdea(e.target.value)}
                    className="border-purple-200 pl-10 text-left transition-all duration-200 hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 dark:border-purple-900 dark:bg-gray-700 dark:text-white dark:hover:border-purple-600"
                    disabled={isCreating}
                  />
                  <div className="flex flex-wrap gap-4">
                    <div className="min-w-[200px] flex-1">
                      <Select
                        value={newCategory}
                        onValueChange={setNewCategory}
                        disabled={isCreating}
                      >
                        <SelectTrigger className="w-full border-purple-200 text-left transition-all duration-200 hover:border-purple-400 focus:border-purple-500 dark:border-purple-900 dark:bg-gray-700 dark:text-white dark:hover:border-purple-600">
                          <SelectValue placeholder="Catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((category) => (
                            <SelectItem
                              key={category}
                              value={category}
                              className="dark:text-white"
                            >
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="min-w-[200px] flex-1">
                      <Select
                        value={newPriority}
                        onValueChange={setNewPriority}
                        disabled={isCreating}
                      >
                        <SelectTrigger className="w-full border-purple-200 text-left transition-all duration-200 hover:border-purple-400 focus:border-purple-500 dark:border-purple-900 dark:bg-gray-700 dark:text-white dark:hover:border-purple-600">
                          <SelectValue placeholder="Priorité" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map((priority) => (
                            <SelectItem
                              key={priority}
                              value={priority}
                              className="dark:text-white"
                            >
                              {priority}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="submit"
                      className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20 transition-all duration-300 hover:from-purple-600 hover:to-fuchsia-600 hover:shadow-purple-500/40"
                      disabled={isCreating || !newIdea.trim()}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                          Ajout en cours...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" /> Ajouter
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Liste des idées et filtres */}
            <Card className="overflow-hidden border border-purple-100/50 bg-white/80 shadow-xl shadow-purple-100/20 backdrop-blur-lg dark:border-purple-900/50 dark:bg-gray-800/80 dark:shadow-purple-900/20">
              <CardContent className="pt-6">
                <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400 dark:text-gray-500" />
                    <Input
                      type="text"
                      placeholder="Rechercher des idées..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="border-purple-200 pl-10 text-left transition-all duration-200 hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 dark:border-purple-900 dark:bg-gray-700 dark:text-white dark:hover:border-purple-600"
                    />
                  </div>
                </div>

                <Tabs
                  defaultValue="all"
                  value={selectedTab}
                  onValueChange={setSelectedTab}
                  className="w-full"
                >
                  <TabsList className="mb-6 w-full rounded-lg bg-purple-50/50 p-1 dark:bg-gray-700/50">
                    <TabsTrigger value="all" className="flex-1 dark:text-white">
                      Toutes
                    </TabsTrigger>
                    <TabsTrigger value="new" className="flex-1 dark:text-white">
                      Nouvelles
                    </TabsTrigger>
                    <TabsTrigger
                      value="in progress"
                      className="flex-1 dark:text-white"
                    >
                      En cours
                    </TabsTrigger>
                    <TabsTrigger
                      value="pending"
                      className="flex-1 dark:text-white"
                    >
                      En attente
                    </TabsTrigger>
                    <TabsTrigger
                      value="completed"
                      className="flex-1 dark:text-white"
                    >
                      Terminées
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {isLoadingNotes ? (
                  <div className="py-12 text-center">
                    <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-violet-500" />
                    <p className="text-lg font-medium dark:text-white">
                      Chargement des notes...
                    </p>
                  </div>
                ) : filteredIdeas.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <p className="text-lg font-medium">Aucune idée trouvée</p>
                    <p className="mt-1">
                      Ajoutez votre première idée ou modifiez vos filtres
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredIdeas.map((idea) => (
                      <div
                        key={idea.id}
                        className={`rounded-lg p-4 backdrop-blur-sm transition-all hover:scale-[1.01] dark:border-gray-700 ${
                          idea.color?.replace(
                            "bg-",
                            "bg-opacity-50 dark:bg-opacity-10",
                          ) || "bg-gray-50 dark:bg-gray-800"
                        } hover:shadow-lg hover:shadow-purple-100/40 dark:hover:shadow-purple-900/20`}
                      >
                        {editingId === idea.id ? (
                          <div className="flex items-center gap-2">
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="min-h-[80px] flex-1 rounded-xl border-purple-200 text-left transition-all duration-200 hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 dark:border-purple-900 dark:bg-gray-700 dark:text-white dark:hover:border-purple-600"
                              autoFocus
                              disabled={isUpdating}
                            />
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                onClick={() => saveEdit(idea.id)}
                                className="bg-green-500 hover:bg-green-600"
                                disabled={isUpdating}
                              >
                                {isUpdating ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingId(null)}
                                className="dark:border-gray-600"
                                disabled={isUpdating}
                              >
                                <CircleX className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="mb-2 font-medium dark:text-white">
                                  {idea.content}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Badge
                                    variant="outline"
                                    className="bg-white dark:bg-gray-700 dark:text-white"
                                  >
                                    {idea.category}
                                  </Badge>

                                  <Badge
                                    className={` ${
                                      idea.priority === "High"
                                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                        : idea.priority === "Medium"
                                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                          : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                    } `}
                                  >
                                    {idea.priority === "High" && (
                                      <ArrowUp className="mr-1 h-3 w-3" />
                                    )}
                                    {idea.priority === "Low" && (
                                      <ArrowDown className="mr-1 h-3 w-3" />
                                    )}
                                    {idea.priority}
                                  </Badge>

                                  <div className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors">
                                    {idea.status === "Completed" ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                        <Check className="h-3 w-3" />
                                        Terminé
                                      </span>
                                    ) : idea.status === "In Progress" ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                        <Clock className="h-3 w-3 animate-spin" />
                                        En cours
                                      </span>
                                    ) : idea.status === "Pending" ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                        <Clock className="h-3 w-3" />
                                        En attente
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                        <Plus className="h-3 w-3" />
                                        Nouveau
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="ml-2 flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => editIdea(idea.id)}
                                  className="h-8 w-8 rounded-full p-0 transition-all hover:bg-purple-100 dark:hover:bg-purple-900/30"
                                  disabled={isUpdating || isDeleting}
                                >
                                  <Edit className="h-4 w-4 dark:text-white" />
                                </Button>

                                <StatusChangeDropdown idea={idea} />

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteIdea(idea.id)}
                                  className="h-8 w-8 rounded-full p-0 transition-all hover:bg-red-100 dark:hover:bg-red-900/30"
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                                  ) : (
                                    <CircleX className="h-4 w-4 text-red-500 dark:text-red-400" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Colonne de droite : Tableau de bord et Minuteur Pomodoro */}
          <div className="space-y-6">
            {/* Carte des Statistiques */}
            <Card className="overflow-hidden border border-purple-100/50 bg-white/80 shadow-xl shadow-purple-100/20 backdrop-blur-lg dark:border-purple-900/50 dark:bg-gray-800/80 dark:shadow-purple-900/20">
              <CardContent className="pt-6">
                <h3 className="mb-4 bg-gradient-to-r from-purple-600 to-fuchsia-500 bg-clip-text text-xl font-bold text-transparent dark:from-purple-400 dark:to-fuchsia-300">
                  Tableau de bord
                </h3>

                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">
                        Progression globale
                      </span>
                      <span className="font-medium dark:text-white">
                        {completionRate}%
                      </span>
                    </div>
                    {/* Barre de progression custom */}
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-purple-100 dark:bg-purple-900/30">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${completionRate}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-purple-100 bg-gradient-to-br from-purple-50 to-fuchsia-50 p-4 dark:border-purple-800 dark:from-purple-900/30 dark:to-fuchsia-900/30">
                      <div className="text-2xl font-bold dark:text-white">
                        {totalIdeas}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        Idées totales
                      </div>
                    </div>
                    <div className="rounded-lg border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-4 dark:border-green-800 dark:from-green-900/30 dark:to-emerald-900/30">
                      <div className="text-2xl font-bold dark:text-white">
                        {completedIdeas}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        Idées terminées
                      </div>
                    </div>
                    <div className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-4 dark:border-blue-800 dark:from-blue-900/30 dark:to-cyan-900/30">
                      <div className="text-2xl font-bold dark:text-white">
                        {inProgressIdeas}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        Idées en cours
                      </div>
                    </div>
                    <div className="rounded-lg border border-yellow-100 bg-gradient-to-br from-yellow-50 to-amber-50 p-4 dark:border-yellow-800 dark:from-yellow-900/30 dark:to-amber-900/30">
                      <div className="text-2xl font-bold dark:text-white">
                        {notes?.filter(
                          (i: { priority: string }) => i.priority === "High",
                        ).length || 0}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        Haute priorité
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Minuteur Pomodoro */}
            <Card className="overflow-hidden border border-purple-100/50 bg-white/80 shadow-xl shadow-purple-100/20 backdrop-blur-lg dark:border-purple-900/50 dark:bg-gray-800/80 dark:shadow-purple-900/20">
              <CardContent className="pt-6">
                <h3 className="mb-4 bg-gradient-to-r from-purple-600 to-fuchsia-500 bg-clip-text text-xl font-bold text-transparent dark:from-purple-400 dark:to-fuchsia-300">
                  Minuteur Pomodoro
                </h3>

                <div className="text-center">
                  <div className="mb-4 text-4xl font-bold tabular-nums dark:text-white">
                    {formatTime(timeLeft)}
                  </div>

                  <div className="mb-4 flex justify-center gap-2">
                    <Button
                      variant={timerType === "focus" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimerType("focus")}
                      className={
                        timerType === "focus"
                          ? "bg-gradient-to-r from-violet-600 to-indigo-600 dark:text-white"
                          : "dark:text-white"
                      }
                    >
                      Focus
                    </Button>
                    <Button
                      variant={
                        timerType === "shortBreak" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setTimerType("shortBreak")}
                      className={`${timerType === "shortBreak" ? "bg-gradient-to-r from-green-500 to-emerald-500 dark:text-white" : "dark:text-white"}`}
                    >
                      Pause courte
                    </Button>
                    <Button
                      variant={
                        timerType === "longBreak" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setTimerType("longBreak")}
                      className={`${timerType === "longBreak" ? "bg-gradient-to-r from-blue-500 to-cyan-500 dark:text-white" : "dark:text-white"}`}
                    >
                      Pause longue
                    </Button>
                  </div>

                  <div className="flex justify-center gap-2">
                    {!isRunning ? (
                      <Button
                        onClick={startTimer}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/20 transition-all duration-300 hover:from-green-600 hover:to-emerald-600 hover:shadow-green-500/40"
                      >
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Démarrer
                      </Button>
                    ) : (
                      <Button
                        onClick={pauseTimer}
                        variant="outline"
                        className="border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30"
                      >
                        <StopCircle className="mr-2 h-4 w-4 text-red-500" />
                        Pause
                      </Button>
                    )}
                    <Button
                      onClick={resetTimer}
                      variant="outline"
                      className="dark:border-gray-600 dark:text-white"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Réinitialiser
                    </Button>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Pomodoros complétés : {pomodoroCount}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Carte des Catégories */}
            <Card className="overflow-hidden border border-purple-100/50 bg-white/80 shadow-xl shadow-purple-100/20 backdrop-blur-lg dark:border-purple-900/50 dark:bg-gray-800/80 dark:shadow-purple-900/20">
              <CardContent className="pt-6">
                <h3 className="mb-4 bg-gradient-to-r from-purple-600 to-fuchsia-500 bg-clip-text text-xl font-bold text-transparent dark:from-purple-400 dark:to-fuchsia-300">
                  Catégories
                </h3>

                <div className="space-y-2">
                  {CATEGORIES.map((category) => {
                    const count =
                      notes?.filter(
                        (idea: { category: string }) =>
                          idea.category === category,
                      ).length || 0;
                    return (
                      <div
                        key={category}
                        className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/30"
                      >
                        <div className="flex items-center">
                          <span className="mr-2 dark:text-white">
                            {category}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-white/50 dark:bg-gray-700/50"
                        >
                          {count}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
