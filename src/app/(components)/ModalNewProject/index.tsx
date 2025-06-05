"use client";

import Modal from "@/app/(components)/Modal";
import { useState } from "react";
import { formatISO } from "date-fns";
import { useCreateProjectMutation } from "@/app/state/api";
import { useUser } from "@clerk/nextjs";
import {
  Calendar,
  ClipboardEdit,
  Loader2,
  Mail,
  Plus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const ModalNewProject = ({ isOpen, onClose }: Props) => {
  const [createProject, { isLoading, isError }] = useCreateProjectMutation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Gestion de la liste des emails invités
  const [memberEmail, setMemberEmail] = useState("");
  const [invitedMembers, setInvitedMembers] = useState<string[]>([]);

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Récupération de l'utilisateur connecté via Clerk
  const { user, isLoaded } = useUser();
  if (!isLoaded) return <p>Loading...</p>;

  const clerkUserId = user?.id || "";

  const handleAddMember = () => {
    const trimmedEmail = memberEmail.trim();
    if (trimmedEmail && !invitedMembers.includes(trimmedEmail)) {
      setInvitedMembers([...invitedMembers, trimmedEmail]);
      setMemberEmail("");
      toast.success(`${trimmedEmail} ajouté à la liste des invités`);
    } else if (invitedMembers.includes(trimmedEmail)) {
      toast.error("Cet email est déjà dans la liste des invités");
    }
  };

  const handleRemoveMember = (emailToRemove: string) => {
    setInvitedMembers(
      invitedMembers.filter((email) => email !== emailToRemove),
    );
    toast.info(`${emailToRemove} retiré de la liste des invités`);
  };

  const handleSubmit = async () => {
    // Vérification de la complétude du formulaire
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "Le nom du projet est obligatoire";
    }

    if (!description.trim()) {
      errors.description = "La description est obligatoire";
    }

    if (!startDate) {
      errors.startDate = "La date de début est obligatoire";
    }

    if (!endDate) {
      errors.endDate = "La date de fin est obligatoire";
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      errors.endDate =
        "La date de fin doit être postérieure à la date de début";
    }

    // Si des erreurs sont trouvées, les afficher et arrêter la soumission
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Réinitialiser les erreurs
    setValidationErrors({});

    try {
      const formattedStartDate = formatISO(new Date(startDate), {
        representation: "complete",
      });
      const formattedEndDate = formatISO(new Date(endDate), {
        representation: "complete",
      });

      // La méthode .unwrap() permet de récupérer directement l'erreur si la mutation échoue
      await createProject({
        name,
        description,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        clerkUserId,
        invitedMembers,
      }).unwrap();

      toast.success("Projet créé avec succès!");
      onClose(); // Fermer la modal après succès
    } catch (err) {
      console.error("Erreur lors de la création du projet:", err);
      toast.error("Erreur lors de la création du projet");
    }
  };

  const isFormValid = () =>
    name && description && startDate && endDate && clerkUserId;

  const inputStyles =
    "w-full rounded-md border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 dark:focus:outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="">
      <div className="-mx-4 -mt-4 mb-4 flex items-center justify-between rounded-t-lg border-b bg-violet-50 p-4">
        <h2 className="flex items-center text-lg font-semibold text-violet-800">
          <ClipboardEdit size={20} className="mr-2 text-violet-600" />
          Créer un nouveau projet
        </h2>
      </div>

      <form
        className="mt-4 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="space-y-1">
          <label
            htmlFor="name"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Nom du projet <span className="text-red-500">*</span>
          </label>
          {validationErrors.name && (
            <p className="mb-1 text-sm text-red-500">{validationErrors.name}</p>
          )}
          <input
            type="text"
            id="name"
            className={`${inputStyles} ${validationErrors.name ? "border-red-500" : ""}`}
            placeholder="Nom du projet"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="description"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Description <span className="text-red-500">*</span>
          </label>
          {validationErrors.description && (
            <p className="mb-1 text-sm text-red-500">
              {validationErrors.description}
            </p>
          )}
          <textarea
            id="description"
            className={`${inputStyles} ${validationErrors.description ? "border-red-500" : ""}`}
            placeholder="Description du projet"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4">
          <div className="space-y-1">
            <label
              htmlFor="startDate"
              className="mb-1 block flex items-center text-sm font-medium text-gray-700"
            >
              <Calendar size={14} className="mr-1" />
              Date de début <span className="text-red-500">*</span>
            </label>
            {validationErrors.startDate && (
              <p className="mb-1 text-sm text-red-500">
                {validationErrors.startDate}
              </p>
            )}
            <input
              type="date"
              id="startDate"
              className={`${inputStyles} ${validationErrors.startDate ? "border-red-500" : ""}`}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="endDate"
              className="mb-1 block flex items-center text-sm font-medium text-gray-700"
            >
              <Calendar size={14} className="mr-1" />
              Date de fin <span className="text-red-500">*</span>
            </label>
            {validationErrors.endDate && (
              <p className="mb-1 text-sm text-red-500">
                {validationErrors.endDate}
              </p>
            )}
            <input
              type="date"
              id="endDate"
              className={`${inputStyles} ${validationErrors.endDate ? "border-red-500" : ""}`}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Zone pour inviter des membres */}
        <div className="space-y-2">
          <label className="block flex items-center text-sm font-medium text-gray-700">
            <Users size={14} className="mr-1" />
            Inviter des membres
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400"
              />
              <input
                type="email"
                placeholder="Email du membre"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                className={`${inputStyles} pl-9`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddMember();
                  }
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleAddMember}
              className="flex items-center rounded-md border border-transparent bg-violet-500 px-3 py-2 text-base font-medium text-white shadow-sm hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600"
            >
              <Plus size={16} className="mr-1" />
              Ajouter
            </button>
          </div>

          {invitedMembers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 rounded-md border bg-gray-50 p-3">
              {invitedMembers.map((email, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-sm text-violet-800"
                >
                  <Mail size={12} className="mr-1" />
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(email)}
                    className="ml-1 rounded-full p-1 text-violet-600 hover:bg-violet-200 hover:text-violet-800"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Note informative sur l'approbation */}
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p>
            Note: Votre projet sera soumis à l'approbation d'un administrateur
            avant d'être activé.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
          >
            Annuler
          </button>

          <button
            type="submit"
            className={`flex items-center rounded-md bg-violet-500 px-4 py-2 text-white hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600 ${
              !isFormValid() || isLoading ? "cursor-not-allowed opacity-50" : ""
            }`}
            disabled={!isFormValid() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              "Créer le projet"
            )}
          </button>
        </div>

        {isError && (
          <p className="mt-2 text-red-500">
            Une erreur est survenue lors de la création du projet.
          </p>
        )}
      </form>
    </Modal>
  );
};

export default ModalNewProject;
