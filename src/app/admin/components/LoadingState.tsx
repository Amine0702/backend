import type React from "react"
import { Loader2 } from "lucide-react"

interface LoadingStateProps {
  message?: string
}

const LoadingState: React.FC<LoadingStateProps> = ({ message = "Chargement des données..." }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
      <Loader2 className="h-12 w-12 text-purple-600 animate-spin mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{message}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
        Veuillez patienter pendant que nous récupérons les données...
      </p>
    </div>
  )
}

export default LoadingState
