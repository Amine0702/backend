"use client";

import { type JSX, useState } from "react";
import {
  ClockIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  ArrowLeftIcon,
  ChatBubbleLeftIcon,
  TrashIcon,
  PencilIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from "recharts";
import {
  useGetAllProjectsHistoryQuery,
  useGetProjectHistoryQuery,
} from "@/app/state/api";

// Palette de couleurs
const primaryColor = "#b03ff3"; // mauve dominant
const accentYellow = "#FFC107";
const accentGreen = "#4CAF50";
const accentOrange = "#FF9800";
const accentPurple = "#9b59b6"; // ou la valeur de votre choix

// Définition du type Projet
type Projet = {
  id: string | number;
  nom: string;
  dateDebut: string;
  chefProjet: string;
  equipe: string;
  activityCount?: number;
};

// Définition du type d'audit log
type AuditLog = {
  id: number;
  timestamp: string;
  user: string;
  avatar?: string | null;
  action: "create" | "update" | "delete" | "comment";
  target: string;
  details: string;
};

// Définition des props pour le composant StatsCard
type StatsCardProps = {
  title: string;
  count: number;
  icon: JSX.Element;
  bgClass: string;
};

// Composant StatsCard (design et couleurs similaires)
const StatsCard = ({ title, count, icon, bgClass }: StatsCardProps) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className={`flex items-center p-4 ${bgClass} rounded-xl text-gray-800 shadow-lg`}
  >
    <div className="mr-4 rounded-full bg-white bg-opacity-30 p-3">{icon}</div>
    <div>
      <p className="text-sm">{title}</p>
      <p className="text-2xl font-bold">{count}</p>
    </div>
  </motion.div>
);

// Fonction pour obtenir la couleur selon l'action
const getActionColor = (action: AuditLog["action"]) => {
  switch (action) {
    case "create":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
    case "update":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
    case "delete":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
    case "comment":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
  }
};

// Fonction pour obtenir l'icône selon l'action
const getActionIcon = (action: AuditLog["action"]) => {
  switch (action) {
    case "create":
      return <PlusCircleIcon className="h-5 w-5" />;
    case "update":
      return <PencilIcon className="h-5 w-5" />;
    case "delete":
      return <TrashIcon className="h-5 w-5" />;
    case "comment":
      return <ChatBubbleLeftIcon className="h-5 w-5" />;
  }
};

// En-tête de l'historique pour le projet sélectionné (design inspiré de la page d'analyse)
const Header = ({ projet }: { projet: Projet }) => {
  const currentDate = new Date();
  return (
    <div className="mb-8">
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 text-3xl font-bold"
        style={{ color: primaryColor }}
      >
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: primaryColor + "20" }}
        >
          <ClockIcon className="h-8 w-8" style={{ color: primaryColor }} />
        </div>
        <span className="flex items-center bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-4xl font-extrabold text-transparent">
          Historique du {projet.nom}
        </span>
      </motion.h1>
      <p className="text-gray-600 dark:text-gray-300">
        Début : {new Date(projet.dateDebut).toLocaleDateString("fr-FR")} • Chef
        de projet : {projet.chefProjet} • Équipe : {projet.equipe}
      </p>
      <p className="mt-2 text-lg font-medium text-gray-700 dark:text-gray-400">
        Aujourd'hui, c'est le{" "}
        {currentDate.toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
    </div>
  );
};

// Graphique d'évolution des actions (design similaire)
const GraphAudit = ({ auditGraphData }: { auditGraphData: any[] }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
    className="mb-8 rounded-xl bg-white p-6 shadow-lg dark:bg-slate-800"
  >
    <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-gray-200">
      <ChartBarIcon className="h-6 w-6" style={{ color: primaryColor }} />
      Évolution des Actions
    </h2>
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={auditGraphData}>
        <XAxis dataKey="day" stroke={primaryColor} tick={{ fontSize: 12 }} />
        <Tooltip contentStyle={{ backgroundColor: "#fff", border: "none" }} />
        <Line
          type="monotone"
          dataKey="create"
          stroke={accentGreen}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="update"
          stroke={primaryColor}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="delete"
          stroke={accentOrange}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="comment"
          stroke={accentYellow}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  </motion.div>
);

