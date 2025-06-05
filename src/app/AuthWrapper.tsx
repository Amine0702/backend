"use client";
import { useAuth, useUser } from "@clerk/nextjs";
import type React from "react";

import { useState, useEffect } from "react";
import { useCreateUserMutation } from "./state/api";
import { useRouter, usePathname } from "next/navigation";
import ConditionalDashboardWrapper from "./ConditionalDashboardWrapper";

const LoadingIndicator = () => (
  <div className="flex min-h-screen items-center justify-center">
    <span>Loading...</span>
  </div>
);

export default function AuthWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [createUser, { error, isLoading: apiLoading }] =
    useCreateUserMutation();
  const [isUserCreated, setIsUserCreated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Création de l'utilisateur dans l'API backend et récupération du rôle
  useEffect(() => {
    if (authLoaded && userLoaded && isSignedIn && user && !isUserCreated) {
      const userData = {
        email: user.emailAddresses[0].emailAddress,
        name: user.fullName ?? "",
        clerkUserId: user.id,
        profilePictureUrl: user.imageUrl,
      };

      console.log("Envoi des données à l'API Laravel :", userData);

      createUser(userData)
        .unwrap()
        .then((response) => {
          console.log("Réponse de l'API Laravel :", response);
          setIsUserCreated(true);

          // Stocker l'ID utilisateur Clerk dans le localStorage pour l'utiliser dans d'autres composants
          localStorage.setItem("clerkUserId", user.id);

          // Stockage du rôle global renvoyé par l'API (admin ou non)
          if (response?.user?.role) {
            setUserRole(response.user.role);
            // Stocker uniquement le rôle global (admin)
            if (response.user.role === "admin") {
              localStorage.setItem("userGlobalRole", response.user.role);
            }
          }
        })
        .catch((err) => console.error("Erreur API Laravel :", err));
    }
  }, [authLoaded, userLoaded, isSignedIn, user, isUserCreated, createUser]);

  // Redirections en fonction du rôle et de l'URL en cours
  useEffect(() => {
    if (!userRole) return; // On attend la détermination du rôle

    // Si l'utilisateur est admin et que le pathname ne commence pas par "/admin/apk", on le redirige vers "/admin/apk"
    if (userRole === "admin" && !pathname.startsWith("/admin/apk")) {
      router.push("/admin/apk");
    }

    // Si l'utilisateur n'est pas admin et tente d'accéder à une route admin, on le redirige (ici vers "/landing")
    if (pathname.startsWith("/admin") && userRole !== "admin") {
      router.push("/landing");
    }
  }, [userRole, pathname, router]);

  if (
    !authLoaded ||
    !userLoaded ||
    (isSignedIn && !isUserCreated && apiLoading)
  ) {
    return <LoadingIndicator />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>
          Erreur lors de la synchronisation utilisateur: {JSON.stringify(error)}
        </p>
      </div>
    );
  }

  return isSignedIn ? (
    <ConditionalDashboardWrapper>{children}</ConditionalDashboardWrapper>
  ) : (
    <>{children}</>
  );
}
