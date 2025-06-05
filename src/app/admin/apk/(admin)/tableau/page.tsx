"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftIcon,
  Cog8ToothIcon,
  PencilIcon,
  EyeIcon,
  UserGroupIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import { Search, Users, UserCircle, Check } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import {
  useGetUserProjectsQuery,
  useGetProjectQuery,
  useUpdateMemberRoleMutation,
} from "@/app/state/api";

// Types
type MemberRole = "manager" | "member" | "observer";

type Project = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  description?: string;
  clerk_user_id: string;
  created_at?: string;
  updated_at?: string;
};

type Member = {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  pivot: {
    project_id: number;
    team_member_id: number;
    role: MemberRole;
  };
};

// Role Badge Component
function RoleBadge({
  role,
  className,
}: {
  role: MemberRole;
  className?: string;
}) {
  const config = {
    manager: {
      label: "Manager",
      icon: Cog8ToothIcon,
      className:
        "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/40 dark:text-white dark:border-pink-800/50",
    },
    member: {
      label: "Membre",
      icon: PencilIcon,
      className:
        "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-white dark:border-blue-800/50",
    },
    observer: {
      label: "Observateur",
      icon: EyeIcon,
      className:
        "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-white dark:border-green-800/50",
    },
  };

  const { label, icon: Icon, className: badgeClass } = config[role];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm",
        badgeClass,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

// Role Select Component
function RoleSelect({
  currentRole,
  onChange,
  member,
  projectName,
  boardName,
  projectId,
}: {
  currentRole: MemberRole;
  onChange: (role: MemberRole) => Promise<void>;
  member: Member;
  projectName: string;
  boardName: string;
  projectId: number;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const roles: { value: MemberRole; label: string }[] = [
    { value: "observer", label: "Observateur" },
    { value: "member", label: "Membre" },
    { value: "manager", label: "Manager" },
  ];

  const handleRoleChange = async (role: MemberRole) => {
    if (role === currentRole) {
      setOpen(false);
      return;
    }

    setSending(true);

    try {
      await onChange(role);

      toast({
        title: "Rôle mis à jour avec succès",
        description: (
          <div className="mt-1">
            <p className="text-sm dark:text-white">
              Le rôle de{" "}
              <span className="font-semibold dark:text-white">
                {member.name}
              </span>{" "}
              a été mis à jour avec succès.
            </p>
            <div className="mt-2 rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-700">
              <p className="dark:text-white">
                <span className="font-semibold dark:text-white">Projet:</span>{" "}
                {projectName}
              </p>
              <p className="dark:text-white">
                <span className="font-semibold dark:text-white">Kanban:</span>{" "}
                {boardName}
              </p>
              <p className="dark:text-white">
                <span className="font-semibold dark:text-white">
                  Nouveau rôle:
                </span>{" "}
                {role === "manager"
                  ? "Manager"
                  : role === "member"
                    ? "Membre"
                    : "Observateur"}
              </p>
            </div>
          </div>
        ),
        duration: 5000,
        className:
          "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du rôle:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le rôle. Veuillez réessayer.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setSending(false);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-center border-purple-100 bg-white shadow-sm hover:bg-purple-50/50 dark:border-purple-900/50 dark:bg-slate-800 dark:text-white dark:hover:bg-purple-900/30"
          disabled={sending}
        >
          <RoleBadge role={currentRole} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] border-slate-200 bg-white p-0 dark:border-slate-700 dark:bg-slate-800">
        <Command className="bg-white dark:bg-slate-800">
          <CommandList>
            <CommandEmpty className="dark:text-white">
              Aucun rôle trouvé.
            </CommandEmpty>
            <CommandGroup>
              {roles.map((role) => (
                <CommandItem
                  key={role.value}
                  value={role.value}
                  onSelect={() => handleRoleChange(role.value as MemberRole)}
                  className="flex items-center gap-2 bg-white py-2 hover:bg-slate-100 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 dark:aria-selected:bg-slate-700"
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      currentRole === role.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <RoleBadge role={role.value as MemberRole} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Member Card Component
function MemberCard({
  member,
  projectName,
  boardName,
  onRoleChange,
  projectId,
}: {
  member: Member;
  projectName: string;
  boardName: string;
  onRoleChange: (memberId: number, role: MemberRole) => Promise<void>;
  projectId: number;
}) {
  const [role, setRole] = useState<MemberRole>(member.pivot.role);

  const handleRoleChange = async (newRole: MemberRole) => {
    try {
      await onRoleChange(member.id, newRole);
      setRole(newRole);
    } catch (error) {
      console.error("Error updating role:", error);
      throw error;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
      className="group"
    >
      <Card className="overflow-hidden border-0 bg-white shadow-lg transition-all group-hover:shadow-xl dark:bg-slate-800/95">
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-14 w-14 border-2 border-purple-100 ring-2 ring-purple-50 dark:border-purple-900/50 dark:ring-purple-950">
              <AvatarImage
                src={member.avatar || "/placeholder.svg"}
                alt={member.name}
              />
              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-600 text-white dark:from-purple-700 dark:to-purple-900">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-semibold dark:text-slate-100">
                  {member.name}
                </h3>
                <Badge
                  variant={role === "manager" ? "default" : "secondary"}
                  className={`ml-1 ${
                    role === "manager"
                      ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white dark:from-purple-700/90 dark:to-indigo-700/90"
                      : "bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 dark:from-slate-700 dark:to-slate-600 dark:text-slate-300"
                  }`}
                >
                  {role === "manager" ? (
                    <UserCircle className="mr-1 h-3 w-3" />
                  ) : (
                    <Users className="mr-1 h-3 w-3" />
                  )}
                  {role === "manager"
                    ? "Manager"
                    : role === "member"
                      ? "Membre"
                      : "Observateur"}
                </Badge>
              </div>
              <p className="truncate text-sm text-muted-foreground dark:text-slate-400">
                {member.email}
              </p>
            </div>
            <div className="w-[160px]">
              <RoleSelect
                currentRole={role}
                onChange={handleRoleChange}
                member={member}
                projectName={projectName}
                boardName={boardName}
                projectId={projectId}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Role Stats Component
function RoleStats({ members }: { members: Member[] }) {
  const total = members ? members.length : 0;
  const managers = members
    ? members.filter((m) => m.pivot.role === "manager").length
    : 0;
  const regularMembers = members
    ? members.filter((m) => m.pivot.role === "member").length
    : 0;
  const observers = members
    ? members.filter((m) => m.pivot.role === "observer").length
    : 0;

  const stats = [
    {
      title: "Total Membres",
      value: total,
      icon: UserGroupIcon,
      bgClass:
        "bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800/30",
      iconClass: "text-orange-500 dark:text-white",
      textClass: "text-orange-800 dark:text-white",
    },
    {
      title: "Managers",
      value: managers,
      icon: Cog8ToothIcon,
      bgClass:
        "bg-pink-50 border-pink-100 dark:bg-pink-900/20 dark:border-pink-800/30",
      iconClass: "text-pink-500 dark:text-white",
      textClass: "text-pink-800 dark:text-white",
    },
    {
      title: "Membres",
      value: regularMembers,
      icon: PencilIcon,
      bgClass:
        "bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/30",
      iconClass: "text-blue-500 dark:text-white",
      textClass: "text-blue-800 dark:text-white",
    },
    {
      title: "Observateurs",
      value: observers,
      icon: EyeIcon,
      bgClass:
        "bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800/30",
      iconClass: "text-green-500 dark:text-white",
      textClass: "text-green-800 dark:text-white",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.03 }}
        >
          <Card
            className={`${stat.bgClass} overflow-hidden border shadow-lg transition-all hover:shadow-xl`}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-700">
                  <stat.icon className={`h-7 w-7 ${stat.iconClass}`} />
                </div>
                <div>
                  <p className={`text-sm font-medium ${stat.textClass}`}>
                    {stat.title}
                  </p>
                  <p className={`text-3xl font-bold ${stat.textClass}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// Kanban Members Component
function KanbanMembers({
  projectId,
  projectName,
}: {
  projectId: number;
  projectName: string;
}) {
  const { data: projectData, isLoading, error } = useGetProjectQuery(projectId);
  const [updateMemberRole] = useUpdateMemberRoleMutation();
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (projectData) {
      console.log("Project data:", projectData);

      // Check multiple possible locations for team members data
      if (projectData.teamMembers && projectData.teamMembers.length > 0) {
        setMembers(projectData.teamMembers);
      } else if (
        projectData.team_members &&
        projectData.team_members.length > 0
      ) {
        setMembers(projectData.team_members);
      } else if (projectData.team && projectData.team.length > 0) {
        setMembers(projectData.team);
      }
    }
  }, [projectData]);

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleRoleChange = async (memberId: number, role: MemberRole) => {
    try {
      console.log(
        "Updating role for member:",
        memberId,
        "to role:",
        role,
        "in project:",
        projectId,
      );

      await updateMemberRole({
        projectId: projectId.toString(),
        memberId: memberId.toString(),
        role: role,
      }).unwrap();

      // Update local state
      setMembers(
        members.map((member) =>
          member.id === memberId
            ? { ...member, pivot: { ...member.pivot, role } }
            : member,
        ),
      );

      toast({
        title: "Succès",
        description: "Le rôle du membre a été mis à jour avec succès.",
        duration: 3000,
      });
    } catch (error: any) {
      console.error("Error updating member role:", error);

      let errorMessage = "Impossible de mettre à jour le rôle du membre.";
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
        duration: 3000,
      });
      throw error;
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full border-0 bg-white shadow-xl dark:bg-slate-800">
        <CardContent className="space-y-8 p-8">
          <div className="flex h-64 items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
              <p className="text-lg text-gray-500 dark:text-gray-300">
                Chargement des données...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-0 bg-white shadow-xl dark:bg-slate-800">
        <CardContent className="space-y-8 p-8">
          <div className="flex h-64 flex-col items-center justify-center">
            <p className="mb-4 text-lg text-red-500 dark:text-red-300">
              Erreur lors du chargement des données du projet
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-300">
              Veuillez rafraîchir la page ou réessayer plus tard.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (projectData && (!members || members.length === 0)) {
    return (
      <Card className="w-full border-0 bg-white shadow-xl dark:bg-slate-800">
        <CardContent className="space-y-8 p-8">
          <div className="flex h-64 flex-col items-center justify-center">
            <Users className="h-16 w-16 text-muted-foreground/30 dark:text-white/30" />
            <p className="mb-4 text-lg text-gray-500 dark:text-gray-300">
              Aucun membre d'équipe trouvé dans ce projet
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-300">
              Les membres apparaîtront ici une fois qu'ils auront rejoint le
              projet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const boardName = projectData?.name ? `Kanban ${projectData.name}` : "Kanban";

  return (
    <Card className="w-full border-0 bg-white shadow-xl dark:bg-slate-800">
      <CardContent className="space-y-8 p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="bg-gradient-to-r from-purple-700 to-indigo-700 bg-clip-text text-2xl font-bold text-transparent dark:from-purple-300 dark:to-indigo-300">
              Gestion des Rôles du Projet
            </h2>
            <p className="text-base text-gray-600 dark:text-white">
              Gérez qui peut voir, modifier ou administrer le tableau "
              {boardName}" du projet "{projectName}".
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground dark:text-white" />
            <Input
              type="search"
              placeholder="Rechercher un membre..."
              className="w-full border-purple-100 bg-white pl-8 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-300 md:w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <RoleStats members={members} />

        <div className="space-y-6">
          <h3 className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-lg font-semibold text-transparent dark:from-purple-300 dark:to-indigo-300">
            <Users className="h-5 w-5 text-purple-600 dark:text-white" />
            <span>Membres de l'équipe</span>
          </h3>

          <div className="grid gap-4">
            <AnimatePresence>
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member, index) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <MemberCard
                      member={member}
                      projectName={projectName}
                      boardName={boardName}
                      onRoleChange={handleRoleChange}
                      projectId={projectId}
                    />
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <Users className="h-16 w-16 text-muted-foreground/30 dark:text-white/30" />
                  <h3 className="mt-4 text-lg font-semibold dark:text-white">
                    Aucun membre trouvé
                  </h3>
                  <p className="text-muted-foreground dark:text-white">
                    Aucun membre ne correspond à votre recherche.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Project List Component
function ProjectList({
  projects,
  onSelect,
}: {
  projects: Project[];
  onSelect: (project: Project) => void;
}) {
  return (
    <div className="space-y-8 rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-800">
      <h1 className="flex items-center bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-4xl font-extrabold text-transparent dark:from-purple-300 dark:to-indigo-300">
        <div className="rounded-xl bg-purple-200/50 p-3 dark:bg-purple-800/30">
          <TableCellsIcon className="h-8 w-8 text-purple-600 dark:text-white" />
        </div>
        <span className="ml-4">Sélectionnez un projet</span>
      </h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.03 }}
            onClick={() => onSelect(project)}
            className="cursor-pointer rounded-2xl border border-transparent bg-white p-6 shadow-xl transition hover:border-[3px] hover:border-[#b03ff3] dark:bg-slate-700 dark:hover:border-[#9d5fd0]"
          >
            <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
              {project.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-white">
              Début : {new Date(project.start_date).toLocaleDateString("fr-FR")}
            </p>
            <p className="text-sm text-gray-600 dark:text-white">
              Fin : {new Date(project.end_date).toLocaleDateString("fr-FR")}
            </p>
            {project.description && (
              <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-white">
                {project.description}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Main Component
export default function ProjectsPage() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const clerkUserId =
    typeof window !== "undefined"
      ? localStorage.getItem("currentUserId")
      : null;

  const {
    data: projectsData,
    isLoading,
    error,
  } = useGetUserProjectsQuery(clerkUserId || "", { skip: !clerkUserId });

  const allProjects = projectsData
    ? [
        ...(projectsData.managerProjects || []),
        ...(projectsData.invitedProjects || []),
      ]
    : [];

  if (!clerkUserId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-slate-900">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <UserCircle className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              Connexion requise
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-300">
              Veuillez vous connecter pour accéder à cette page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-slate-900">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              Chargement en cours
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-300">
              Chargement des projets...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-slate-900">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-100 p-4 dark:bg-red-900/20">
              <svg
                className="h-8 w-8 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              Erreur de chargement
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-300">
              Erreur lors du chargement des projets. Veuillez réessayer.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-slate-900">
      {!selectedProject ? (
        <ProjectList
          projects={allProjects}
          onSelect={(proj) => setSelectedProject(proj)}
        />
      ) : (
        <div className="space-y-6">
          <Button
            onClick={() => setSelectedProject(null)}
            variant="ghost"
            className="flex items-center gap-2 text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:text-white dark:hover:bg-purple-900/30 dark:hover:text-white"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Retour à la liste des projets
          </Button>

          <div className="mb-6">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 text-4xl font-bold"
            >
              <div className="rounded-xl bg-purple-100 p-3 dark:bg-purple-800/30">
                <TableCellsIcon className="h-8 w-8 text-purple-600 dark:text-white" />
              </div>
              <div className="space-y-1">
                <span className="flex items-center bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-3xl font-extrabold text-transparent dark:from-purple-300 dark:to-indigo-300">
                  {selectedProject.name}
                </span>
                <div className="flex items-center gap-2">
                  <Separator className="h-0.5 w-10 bg-purple-200 dark:bg-purple-700" />
                  <span className="text-lg font-medium text-purple-600 dark:text-white">
                    Gestion des Rôles
                  </span>
                </div>
              </div>
            </motion.h1>
            <p className="ml-14 mt-2 text-gray-600 dark:text-white">
              Début :{" "}
              {new Date(selectedProject.start_date).toLocaleDateString("fr-FR")}{" "}
              • Fin :{" "}
              {new Date(selectedProject.end_date).toLocaleDateString("fr-FR")}
            </p>
          </div>

          <KanbanMembers
            projectId={selectedProject.id}
            projectName={selectedProject.name}
          />
        </div>
      )}
      <Toaster />
    </div>
  );
}
