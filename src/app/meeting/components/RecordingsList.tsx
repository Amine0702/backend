"use client";

import { useUser } from "@clerk/nextjs";
import useStreamCall from "../hooks/useStreamCall";
import useLoadRecordings from "../hooks/UseLoadRecordings";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function RecordingsList() {
  const call = useStreamCall();

  const { recordings, recordingsLoading } = useLoadRecordings(call);

  const { user, isLoaded: userLoaded } = useUser();

  if (userLoaded && !user) {
    return (
      <p className="text-center text-gray-900 dark:text-gray-100">
        Vous devez être connecté pour voir les enregistrements.
      </p>
    );
  }

  if (recordingsLoading)
    return (
      <Loader2 className="mx-auto animate-spin text-gray-900 dark:text-gray-100" />
    );

  return (
    <div className="space-y-3 text-center">
      {recordings.length === 0 && (
        <p className="text-gray-900 dark:text-gray-100">
          Aucun enregistrement pour cette réunion.
        </p>
      )}
      <ul className="list-inside list-disc">
        {recordings
          .sort((a, b) => b.end_time.localeCompare(a.end_time))
          .map((recording) => (
            <li key={recording.url}>
              <Link
                href={recording.url}
                target="_blank"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {new Date(recording.end_time).toLocaleString()}
              </Link>
            </li>
          ))}
      </ul>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Remarque : Il peut s'écouler jusqu'à 1 minute avant que les nouveaux
        enregistrements n'apparaissent.
        <br />
        Vous pouvez actualiser la page pour voir si de nouveaux enregistrements
        sont disponibles.
      </p>
    </div>
  );
}