// Composant pour afficher chaque audit log
const AuditLogCard = ({ log }: { log: AuditLog }) => {
  // Fonction pour générer les initiales à partir du nom d'utilisateur
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="p-4 transition-colors hover:bg-purple-50 dark:hover:bg-purple-800">
      <div className="flex items-start gap-4">
        <div className={`rounded-lg p-2 ${getActionColor(log.action)}`}>
          {getActionIcon(log.action)}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium dark:text-white">{log.target}</span>
            <span
              className={`rounded-full px-2 py-1 text-xs ${getActionColor(log.action)}`}
            >
              {log.action}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {new Intl.DateTimeFormat("fr-FR", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(log.timestamp))}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {log.details}
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm">
            {log.avatar ? (
              <div
                className="h-6 w-6 rounded-full bg-cover bg-center"
                style={{
                  backgroundImage: `url(${log.avatar})`,
                  backgroundSize: "cover",
                }}
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-200 text-xs font-medium text-purple-800">
                {getInitials(log.user)}
              </div>
            )}
            <span className="text-gray-700 dark:text-gray-300">{log.user}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant regroupant l'historique d'un projet
const HistoriqueProjet = ({ projet }: { projet: Projet }) => {
  const {
    data: historyData,
    isLoading,
    error,
  } = useGetProjectHistoryQuery(Number(projet.id));
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("all");

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !historyData) {
    return (
      <div className="py-12 text-center">
        <ArchiveBoxIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Une erreur s'est produite lors du chargement de l'historique
        </p>
      </div>
    );
  }

  const { auditLogs, auditGraphData, stats } = historyData;

  const filteredLogs = auditLogs.filter(
    (log: AuditLog) =>
      (log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (selectedAction === "all" || log.action === selectedAction),
  );

  return (
    <section className="space-y-8 rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-800">
      <button
        onClick={() => window.location.reload()}
        className="flex items-center text-sm hover:underline"
        style={{ color: primaryColor }}
      >
        <ArrowLeftIcon className="mr-1 h-4 w-4" /> Retour à la liste des projets
      </button>
      <Header projet={projet} />

      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatsCard
          title="Total Actions"
          count={stats.totalLogs}
          icon={
            <DocumentTextIcon
              className="h-6 w-6"
              style={{ color: accentPurple }}
            />
          }
          bgClass="bg-purple-100"
        />
        <StatsCard
          title="Créations"
          count={stats.createLogs}
          icon={
            <PlusCircleIcon
              className="h-6 w-6"
              style={{ color: accentGreen }}
            />
          }
          bgClass="bg-green-100"
        />
        <StatsCard
          title="Modifications"
          count={stats.updateLogs}
          icon={
            <PencilIcon className="h-6 w-6" style={{ color: primaryColor }} />
          }
          bgClass="bg-blue-100"
        />
        <StatsCard
          title="Suppressions"
          count={stats.deleteLogs}
          icon={
            <TrashIcon className="h-6 w-6" style={{ color: accentOrange }} />
          }
          bgClass="bg-red-100"
        />
      </div>

      {/* Recherche et filtre */}
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="relative max-w-xs flex-1">
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-300" />
        </div>
        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="rounded-lg border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="all">Toutes les actions</option>
          <option value="create">Créations</option>
          <option value="update">Modifications</option>
          <option value="delete">Suppressions</option>
          <option value="comment">Commentaires</option>
        </select>
      </div>

      {/* Graphique d'évolution des actions */}
      <GraphAudit auditGraphData={auditGraphData} />

      {/* Liste des logs */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800">
        <div className="grid grid-cols-1 divide-y divide-gray-200 dark:divide-gray-700">
          {filteredLogs.map((log: AuditLog) => (
            <AuditLogCard key={log.id} log={log} />
          ))}
        </div>
        {filteredLogs.length === 0 && (
          <div className="py-12 text-center">
            <ArchiveBoxIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Aucune activité récente
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

// Composant pour afficher la liste des projets
const ProjectList = ({ onSelect }: { onSelect: (projet: Projet) => void }) => {
  const { data, isLoading, error } = useGetAllProjectsHistoryQuery();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !data || !data.projects) {
    return (
      <div className="py-12 text-center">
        <ArchiveBoxIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Une erreur s'est produite lors du chargement des projets
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-xl bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 p-6 shadow-2xl dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
      <h1 className="flex items-center bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-4xl font-extrabold text-transparent">
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: primaryColor + "20" }}
        ></div>
        <span className="ml-4">
          Sélectionnez un projet pour consulter son historique
        </span>
      </h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.projects.map((projet: Projet) => (
          <motion.div
            key={projet.id}
            whileHover={{ scale: 1.03 }}
            onClick={() => onSelect(projet)}
            className="cursor-pointer rounded-2xl border border-transparent bg-gray-50 p-6 shadow-xl transition hover:border-[3px] hover:border-[#b03ff3] dark:bg-slate-700"
          >
            <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
              {projet.nom}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Début : {new Date(projet.dateDebut).toLocaleDateString("fr-FR")}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Chef : {projet.chefProjet}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Équipe : {projet.equipe}
            </p>
            {projet.activityCount !== undefined && (
              <p className="mt-2 text-sm font-medium text-purple-600 dark:text-purple-400">
                {projet.activityCount} activités enregistrées
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Composant principal gérant l'affichage de la liste ou de l'historique selon le projet sélectionné
export default function HistoriqueProjets() {
  const [selectedProject, setSelectedProject] = useState<Projet | null>(null);

  if (!selectedProject) {
    return (
      <section className="p-6">
        <ProjectList onSelect={(projet) => setSelectedProject(projet)} />
      </section>
    );
  }

  return <HistoriqueProjet projet={selectedProject} />;
}
