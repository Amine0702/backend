"use client";
import {
  ChartBarIcon,
  UsersIcon,
  ClipboardDocumentCheckIcon,
  ArrowTrendingUpIcon,
  BriefcaseIcon,
  ClockIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CheckCircleIcon,
  PresentationChartLineIcon,
  CheckIcon,
  XMarkIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createGlobalStyle } from "styled-components";
import {
  useGetDashboardDataQuery,
  useGetRecentActivitiesQuery,
  useGetUserDetailsByIdQuery,
  useGetProjectStatsByMonthQuery,
  useGetPendingProjectsQuery,
  useApproveProjectMutation,
  useRejectProjectMutation,
  useGetProjectQuery,
} from "@/app/state/api";
import type { BackendTeamMember } from "@/app/projects/types/kanban";
import { ConfirmationModal } from "../../../components/confirmation-modal";

// Ajouter des styles CSS personnalisés pour la barre de défilement

const GlobalStyle = createGlobalStyle`
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
    display: block;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.5);
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(139, 92, 246, 0.7);
  }

  /* Ajouter des styles pour les échelles du graphique en mode sombre */
  .dark .recharts-cartesian-axis-tick-value {
    fill: #ffffff;
  }

  /* Ajouter des styles pour les emails et badges en mode sombre */
  .dark .badge-email {
    color: #ffffff !important;
    border-color: #ffffff !important;
  }

  /* Ajouter des styles pour le bouton fermer en mode sombre */
  .dark .close-button {
    color: #ffffff !important;
  }
  
  /* Améliorer la visibilité des pourcentages en mode sombre */
  .dark .task-percentage {
    color: #ffffff !important;
  }
  
  /* Style pour masquer la scrollbar tout en permettant le défilement */
  .hide-scrollbar {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
`;

/* =================== Types & Interfaces =================== */

type ModalType =
  | "projets_actifs"
  | "taches_completees"
  | "activite_recente"
  | "taches_en_cours"
  | "projets_termines"
  | "projets_prioritaires"
  | "projets_section"
  | "projet_details"
  | "tache_details"
  | "equipes"
  | "equipe_details"
  | "member_details"
  | "projets_en_attente"
  | "repartition_taches"
  | "projet_repartition_taches"
  | null;

interface Project {
  id: number;
  name: string;
  progress: number;
  deadline: string;
  color: string;
  details: string;
  team?: BackendTeamMember[];
  end_date?: string;
  description?: string;
  status?: string;
}

interface PendingProject {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  clerk_user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  team_members: BackendTeamMember[];
}

interface Task {
  id: number;
  title: string;
  progress: string;
  details: string;
  assignedTo: string;
  assignee?: BackendTeamMember;
  deadline: string;
  priority: "basse" | "moyenne" | "haute" | "urgente";
  description: string;
  due_date: string;
  assignee_id: number | null;
  project_name?: string;
  project_id?: number;
  status?: string;
}

interface Activity {
  id: number;
  user: string;
  action: string;
  time: string;
}

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

interface StatBlockProps {
  title: string;
  value: string;
  icon: React.ReactElement;
  onClick?: () => void;
}

interface ClickableProps {
  onClick?: () => void;
}

interface ProjectTimelineProps extends ClickableProps {}

interface RecentActivityProps extends ClickableProps {
  className?: string;
}

interface ProjectSectionProps {
  onProjectClick: (project: Project) => void;
  summary?: boolean;
  projects: Project[];
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
  avatar: string;
  status: "active" | "inactive";
  email: string;
  phone?: string;
  address?: string;
  project?: string;
  post?: string;
}

interface TeamGroup {
  projectName: string;
  projectColor: string;
  members: TeamMember[];
}

interface NotificationState {
  show: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
}

/* =================== Données de démonstration =================== */

const colors = {
  primary: "#8B5CF6",
  secondary: "#6366F1",
  accent: "#EC4899",
  background: "#F8FAFC",
  text: "#1E293B",
};

const PRIORITY_COLORS = {
  basse: "#10B981", // vert
  moyenne: "#F59E0B", // ambre
  haute: "#EF4444", // rouge
  urgente: "#7C3AED", // violet foncé
};

/* =================== Composants =================== */

