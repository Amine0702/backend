"use client";
import "./report.css";
import { useState } from "react";
import type React from "react";

import { useToast } from "@/app/(components)/ui/use-toast";
import {
  FileText,
  Calendar,
  Download,
  TrendingUp,
  Briefcase,
  Users,
  User,
  CalendarIcon,
  CheckSquare,
  Loader2,
  AlertTriangle,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/(components)/ui/card";
import { Button } from "@/app/(components)/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/(components)/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/(components)/ui/accordion";
import { Badge } from "@/app/(components)/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/(components)/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";

import {
  useGetProjectStatsQuery,
  useGetAllProjectsStatsQuery,
  useGenerateProjectReportMutation,
} from "@/app/state/api";
import jsPDF from "jspdf";

// Fonction de débogage pour vérifier les données
const debugData = (data: any, label: string) => {
  console.log(`=== ${label} ===`, data);
  if (data?.stats) {
    console.log("Stats détaillées:", {
      totalTasks: data.stats.totalTasks,
      completedTasks: data.stats.completedTasks,
      completionRate: data.stats.completionRate,
      tasksByStatus: data.stats.tasksByStatus,
      teamPerformance: data.stats.teamPerformance,
    });
  }
};

// Types pour les données
interface Manager {
  id: string | number;
  name: string;
  email: string;
  avatar?: string;
  pivot?: {
    role?: string;
  };
}

interface Project {
  id: string | number;
  name: string;
  description?: string;
  status?: string;
  progress: number;
  start_date: string;
  end_date: string;
  manager?: Manager;
  team?: number;
  totalTasks?: number;
  completedTasks?: number;
}

interface Task {
  id: string | number;
  name: string;
  status: string;
  progress: number;
  startDate?: string;
  endDate?: string;
}

interface TeamMember {
  id: string | number;
  name: string;
  role?: string;
  email?: string;
  avatar?: string;
  tasks?: Task[];
}

interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  teamPerformance?: TeamPerformanceItem[];
  performanceData?: PerformanceDataItem[];
  columnNames?: string[]; // Noms des colonnes dynamiques
}

interface TeamPerformanceItem {
  memberId: string | number;
  name: string;
  tasksCompleted: number;
  tasksAssigned: number;
  completionRate: number;
  averageCompletionTime: number;
}

interface PerformanceDataItem {
  name: string;
  actuel: number;
  precedent: number;
}

const AutomatedReport = () => {
  // États de configuration
  const [project, setProject] = useState<string>("all");
  const [period, setPeriod] = useState<string>("month");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [reportGenerated, setReportGenerated] = useState<boolean>(false);
  const [generatedReportData, setGeneratedReportData] = useState<any>(null);
  const { toast } = useToast();

  // Récupérer les données des projets
  const {
    data: allProjectsData,
    isLoading: isLoadingAllProjects,
    error: allProjectsError,
  } = useGetAllProjectsStatsQuery({});

  const {
    data: projectData,
    isLoading: isLoadingProject,
    error: projectError,
  } = useGetProjectStatsQuery(project !== "all" ? project : "", {
    skip: project === "all",
  });

  // Mutations pour générer et planifier des rapports
  const [generateReport, { isLoading: isGeneratingReport }] =
    useGenerateProjectReportMutation();

  // Gestionnaire appelé lors du clic sur le bouton de génération
  const handleGenerate = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ): Promise<void> => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      // Générer le rapport via l'API
      const response = await generateReport({
        projectId: project !== "all" ? project : undefined,
        reportData: {
          period: period,
          includeAllProjects: project === "all",
        },
      }).unwrap();

      if (response.success) {
        setGeneratedReportData(response.data);
        setReportGenerated(true);
        toast({
          title: "Rapport détaillé généré avec succès",
          description: "Votre rapport est prêt à être consulté et téléchargé",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la génération du rapport:", error);
      toast({
        title: "Erreur lors de la génération du rapport",
        description: "Une erreur s'est produite. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (reportId?: string | number) => {
    let dataToUse = generatedReportData || projectData;

    // Si c'est un rapport de l'historique, essayer de récupérer les données du projet associé

    if (!dataToUse) {
      toast({
        title: "Aucune donnée disponible",
        description: "Impossible de générer le rapport PDF",
        variant: "destructive",
      });
      return;
    }

    try {
      const pdf = new jsPDF();
      let yPosition = 20;

      // Titre du rapport
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");

      const reportTitle = reportId
        ? `RAPPORT HISTORIQUE: ${dataToUse.project.name}`
        : `RAPPORT DÉTAILLÉ: ${getProjectName()}`;

      pdf.text(reportTitle, 20, yPosition);
      yPosition += 15;

      // Informations générales
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");

      pdf.text(
        `Téléchargé le: ${new Date().toLocaleString("fr-FR")}`,
        20,
        yPosition,
      );
      yPosition += 15;

      // Informations du projet
      const project = dataToUse.project;
      const stats = dataToUse.stats;

      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("INFORMATIONS DU PROJET", 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Nom: ${project.name}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Description: ${project.description || "N/A"}`, 20, yPosition);
      yPosition += 8;
      pdf.text(
        `Statut: ${getStatusText(stats.completionRate === 100 ? "completed" : "in-progress")}`,
        20,
        yPosition,
      );
      yPosition += 8;

      if (project.start_date && project.end_date) {
        pdf.text(
          `Période: ${formatDate(project.start_date)} - ${formatDate(project.end_date)}`,
          20,
          yPosition,
        );
        yPosition += 8;
      }

      pdf.text(`Progression: ${stats.completionRate}%`, 20, yPosition);
      yPosition += 15;

      // Statistiques
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("STATISTIQUES", 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Total des tâches: ${stats.totalTasks}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Tâches terminées: ${stats.completedTasks}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Taux de complétion: ${stats.completionRate}%`, 20, yPosition);
      yPosition += 15;

      // Chef de projet
      if (project.manager) {
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text("CHEF DE PROJET", 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(12);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Nom: ${project.manager.name}`, 20, yPosition);
        yPosition += 8;
        pdf.text(`Email: ${project.manager.email || "N/A"}`, 20, yPosition);
        yPosition += 15;
      }

      // Sauvegarder le PDF
      const fileName = reportId
        ? `rapport-historique-${project.name.toLowerCase().replace(/\s+/g, "-")}.pdf`
        : `rapport-detaille-${getProjectName().toLowerCase().replace(/\s+/g, "-")}.pdf`;

      pdf.save(fileName);

      toast({
        title: "Téléchargement démarré",
        description: `Votre rapport PDF est en cours de téléchargement`,
        variant: "default",
      });
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      toast({
        title: "Erreur de téléchargement",
        description: "Une erreur s'est produite lors de la génération du PDF",
        variant: "destructive",
      });
    }
  };

  // Fonction pour obtenir le nom du projet sélectionné
  const getProjectName = (): string => {
    if (project === "all") return "Tous les projets";

    if (allProjectsData?.projects) {
      const foundProject = allProjectsData.projects.find(
        (p: Project) => p.id.toString() === project,
      );
      return foundProject?.name || "Projet inconnu";
    }

    return projectData?.project?.name || "Projet inconnu";
  };

  // Générer les options de projets à partir des données
  const getProjectOptions = () => {
    const options = [{ value: "all", label: "Tous les projets" }];

    if (allProjectsData?.projects) {
      allProjectsData.projects.forEach((proj: Project) => {
        options.push({ value: proj.id.toString(), label: proj.name });
      });
    }

    return options;
  };

  const periodOptions = [
    { value: "month", label: "Dernier mois" },
    { value: "quarter", label: "Dernier trimestre" },
    { value: "year", label: "Dernière année" },
  ];

  const getProjectLabel = () => {
    return project === "all" ? "Tous les projets" : getProjectName();
  };

  const getPeriodspan = () =>
    periodOptions.find((opt) => opt.value === period)?.label || "";

  // Fonction pour formater les dates
  const formatDate = (dateString: string): string => {
    if (!dateString) return "N/A";
    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    return new Date(dateString).toLocaleDateString("fr-FR", options);
  };

  // Fonction pour obtenir la couleur de statut dynamique
  const getStatusColor = (status: string): string => {
    const statusLower = status.toLowerCase();

    // Statuts de complétion
    if (
      ["termine", "terminée", "done", "completed", "fini", "finie"].includes(
        statusLower,
      )
    ) {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    }
    // Statuts de révision
    else if (
      ["en révision", "review", "révision", "à réviser", "validation"].includes(
        statusLower,
      )
    ) {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    }
    // Statuts en cours
    else if (
      [
        "en cours",
        "in progress",
        "doing",
        "en développement",
        "développement",
      ].includes(statusLower)
    ) {
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    }
    // Statuts de début
    else if (
      ["à faire", "todo", "to do", "backlog", "nouveau"].includes(statusLower)
    ) {
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    }
    // Autres statuts
    else {
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  // Fonction pour obtenir le texte de statut (garde le nom original de la colonne)
  const getStatusText = (status: string): string => {
    // Pour les statuts système, on traduit
    switch (status) {
      case "completed":
        return "Terminé";
      case "in-progress":
        return "En cours";
      case "delayed":
        return "En retard";
      case "planned":
        return "Planifié";
      default:
        // Pour les noms de colonnes personnalisés, on garde le nom original
        return status;
    }
  };

  // Fonction pour changer le projet sélectionné depuis la vue d'ensemble
  const handleSelectProject = (projectId: string) => {
    setProject(projectId);
    setReportGenerated(false);
    setGeneratedReportData(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Obtenir les données à afficher
  const getDisplayData = () => {
    if (generatedReportData) {
      debugData(generatedReportData, "Generated Report Data");
      return generatedReportData;
    }

    if (project === "all") {
      debugData(allProjectsData, "All Projects Data");
      return allProjectsData;
    }

    debugData(projectData, "Single Project Data");
    return projectData;
  };

  // Déterminer si les données sont en cours de chargement
  const isLoadingData =
    isLoadingAllProjects ||
    (project !== "all" && isLoadingProject) ||
    isGeneratingReport ||
    isGenerating;

  // Vérifier s'il y a des erreurs
  const hasErrorData = allProjectsError || (project !== "all" && projectError);

  const displayData = getDisplayData();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto max-w-7xl space-y-6 p-4">
        {/* Bandeau d'introduction */}
        <div className="animate-fade-in rounded-lg border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 p-6 shadow-sm dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
              Générateur de Rapports Détaillés
            </h1>
            <p className="mt-2 text-black dark:text-white">
              Créez des rapports détaillés et professionnels en quelques clics
              pour tous vos projets
            </p>
          </div>
        </div>

        {/* Afficher les erreurs s'il y en a */}
        {hasErrorData && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>
              Une erreur s'est produite lors du chargement des données. Veuillez
              réessayer.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Formulaire de configuration du rapport */}
          <div className="animate-fade-in lg:col-span-1">
            <Card className="h-full border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                  <FileText className="h-5 w-5 text-black dark:text-white" />
                  Paramètres du Rapport
                </CardTitle>
                <CardDescription className="text-black dark:text-white">
                  Configurez les options pour générer votre rapport détaillé
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black dark:text-white">
                      Projet
                    </label>
                    <Select
                      value={project}
                      onValueChange={setProject}
                      disabled={isLoadingData}
                    >
                      <SelectTrigger className="text-black dark:text-white">
                        <SelectValue placeholder="Sélectionnez un projet" />
                      </SelectTrigger>
                      <SelectContent>
                        {getProjectOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="text-black dark:text-white">
                              {option.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-black dark:text-white">
                      Période
                    </label>
                    <Select
                      value={period}
                      onValueChange={setPeriod}
                      disabled={isLoadingData}
                    >
                      <SelectTrigger className="text-black dark:text-white">
                        <SelectValue placeholder="Sélectionnez une période" />
                      </SelectTrigger>
                      <SelectContent>
                        {periodOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="text-black dark:text-white">
                              {option.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </form>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:bg-indigo-600"
                  onClick={handleGenerate}
                  disabled={isLoadingData}
                >
                  {isLoadingData ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Génération en
                      cours...
                    </span>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4 text-white" /> Générer
                      le Rapport Détaillé
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Affichage du rapport généré */}
          <div className="animate-fade-in lg:col-span-2">
            {isLoadingData ? (
              <div className="flex h-full flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <Loader2 className="mb-4 h-10 w-10 animate-spin text-indigo-600" />
                <h3 className="text-xl font-medium text-black dark:text-white">
                  Chargement des données...
                </h3>
              </div>
            ) : reportGenerated && displayData ? (
              <Card className="border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-2xl text-black dark:text-white">
                      Rapport Détaillé
                    </CardTitle>
                    <CardDescription className="text-black dark:text-white">
                      {getProjectLabel()} | {getPeriodspan()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleDownload()}
                      className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:bg-indigo-600"
                    >
                      <Download className="mr-2 h-4 w-4 text-white" />{" "}
                      Télécharger PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                  {project === "all" ? (
                    <div>
                      {/* Résumé général pour tous les projets */}
                      {displayData?.summary && (
                        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                          <Card className="border border-gray-200 shadow-sm dark:border-gray-700">
                            <CardContent className="pt-4">
                              <div className="flex items-center gap-4">
                                <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/20">
                                  <Briefcase className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Total Projets
                                  </p>
                                  <h3 className="text-2xl font-bold text-black dark:text-white">
                                    {displayData.summary.totalProjects}
                                  </h3>
                                  <p className="text-xs text-green-600 dark:text-green-400">
                                    {displayData.summary.completedProjects}{" "}
                                    terminés
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="border border-gray-200 shadow-sm dark:border-gray-700">
                            <CardContent className="pt-4">
                              <div className="flex items-center gap-4">
                                <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/20">
                                  <CheckSquare className="h-6 w-6 text-green-500 dark:text-green-400" />
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Total Tâches
                                  </p>
                                  <h3 className="text-2xl font-bold text-black dark:text-white">
                                    {displayData.summary.totalTasks}
                                  </h3>
                                  <p className="text-xs text-green-600 dark:text-green-400">
                                    {displayData.summary.totalCompletedTasks}{" "}
                                    terminées
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="border border-gray-200 shadow-sm dark:border-gray-700">
                            <CardContent className="pt-4">
                              <div className="flex items-center gap-4">
                                <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900/20">
                                  <TrendingUp className="h-6 w-6 text-purple-500 dark:text-purple-400" />
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Taux Global
                                  </p>
                                  <h3 className="text-2xl font-bold text-black dark:text-white">
                                    {displayData.summary.totalTasks > 0
                                      ? Math.round(
                                          (displayData.summary
                                            .totalCompletedTasks /
                                            displayData.summary.totalTasks) *
                                            100,
                                        )
                                      : 0}
                                    %
                                  </h3>
                                  <p className="text-xs text-blue-600 dark:text-blue-400">
                                    de complétion
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {/* Liste des projets */}
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {displayData.projects &&
                        displayData.projects.length > 0 ? (
                          displayData.projects.map((proj: Project) => (
                            <Card
                              key={proj.id}
                              className="overflow-hidden border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-700"
                            >
                              <CardHeader className="dark:to-gray-750 bg-gradient-to-r from-indigo-50 to-violet-50 pb-2 dark:from-gray-800">
                                <div className="flex items-start justify-between">
                                  <CardTitle className="text-xl text-black dark:text-white">
                                    {proj.name}
                                  </CardTitle>
                                  <Badge
                                    className={getStatusColor(
                                      proj.status ||
                                        (proj.progress === 100
                                          ? "completed"
                                          : "in-progress"),
                                    )}
                                  >
                                    {getStatusText(
                                      proj.status ||
                                        (proj.progress === 100
                                          ? "completed"
                                          : "in-progress"),
                                    )}
                                  </Badge>
                                </div>
                                <CardDescription className="flex items-center gap-2 text-black dark:text-white">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(proj.start_date)} -{" "}
                                  {formatDate(proj.end_date)}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="pt-4">
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                      Progression:
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <div className="progress-bar h-3 w-32">
                                        <div
                                          className="progress-bar-fill h-full"
                                          style={{
                                            width: `${proj.progress || 0}%`,
                                          }}
                                        />
                                      </div>
                                      <span className="text-sm font-medium text-black dark:text-white">
                                        {proj.progress || 0}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                      Chef de projet:
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage
                                          src={
                                            proj.manager?.avatar ||
                                            "/placeholder.svg?height=40&width=40" ||
                                            "/placeholder.svg"
                                          }
                                          alt={proj.manager?.name || "Manager"}
                                        />
                                        <AvatarFallback>
                                          {proj.manager?.name
                                            ? proj.manager.name
                                                .split(" ")
                                                .map((n: string) => n[0])
                                                .join("")
                                            : "?"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm text-black dark:text-white">
                                        {proj.manager?.name || "Non assigné"}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                      Équipe:
                                    </span>
                                    <span className="text-sm text-black dark:text-white">
                                      {proj.team || 0} membres
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                      Tâches:
                                    </span>
                                    <span className="text-sm text-black dark:text-white">
                                      {proj.completedTasks || 0}/
                                      {proj.totalTasks || 0}
                                    </span>
                                  </div>
                                </div>
                              </CardContent>
                              <CardFooter className="border-t border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                                <Button
                                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:bg-indigo-600"
                                  onClick={() =>
                                    handleSelectProject(proj.id.toString())
                                  }
                                >
                                  Voir les détails
                                </Button>
                              </CardFooter>
                            </Card>
                          ))
                        ) : (
                          <div className="col-span-2 py-12 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                              <AlertTriangle className="h-6 w-6 text-yellow-500" />
                            </div>
                            <h3 className="mb-2 text-lg font-medium text-black dark:text-white">
                              Aucun projet trouvé
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                              Vous n'avez pas encore de projets ou vous n'avez
                              pas accès aux projets existants.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : displayData?.project ? (
                    <div className="space-y-6 border-b border-gray-200 pb-8 last:border-0 dark:border-gray-700">
                      {/* En-tête du projet avec design amélioré */}
                      <div className="dark:to-gray-750/50 relative overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 p-6 shadow-sm dark:border-gray-700 dark:from-gray-800/50">
                        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                          <div>
                            <h2 className="text-3xl font-bold text-black dark:text-white">
                              {displayData.project.name ||
                                "Nom du projet non disponible"}
                            </h2>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge
                                className={`${getStatusColor(displayData.stats?.completionRate === 100 ? "completed" : "in-progress")} px-3 py-1 text-sm font-medium`}
                              >
                                {getStatusText(
                                  displayData.stats?.completionRate === 100
                                    ? "completed"
                                    : "in-progress",
                                )}
                              </Badge>
                              <span className="flex items-center text-sm text-black dark:text-white">
                                <Calendar className="mr-1 inline-block h-4 w-4" />
                                {formatDate(displayData.project.start_date)} -{" "}
                                {formatDate(displayData.project.end_date)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 rounded-lg bg-white/80 px-4 py-2 shadow-sm backdrop-blur-sm dark:bg-gray-800/80">
                            <div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Progression
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="progress-bar h-3 w-24">
                                  <div
                                    className="progress-bar-fill h-full"
                                    style={{
                                      width: `${displayData.stats?.completionRate || 0}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-bold text-black dark:text-white">
                                  {displayData.stats?.completionRate || 0}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Métriques du projet */}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Card className="metric-card">
                          <CardContent className="pt-4">
                            <div className="flex items-center gap-4">
                              <div className="metric-icon bg-orange-100 dark:bg-orange-900/20">
                                <TrendingUp className="h-6 w-6 text-orange-500 dark:text-orange-400" />
                              </div>
                              <div className="w-full">
                                <p className="metric-label">Progression</p>
                                <div className="mb-2 flex items-baseline gap-2">
                                  <h3 className="metric-value">
                                    {displayData.stats?.completionRate || 0}%
                                  </h3>
                                  <span
                                    className={`metric-change ${(displayData.stats?.completionRate || 0) > 50 ? "positive" : "neutral"}`}
                                  >
                                    {(displayData.stats?.completionRate || 0) >
                                    50
                                      ? "En bonne voie"
                                      : "Attention requise"}
                                  </span>
                                </div>
                                <div className="progress-bar h-4 w-full">
                                  <div
                                    className="progress-bar-fill h-full"
                                    style={{
                                      width: `${displayData.stats?.completionRate || 0}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="metric-card">
                          <CardContent className="pt-4">
                            <div className="flex items-center gap-4">
                              <div className="metric-icon bg-yellow-100 dark:bg-yellow-900/20">
                                <CheckSquare className="h-6 w-6 text-yellow-500 dark:text-yellow-400" />
                              </div>
                              <div>
                                <p className="metric-label">Tâches</p>
                                <div className="flex items-baseline gap-2">
                                  <h3 className="metric-value">
                                    {displayData.stats?.completedTasks || 0} /{" "}
                                    {displayData.stats?.totalTasks || 0}
                                  </h3>
                                  <span className="metric-change positive">
                                    terminées
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Statistiques des tâches par statut (colonnes dynamiques) */}
                      {displayData.stats?.tasksByStatus && (
                        <Card className="overflow-hidden border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-700">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                              <CheckSquare className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                              Répartition des tâches par statut
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                              <div>
                                <h4 className="mb-2 text-sm font-medium text-black dark:text-white">
                                  Par statut (colonnes)
                                </h4>
                                <div className="space-y-2">
                                  {Object.entries(
                                    displayData.stats.tasksByStatus,
                                  ).map(([status, count]) => (
                                    <div
                                      key={status}
                                      className="flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          className={`status-badge ${getStatusColor(status)}`}
                                          variant="outline"
                                        >
                                          {status}
                                        </Badge>
                                      </div>
                                      <span className="text-sm font-medium text-black dark:text-white">
                                        {String(count)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h4 className="mb-2 text-sm font-medium text-black dark:text-white">
                                  Par priorité
                                </h4>
                                <div className="space-y-2">
                                  {Object.entries(
                                    displayData.stats?.tasksByPriority || {},
                                  ).map(([priority, count]) => (
                                    <div
                                      key={priority}
                                      className="flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`h-3 w-3 rounded-full ${
                                            priority === "urgente"
                                              ? "bg-red-500"
                                              : priority === "haute"
                                                ? "bg-orange-500"
                                                : priority === "moyenne"
                                                  ? "bg-blue-500"
                                                  : "bg-green-500"
                                          }`}
                                        ></span>
                                        <span className="text-sm text-black dark:text-white">
                                          {priority.charAt(0).toUpperCase() +
                                            priority.slice(1)}
                                        </span>
                                      </div>
                                      <span className="text-sm font-medium text-black dark:text-white">
                                        {String(count)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Informations sur le manager */}
                      {displayData.project?.manager && (
                        <Card className="overflow-hidden border-0 shadow-md transition-all duration-300 hover:shadow-lg">
                          <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-500"></div>
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg text-black dark:text-white">
                              <User className="h-5 w-5 text-pink-500 dark:text-pink-400" />
                              Chef de Projet
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex flex-col items-start gap-6 rounded-lg bg-gradient-to-r from-violet-50 to-indigo-50 p-4 dark:from-violet-900/10 dark:to-indigo-900/10 sm:flex-row sm:items-center">
                              <Avatar className="h-20 w-20 border-4 border-white shadow-md dark:border-gray-800">
                                <AvatarImage
                                  src={
                                    displayData.project.manager.avatar ||
                                    "/placeholder.svg?height=40&width=40" ||
                                    "/placeholder.svg"
                                  }
                                  alt={displayData.project.manager.name}
                                />
                                <AvatarFallback className="bg-violet-100 text-xl text-violet-600 dark:bg-violet-900 dark:text-violet-200">
                                  {displayData.project.manager.name
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="space-y-2">
                                <h3 className="text-xl font-bold text-black dark:text-white">
                                  {displayData.project.manager.name}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {displayData.project.manager.pivot?.role ||
                                    "Manager"}
                                </p>
                                <div className="flex flex-col gap-3 text-sm sm:flex-row sm:gap-6">
                                  <span className="flex items-center text-gray-600 dark:text-gray-300">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="mr-1 h-4 w-4"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                      />
                                    </svg>
                                    {displayData.project.manager.email}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Équipe du projet */}
                      {displayData.team && displayData.team.length > 0 && (
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem
                            value="team"
                            className="overflow-hidden border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-700"
                          >
                            <AccordionTrigger className="px-6 py-4 text-lg font-medium text-black hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800/50">
                              <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/20">
                                  <Users className="h-5 w-5 text-green-500 dark:text-green-400" />
                                </div>
                                <span>
                                  Équipe du Projet ({displayData.team.length}{" "}
                                  membres)
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6 pt-2">
                              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                                {displayData.team.map((member: TeamMember) => (
                                  <Card
                                    key={member.id}
                                    className="overflow-hidden border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-700"
                                  >
                                    <CardHeader className="dark:to-gray-750 bg-gradient-to-r from-gray-50 to-gray-100 pb-2 dark:from-gray-800">
                                      <div className="flex items-center gap-4">
                                        <Avatar className="h-14 w-14 border-2 border-white shadow-sm dark:border-gray-700">
                                          <AvatarImage
                                            src={
                                              member.avatar ||
                                              "/placeholder.svg?height=40&width=40" ||
                                              "/placeholder.svg"
                                            }
                                            alt={member.name}
                                          />
                                          <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200">
                                            {member.name
                                              .split(" ")
                                              .map((n: string) => n[0])
                                              .join("")}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <h4 className="text-lg font-bold text-black dark:text-white">
                                            {member.name}
                                          </h4>
                                          <p className="text-sm text-gray-600 dark:text-gray-300">
                                            {member.role}
                                          </p>
                                        </div>
                                      </div>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                      {member.tasks &&
                                      member.tasks.length > 0 ? (
                                        <div className="space-y-4">
                                          <h5 className="flex items-center gap-2 text-sm font-medium text-black dark:text-white">
                                            <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            Tâches assignées:
                                          </h5>
                                          <div className="space-y-3">
                                            {member.tasks.map((task: Task) => (
                                              <div
                                                key={task.id}
                                                className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"
                                              >
                                                <div className="flex items-start justify-between">
                                                  <h6 className="text-sm font-medium text-black dark:text-white">
                                                    {task.name}
                                                  </h6>
                                                  <Badge
                                                    className={`status-badge ${getStatusColor(task.status)}`}
                                                  >
                                                    {task.status}
                                                  </Badge>
                                                </div>
                                                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                                                  {task.startDate &&
                                                    task.endDate && (
                                                      <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                                        <CalendarIcon className="mr-1 inline-block h-3 w-3" />
                                                        {formatDate(
                                                          task.startDate,
                                                        )}{" "}
                                                        -{" "}
                                                        {formatDate(
                                                          task.endDate,
                                                        )}
                                                      </span>
                                                    )}
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                      Progression:
                                                    </span>
                                                    <div className="progress-bar h-2 w-20">
                                                      <div
                                                        className="progress-bar-fill h-full"
                                                        style={{
                                                          width: `${task.progress}%`,
                                                        }}
                                                      />
                                                    </div>
                                                    <span className="text-xs font-medium text-black dark:text-white">
                                                      {task.progress}%
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                          Aucune tâche assignée
                                        </p>
                                      )}
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}

                      {/* Performance de l'équipe */}
                      {displayData.stats?.teamPerformance &&
                        displayData.stats.teamPerformance.length > 0 && (
                          <Card className="overflow-hidden border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-700">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                                <TrendingUp className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                                Performance de l'équipe
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {displayData.stats.teamPerformance.map(
                                  (member: TeamPerformanceItem) => (
                                    <div
                                      key={member.memberId}
                                      className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800"
                                    >
                                      <div className="mb-2 flex items-center justify-between">
                                        <h4 className="text-sm font-medium text-black dark:text-white">
                                          {member.name}
                                        </h4>
                                        <Badge
                                          className={
                                            member.completionRate > 75
                                              ? "status-completed"
                                              : "status-in-progress"
                                          }
                                        >
                                          {member.tasksCompleted} tâches
                                          terminées
                                        </Badge>
                                      </div>
                                      <div className="mb-1 flex items-center gap-2">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          Taux de complétion:
                                        </span>
                                        <div className="progress-bar h-2 flex-1">
                                          <div
                                            className="progress-bar-fill h-full"
                                            style={{
                                              width: `${member.completionRate}%`,
                                            }}
                                          />
                                        </div>
                                        <span className="text-xs font-medium text-black dark:text-white">
                                          {member.completionRate}%
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          Temps moyen:
                                        </span>
                                        <span className="text-xs font-medium text-black dark:text-white">
                                          {member.averageCompletionTime}{" "}
                                          {member.averageCompletionTime === 1
                                            ? "jour"
                                            : "jours"}
                                        </span>
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                      {/* Tendances de performance */}
                      {displayData.stats?.tasksByStatus && (
                        <Card className="overflow-hidden border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-700">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                              <TrendingUp className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                              Évolution des tâches par statut
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-6">
                              {/* Graphique en barres pour les statuts */}
                              <div className="relative h-64">
                                <div className="absolute inset-0 flex items-end justify-between px-4">
                                  {Object.entries(
                                    displayData.stats.tasksByStatus,
                                  ).map(([status, count], index) => {
                                    const taskCount = Number(count) || 0;
                                    const allCounts = Object.values(
                                      displayData.stats.tasksByStatus,
                                    ).map((c) => Number(c) || 0);
                                    const maxCount = Math.max(...allCounts, 1); // Éviter la division par zéro
                                    const height =
                                      maxCount > 0
                                        ? (taskCount / maxCount) * 200
                                        : 10;

                                    return (
                                      <div
                                        key={status}
                                        className="flex flex-col items-center"
                                        style={{
                                          width: `${100 / Object.keys(displayData.stats.tasksByStatus).length - 2}%`,
                                        }}
                                      >
                                        <div className="flex flex-col items-center">
                                          <span className="mb-2 text-sm font-medium text-black dark:text-white">
                                            {taskCount}
                                          </span>
                                          <div
                                            className={`w-full rounded-t-lg transition-all duration-500 ${
                                              status
                                                .toLowerCase()
                                                .includes("terminé") ||
                                              status
                                                .toLowerCase()
                                                .includes("done")
                                                ? "bg-green-500"
                                                : status
                                                      .toLowerCase()
                                                      .includes("cours") ||
                                                    status
                                                      .toLowerCase()
                                                      .includes("progress")
                                                  ? "bg-blue-500"
                                                  : status
                                                        .toLowerCase()
                                                        .includes("révision") ||
                                                      status
                                                        .toLowerCase()
                                                        .includes("review")
                                                    ? "bg-yellow-500"
                                                    : "bg-purple-500"
                                            }`}
                                            style={{
                                              height: `${height}px`,
                                              minHeight: "20px",
                                            }}
                                          />
                                        </div>
                                        <span className="mt-2 break-words text-center text-xs text-gray-600 dark:text-gray-400">
                                          {status}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Légende */}
                              <div className="flex flex-wrap justify-center gap-4">
                                {Object.entries(
                                  displayData.stats.tasksByStatus,
                                ).map(([status, count]) => {
                                  const taskCount = Number(count) || 0;
                                  return (
                                    <div
                                      key={status}
                                      className="flex items-center gap-2"
                                    >
                                      <div
                                        className={`h-3 w-3 rounded-full ${
                                          status
                                            .toLowerCase()
                                            .includes("terminé") ||
                                          status.toLowerCase().includes("done")
                                            ? "bg-green-500"
                                            : status
                                                  .toLowerCase()
                                                  .includes("cours") ||
                                                status
                                                  .toLowerCase()
                                                  .includes("progress")
                                              ? "bg-blue-500"
                                              : status
                                                    .toLowerCase()
                                                    .includes("révision") ||
                                                  status
                                                    .toLowerCase()
                                                    .includes("review")
                                                ? "bg-yellow-500"
                                                : "bg-purple-500"
                                        }`}
                                      />
                                      <span className="text-xs text-gray-600 dark:text-gray-400">
                                        {status} ({taskCount})
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Statistiques supplémentaires */}
                              <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {displayData.stats.completionRate}%
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Taux de complétion
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {displayData.stats.totalTasks -
                                      displayData.stats.completedTasks}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Tâches restantes
                                  </p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                      <div className="mb-4 rounded-full bg-red-50 p-4 dark:bg-red-900">
                        <AlertTriangle className="h-10 w-10 text-red-500 dark:text-red-400" />
                      </div>
                      <h3 className="mb-2 text-xl font-medium text-black dark:text-white">
                        Données du projet non disponibles
                      </h3>
                      <p className="max-w-sm text-black dark:text-white">
                        Les données du projet sélectionné ne sont pas
                        disponibles. Veuillez sélectionner un autre projet ou
                        réessayer.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-4 rounded-full bg-indigo-50 p-4 dark:bg-indigo-900">
                  <FileText className="h-10 w-10 text-black dark:text-white" />
                </div>
                <h3 className="mb-2 text-xl font-medium text-black dark:text-white">
                  Aucun rapport généré
                </h3>
                <p className="max-w-sm text-black dark:text-white">
                  Configurez les paramètres et générez votre premier rapport
                  détaillé pour visualiser les données ici.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomatedReport;
