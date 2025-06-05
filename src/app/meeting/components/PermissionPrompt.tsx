import { Mic, Webcam } from "lucide-react";

export default function PermissionPrompt() {
  return (
    <div className="flex flex-col items-center gap-3 p-6">
      <div className="flex items-center gap-3">
        <Webcam size={40} className="text-gray-900 dark:text-gray-100" />
        <Mic size={40} className="text-gray-900 dark:text-gray-100" />
      </div>
      <p className="text-center text-gray-900 dark:text-gray-100">
        Veuillez autoriser l'accès à votre microphone et caméra pour rejoindre
        la réunion
      </p>
    </div>
  );
}