// Composant Modal générique (affiche en recouvrant entièrement l'écran, sans navbar)
const Modal: React.FC<ModalProps> = ({ title, children, onClose }) => (
  <motion.div
    className="fixed inset-0 z-50 flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <div className="absolute inset-0 bg-black opacity-50" onClick={onClose} />
    <motion.div
      className="relative z-10 max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-8 dark:bg-slate-800"
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
          {title}
        </h2>
        <Button
          variant="ghost"
          onClick={onClose}
          className="close-button hover:bg-slate-100 dark:text-white dark:hover:bg-slate-700"
        >
          Fermer
        </Button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

// Composant StatBlock cliquable
const StatBlock: React.FC<StatBlockProps> = ({
  title,
  value,
  icon,
  onClick,
}) => (
  <motion.div
    onClick={onClick}
    whileHover={{ scale: 1.03 }}
    className="cursor-pointer rounded-2xl border border-slate-100 bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-all hover:border-purple-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-400"
  >
    <div className="flex items-center gap-4">
      <div className="rounded-xl bg-purple-500/10 p-3">
        {React.cloneElement(icon, { className: "w-8 h-8 text-purple-600" })}
      </div>
      <div>
        <p className="mb-1 text-sm text-slate-500 dark:text-slate-300">
          {title}
        </p>
        <p className="text-3xl font-bold text-slate-800 dark:text-white">
          {value}
        </p>
        <div className="mt-2 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <ArrowTrendingUpIcon className="h-4 w-4" />
        </div>
      </div>
    </div>
  </motion.div>
);

// Modifier le composant ProjectTimeline pour supprimer la barre de défilement horizontale
const ProjectTimeline: React.FC<
  ProjectTimelineProps & { priorityProjects: Project[] }
> = ({ onClick, priorityProjects }) => {
  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="cursor-pointer rounded-2xl border border-slate-100 bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-all hover:border-purple-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-400"
    >
      <h3 className="mb-6 flex items-center gap-3 text-xl font-semibold text-slate-800 dark:text-white">
        <BriefcaseIcon className="h-7 w-7 text-purple-600" />
        Projets prioritaires
      </h3>
      <div
        className="hide-scrollbar space-y-6 overflow-y-auto pr-2"
        style={{ maxHeight: "400px" }}
      >
        {priorityProjects.length > 0 ? (
          priorityProjects.map((project) => (
            <div key={project.id} className="space-y-3">
              <div className="flex justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
                <span>{project.name}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {project.deadline}
                </span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${project.progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="absolute h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${project.color} 0%, ${colors.secondary} 100%)`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {project.details.substring(0, 80)}...
              </p>
            </div>
          ))
        ) : (
          <p className="text-center text-slate-500 dark:text-slate-400">
            Aucun projet prioritaire trouvé
          </p>
        )}
      </div>
    </motion.div>
  );
};

// Remplacer le composant RecentActivity par celui qui utilise l'API
// Modifier le composant RecentActivity pour utiliser useGetRecentActivitiesQuery
const RecentActivity: React.FC<RecentActivityProps> = ({
  onClick,
  className,
}) => {
  const {
    data: activitiesData,
    isLoading,
    error,
  } = useGetRecentActivitiesQuery();

  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex h-full cursor-pointer flex-col rounded-2xl border border-slate-100 bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-all hover:border-purple-200 dark:border-slate-700 dark:bg-slate-800 ${className || ""}`}
    >
      <h3 className="mb-4 flex items-center gap-3 text-xl font-semibold text-slate-800 dark:text-white">
        <ClockIcon className="h-7 w-7 text-purple-600" />
        Activité Récente
      </h3>
      <div
        className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden pr-2"
        style={{
          maxHeight: "300px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-red-500">
            Erreur lors du chargement des activités récentes
          </div>
        ) : activitiesData?.activities?.length > 0 ? (
          activitiesData.activities.slice(0, 4).map((activity: any) => (
            <motion.div
              key={activity.id}
              className="flex items-start gap-4 rounded-lg bg-purple-50/50 p-4 dark:bg-slate-700/50"
              whileHover={{ x: 5 }}
            >
              <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-purple-600" />
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm text-slate-800 dark:text-white">
                  <span className="font-medium">{activity.user}</span>{" "}
                  {activity.action}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {activity.time}
                </p>
              </div>
            </motion.div>
          ))
        ) : (
          <p className="py-8 text-center text-slate-500 dark:text-slate-400">
            Aucune activité récente
          </p>
        )}
      </div>
    </motion.div>
  );
};

// Composant ProjectSection (affiche tous les projets)
const ProjectSection: React.FC<ProjectSectionProps> = ({
  onProjectClick,
  summary = false,
  projects,
}) => {
  const list = summary ? projects.slice(0, 3) : projects;
  return (
    <motion.div
      className="rounded-2xl border border-slate-100 bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-all hover:border-purple-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-400"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="mb-4 flex items-center gap-3 text-xl font-semibold text-slate-800 dark:text-white">
        <BriefcaseIcon className="h-7 w-7 text-purple-600" />
        Projets
      </h3>
      <div
        className="space-y-4 overflow-y-auto pr-2"
        style={{
          maxHeight: "400px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {list.length > 0 ? (
          list.map((project, index) => (
            <motion.div
              key={project.id}
              onClick={() => onProjectClick(project)}
              className="flex cursor-pointer items-center gap-4 rounded-lg p-3 transition-colors hover:bg-purple-50/50 dark:hover:bg-slate-700/50"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ x: 5 }}
            >
              <div
                className="rounded-full p-2"
                style={{ background: project.color }}
              >
                <BriefcaseIcon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-800 dark:text-white">
                  {project.name}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Deadline: {project.deadline}
                </p>
              </div>
              <div className="w-16">
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${project.progress}%`,
                      background: project.color,
                    }}
                  />
                </div>
                <p className="task-percentage mt-1 text-right text-xs text-slate-500 dark:text-slate-400">
                  {project.progress}%
                </p>
              </div>
            </motion.div>
          ))
        ) : (
          <p className="text-center text-slate-500 dark:text-slate-400">
            Aucun projet trouvé
          </p>
        )}
      </div>
    </motion.div>
  );
};

