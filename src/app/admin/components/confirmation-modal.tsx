"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface ConfirmationModalProps {
  title: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  type,
  onClose,
}) => {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckIcon className="h-10 w-10 text-green-500" />;
      case "error":
        return <XMarkIcon className="h-10 w-10 text-red-500" />;
      case "warning":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
      case "info":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case "success":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "error":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      case "warning":
        return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
      case "info":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      default:
        return "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        className={`relative z-10 w-full max-w-md overflow-hidden rounded-2xl border p-6 shadow-xl ${getBgColor()}`}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-800">
            {getIcon()}
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-800 dark:text-white">
            {title}
          </h2>
          <p className="mb-6 text-slate-600 dark:text-slate-300">{message}</p>
          <Button
            onClick={onClose}
            className={
              type === "success"
                ? "bg-green-600 hover:bg-green-700"
                : type === "error"
                  ? "bg-red-600 hover:bg-red-700"
                  : type === "warning"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-blue-600 hover:bg-blue-700"
            }
          >
            OK
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};
