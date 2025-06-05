"use client";

import type React from "react";
import { useState } from "react";
import {
  X,
  Mail,
  Check,
  Eye,
  Edit,
  UserCog,
  AlertCircle,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useInviteUsersMutation } from "@/app/state/api";

interface ProjectShareModalProps {
  onClose: () => void;
  projectName: string;
  projectId: string;
}

type PermissionLevel = "observer" | "member" | "manager";

interface InviteeData {
  email: string;
  permission: PermissionLevel;
}

const ProjectShareModal: React.FC<ProjectShareModalProps> = ({
  onClose,
  projectName,
  projectId,
}) => {
  const [invitees, setInvitees] = useState<InviteeData[]>([
    { email: "", permission: "observer" },
  ]);

  const [inviteUsers, { isLoading: isSubmitting }] = useInviteUsersMutation();

  const handleEmailChange = (index: number, email: string) => {
    const newInvitees = [...invitees];
    newInvitees[index].email = email;
    setInvitees(newInvitees);
  };

  const handlePermissionChange = (
    index: number,
    permission: PermissionLevel,
  ) => {
    const newInvitees = [...invitees];
    newInvitees[index].permission = permission;
    setInvitees(newInvitees);
  };

  const addInviteeField = () => {
    setInvitees([...invitees, { email: "", permission: "observer" }]);
  };

  const removeInviteeField = (index: number) => {
    if (invitees.length > 1) {
      const newInvitees = [...invitees];
      newInvitees.splice(index, 1);
      setInvitees(newInvitees);
    }
  };

  const handleSubmit = async () => {
    // Validation des emails
    const validInvitees = invitees.filter(
      (inv) =>
        inv.email.trim() !== "" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inv.email),
    );

    if (validInvitees.length === 0) {
      toast.error("Veuillez saisir au moins une adresse email valide");
      return;
    }

    try {
      await inviteUsers({
        id: projectId,
        invitations: validInvitees.map((inv) => ({
          email: inv.email,
          permission: inv.permission,
        })),
      }).unwrap();

      toast.success(
        `${validInvitees.length} invitation(s) envoyée(s) avec succès. Les utilisateurs recevront un email pour accepter l'invitation.`,
      );
      onClose();
    } catch (error: any) {
      console.error("Error sending invitations:", error);
      const errorMessage =
        error?.data?.message || "Erreur lors de l'envoi des invitations";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-violet-800">
            Inviter des collaborateurs
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-sm text-gray-600">
            Invitez des personnes à collaborer sur le projet{" "}
            <span className="font-semibold">{projectName}</span>
          </p>
          <div className="rounded-md bg-blue-50 p-3">
            <p className="text-xs text-blue-700">
              💡 Les invités recevront un email avec un lien pour accepter
              l'invitation. Ils ne rejoindront le projet qu'après avoir cliqué
              sur le lien d'acceptation.
            </p>
          </div>
        </div>

        <div className="mb-6 space-y-4">
          {invitees.map((invitee, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="flex-grow">
                <div className="flex items-center overflow-hidden rounded-md border">
                  <span className="bg-gray-100 p-2 text-gray-500">
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    value={invitee.email}
                    onChange={(e) => handleEmailChange(index, e.target.value)}
                    placeholder="email@exemple.com"
                    className="flex-grow p-2 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex-shrink-0">
                <select
                  value={invitee.permission}
                  onChange={(e) =>
                    handlePermissionChange(
                      index,
                      e.target.value as PermissionLevel,
                    )
                  }
                  className="rounded-md border bg-white p-2"
                >
                  <option value="observer">Observateur</option>
                  <option value="member">Membre</option>
                  <option value="manager">Manager</option>
                </select>
              </div>

              <button
                onClick={() => removeInviteeField(index)}
                className="p-1 text-gray-400 hover:text-red-500"
                disabled={invitees.length === 1}
              >
                <X size={18} />
              </button>
            </div>
          ))}

          <button
            onClick={addInviteeField}
            className="flex items-center text-sm text-violet-600 hover:text-violet-800"
          >
            <Plus size={16} className="mr-1" /> Ajouter un autre email
          </button>
        </div>

        <div className="mb-6 rounded-md border border-violet-200 bg-violet-50 p-3">
          <div className="flex items-center">
            <AlertCircle size={18} className="mr-2 text-violet-600" />
            <h3 className="text-sm font-medium text-violet-800">
              Niveaux de permission
            </h3>
          </div>
          <ul className="mt-2 space-y-1 text-xs text-violet-700">
            <li className="flex items-center">
              <Eye size={12} className="mr-1" />
              <b>Observateur:</b> Peut voir les tâches mais ne peut rien
              modifier
            </li>
            <li className="flex items-center">
              <Edit size={12} className="mr-1" />
              <b>Membre:</b> Peut modifier ses propres tâches et en créer de
              nouvelles
            </li>
            <li className="flex items-center">
              <UserCog size={12} className="mr-1" />
              <b>Manager:</b> Accès complet, peut assigner des tâches et
              modifier toutes les tâches
            </li>
          </ul>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
            disabled={isSubmitting}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center rounded-md bg-violet-500 px-4 py-2 text-white hover:bg-violet-600 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
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
                Envoi en cours...
              </>
            ) : (
              <>
                <Check size={16} className="mr-2" />
                Envoyer les invitations
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectShareModal;
