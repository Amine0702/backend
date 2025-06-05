"use client";

export default function ErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Erreur
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Désolé, une erreur s'est produite. Veuillez réessayer plus tard.
        </p>
      </div>
    </div>
  );
}