// Modifier le composant TeamGroups pour limiter l'affichage à 3 équipes et ajouter une scrollbar
const TeamGroups: React.FC<{
  onTeamClick: (projectName: string, members: TeamMember[]) => void;
  teamGroups: TeamGroup[];
}> = ({ onTeamClick, teamGroups }) => {
  return (
    <motion.div
      className="rounded-2xl border border-slate-100 bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-all hover:border-purple-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-400"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="mb-4 flex items-center gap-3 text-xl font-semibold text-slate-800 dark:text-white">
        <UserGroupIcon className="h-7 w-7 text-purple-600" />
        Équipes par Projet
      </h3>
      <div
        className="space-y-4 overflow-y-auto pr-2"
        style={{
          maxHeight: "300px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {teamGroups.length > 0 ? (
          teamGroups.map((group, index) => (
            <motion.div
              key={group.projectName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="cursor-pointer rounded-lg border-l-4 p-4 transition-colors hover:bg-purple-50/50 dark:hover:bg-slate-700/50"
              style={{ borderColor: group.projectColor }}
              onClick={() => onTeamClick(group.projectName, group.members)}
              whileHover={{ x: 5 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-800 dark:text-white">
                    {group.projectName}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {group.members.length} membres
                  </p>
                </div>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full font-medium text-white"
                  style={{ background: group.projectColor }}
                >
                  {group.members.length}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <p className="text-center text-slate-500 dark:text-slate-400">
            Aucune équipe trouvée
          </p>
        )}
      </div>
    </motion.div>
  );
};

// TaskDetails Component
const TaskDetails: React.FC<{ task: Task; onClose: () => void }> = ({
  task,
  onClose,
}) => (
  <Modal title={task.title} onClose={onClose}>
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
        <h4 className="font-medium text-slate-800 dark:text-white">Détails</h4>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {task.details}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
          <h4 className="font-medium text-slate-800 dark:text-white">
            Assigné à
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {task.assignedTo}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
          <h4 className="font-medium text-slate-800 dark:text-white">
            Deadline
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {task.deadline}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
          <h4 className="font-medium text-slate-800 dark:text-white">
            Priorité
          </h4>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
            ></span>
            <p className="text-sm capitalize text-slate-600 dark:text-slate-300">
              {task.priority}
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
          <h4 className="font-medium text-slate-800 dark:text-white">Statut</h4>
          <p className="text-sm capitalize text-slate-600 dark:text-slate-300">
            {task.status || "En cours"}
          </p>
        </div>
      </div>
      {task.project_name && (
        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
          <h4 className="font-medium text-slate-800 dark:text-white">Projet</h4>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {task.project_name}
          </p>
        </div>
      )}
      <Button
        onClick={onClose}
        className="bg-purple-600 text-white hover:bg-purple-700"
      >
        Fermer
      </Button>
    </div>
  </Modal>
);

// TeamDetails Component
const TeamDetails: React.FC<{
  projectName: string;
  members: TeamMember[];
  onClose: () => void;
  onMemberClick: (member: TeamMember) => void;
}> = ({ projectName, members, onClose, onMemberClick }) => (
  <Modal title={`Équipe - ${projectName}`} onClose={onClose}>
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Cette équipe est responsable du projet <strong>{projectName}</strong>.
      </p>
      <h4 className="font-medium text-slate-800 dark:text-white">
        Membres de l'équipe
      </h4>
      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex cursor-pointer items-center justify-between rounded-lg bg-slate-50 p-3 transition-colors hover:bg-purple-50 dark:bg-slate-700/50 dark:hover:bg-purple-900/20"
            onClick={() => onMemberClick(member)}
          >
            <div className="flex items-center gap-3">
              <img
                src={member.avatar || "/placeholder.svg"}
                alt={member.name}
                className="h-8 w-8 rounded-full"
              />
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-white">
                  {member.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {member.role}
                </p>
              </div>
            </div>
            <Badge variant="outline">{member.status}</Badge>
          </div>
        ))}
      </div>
      <Button
        onClick={onClose}
        className="bg-purple-600 text-white hover:bg-purple-700"
      >
        Fermer
      </Button>
    </div>
  </Modal>
);

// Modifier la fonction qui gère le clic sur un membre pour récupérer les détails supplémentaires
// Remplacer le composant MemberDetails par celui-ci
const MemberDetails: React.FC<{ member: TeamMember; onClose: () => void }> = ({
  member,
  onClose,
}) => {
  const { data: userDetails, isLoading } = useGetUserDetailsByIdQuery(
    member.id,
  );

  return (
    <Modal title={`Détails de ${member.name}`} onClose={onClose}>
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-6">
              <img
                src={member.avatar || "/placeholder.svg"}
                alt={member.name}
                className="h-20 w-20 rounded-full"
              />
              <div>
                <h4 className="text-lg font-medium text-slate-800 dark:text-white">
                  {member.name}
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {member.role}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
              <h4 className="font-medium text-slate-800 dark:text-white">
                Informations de contact
              </h4>
              <div className="mt-2 space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  <span className="font-medium">Email:</span> {member.email}
                </p>
                {userDetails?.user?.phone && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Téléphone:</span>{" "}
                    {userDetails.user.phone}
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
              <h4 className="font-medium text-slate-800 dark:text-white">
                Informations supplémentaires
              </h4>
              <div className="mt-2 space-y-2">
                {userDetails?.user?.job_title && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Poste:</span>{" "}
                    {userDetails.user.job_title}
                  </p>
                )}
                {userDetails?.user?.location && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Localisation:</span>{" "}
                    {userDetails.user.location}
                  </p>
                )}
                {userDetails?.user?.company && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Entreprise:</span>{" "}
                    {userDetails.user.company}
                  </p>
                )}
                {member.project && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Projet:</span>{" "}
                    {member.project}
                  </p>
                )}
              </div>
            </div>
            {userDetails?.user?.bio && (
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
                <h4 className="font-medium text-slate-800 dark:text-white">
                  Biographie
                </h4>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {userDetails.user.bio}
                </p>
              </div>
            )}
          </>
        )}
        <Button
          onClick={onClose}
          className="bg-purple-600 text-white hover:bg-purple-700"
        >
          Fermer
        </Button>
      </div>
    </Modal>
  );
};

