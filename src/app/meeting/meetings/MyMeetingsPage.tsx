"use client";

import { useUser } from "@clerk/nextjs";
import { type Call, useStreamVideoClient } from "@stream-io/video-react-sdk";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function MyMeetingsPage() {
  const { user } = useUser();

  const client = useStreamVideoClient();

  const [calls, setCalls] = useState<Call[]>();

  useEffect(() => {
    async function loadCalls() {
      if (!client || !user?.id) {
        return;
      }

      const { calls } = await client.queryCalls({
        sort: [{ field: "starts_at", direction: -1 }],
        filter_conditions: {
          starts_at: { $exists: true },
          $or: [
            { created_by_user_id: user.id },
            { members: { $in: [user.id] } },
          ],
        },
      });
      setCalls(calls);
    }

    loadCalls();
  }, [client, user?.id]);

  return (
    <div className="min-h-screen bg-white p-6 dark:bg-gray-950">
      <div className="space-y-3">
        <h1 className="text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
          Mes réunions
        </h1>
        {!calls && (
          <Loader2 className="mx-auto animate-spin text-gray-900 dark:text-gray-100" />
        )}
        {calls?.length === 0 && (
          <p className="text-center text-gray-600 dark:text-gray-400">
            Aucune réunion trouvée
          </p>
        )}
        <ul className="list-inside list-disc space-y-2">
          {calls?.map((call) => <MeetingItem key={call.id} call={call} />)}
        </ul>
      </div>
    </div>
  );
}

interface MeetingItemProps {
  call: Call;
}

function MeetingItem({ call }: MeetingItemProps) {
  const meetingLink = `/meeting/${call.id}`;

  const isInfuture =
    call.state.startsAt && new Date(call.state.startsAt) > new Date();

  const hasEnded = !!call.state.endedAt;

  return (
    <li>
      <Link
        href={meetingLink}
        className="text-blue-600 hover:underline dark:text-blue-400"
      >
        {call.state.startsAt?.toLocaleString()}
        {isInfuture && " (À venir)"}
        {hasEnded && " (Terminée)"}
      </Link>
      <p className="ml-6 text-gray-500 dark:text-gray-400">
        {call.state.custom.description}
      </p>
    </li>
  );
}
