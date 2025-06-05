"use client"

import type React from "react"
import { useState } from "react"
import { X, Brain, Sparkles, MessageSquare } from "lucide-react"

interface TaskAICreationModalProps {
  onClose: () => void
  onSelectOption: (useAI: boolean) => void
}

const TaskAICreationModal: React.FC<TaskAICreationModalProps> = ({ onClose, onSelectOption }) => {
  const [option, setOption] = useState<"ai" | "manual" | null>(null)

  const handleOptionSelect = (selectedOption: "ai" | "manual") => {
    setOption(selectedOption)
    onSelectOption(selectedOption === "ai")
    onClose()
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Créer une nouvelle tâche</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100" title="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-6 text-center">Comment souhaitez-vous créer votre tâche ?</p>

          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => handleOptionSelect("ai")}
              className="flex flex-col items-center p-6 border-2 border-violet-200 rounded-lg hover:bg-violet-50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center mb-3">
                <Brain size={24} className="text-violet-600" />
              </div>
              <h3 className="font-medium text-violet-700 mb-1">Génération par IA (Gratuit)</h3>
              <p className="text-sm text-center text-gray-600">
                Décrivez la tâche en langage naturel et l'IA générera tous les détails automatiquement.
              </p>
              <div className="mt-2 text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full flex items-center">
                <Sparkles size={12} className="mr-1" />
                Recommandé
              </div>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-2 text-sm text-gray-500">ou</span>
              </div>
            </div>

            <button
              onClick={() => handleOptionSelect("manual")}
              className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-600"
                >
                  <path d="M14 4V6.4C14 8.76 14 9.94 14.73 10.67C15.46 11.4 16.64 11.4 19 11.4H21.4" />
                  <path d="M2 6.94V5.86C2 4.28 2 3.5 2.41 2.94C2.76 2.45 3.32 2.14 3.94 2.05C4.66 1.94 5.52 2.25 7.24 2.86L18.76 7.14C20.48 7.75 21.34 8.06 21.71 8.65C22.03 9.16 22.03 9.78 21.71 10.29C21.34 10.88 20.48 11.19 18.76 11.8L7.24 16.08C5.52 16.69 4.66 17 3.94 16.89C3.32 16.8 2.76 16.49 2.41 16C2 15.44 2 14.66 2 13.08V11.97" />
                  <path d="M11 14L10 18" />
                  <path d="M14 12L18 18" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-700 mb-1">Remplissage manuel</h3>
              <p className="text-sm text-center text-gray-600">
                Remplissez tous les détails vous-même pour un contrôle total
              </p>
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center mb-2">
              <MessageSquare size={18} className="text-blue-600 mr-2" />
              <h3 className="font-medium text-blue-700">Astuce</h3>
            </div>
            <p className="text-sm text-blue-600">
              Vous pouvez aussi utiliser l'assistant IA pour discuter de votre projet et obtenir des suggestions pour
              créer des tâches plus efficacement.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskAICreationModal
