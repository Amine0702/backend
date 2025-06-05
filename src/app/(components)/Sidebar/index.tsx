"use client";
import type React from "react";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useGetUserProjectsQuery } from "@/app/state/api";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "../redux";
import { toggleSidebar } from "@/app/state"; // Importez l'action pour contrôler le sidebar
import {
  Briefcase,
  FileLineChartIcon as FileChartLine,
  Home,
  Inbox,
  NotebookTabs,
  Users,
  Video,
  ChevronUp,
  ChevronDown,
  Loader2,
  User,
} from "lucide-react";

const Sidebar = () => {
  const [showManagerProjects, setShowManagerProjects] = useState(true);
  const [showInvitedProjects, setShowInvitedProjects] = useState(true);
  const [isMobileOpen, setShowMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [originalSidebarState, setOriginalSidebarState] = useState(false);

  const { user, isLoaded: userLoaded } = useUser();
  const clerkUserId = user?.id || "";

  const { data, error, isLoading } = useGetUserProjectsQuery(clerkUserId, {
    skip: !userLoaded || !clerkUserId,
    pollingInterval: 30000, // Poll every 30 seconds for updates
  });

  const dispatch = useAppDispatch();
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed,
  );

  // Sauvegarder l'état original du sidebar quand il change
  useEffect(() => {
    setOriginalSidebarState(isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  const sidebarWidth = isSidebarCollapsed ? "w-0 md:w-[90px]" : "w-[255px]";
  const sidebarClassNames = `fixed top-0 left-0 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 dark:border-gray-800 dark:bg-gray-900 bg-white ${sidebarWidth} overflow-hidden`;

  // Gérer l'entrée de la souris
  const handleMouseEnter = () => {
    if (isSidebarCollapsed) {
      setIsHovered(true);
      // Ouvrir le sidebar en modifiant l'état global
      dispatch(toggleSidebar());
    }
  };

  // Gérer la sortie de la souris
  const handleMouseLeave = () => {
    if (isHovered) {
      setIsHovered(false);
      // Restaurer l'état original du sidebar
      if (!originalSidebarState) {
        dispatch(toggleSidebar());
      }
    }
  };

  return (
    <>
      {/* Mobile overlay - only visible when sidebar is open on mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setShowMobile(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={sidebarClassNames}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-center border-b border-gray-200 p-3 dark:border-gray-800">
            <Link href="/">
              {isSidebarCollapsed ? (
                <Image
                  src="/img/logo/icon.png"
                  alt="Logo"
                  width={63}
                  height={32}
                />
              ) : (
                <div className="flex items-center">
                  <Image
                    src="/img/logo/logo.png"
                    alt="Logo"
                    width={140}
                    height={50}
                    className="dark:hidden"
                  />
                  <Image
                    src="/img/logo/logo.png"
                    alt="Logo"
                    width={154}
                    height={32}
                    className="hidden dark:block"
                  />
                </div>
              )}
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto px-4">
            <div className="mt-4 space-y-1">
              <SidebarLink
                icon={Home}
                label="Tableau de bord"
                href="/home"
                isCollapsed={isSidebarCollapsed}
              />
              <SidebarLink
                icon={FileChartLine}
                label="Rapports"
                href="/rapport"
                isCollapsed={isSidebarCollapsed}
              />
              <SidebarLink
                icon={Video}
                label="Réunions"
                href="/meeting"
                isCollapsed={isSidebarCollapsed}
              />
              <SidebarLink
                icon={Users}
                label="Équipes"
                href="/teams"
                isCollapsed={isSidebarCollapsed}
              />
              <SidebarLink
                icon={NotebookTabs}
                label="Notes"
                href="/notes"
                isCollapsed={isSidebarCollapsed}
              />
              <SidebarLink
                icon={User}
                label="Profil"
                href="/profile"
                isCollapsed={isSidebarCollapsed}
              />
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowManagerProjects((prev) => !prev)}
                className={`flex w-full items-center justify-between px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 ${isSidebarCollapsed ? "hidden" : ""}`}
              >
                {!isSidebarCollapsed && <span>Vos projets</span>}
                {showManagerProjects ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>
              {showManagerProjects && !isSidebarCollapsed && (
                <div className="flex flex-col space-y-1">
                  {isLoading && (
                    <div className="flex items-center px-4 py-2 text-gray-500">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Chargement...
                    </div>
                  )}
                  {error && (
                    <div className="px-4 py-2 text-red-500">
                      Erreur lors du chargement des projets:{" "}
                      {JSON.stringify(error)}
                    </div>
                  )}
                  {data?.managerProjects &&
                    data.managerProjects.length === 0 && (
                      <div className="px-4 py-2 text-gray-500">
                        Aucun projet trouvé
                      </div>
                    )}
                  {data?.managerProjects?.map(
                    (project: {
                      id: React.Key | null | undefined;
                      name: string;
                    }) => (
                      <SidebarLink
                        key={project.id}
                        icon={Briefcase}
                        label={project.name}
                        href={`/projects/${project.id}`}
                        isCollapsed={isSidebarCollapsed}
                      />
                    ),
                  )}
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowInvitedProjects((prev) => !prev)}
                className={`flex w-full items-center justify-between px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 ${isSidebarCollapsed ? "hidden" : ""}`}
              >
                {!isSidebarCollapsed && <span>Projets invités</span>}
                {showInvitedProjects ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>
              {showInvitedProjects && !isSidebarCollapsed && (
                <div className="flex flex-col space-y-1">
                  {isLoading && (
                    <div className="flex items-center px-4 py-2 text-gray-500">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Chargement...
                    </div>
                  )}
                  {error && (
                    <div className="px-4 py-2 text-red-500">
                      Erreur lors du chargement des projets:{" "}
                      {JSON.stringify(error)}
                    </div>
                  )}
                  {data?.invitedProjects &&
                    data.invitedProjects.length === 0 && (
                      <div className="px-4 py-2 text-gray-500">
                        Aucun projet trouvé
                      </div>
                    )}
                  {data?.invitedProjects?.map(
                    (project: {
                      id: React.Key | null | undefined;
                      name: string;
                    }) => (
                      <SidebarLink
                        key={project.id}
                        icon={Briefcase}
                        label={project.name}
                        href={`/projects/${project.id}`}
                        isCollapsed={isSidebarCollapsed}
                      />
                    ),
                  )}
                </div>
              )}
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
};

interface SidebarLinkProps {
  href: string;
  icon: React.ElementType;
  label: string;
  isCollapsed: boolean;
}

const SidebarLink = ({
  href,
  icon: Icon,
  label,
  isCollapsed,
}: SidebarLinkProps) => {
  const pathname = usePathname();
  const isActive =
    pathname === href || (pathname === "/" && href === "/dashboard");

  return (
    <Link href={href} className="w-full">
      <div
        className={`relative flex cursor-pointer items-center gap-3 px-4 py-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
          isActive
            ? "bg-gray-100 text-violet-600 dark:bg-gray-700"
            : "text-gray-800 dark:text-gray-100"
        }`}
      >
        {isActive && !isCollapsed && (
          <div className="absolute left-0 top-0 h-full w-[5px] bg-violet-500" />
        )}
        <Icon className="h-6 w-6" />
        {!isCollapsed && <span className="font-medium">{label}</span>}
      </div>
    </Link>
  );
};

export default Sidebar;
