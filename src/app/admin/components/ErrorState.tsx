"use client"

import type React from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

const ErrorState: React.FC<ErrorStateProps> = ({
  message = "Une erreur s'est produite lors du chargement des données.",
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Erreur de chargement</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} className="mt-4 bg-purple-600 hover:bg-purple-700 text-white">
          Réessayer
        </Button>
      )}
    </div>
  )
}

export default ErrorState
