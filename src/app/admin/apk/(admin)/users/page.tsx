"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MagnifyingGlassIcon,
  UserIcon,
  TrashIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  PencilIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { Toaster, toast } from "sonner";
import {
  useGetAllUsersQuery,
  useUpdateUserRoleMutation,
  useDeleteUserMutation,
  useGetUserStatsQuery,
  useCreateUserMutation,
  useInviteUserMutation,
  useGetPendingInvitationsQuery,
  useCancelInvitationMutation,
} from "@/app/state/api";

// Palette de couleurs
const primaryColor = "#b03ff3"; // mauve dominant
const accentYellow = "#FFC107";
const accentGreen = "#4CAF50";
const accentRed = "#F44336";

// --- Types
type User = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  profile_picture_url?: string;
  created_at: string;
  clerk_user_id: string;
  status: "active" | "pending" | "inactive";
};

type Invitation = {
  id: number;
  email: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  role: "admin" | "user";
  created_at: string;
  expires_at: string;
};

// --- Composant Statistique (rectangle)
const StatsCard = ({
  title,
  value,
  icon,
  bgClass,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  bgClass: string;
}) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className={`flex items-center p-4 ${bgClass} rounded-xl text-gray-800 shadow-lg`}
  >
    <div className="mr-4 rounded-full bg-white bg-opacity-50 p-3">{icon}</div>
    <div>
      <p className="text-sm">{title}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  </motion.div>
);

