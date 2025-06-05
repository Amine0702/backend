"use client";
import "./teams.css";
import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Briefcase,
  ClipboardList,
  Calendar,
  Info,
} from "lucide-react";
import { ThemeProvider } from "../projects/components/theme-provider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/(components)/ui/card";
import { Button } from "@/app/(components)/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/(components)/ui/table";
import { Badge } from "@/app/(components)/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/(components)/ui/popover";
import { Checkbox } from "@/app/(components)/ui/checkbox";
import { Slider } from "@/app/(components)/slider";
import { useToast } from "@/app/(components)/ui/use-toast";
import { Skeleton } from "@/app/(components)/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/(components)/ui/dialog";
import { useUser } from "@clerk/nextjs";
import { useGetTeamsQuery, useGetTeamStatsQuery } from "../state/api";
import type { Team, TeamMember, Task } from "./types/team";
import type { ReactNode } from "react";

// Interfaces pour les props des composants
interface MetricCardProps {
  icon: ReactNode;
  title: string;
  value: string;
  isLoading?: boolean;
}

interface StatusBadgeProps {
  status: string;
}

interface JobTitleBadgeProps {
  jobTitle: string | null;
}

interface RoleBadgeProps {
  role: string;
}

interface PriorityBadgeProps {
  priority: string;
}

interface TaskStatusBadgeProps {
  status: string;
}

interface UserAvatarProps {
  user: {
    avatar?: string | null;
    name?: string;
  };
}

interface ProgressBarProps {
  value: number;
}

interface MemberTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
  tasks: Task[];
}

// Composant Carte Métrique
const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  title,
  value,
  isLoading = false,
}) => (
  <Card className="border-purple-200 transition-colors hover:border-purple-300 dark:border-purple-800 dark:hover:border-purple-700">
    <CardContent className="p-6">
      <div className="flex justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
              {value}
            </p>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50">
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

// Composant Badge Statut
const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case "active":
      return (
        <Badge
          variant="outline"
          className="border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
        >
          <Clock className="mr-1 h-3.5 w-3.5" /> Actif
        </Badge>
      );
    case "completed":
      return (
        <Badge
          variant="outline"
          className="border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
        >
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Terminé
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300"
        >
          {status}
        </Badge>
      );
  }
};

// Composant Badge Poste
const JobTitleBadge: React.FC<JobTitleBadgeProps> = ({ jobTitle }) => {
  if (!jobTitle) {
    return (
      <Badge
        variant="outline"
        className="border-gray-200 bg-gray-100 text-gray-800 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
      >
        <Briefcase className="mr-1 h-3.5 w-3.5" />
        Non défini
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
    >
      <Briefcase className="mr-1 h-3.5 w-3.5" />
      {jobTitle}
    </Badge>
  );
};

// Composant Badge Rôle
const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  switch (role) {
    case "manager":
      return (
        <Badge
          variant="outline"
          className="border-purple-200 bg-purple-100 text-purple-800 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
        >
          Chef de projet
        </Badge>
      );
    case "member":
      return (
        <Badge
          variant="outline"
          className="border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
        >
          Membre
        </Badge>
      );
    case "observer":
      return (
        <Badge
          variant="outline"
          className="border-gray-200 bg-gray-100 text-gray-800 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
        >
          Observateur
        </Badge>
      );
    default:
      return <Badge variant="outline">{role || "Membre"}</Badge>;
  }
};

// Composant Badge Priorité
const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  switch (priority) {
    case "high":
    case "haute":
    case "urgente":
      return (
        <Badge
          variant="outline"
          className="border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
        >
          Haute
        </Badge>
      );
    case "medium":
    case "moyenne":
      return (
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
        >
          Moyenne
        </Badge>
      );
    case "low":
    case "basse":
      return (
        <Badge
          variant="outline"
          className="border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
        >
          Basse
        </Badge>
      );
    default:
      return <Badge variant="outline">{priority || "Non définie"}</Badge>;
  }
};