// Composant pour afficher les projets en attente d'approbation
const PendingProjectsSection: React.FC<{
  pendingProjects: PendingProject[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  isLoading: boolean;
}> = ({ pendingProjects, onApprove, onReject, isLoading }) => {
  return (
    <motion.div
      className="rounded-2xl border border-amber-200 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:border-amber-700 dark:bg-slate-800"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="mb-4 flex items-center gap-3 text-xl font-semibold text-slate-800 dark:text-white">
        <BriefcaseIcon className="h-7 w-7 text-amber-600" />
        Projets en attente d'approbation ({pendingProjects.length})
      </h3>
      <div className="custom-scrollbar max-h-[400px] space-y-4 overflow-y-auto pr-2">
        {pendingProjects.length > 0 ? (
          pendingProjects.map((project) => (
            <div
              key={project.id}
              className="rounded-lg border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-900/20"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-slate-800 dark:text-white">
                    {project.name}
                  </h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Créé le {new Date(project.created_at).toLocaleDateString()}
                  </p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {project.description}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Créé par:{" "}
                    {project.team_members.find(
                      (m) => m.clerk_user_id === project.clerk_user_id,
                    )?.name || "Utilisateur inconnu"}
                  </p>
                </div>
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                  En attente
                </Badge>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => onReject(project.id)}
                  disabled={isLoading}
                >
                  <XMarkIcon className="mr-1 h-4 w-4" />
                  Rejeter
                </Button>
                <Button
                  className="bg-green-600 text-white hover:bg-green-700"
                  onClick={() => onApprove(project.id)}
                  disabled={isLoading}
                >
                  <CheckIcon className="mr-1 h-4 w-4" />
                  Approuver
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-slate-500 dark:text-slate-400">
            Aucun projet en attente d'approbation
          </p>
        )}
      </div>
    </motion.div>
  );
};

// Composant pour afficher la liste des projets pour la répartition des tâches
const ProjectsTaskDistribution: React.FC<{
  projects: Project[];
  onProjectSelect: (projectId: number) => void;
  onClose: () => void;
}> = ({ projects, onProjectSelect, onClose }) => {
  return (
    <Modal title="Répartition des Tâches par Projet" onClose={onClose}>
      <div className="space-y-6">
        <p className="text-slate-600 dark:text-slate-300">
          Sélectionnez un projet pour voir la répartition détaillée des tâches
          par priorité.
        </p>

        <div className="custom-scrollbar max-h-[60vh] space-y-4 overflow-y-auto pr-2">
          {projects.length > 0 ? (
            projects.map((project) => (
              <motion.div
                key={project.id}
                className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-purple-300 hover:bg-purple-50/50 dark:border-slate-700 dark:bg-slate-700/50 dark:hover:border-purple-500 dark:hover:bg-purple-900/20"
                onClick={() => onProjectSelect(project.id)}
                whileHover={{ x: 5 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-full p-2"
                      style={{ background: project.color }}
                    >
                      <BriefcaseIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800 dark:text-white">
                        {project.name}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Deadline: {project.deadline}
                      </p>
                    </div>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-slate-400" />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="w-full">
                    <div className="mb-1 flex justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Progression
                      </span>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {project.progress}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-600">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${project.progress}%`,
                          background: project.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="rounded-lg bg-slate-100 p-8 text-center dark:bg-slate-800">
              <p className="text-slate-500 dark:text-slate-400">
                Aucun projet disponible
              </p>
            </div>
          )}
        </div>

        <Button
          onClick={onClose}
          className="bg-purple-600 text-white hover:bg-purple-700"
        >
          Fermer
        </Button>
      </div>
    </Modal>
  );
};

// Composant pour afficher la répartition des tâches d'un projet spécifique
const ProjectTaskDistributionDetails: React.FC<{
  projectId: number;
  onBack: () => void;
  onClose: () => void;
}> = ({ projectId, onBack, onClose }) => {
  const { data: projectData, isLoading } = useGetProjectQuery(projectId);
  const [tasksByPriority, setTasksByPriority] = useState<
    Record<string, Task[]>
  >({
    basse: [],
    moyenne: [],
    haute: [],
    urgente: [],
  });
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [pieChartData, setPieChartData] = useState<any[]>([]);

  useEffect(() => {
    if (projectData) {
      // Extraire toutes les tâches de toutes les colonnes
      const tasks: Task[] = [];
      const priorityMap: Record<string, Task[]> = {
        basse: [],
        moyenne: [],
        haute: [],
        urgente: [],
      };

      projectData.columns.forEach((column: any) => {
        column.tasks.forEach((task: any) => {
          // Convertir la tâche au format attendu
          const formattedTask: Task = {
            id: task.id,
            title: task.title,
            progress:
              task.status === "terminé"
                ? "100%"
                : task.status === "en_révision"
                  ? "75%"
                  : task.status === "en_cours"
                    ? "50%"
                    : "25%",
            details: task.description || "Aucune description",
            assignedTo: task.assignee ? task.assignee.name : "Non assigné",
            assignee: task.assignee,
            deadline: task.due_date
              ? format(new Date(task.due_date), "dd/MM/yy")
              : "N/A",
            priority: task.priority || "moyenne",
            description: task.description || "",
            due_date: task.due_date || "",
            assignee_id: task.assignee_id,
            project_name: projectData.name,
            project_id: projectData.id,
            status: task.status,
          };

          tasks.push(formattedTask);

          // Ajouter la tâche au groupe de priorité correspondant
          if (priorityMap[formattedTask.priority]) {
            priorityMap[formattedTask.priority].push(formattedTask);
          } else {
            // Si la priorité n'est pas reconnue, la mettre dans "moyenne"
            priorityMap.moyenne.push(formattedTask);
          }
        });
      });

      setAllTasks(tasks);
      setTasksByPriority(priorityMap);

      // Préparer les données pour le graphique en camembert
      const chartData = [
        {
          name: "Basse",
          value: priorityMap.basse.length,
          color: PRIORITY_COLORS.basse,
          percentage: "0%",
        },
        {
          name: "Moyenne",
          value: priorityMap.moyenne.length,
          color: PRIORITY_COLORS.moyenne,
          percentage: "0%",
        },
        {
          name: "Haute",
          value: priorityMap.haute.length,
          color: PRIORITY_COLORS.haute,
          percentage: "0%",
        },
        {
          name: "Urgente",
          value: priorityMap.urgente.length,
          color: PRIORITY_COLORS.urgente,
          percentage: "0%",
        },
      ].filter((item) => item.value > 0);

      // Calculer les pourcentages
      const totalTasks = chartData.reduce((sum, item) => sum + item.value, 0);
      chartData.forEach((item) => {
        item.percentage = `${Math.round((item.value / totalTasks) * 100)}%`;
      });

      setPieChartData(chartData);
    }
  }, [projectData]);

  if (isLoading) {
    return (
      <Modal title="Chargement..." onClose={onClose}>
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
        </div>
      </Modal>
    );
  }

  if (!projectData) {
    return (
      <Modal title="Erreur" onClose={onClose}>
        <div className="p-6 text-center">
          <p className="text-red-500">
            Impossible de charger les données du projet
          </p>
          <Button
            onClick={onBack}
            className="mt-4 bg-purple-600 text-white hover:bg-purple-700"
          >
            Retour à la liste des projets
          </Button>
        </div>
      </Modal>
    );
  }

  const totalTasks = allTasks.length;

  return (
    <Modal
      title={`Répartition des Tâches - ${projectData.name}`}
      onClose={onClose}
    >
      <div
        className="space-y-4 overflow-y-auto pr-2"
        style={{
          maxHeight: "70vh",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              onClick={onBack}
              variant="outline"
              className="flex items-center gap-1 border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ChevronRightIcon className="h-4 w-4 rotate-180" />
              Retour aux projets
            </Button>

            <div className="text-right">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Total des tâches:{" "}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {totalTasks}
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Graphique en camembert */}
            <div className="rounded-lg bg-slate-50 p-6 dark:bg-slate-700/50">
              <h3 className="mb-6 text-lg font-semibold text-slate-800 dark:text-white">
                Répartition par priorité
              </h3>

              {pieChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percentage }) =>
                          `${name}: ${percentage}`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center">
                  <p className="text-slate-500 dark:text-slate-400">
                    Aucune donnée disponible
                  </p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-4">
                {pieChartData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm capitalize text-slate-700 dark:text-slate-300">
                      {item.name} ({item.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Détails par priorité */}
            <div className="rounded-lg bg-slate-50 p-6 dark:bg-slate-700/50">
              <h3 className="mb-6 text-lg font-semibold text-slate-800 dark:text-white">
                Détails par priorité
              </h3>

              <div className="hide-scrollbar max-h-[300px] space-y-6 overflow-y-auto pr-2">
                {Object.entries(tasksByPriority)
                  .filter(([_, tasks]) => tasks.length > 0)
                  .map(([priority, tasks]) => (
                    <div key={priority} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor:
                              PRIORITY_COLORS[
                                priority as keyof typeof PRIORITY_COLORS
                              ],
                          }}
                        ></div>
                        <h4 className="font-medium capitalize text-slate-800 dark:text-white">
                          {priority}
                        </h4>
                        <Badge className="ml-2 bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200">
                          {tasks.length} tâches
                        </Badge>
                      </div>

                      <div className="ml-5 space-y-2">
                        {tasks.map((task) => (
                          <div
                            key={task.id}
                            className="text-sm text-slate-600 dark:text-slate-300"
                          >
                            • {task.title}{" "}
                            {task.assignedTo !== "Non assigné" &&
                              `(${task.assignedTo})`}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Liste complète des tâches */}
        <div className="rounded-lg bg-slate-50 p-6 dark:bg-slate-700/50">
          <h3 className="mb-6 text-lg font-semibold text-slate-800 dark:text-white">
            Liste des tâches
          </h3>

          <div className="hide-scrollbar max-h-[300px] space-y-4 overflow-y-auto pr-2">
            {allTasks.length > 0 ? (
              allTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-slate-200 p-4 dark:border-slate-600"
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
                      style={{
                        backgroundColor: PRIORITY_COLORS[task.priority],
                      }}
                    ></div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-800 dark:text-white">
                        {task.title}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                        <div>
                          Priorité:{" "}
                          <span className="capitalize">{task.priority}</span>
                        </div>
                        <div>Assigné à: {task.assignedTo}</div>
                        <div>
                          Statut:{" "}
                          <span className="capitalize">
                            {task.status || "À_faire"}
                          </span>
                        </div>
                        <div>Deadline: {task.deadline}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-500 dark:text-slate-400">
                Aucune tâche trouvée
              </p>
            )}
          </div>
        </div>

        <Button
          onClick={onClose}
          className="bg-purple-600 text-white hover:bg-purple-700"
        >
          Fermer
        </Button>
      </div>
    </Modal>
  );
};

// Modifier le composant principal pour gérer les clics sur les innovations
export default function GlobalDashboard() {
  const [selectedModal, setSelectedModal] = useState<ModalType>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTeamProject, setSelectedTeamProject] = useState<string | null>(
    null,
  );
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<TeamMember[]>(
    [],
  );
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null,
  );

  // État pour le système de notification
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    title: "",
    message: "",
    type: "success",
  });

  // Get the current user ID from localStorage
  const [clerkUserId, setClerkUserId] = useState<string | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem("currentUserId");
    if (userId) {
      setClerkUserId(userId);
    }
  }, []);

  // Fetch dashboard data
  const {
    data: dashboardData,
    isLoading: isLoadingDashboard,
    error: dashboardError,
  } = useGetDashboardDataQuery(undefined, { skip: !clerkUserId });

  // Fetch recent activities
  const {
    data: activitiesData,
    isLoading: isLoadingActivities,
    error: activitiesError,
  } = useGetRecentActivitiesQuery();

  // Fetch monthly stats
  const { data: monthlyStatsData, isLoading: isLoadingMonthlyStats } =
    useGetProjectStatsByMonthQuery();

  // Fetch pending projects using RTK Query
  const { data: pendingProjectsData, isLoading: isLoadingPendingProjects } =
    useGetPendingProjectsQuery();

  // Mutations for approving and rejecting projects
  const [approveProject, { isLoading: isApprovingProject }] =
    useApproveProjectMutation();
  const [rejectProject, { isLoading: isRejectingProject }] =
    useRejectProjectMutation();

  // Afficher une notification
  const showNotification = (
    title: string,
    message: string,
    type: "success" | "error" | "warning" | "info" = "success",
  ) => {
    setNotification({
      show: true,
      title,
      message,
      type,
    });
  };

  // Fermer la notification
  const closeNotification = () => {
    setNotification((prev) => ({ ...prev, show: false }));
  };

  // Handle project approval using RTK Query
  const handleApproveProject = async (projectId: number) => {
    try {
      await approveProject(projectId).unwrap();
      showNotification(
        "Projet approuvé",
        "Le projet a été approuvé avec succès.",
        "success",
      );
    } catch (error) {
      console.error("Error approving project:", error);
      showNotification(
        "Échec de l'approbation",
        "Le projet n'a pas pu être approuvé. Veuillez réessayer.",
        "error",
      );
    }
  };

  // Handle project rejection using RTK Query
  const handleRejectProject = async (projectId: number) => {
    try {
      await rejectProject(projectId).unwrap();
      showNotification(
        "Projet rejeté",
        "Le projet a été rejeté et supprimé de la base de données.",
        "warning",
      );
    } catch (error) {
      console.error("Error rejecting project:", error);
      showNotification(
        "Échec du rejet",
        "Le projet n'a pas pu être rejeté. Veuillez réessayer.",
        "error",
      );
    }
  };

  // Define project colors
  const projectColors = [
    "#EC4899",
    "#8B5CF6",
    "#6366F1",
    "#10B981",
    "#F59E0B",
    "#3B82F6",
    "#EF4444",
    "#14B8A6",
    "#8B5CF6",
    "#F97316",
  ];

  // Transform backend data to match UI components
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [completedProjects, setCompletedProjects] = useState<Project[]>([]);
  const [priorityProjects, setPriorityProjects] = useState<Project[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [ongoingTasks, setOngoingTasks] = useState<Task[]>([]);
  const [teamGroups, setTeamGroups] = useState<TeamGroup[]>([]);

  useEffect(() => {
    if (dashboardData) {
      // Transform projects data
      const transformedActiveProjects = dashboardData.active_projects.map(
        (project: any, index: number) => ({
          id: project.id,
          name: project.name,
          progress: project.progress,
          deadline: project.end_date
            ? format(new Date(project.end_date), "dd/MM/yy")
            : "N/A",
          color: projectColors[index % projectColors.length],
          details: project.description || "Aucune description",
          team: project.team || [],
          end_date: project.end_date,
          description: project.description,
        }),
      );

      const transformedCompletedProjects = dashboardData.completed_projects.map(
        (project: any, index: number) => ({
          id: project.id,
          name: project.name,
          progress: project.progress,
          deadline: project.end_date
            ? format(new Date(project.end_date), "dd/MM/yy")
            : "N/A",
          color:
            projectColors[
              (index + transformedActiveProjects.length) % projectColors.length
            ],
          details: project.description || "Aucune description",
          team: project.team || [],
          end_date: project.end_date,
          description: project.description,
        }),
      );

      const transformedPriorityProjects = dashboardData.priority_projects.map(
        (project: any, index: number) => ({
          id: project.id,
          name: project.name,
          progress: project.progress,
          deadline: project.end_date
            ? format(new Date(project.end_date), "dd/MM/yy")
            : "N/A",
          color: projectColors[index % projectColors.length],
          details: project.description || "Aucune description",
          team: project.team || [],
          end_date: project.end_date,
          description: project.description,
        }),
      );

      // Transform tasks data
      const transformedCompletedTasks = dashboardData.completed_tasks.map(
        (task: any) => ({
          id: task.id,
          title: task.title,
          progress: "100%",
          details: task.description || "Aucune description",
          assignedTo: task.assignee ? task.assignee.name : "Non assigné",
          assignee: task.assignee,
          deadline: task.due_date
            ? format(new Date(task.due_date), "dd/MM/yy")
            : "N/A",
          priority: task.priority || "moyenne",
          description: task.description || "",
          due_date: task.due_date || "",
          assignee_id: task.assignee_id,
          project_name: task.project_name,
          project_id: task.project_id,
          status: "terminé",
        }),
      );

      const transformedOngoingTasks = dashboardData.ongoing_tasks.map(
        (task: any) => {
          let progress = "25%";
          if (task.status === "en_cours") progress = "50%";
          if (task.status === "en_révision") progress = "75%";

          return {
            id: task.id,
            title: task.title,
            progress: progress,
            details: task.description || "Aucune description",
            assignedTo: task.assignee ? task.assignee.name : "Non assigné",
            assignee: task.assignee,
            deadline: task.due_date
              ? format(new Date(task.due_date), "dd/MM/yy")
              : "N/A",
            priority: task.priority || "moyenne",
            description: task.description || "",
            due_date: task.due_date || "",
            assignee_id: task.assignee_id,
            project_name: task.project_name,
            project_id: task.project_id,
            status: task.status,
          };
        },
      );

      // Transform team data
      const transformedTeamGroups = dashboardData.teams_by_project
        .map((team: any, index: number) => ({
          projectName: team.project_name,
          projectColor: projectColors[index % projectColors.length],
          members: team.members.map((member: any) => ({
            id: member.id,
            name: member.name,
            role: member.pivot.role,
            avatar:
              member.avatar ||
              `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? "men" : "women"}/${Math.floor(Math.random() * 10)}.jpg`,
            status: "active",
            email: member.email,
          })),
        }))
        .filter((group: any) => group.members.length > 0);

      // Set state with transformed data
      setAllProjects([
        ...transformedActiveProjects,
        ...transformedCompletedProjects,
      ]);
      setActiveProjects(transformedActiveProjects);
      setCompletedProjects(transformedCompletedProjects);
      setPriorityProjects(transformedPriorityProjects);
      setCompletedTasks(transformedCompletedTasks);
      setOngoingTasks(transformedOngoingTasks);
      setTeamGroups(transformedTeamGroups);
    }
  }, [dashboardData]);

  // Mettre à jour les statistiques mensuelles lorsque les données sont chargées
  useEffect(() => {
    if (monthlyStatsData?.monthlyStats) {
      setMonthlyStats(monthlyStatsData.monthlyStats);
    }
  }, [monthlyStatsData]);

  // Gérer la sélection d'un projet pour voir sa répartition des tâches
  const handleProjectSelect = (projectId: number) => {
    setSelectedProjectId(projectId);
    setSelectedModal("projet_repartition_taches");
  };

  // Gérer le retour à la liste des projets
  const handleBackToProjects = () => {
    setSelectedProjectId(null);
    setSelectedModal("repartition_taches");
  };

  return (
    <>
      <GlobalStyle />
      <section
        className="min-h-screen bg-gradient-to-br from-purple-50/50 to-blue-50/50 p-6 dark:from-slate-900 dark:to-slate-800 md:p-8"
        onClick={(e) => {
          if (e.target === e.currentTarget && selectedModal) {
            setSelectedModal(null);
          }
        }}
      >
        {/* Important: Ne pas afficher la navbar dans les modales */}
        {!selectedModal && (
          <header className="mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-6"
            >
              <div className="rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/10 p-4">
                <ChartBarIcon className="h-10 w-10 text-purple-600" />
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
                  Tableau de Bord Exécutif
                </h1>
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                  Vue d'ensemble des performances
                </p>
              </div>
            </motion.div>
          </header>
        )}
        {/* Section des projets en attente d'approbation */}
        {pendingProjectsData?.pendingProjects &&
          pendingProjectsData.pendingProjects.length > 0 && (
            <div className="mb-8">
              <PendingProjectsSection
                pendingProjects={pendingProjectsData.pendingProjects}
                onApprove={handleApproveProject}
                onReject={handleRejectProject}
                isLoading={isApprovingProject || isRejectingProject}
              />
            </div>
          )}
        {/* Première rangée de statistiques */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-5">
          <StatBlock
            title="Projets Actifs"
            value={activeProjects.length.toString()}
            icon={<BriefcaseIcon />}
            onClick={() => setSelectedModal("projets_actifs")}
          />
          <StatBlock
            title="Tâches Complétées"
            value={completedTasks.length.toString()}
            icon={<ClipboardDocumentCheckIcon />}
            onClick={() => setSelectedModal("taches_completees")}
          />
          <StatBlock
            title="Projets"
            value={allProjects.length.toString()}
            icon={<UsersIcon />}
            onClick={() => setSelectedModal("projets_section")}
          />
          <StatBlock
            title="Tâches en cours"
            value={ongoingTasks.length.toString()}
            icon={<DocumentTextIcon />}
            onClick={() => setSelectedModal("taches_en_cours")}
          />
          <StatBlock
            title="Projets terminés"
            value={completedProjects.length.toString()}
            icon={<CheckCircleIcon />}
            onClick={() => setSelectedModal("projets_termines")}
          />
        </div>
        {/* Widgets */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <motion.div
              className="rounded-2xl border border-slate-100 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2 className="mb-6 flex items-center gap-3 text-xl font-semibold text-slate-800 dark:text-white">
                <PresentationChartLineIcon className="h-7 w-7 text-purple-600" />
                Progression par mois
              </h2>
              <div className="h-64">
                {isLoadingMonthlyStats ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyStats}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-slate-200 dark:stroke-slate-700"
                      />
                      <XAxis
                        dataKey="name"
                        stroke={colors.text}
                        className="text-xs dark:stroke-slate-400"
                      />
                      <YAxis
                        stroke={colors.text}
                        className="text-xs dark:stroke-slate-400"
                      />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(255, 255, 255, 0.9)",
                          border: `1px solid ${colors.primary}20`,
                          borderRadius: "12px",
                          boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)",
                          color: "#1E293B",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="nouveaux"
                        name=" projets"
                        stroke={colors.primary}
                        strokeWidth={3}
                        dot={{ fill: colors.primary, strokeWidth: 2, r: 4 }}
                        activeDot={{
                          r: 8,
                          fill: colors.primary,
                          stroke: "white",
                          strokeWidth: 2,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>

            <div className="grid h-[400px] grid-cols-1 gap-8 md:grid-cols-2">
              <RecentActivity
                onClick={() => setSelectedModal("activite_recente")}
              />
              <motion.div
                onClick={() => setSelectedModal("repartition_taches")}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex h-full cursor-pointer flex-col rounded-2xl border border-slate-100 bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-all hover:border-purple-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-400"
              >
                <h3 className="mb-4 flex items-center gap-3 text-xl font-semibold text-slate-800 dark:text-white">
                  <DocumentTextIcon className="h-7 w-7 text-purple-600" />
                  Répartition des Tâches
                </h3>
                <div
                  className="space-y-4 overflow-y-auto pr-2"
                  style={{
                    maxHeight: "300px",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                  }}
                >
                  <style jsx>{`
                    div::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>
                  {teamGroups.length > 0 ? (
                    teamGroups.map((group, index) => (
                      <motion.div
                        key={group.projectName}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="cursor-pointer rounded-lg border-l-4 p-4 transition-colors hover:bg-purple-50/50 dark:hover:bg-slate-700/50"
                        style={{ borderColor: group.projectColor }}
                        whileHover={{ x: 5 }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-slate-800 dark:text-white">
                              {group.projectName}
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              {group.members.length} membres
                            </p>
                          </div>
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-full font-medium text-white"
                            style={{ background: group.projectColor }}
                          >
                            {group.members.length}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-center text-slate-500 dark:text-slate-400">
                      Aucune équipe trouvée
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          </div>

          <div className="space-y-8">
            <div
              className="cursor-pointer"
              onClick={() => setSelectedModal("projets_prioritaires")}
            >
              <ProjectTimeline
                onClick={() => setSelectedModal("projets_prioritaires")}
                priorityProjects={priorityProjects}
              />
            </div>
            <div
              className="cursor-pointer"
              onClick={() => setSelectedModal("equipes")}
            >
              <TeamGroups
                teamGroups={teamGroups}
                onTeamClick={(projectName, members) => {
                  setSelectedTeamProject(projectName);
                  setSelectedTeamMembers(members);
                  setSelectedModal("equipe_details");
                }}
              />
            </div>
          </div>
        </div>
        {/* Modales */}
        {selectedModal === "projets_actifs" && (
          <Modal
            title="Détails des Projets Actifs"
            onClose={() => setSelectedModal(null)}
          >
            <div
              className="space-y-4 overflow-y-auto pr-2"
              style={{
                maxHeight: "70vh",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              <style jsx>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              {activeProjects.length > 0 ? (
                activeProjects.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="font-bold text-slate-800 dark:text-white">
                        {project.name}
                      </h4>
                      <Badge variant="outline">{`${project.progress}%`}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Deadline: {project.deadline}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {project.details}
                    </p>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-600">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${project.progress}%`,
                          background: `linear-gradient(90deg, ${project.color} 0%, ${colors.secondary} 100%)`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 dark:text-slate-400">
                  Aucun projet actif trouvé
                </p>
              )}
            </div>
          </Modal>
        )}
        {selectedModal === "taches_completees" && (
          <Modal
            title="Tâches Complétées"
            onClose={() => setSelectedModal(null)}
          >
            <div
              className="space-y-4 overflow-y-auto pr-2"
              style={{
                maxHeight: "70vh",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              <style jsx>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              {completedTasks.length > 0 ? (
                completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="cursor-pointer rounded-lg bg-slate-50 p-4 transition-colors hover:bg-purple-50 dark:bg-slate-700/50 dark:hover:bg-purple-900/20"
                    onClick={() => {
                      setSelectedTask(task);
                      setSelectedModal("tache_details");
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 dark:text-white">
                        {task.title}
                      </h4>
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                      >
                        {task.progress}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {task.details.substring(0, 100)}...
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Assigné à: {task.assignedTo}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Deadline: {task.deadline}
                      </span>
                    </div>
                    {task.project_name && (
                      <div className="mt-2">
                        <span className="text-xs text-purple-600 dark:text-purple-400">
                          Projet: {task.project_name}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 dark:text-slate-400">
                  Aucune tâche complétée trouvée
                </p>
              )}
            </div>
          </Modal>
        )}
        {selectedModal === "tache_details" && selectedTask && (
          <TaskDetails
            task={selectedTask}
            onClose={() => {
              setSelectedTask(null);
              setSelectedModal("taches_completees");
            }}
          />
        )}
        {selectedModal === "taches_en_cours" && (
          <Modal title="Tâches en cours" onClose={() => setSelectedModal(null)}>
            <div
              className="space-y-4 overflow-y-auto pr-2"
              style={{
                maxHeight: "70vh",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              <style jsx>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              {ongoingTasks.length > 0 ? (
                ongoingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="cursor-pointer rounded-lg bg-slate-50 p-4 transition-colors hover:bg-purple-50 dark:bg-slate-700/50 dark:hover:bg-purple-900/20"
                    onClick={() => {
                      setSelectedTask(task);
                      setSelectedModal("tache_details");
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 dark:text-white">
                        {task.title}
                      </h4>
                      <Badge variant="outline">{task.progress}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {task.details.substring(0, 100)}...
                    </p>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-600">
                      <div
                        className="h-full rounded-full bg-purple-500"
                        style={{ width: task.progress }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Assigné à: {task.assignedTo}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Deadline: {task.deadline}
                      </span>
                    </div>
                    {task.project_name && (
                      <div className="mt-2">
                        <span className="text-xs text-purple-600 dark:text-purple-400">
                          Projet: {task.project_name}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 dark:text-slate-400">
                  Aucune tâche en cours trouvée
                </p>
              )}
            </div>
          </Modal>
        )}
        {selectedModal === "projets_termines" && (
          <Modal
            title="Projets terminés"
            onClose={() => setSelectedModal(null)}
          >
            <div className="custom-scrollbar max-h-[70vh] space-y-4 overflow-y-auto pr-2">
              {completedProjects.length > 0 ? (
                completedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 dark:text-white">
                        {project.name}
                      </h4>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                        Terminé
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {project.details}
                    </p>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-600">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${project.progress}%`,
                          background: `linear-gradient(90deg, ${project.color} 0%, ${colors.secondary} 100%)`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 dark:text-slate-400">
                  Aucun projet terminé trouvé
                </p>
              )}
            </div>
          </Modal>
        )}
        {selectedModal === "projets_prioritaires" && (
          <Modal
            title="Projets Prioritaires"
            onClose={() => setSelectedModal(null)}
          >
            <div className="custom-scrollbar max-h-[70vh] space-y-4 overflow-y-auto pr-2">
              {priorityProjects.length > 0 ? (
                priorityProjects.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-lg border-l-4 bg-slate-50 p-4 dark:bg-slate-700/50"
                    style={{ borderColor: project.color }}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 dark:text-white">
                        {project.name}
                      </h4>
                      <Badge variant="outline">{`${project.progress}%`}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Deadline: {project.deadline}
                    </p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {project.details}
                    </p>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-600">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${project.progress}%`,
                          background: `linear-gradient(90deg, ${project.color} 0%, ${colors.secondary} 100%)`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 dark:text-slate-400">
                  Aucun projet prioritaire trouvé
                </p>
              )}
            </div>
          </Modal>
        )}
        {selectedModal === "activite_recente" && (
          <Modal
            title="Activité Récente"
            onClose={() => setSelectedModal(null)}
          >
            <div className="custom-scrollbar max-h-[70vh] space-y-4 overflow-y-auto pr-2">
              {isLoadingActivities ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
                </div>
              ) : activitiesError ? (
                <div className="py-8 text-center text-red-500">
                  Erreur lors du chargement des activités récentes
                </div>
              ) : activitiesData?.activities?.length > 0 ? (
                activitiesData.activities.map((activity: any) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50"
                  >
                    <div className="mt-2 h-2 w-2 rounded-full bg-purple-600" />
                    <div>
                      <p className="text-sm text-slate-800 dark:text-white">
                        <span className="font-medium text-purple-600 dark:text-purple-400">
                          {activity.user}
                        </span>{" "}
                        {activity.action}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-slate-500 dark:text-slate-400">
                  Aucune activité récente
                </p>
              )}
            </div>
          </Modal>
        )}
        {selectedModal === "projets_section" && (
          <Modal
            title="Tous les Projets"
            onClose={() => setSelectedModal(null)}
          >
            <ProjectSection
              projects={allProjects}
              onProjectClick={(project) => {
                setSelectedProject(project);
                setSelectedModal("projet_details");
              }}
              summary={false}
            />
          </Modal>
        )}
        {selectedModal === "projet_details" && selectedProject && (
          <Modal
            title={selectedProject.name}
            onClose={() => {
              setSelectedProject(null);
              setSelectedModal("projets_section");
            }}
          >
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white">
                    Détails du projet
                  </h4>
                  <Badge
                    variant="outline"
                    className="border-purple-300 text-purple-800 dark:border-purple-700 dark:text-purple-300"
                  >
                    {selectedProject.progress}% complété
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Deadline
                    </p>
                    <p className="text-slate-800 dark:text-white">
                      {selectedProject.deadline}
                    </p>
                  </div>

                  <div className="mt-2 md:mt-0">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Progression
                    </p>
                    <div className="mt-1 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-600">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${selectedProject.progress}%`,
                          background: `linear-gradient(90deg, ${selectedProject.color} 0%, ${colors.secondary} 100%)`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Description
                  </p>
                  <p className="mt-1 text-slate-800 dark:text-white">
                    {selectedProject.details}
                  </p>
                </div>
              </div>
            </div>
          </Modal>
        )}
        {selectedModal === "equipes" && (
          <Modal
            title="Équipes par Projet"
            onClose={() => setSelectedModal(null)}
          >
            <TeamGroups
              teamGroups={teamGroups}
              onTeamClick={(projectName, members) => {
                setSelectedTeamProject(projectName);
                setSelectedTeamMembers(members);
                setSelectedModal("equipe_details");
              }}
            />
          </Modal>
        )}
        {selectedModal === "equipe_details" && selectedTeamProject && (
          <TeamDetails
            projectName={selectedTeamProject}
            members={selectedTeamMembers}
            onClose={() => {
              setSelectedTeamProject(null);
              setSelectedTeamMembers([]);
              setSelectedModal("equipes");
            }}
            onMemberClick={(member) => {
              setSelectedMember(member);
              setSelectedModal("member_details");
            }}
          />
        )}
        {selectedModal === "member_details" && selectedMember && (
          <MemberDetails
            member={selectedMember}
            onClose={() => {
              setSelectedMember(null);
              if (selectedTeamProject) {
                setSelectedModal("equipe_details");
              } else {
                setSelectedModal("equipes");
              }
            }}
          />
        )}
        {selectedModal === "projets_en_attente" && (
          <Modal
            title="Projets en attente d'approbation"
            onClose={() => setSelectedModal(null)}
          >
            <div className="space-y-4">
              {pendingProjectsData?.pendingProjects &&
              pendingProjectsData.pendingProjects.length > 0 ? (
                pendingProjectsData.pendingProjects.map((project: any) => (
                  <div
                    key={project.id}
                    className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-slate-800 dark:text-white">
                          {project.name}
                        </h4>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          Créé le{" "}
                          {new Date(project.created_at).toLocaleDateString()}
                        </p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                          {project.description}
                        </p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          Créé par:{" "}
                          {project.team_members.find(
                            (m: any) =>
                              m.clerk_user_id === project.clerk_user_id,
                          )?.name || "Utilisateur inconnu"}
                        </p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                        En attente
                      </Badge>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <Button
                        variant="outline"
                        className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => handleRejectProject(project.id)}
                        disabled={isApprovingProject || isRejectingProject}
                      >
                        <XMarkIcon className="mr-1 h-4 w-4" />
                        Rejeter
                      </Button>
                      <Button
                        className="bg-green-600 text-white hover:bg-green-700"
                        onClick={() => handleApproveProject(project.id)}
                        disabled={isApprovingProject || isRejectingProject}
                      >
                        <CheckIcon className="mr-1 h-4 w-4" />
                        Approuver
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-slate-500 dark:text-slate-400">
                  Aucun projet en attente d'approbation
                </p>
              )}
            </div>
          </Modal>
        )}
        {selectedModal === "repartition_taches" && (
          <ProjectsTaskDistribution
            projects={allProjects}
            onProjectSelect={handleProjectSelect}
            onClose={() => setSelectedModal(null)}
          />
        )}
        {selectedModal === "projet_repartition_taches" && selectedProjectId && (
          <ProjectTaskDistributionDetails
            projectId={selectedProjectId}
            onBack={handleBackToProjects}
            onClose={() => setSelectedModal(null)}
          />
        )}
        {/* Notification Modal */}
        {notification.show && (
          <ConfirmationModal
            title={notification.title}
            message={notification.message}
            type={notification.type}
            onClose={closeNotification}
          />
        )}
      </section>
    </>
  );
}
