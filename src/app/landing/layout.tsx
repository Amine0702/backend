import type React from "react";
import "./landing.css";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <title>Page d'Accueil</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