// Composant Badge Statut Tâche
const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case "completed":
      return (
        <Badge
          variant="outline"
          className="border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
        >
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Terminée
        </Badge>
      );
    case "in_progress":
      return (
        <Badge
          variant="outline"
          className="border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
        >
          <Clock className="mr-1 h-3.5 w-3.5" /> En cours
        </Badge>
      );
    case "not_started":
      return (
        <Badge
          variant="outline"
          className="border-gray-200 bg-gray-100 text-gray-800 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
        >
          Non commencée
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300"
        >
          {status}
        </Badge>
      );
  }
};

// Composant Avatar
const UserAvatar: React.FC<UserAvatarProps> = ({ user }) => (
  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-purple-100 text-xs font-medium text-purple-800 dark:bg-purple-800 dark:text-purple-100">
    {user.avatar ? (
      <img
        src={user.avatar || "/placeholder.svg"}
        alt={user.name || "User"}
        className="h-full w-full object-cover"
      />
    ) : user.name ? (
      user.name.charAt(0).toUpperCase()
    ) : (
      "?"
    )}
  </div>
);

// Composant Barre de Progression
const ProgressBar: React.FC<ProgressBarProps> = ({ value }) => {
  // Ensure value is a number and between 0-100
  const safeValue =
    typeof value === "number" && !isNaN(value)
      ? Math.min(Math.max(value, 0), 100)
      : 0;

  return (
    <div className="w-full">
      <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-2.5 rounded-full bg-purple-600 dark:bg-purple-500"
          style={{ width: `${safeValue}%` }}
        ></div>
      </div>
      <div className="mt-1 text-center text-xs">{safeValue}%</div>
    </div>
  );
};