// --- Composant principal UsersPage
export default function UsersPage() {
  const [clerkUserId, setClerkUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "user">("all");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [isCancelInvitationModalOpen, setIsCancelInvitationModalOpen] =
    useState(false);
  const [invitationToCancel, setInvitationToCancel] =
    useState<Invitation | null>(null);

  // Store Clerk user ID in localStorage for API requests

  useEffect(() => {
    const userId = localStorage.getItem("currentUserId");
    if (userId) {
      setClerkUserId(userId);
    }
  }, []);

  // RTK Query hooks
  const {
    data: usersData,
    isLoading: isUsersLoading,
    refetch: refetchUsers,
  } = useGetAllUsersQuery(undefined);
  const { data: statsData, isLoading: isStatsLoading } =
    useGetUserStatsQuery(undefined);
  const [updateUserRole, { isLoading: isUpdatingRole }] =
    useUpdateUserRoleMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const {
    data: invitationsData,
    isLoading: isInvitationsLoading,
    refetch: refetchInvitations,
  } = useGetPendingInvitationsQuery(undefined, {
    // Add polling to automatically refresh invitations every 30 seconds
    pollingInterval: 30000,
  });
  const [inviteUser, { isLoading: isInviting }] = useInviteUserMutation();
  const [cancelInvitation, { isLoading: isCancelling }] =
    useCancelInvitationMutation();

  // Filter users based on search query and role filter
  const filteredUsers = usersData?.users
    ? usersData.users.filter((user: User) => {
        const matchesSearch =
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesFilter = filterRole === "all" || user.role === filterRole;

        return matchesSearch && matchesFilter;
      })
    : [];

  // Handle role change
  const handleRoleChange = async (user: User, newRole: "admin" | "user") => {
    try {
      await updateUserRole({ id: user.id, role: newRole }).unwrap();
      toast.success(`Le rôle de ${user.name} a été changé en ${newRole}`);
      refetchUsers();
    } catch (error) {
      console.error("Erreur lors de la mise à jour du rôle:", error);
      toast.error("Erreur lors de la mise à jour du rôle");
    }
  };

  // Handle user deletion
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await deleteUser(userToDelete.id).unwrap();
      toast.success(`${userToDelete.name} a été supprimé avec succès`);
      refetchUsers();
    } catch (error) {
      console.error("Erreur lors de la suppression de l'utilisateur:", error);
      toast.error("Erreur lors de la suppression de l'utilisateur");
    } finally {
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  // Handle user creation
  const handleCreateUser = async (userData: {
    name: string;
    email: string;
    role: "admin" | "user";
  }) => {
    try {
      // In a real app, you would generate a temporary password or send an invitation
      await createUser({
        name: userData.name,
        email: userData.email,
        role: userData.role,
        // Add other required fields as needed
      }).unwrap();
      toast.success(`${userData.name} a été créé avec succès`);
      setIsModalOpen(false);
      refetchUsers();
      // Also refresh invitations in case this email had a pending invitation
      refetchInvitations();
    } catch (error) {
      console.error("Erreur lors de la création de l'utilisateur:", error);
      toast.error("Erreur lors de la création de l'utilisateur");
    }
  };

  // Filter only pending invitations
  const pendingInvitations =
    invitationsData?.invitations?.filter(
      (invitation: Invitation) => invitation.status === "pending",
    ) || [];

  return (
    <div className="min-h-screen bg-gray-100 p-6 dark:bg-slate-900">
      <Toaster position="top-right" richColors />

      <div className="mx-auto max-w-7xl">
        <h1 className="mb-5 mt-5 flex items-center bg-gradient-to-r from-[#b03ff3] to-blue-500 bg-clip-text text-4xl font-extrabold text-transparent">
          Gestion des Utilisateurs
        </h1>

        {/* Stats Cards */}
        {!isStatsLoading && statsData && (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatsCard
              title="Total Utilisateurs"
              value={statsData.total}
              icon={<UserIcon className="h-6 w-6" />}
              bgClass="bg-purple-100"
            />
            <StatsCard
              title="Administrateurs"
              value={statsData.admins}
              icon={<ShieldCheckIcon className="h-6 w-6" />}
              bgClass="bg-blue-100"
            />
            <StatsCard
              title="Utilisateurs Standard"
              value={statsData.users}
              icon={<UserCircleIcon className="h-6 w-6" />}
              bgClass="bg-green-100"
            />
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative max-w-xs flex-1">
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-[#b03ff3] focus:ring-2 focus:ring-[#b03ff3] dark:border-gray-600 dark:bg-gray-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-300" />
            </div>

            <select
              value={filterRole}
              onChange={(e) =>
                setFilterRole(e.target.value as "all" | "admin" | "user")
              }
              className="w-40 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#b03ff3] focus:ring-2 focus:ring-[#b03ff3] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Tous les rôles</option>
              <option value="admin">Administrateurs</option>
              <option value="user">Utilisateurs</option>
            </select>
          </div>

          <div className="flex space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-2 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-white shadow transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"></path>
                <path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"></path>
              </svg>
              Inviter par email
            </motion.button>
          </div>
        </div>

        {/* Users Table */}
        {isUsersLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-purple-500"></div>
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="overflow-hidden rounded-xl bg-white shadow-lg dark:bg-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                  >
                    Utilisateur
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                  >
                    Rôle
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                  >
                    Date d'inscription
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {filteredUsers.map((user: User) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <img
                            className="h-10 w-10 rounded-full"
                            src={
                              user.profile_picture_url ||
                              "/placeholder.svg?height=40&width=40" ||
                              "/placeholder.svg"
                            }
                            alt={user.name}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {user.role === "admin"
                          ? "Administrateur"
                          : "Utilisateur"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setIsEditModalOpen(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          title="Modifier"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setUserToDelete(user);
                            setIsDeleteModalOpen(true);
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Supprimer"
                          disabled={isDeleting}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl bg-white py-12 text-center shadow-lg dark:bg-gray-800">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-500 dark:text-gray-300">
              Aucun utilisateur trouvé
            </p>
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {!isInvitationsLoading && pendingInvitations.length > 0 && (
        <div className="mx-auto mt-8 max-w-7xl">
          <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
            Invitations en attente
          </h2>
          <div className="overflow-hidden rounded-xl bg-white shadow-lg dark:bg-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                  >
                    Rôle
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                  >
                    Date d'invitation
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                  >
                    Expire le
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {pendingInvitations.map((invitation: Invitation) => (
                  <tr
                    key={invitation.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {invitation.email}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          invitation.role === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {invitation.role === "admin"
                          ? "Administrateur"
                          : "Utilisateur"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(invitation.created_at).toLocaleDateString(
                        "fr-FR",
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(invitation.expires_at).toLocaleDateString(
                        "fr-FR",
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setInvitationToCancel(invitation);
                          setIsCancelInvitationModalOpen(true);
                        }}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title="Annuler l'invitation"
                        disabled={isCancelling}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <AddUserModal
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleCreateUser}
            isLoading={isCreating}
          />
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedUser && (
          <EditUserModal
            user={selectedUser}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedUser(null);
            }}
            onRoleChange={handleRoleChange}
            isLoading={isUpdatingRole}
          />
        )}
      </AnimatePresence>

      {/* Invite User Modal */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <InviteUserModal
            onClose={() => setIsInviteModalOpen(false)}
            onSubmit={(data) => {
              inviteUser(data)
                .unwrap()
                .then(() => {
                  toast.success(`Invitation envoyée à ${data.email}`);
                  setIsInviteModalOpen(false);
                  refetchInvitations();
                })
                .catch((error) => {
                  console.error(
                    "Erreur lors de l'envoi de l'invitation:",
                    error,
                  );
                  toast.error(
                    error.data?.message ||
                      "Erreur lors de l'envoi de l'invitation",
                  );
                });
            }}
            isLoading={isInviting}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteModalOpen && (
          <DeleteConfirmationModal
            onClose={() => {
              setIsDeleteModalOpen(false);
              setUserToDelete(null);
            }}
            onConfirm={handleDeleteUser}
            isLoading={isDeleting}
            user={userToDelete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCancelInvitationModalOpen && (
          <CancelInvitationModal
            onClose={() => {
              setIsCancelInvitationModalOpen(false);
              setInvitationToCancel(null);
            }}
            onConfirm={() => {
              if (invitationToCancel) {
                cancelInvitation(invitationToCancel.id)
                  .unwrap()
                  .then(() => {
                    toast.success("Invitation annulée avec succès");
                    refetchInvitations();
                  })
                  .catch((error) => {
                    console.error(
                      "Erreur lors de l'annulation de l'invitation:",
                      error,
                    );
                    toast.error("Erreur lors de l'annulation de l'invitation");
                  })
                  .finally(() => {
                    setIsCancelInvitationModalOpen(false);
                    setInvitationToCancel(null);
                  });
              }
            }}
            isLoading={isCancelling}
            invitation={invitationToCancel}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Modal d'ajout d'un nouvel utilisateur
const AddUserModal = ({
  onClose,
  onSubmit,
  isLoading,
}: {
  onClose: () => void;
  onSubmit: (userData: {
    name: string;
    email: string;
    role: "admin" | "user";
  }) => void;
  isLoading: boolean;
}) => {
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    role: "user" as "admin" | "user",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(userData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800"
      >
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
          <UserPlusIcon className="h-6 w-6 text-purple-600" />
          <span>Ajouter un nouvel utilisateur</span>
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nom
            </label>
            <input
              name="name"
              type="text"
              value={userData.name}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#b03ff3] focus:ring-[#b03ff3] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              name="email"
              type="email"
              value={userData.email}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#b03ff3] focus:ring-[#b03ff3] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Rôle
            </label>
            <select
              name="role"
              value={userData.role}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#b03ff3] focus:ring-[#b03ff3] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="user">Utilisateur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-4 rounded-md px-4 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-white transition hover:from-purple-700 hover:to-pink-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Création en cours...</span>
                </>
              ) : (
                <>
                  <UserPlusIcon className="h-5 w-5" />
                  <span>Créer l'utilisateur</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Modal de modification d'un utilisateur
const EditUserModal = ({
  user,
  onClose,
  onRoleChange,
  isLoading,
}: {
  user: User;
  onClose: () => void;
  onRoleChange: (user: User, newRole: "admin" | "user") => void;
  isLoading: boolean;
}) => {
  const [newRole, setNewRole] = useState<"admin" | "user">(user.role);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRole !== user.role) {
      onRoleChange(user, newRole);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800"
      >
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
          <PencilIcon className="h-6 w-6 text-purple-600" />
          <span>Modifier l'utilisateur</span>
        </h2>
        <div className="mb-4 flex items-center">
          <img
            src={
              user.profile_picture_url || "/placeholder.svg?height=48&width=48"
            }
            alt={user.name}
            className="mr-4 h-12 w-12 rounded-full"
          />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {user.name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {user.email}
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Rôle
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as "admin" | "user")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#b03ff3] focus:ring-[#b03ff3] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="user">Utilisateur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-4 rounded-md px-4 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-white transition hover:from-purple-700 hover:to-pink-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Mise à jour en cours...</span>
                </>
              ) : (
                <>
                  <CheckIcon className="h-5 w-5" />
                  <span>Enregistrer les modifications</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Modal d'invitation d'un utilisateur par email
const InviteUserModal = ({
  onClose,
  onSubmit,
  isLoading,
}: {
  onClose: () => void;
  onSubmit: (data: { email: string; role: string }) => void;
  isLoading: boolean;
}) => {
  const [inviteData, setInviteData] = useState({
    email: "",
    role: "user",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setInviteData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(inviteData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800"
      >
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-blue-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"></path>
            <path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"></path>
          </svg>
          <span>Inviter un utilisateur par email</span>
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              name="email"
              type="email"
              value={inviteData.email}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="exemple@domaine.com"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Rôle
            </label>
            <select
              name="role"
              value={inviteData.role}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="user">Utilisateur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div className="mb-4 rounded-md bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
            <p>
              Un email d'invitation sera envoyé à cette adresse avec un lien
              pour créer un compte.
            </p>
            <p className="mt-1">L'invitation expirera après 7 jours.</p>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-4 rounded-md px-4 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-white transition"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 7.92A2.92 2.92 0 0 1 8 5h8a2.92 2.92 0 0 1 3 2.92v8.15A2.92 2.92 0 0 1 16 19H8a2.92 2.92 0 0 1-3-2.92Z"></path>
                    <path d="M16 11h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2"></path>
                    <path d="M8 11H6a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h2"></path>
                    <path d="M15 5v14"></path>
                    <path d="M9 5v14"></path>
                  </svg>
                  <span>Envoyer l'invitation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Ajoutez ce composant à la fin de votre fichier
const DeleteConfirmationModal = ({
  onClose,
  onConfirm,
  isLoading,
  user,
}: {
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  user: User | null;
}) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800"
      >
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-red-600 dark:text-red-400">
          <TrashIcon className="h-6 w-6" />
          <span>Confirmer la suppression</span>
        </h2>

        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300">
            Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur{" "}
            <span className="font-semibold text-red-600">{user.name}</span> ?
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400"></p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            disabled={isLoading}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-white transition hover:bg-red-700 disabled:bg-red-400"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg
                  className="h-5 w-5 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Suppression...</span>
              </>
            ) : (
              <>
                <TrashIcon className="h-5 w-5" />
                <span>Confirmer la suppression</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const CancelInvitationModal = ({
  onClose,
  onConfirm,
  isLoading,
  invitation,
}: {
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  invitation: Invitation | null;
}) => {
  if (!invitation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800"
      >
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-red-600 dark:text-red-400">
          <TrashIcon className="h-6 w-6" />
          <span>Annuler l'invitation</span>
        </h2>

        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300">
            Êtes-vous sûr de vouloir annuler l'invitation envoyée à{" "}
            <span className="font-semibold text-red-600">
              {invitation.email}
            </span>{" "}
            ?
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400"></p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            disabled={isLoading}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-white transition hover:bg-red-700 disabled:bg-red-400"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg
                  className="h-5 w-5 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Annulation en cours...</span>
              </>
            ) : (
              <>
                <TrashIcon className="h-5 w-5" />
                <span>Confirmer l'annulation</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