// Composant Modal des Tâches de l'Utilisateur
const MemberTasksModal: React.FC<MemberTasksModalProps> = ({
  isOpen,
  onClose,
  member,
  tasks,
}) => {
  if (!isOpen || !member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ClipboardList className="h-5 w-5 text-purple-600" />
            Tâches de {member.name}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {tasks && tasks.length > 0 ? (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader className="bg-purple-50 dark:bg-purple-900/20">
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Progression</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Date d'échéance
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow
                      key={task.id}
                      className="hover:bg-purple-50/50 dark:hover:bg-purple-900/10"
                    >
                      <TableCell className="font-medium">
                        {task.title}
                      </TableCell>
                      <TableCell>
                        <TaskStatusBadge status={task.status} />
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={task.priority} />
                      </TableCell>
                      <TableCell>
                        <ProgressBar value={task.progress || 0} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {task.due_date ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            Non définie
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-md bg-gray-50 p-8 dark:bg-gray-800">
              <ClipboardList className="mb-2 h-12 w-12 text-gray-400" />
              <p className="text-lg font-medium">Aucune tâche assignée</p>
              <p className="text-muted-foreground">
                Ce membre n'a pas de tâches assignées dans ce projet.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Composant Principal Page Équipes
const TeamsPage = () => {
  const { toast } = useToast();
  const { user, isLoaded: userLoaded } = useUser();

  // Stocker l'ID utilisateur Clerk dans le localStorage pour les requêtes API
  useEffect(() => {
    if (userLoaded && user) {
      localStorage.setItem("currentUserId", user.id);
      console.log("ID utilisateur Clerk stocké:", user.id);
    }
  }, [user, userLoaded]);

  // Utiliser RTK Query pour récupérer les données
  const {
    data: teamsData,
    isLoading: isTeamsLoading,
    error: teamsError,
    refetch: refetchTeams,
  } = useGetTeamsQuery({});
  const {
    data: teamStats,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useGetTeamStatsQuery({});

  // Forcer un rechargement des données au montage du composant et quand l'utilisateur change
  useEffect(() => {
    if (userLoaded && user) {
      refetchTeams();
      refetchStats();
    }
  }, [refetchTeams, refetchStats, user, userLoaded]);

  // Ensure teams is always an array and has the correct structure
  const teams = React.useMemo(() => {
    if (!teamsData) return [];
    if (Array.isArray(teamsData)) return teamsData;
    if (teamsData.data && Array.isArray(teamsData.data)) return teamsData.data;
    return [];
  }, [teamsData]);

  // Afficher les erreurs dans la console pour le débogage
  React.useEffect(() => {
    if (teamsError) {
      console.error("Erreur lors du chargement des équipes:", teamsError);
    }
    // Log des données reçues pour le débogage
    if (teamsData) {
      console.log("Données des équipes reçues:", teamsData);
    }
  }, [teamsError, teamsData]);

  // État
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string | null>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = useState({
    active: true,
    completed: true,
  });
  const [completionFilter, setCompletionFilter] = useState<[number, number]>([
    0, 100,
  ]);
  const [isProgressInfoOpen, setIsProgressInfoOpen] = useState(false);

  // État pour la modal des tâches
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Basculer les détails de l'équipe
  const toggleTeamDetails = (id: string) => {
    setExpandedTeam(expandedTeam === id ? null : id);
    setExpandedMember(null);
  };

  // Basculer les détails du membre
  const toggleMemberDetails = (id: string) => {
    setExpandedMember(expandedMember === id ? null : id);
  };

  // Ouvrir la modal des tâches d'un membre
  const openMemberTasks = (member: TeamMember) => {
    setSelectedMember(member);
    setIsTaskModalOpen(true);
  };

  // Gérer le tri
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  // Obtenir l'icône de tri
  const getSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setStatusFilter({ active: true, completed: true });
    setCompletionFilter([0, 100]);
    setSearchTerm("");
  };

  // Statistiques d'équipe
  const stats = teamStats || {
    total_teams: 0,
    active_teams: 0,
    completed_teams: 0,
    total_members: 0,
    total_active_projects: 0,
  };

  // Filtrer les équipes
  const filteredTeams = React.useMemo(() => {
    if (!teams || !Array.isArray(teams)) return [];

    return teams.filter((team) => {
      // Filtre de recherche
      if (
        searchTerm &&
        !team.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Filtre de statut
      if (team.status === "active" && !statusFilter.active) return false;
      if (team.status === "completed" && !statusFilter.completed) return false;

      // Filtre de complétion
      if (
        team.completion_rate < completionFilter[0] ||
        team.completion_rate > completionFilter[1]
      ) {
        return false;
      }

      return true;
    });
  }, [teams, searchTerm, statusFilter, completionFilter]);

  // Trier les équipes
  const sortedTeams = React.useMemo(() => {
    if (!filteredTeams.length) return [];

    return [...filteredTeams].sort((a, b) => {
      if (!sortBy) return 0;

      const valueA = a[sortBy as keyof Team];
      const valueB = b[sortBy as keyof Team];

      if (typeof valueA === "string" && typeof valueB === "string") {
        return sortDirection === "asc"
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      } else if (typeof valueA === "number" && typeof valueB === "number") {
        return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
      }
      return 0;
    });
  }, [filteredTeams, sortBy, sortDirection]);

  // Si l'utilisateur n'est pas chargé, afficher un indicateur de chargement
  if (!userLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
          <p className="text-lg font-medium">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="container mx-auto animate-fade-in px-4 py-8">
        {/* En-tête de la page */}
        <div className="mb-6 animate-fade-in rounded-lg border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 p-8 shadow-sm dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
              Gestion des Équipes
            </h1>
            <p className="mt-2 text-muted-foreground">
              Visualisez et gérez vos équipes pour une meilleure collaboration
            </p>
          </div>
        </div>

        {/* Cartes Métriques */}
        <div
          className="mb-8 grid animate-fade-in grid-cols-1 gap-4 md:grid-cols-3"
          style={{ animationDelay: "0.1s" }}
        >
          <MetricCard
            icon={
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            }
            title="Équipes Actives"
            value={`${stats.active_teams}/${stats.total_teams}`}
            isLoading={isStatsLoading}
          />
          <MetricCard
            icon={
              <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            }
            title="Projets Terminés"
            value={`${stats.completed_teams || 0}`}
            isLoading={isStatsLoading}
          />
          <MetricCard
            icon={
              <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            }
            title="Projets Actifs"
            value={`${stats.total_active_projects}`}
            isLoading={isStatsLoading}
          />
        </div>

        {/* Barre d'Action */}
        <div
          className="mb-6 flex animate-fade-in flex-col gap-4 md:flex-row"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher des équipes ou des membres..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:ring-purple-400"
            />
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="flex gap-2 border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:text-white dark:hover:bg-purple-900/30"
                >
                  <Filter className="h-4 w-4" /> Filtres
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4">
                <h3 className="mb-4 flex items-center justify-between font-medium">
                  Filtres
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="h-8 text-xs"
                  >
                    Réinitialiser
                  </Button>
                </h3>

                <div className="space-y-4">
                  {/* Filtres de Statut */}
                  <div>
                    <h4 className="mb-2 text-sm font-medium">Statut</h4>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center">
                        <Checkbox
                          id="status-active"
                          checked={statusFilter.active}
                          onCheckedChange={(checked) =>
                            setStatusFilter({
                              ...statusFilter,
                              active: !!checked,
                            })
                          }
                        />
                        <label htmlFor="status-active" className="ml-2">
                          Actif
                        </label>
                      </div>
                      <div className="flex items-center">
                        <Checkbox
                          id="status-completed"
                          checked={statusFilter.completed}
                          onCheckedChange={(checked) =>
                            setStatusFilter({
                              ...statusFilter,
                              completed: !!checked,
                            })
                          }
                        />
                        <label htmlFor="status-completed" className="ml-2">
                          Terminé
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Filtre de Complétion */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-medium">
                        Taux de Complétion
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {completionFilter[0]}% - {completionFilter[1]}%
                      </span>
                    </div>
                    <Slider
                      value={completionFilter}
                      min={0}
                      max={100}
                      step={5}
                      className="mb-6"
                      onValueChange={(value) =>
                        setCompletionFilter(value as [number, number])
                      }
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Bouton d'information sur le calcul de progression */}
            <Popover
              open={isProgressInfoOpen}
              onOpenChange={setIsProgressInfoOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:text-white dark:hover:bg-purple-900/30"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4">
                <h3 className="mb-2 font-medium">
                  Calcul de la progression des tâches
                </h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Le taux de complétion est calculé en fonction de la colonne où
                  se trouve la tâche:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Colonne "À faire":</span>
                    <Badge variant="outline" className="bg-gray-100">
                      0%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Autres colonnes:</span>
                    <Badge variant="outline" className="bg-gray-100">
                      25%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Colonne "En cours":</span>
                    <Badge variant="outline" className="bg-blue-100">
                      50%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Colonne "En révision":</span>
                    <Badge variant="outline" className="bg-amber-100">
                      75%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Colonne "Terminé":</span>
                    <Badge variant="outline" className="bg-green-100">
                      100%
                    </Badge>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Tableau des Équipes */}
        <Card
          className="animate-fade-in overflow-hidden border-purple-200 shadow-md dark:border-purple-800"
          style={{ animationDelay: "0.3s" }}
        >
          <CardHeader className="border-b border-purple-100 bg-purple-50 pb-4 dark:border-purple-800/50 dark:bg-purple-900/20">
            <CardTitle className="text-xl text-purple-900 dark:text-purple-100">
              Vos Équipes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-purple-50/50 dark:bg-purple-900/10">
                  <TableRow>
                    <TableHead
                      className="w-[50px] cursor-pointer"
                      onClick={() => handleSort("id")}
                    >
                      <div className="flex items-center">
                        ID {getSortIcon("id")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center">
                        Nom de l'Équipe {getSortIcon("name")}
                      </div>
                    </TableHead>
                    <TableHead>Chef d'Équipe</TableHead>
                    <TableHead
                      className="cursor-pointer text-center"
                      onClick={() => handleSort("completion_rate")}
                    >
                      <div className="flex items-center justify-center">
                        Complétion {getSortIcon("completion_rate")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center">
                        Statut {getSortIcon("status")}
                      </div>
                    </TableHead>
                    <TableHead className="w-[80px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isTeamsLoading ? (
                    // Squelettes de chargement
                    Array(3)
                      .fill(0)
                      .map((_, index) => (
                        <TableRow key={`loading-${index}`}>
                          <TableCell>
                            <Skeleton className="h-6 w-10" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-40" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-32" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-20" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-20" />
                          </TableCell>
                        </TableRow>
                      ))
                  ) : sortedTeams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <AlertCircle className="mb-2 h-8 w-8 text-muted-foreground" />
                          <p>Aucune équipe trouvée</p>
                          <p className="mb-4 text-sm text-muted-foreground">
                            {searchTerm ||
                            !statusFilter.active ||
                            !statusFilter.completed
                              ? "Essayez d'ajuster vos filtres."
                              : "Vous n'êtes membre d'aucune équipe pour le moment."}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedTeams.map((team) => (
                      <React.Fragment key={team.id}>
                        <TableRow
                          className={`hover:bg-purple-50/50 dark:hover:bg-purple-900/10 ${expandedTeam === team.id.toString() ? "bg-purple-50 dark:bg-purple-900/20" : ""} `}
                        >
                          <TableCell className="font-medium">
                            <span className="rounded-md bg-purple-100 px-2 py-1 text-purple-800 dark:bg-purple-800 dark:text-purple-100">
                              {team.id}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-purple-900 dark:text-purple-100">
                              {team.name}
                            </div>
                            {team.description && (
                              <div className="max-w-[200px] truncate text-xs text-muted-foreground">
                                {team.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {team.leader ? (
                              <div className="flex items-center gap-2">
                                <UserAvatar user={team.leader} />
                                <div>
                                  <div className="font-medium">
                                    {team.leader.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Chef d'Équipe
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                  ?
                                </div>
                                <span className="text-muted-foreground">
                                  Non assigné
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <ProgressBar value={team.completion_rate} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={team.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() =>
                                  toggleTeamDetails(team.id.toString())
                                }
                              >
                                {expandedTeam === team.id.toString() ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Section Membres d'Équipe */}
                        {expandedTeam === team.id.toString() && (
                          <TableRow className="bg-purple-50/50 dark:bg-purple-900/10">
                            <TableCell colSpan={6} className="p-0">
                              <div className="p-4">
                                <div className="mb-4 flex items-center justify-between">
                                  <h3 className="text-lg font-medium text-purple-800 dark:text-purple-200">
                                    Membres de l'Équipe
                                  </h3>
                                </div>

                                {/* Tableau des Membres */}
                                {team.members && team.members.length > 0 ? (
                                  <div className="overflow-hidden rounded-md border dark:border-purple-800/50">
                                    <Table>
                                      <TableHeader className="bg-purple-100/50 dark:bg-purple-900/30">
                                        <TableRow>
                                          <TableHead className="w-[40px]">
                                            ID
                                          </TableHead>
                                          <TableHead>Nom</TableHead>
                                          <TableHead>Rôle</TableHead>
                                          <TableHead className="hidden lg:table-cell">
                                            Email
                                          </TableHead>
                                          <TableHead>Poste</TableHead>
                                          <TableHead className="w-[80px] text-right">
                                            Actions
                                          </TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {team.members.map(
                                          (member: TeamMember) => (
                                            <TableRow
                                              key={member.id}
                                              className={`hover:bg-purple-100/30 dark:hover:bg-purple-900/20`}
                                            >
                                              <TableCell>{member.id}</TableCell>
                                              <TableCell>
                                                <div className="flex items-center gap-2">
                                                  <UserAvatar user={member} />
                                                  <span className="font-medium">
                                                    {member.name}
                                                  </span>
                                                </div>
                                              </TableCell>
                                              <TableCell>
                                                <RoleBadge role={member.role} />
                                              </TableCell>
                                              <TableCell className="hidden lg:table-cell">
                                                {member.email}
                                              </TableCell>
                                              <TableCell>
                                                <JobTitleBadge
                                                  jobTitle={member.job_title}
                                                />
                                              </TableCell>
                                              <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() =>
                                                      openMemberTasks(member)
                                                    }
                                                    title="Voir les tâches"
                                                  >
                                                    <ClipboardList className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                              </TableCell>
                                            </TableRow>
                                          ),
                                        )}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ) : (
                                  <div className="rounded-md bg-gray-50 p-6 text-center dark:bg-gray-800">
                                    <Users className="mx-auto mb-2 h-10 w-10 text-gray-400" />
                                    <p className="text-muted-foreground">
                                      Aucun membre dans cette équipe
                                    </p>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Modal des tâches du membre */}
        <MemberTasksModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          member={selectedMember}
          tasks={selectedMember?.tasks || []}
        />
      </div>
    </ThemeProvider>
  );
};

export default TeamsPage;
