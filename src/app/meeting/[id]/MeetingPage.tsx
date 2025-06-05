"use client";

import {
  StreamCall,
  StreamTheme,
  useCallStateHooks,
  VideoPreview,
  DeviceSettings,
  CallingState,
} from "@stream-io/video-react-sdk";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import useLoadCall from "../hooks/useLoadCall";
import { useUser } from "@clerk/nextjs";
import useStreamCall from "../hooks/useStreamCall";
import Link from "next/link";
import { buttonClassName } from "@/app/meeting/components/Button";
import PermissionPrompt from "../components/PermissionPrompt";
import AudioVolumeIndicator from "../components/AudioVolumeIndicator";
import FlexibleCallLayout from "../components/FlexibleCallLayouts";
import RecordingsList from "../components/RecordingsList";

interface MeetingPageProps {
  id: string;
}

export default function MeetingPage({ id }: MeetingPageProps) {
  const { call, callLoading } = useLoadCall(id);

  const { user, isLoaded: userLoaded } = useUser();

  if (!userLoaded || callLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="mx-auto animate-spin text-gray-900 dark:text-gray-100" />
      </div>
    );
  }

  if (!call) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
        <p className="text-center font-bold text-gray-900 dark:text-gray-100">
          Réunion non trouvée
        </p>
      </div>
    );
  }

  const notAllowedToJoin =
    call.type === "meeting-private" &&
    (!user || !call.state.members.find((m) => m.user.id === user.id));

  if (notAllowedToJoin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
        <p className="text-center font-bold text-gray-900 dark:text-gray-100">
          Vous n'êtes pas autorisé à voir cette réunion
        </p>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <StreamCall call={call}>
        <StreamTheme>
          <MeetingScreen />
        </StreamTheme>
      </StreamCall>
    </div>
  );
}

function MeetingScreen() {
  const call = useStreamCall();

  const { useCallEndedAt, useCallStartsAt } = useCallStateHooks();

  const CallEndedAt = useCallEndedAt();
  const CallStartsAt = useCallStartsAt();

  const [setupComplete, setSetupComplete] = useState(false);

  async function handleSetupComplete() {
    call.join();
    setSetupComplete(true);
  }

  const callInFuture = CallStartsAt && new Date(CallStartsAt) > new Date();

  const callHasEnded = !!CallEndedAt;

  if (callHasEnded) {
    return <MeetingEndedScreen />;
  }
  if (callInFuture) {
    return <UpcomingMeetingScreen />;
  }

  const description = call.state.custom.description;

  return (
    <div className="space-y-6 p-6">
      {description && (
        <p className="text-center text-gray-900 dark:text-gray-100">
          Description de la réunion :{" "}
          <span className="font-bold">{description}</span>
        </p>
      )}
      {setupComplete ? (
        <CallUI />
      ) : (
        <SetupUI onSetupComplete={handleSetupComplete} />
      )}
    </div>
  );
}

interface SetupUIProps {
  onSetupComplete: () => void;
}

function SetupUI({ onSetupComplete }: SetupUIProps) {
  const call = useStreamCall();

  const { useMicrophoneState, useCameraState } = useCallStateHooks();

  const micState = useMicrophoneState();
  const camState = useCameraState();

  const [micCamDisabled, setMicCamDisabled] = useState(false);

  useEffect(() => {
    if (micCamDisabled) {
      call.camera.disable();
      call.microphone.disable();
    } else {
      call.camera.enable();
      call.microphone.enable();
    }
  }, [micCamDisabled]);

  if (!micState.hasBrowserPermission || !camState.hasBrowserPermission) {
    return <PermissionPrompt />;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <h1 className="text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
        Configuration
      </h1>
      <VideoPreview />
      <div className="flex h-16 items-center gap-3">
        <AudioVolumeIndicator />
        <DeviceSettings />
      </div>
      <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800"
          style={{
            WebkitAppearance: "checkbox",
            MozAppearance: "checkbox",
            appearance: "checkbox",
            marginRight: "4px",
          }}
          checked={micCamDisabled}
          onChange={(e) => setMicCamDisabled(e.target.checked)}
        />
        Rejoindre avec micro et caméra désactivés
      </div>
      <button
        className="flex items-center rounded bg-blue-500 px-3 py-2 text-white hover:bg-blue-600"
        onClick={onSetupComplete}
      >
        Rejoindre la réunion
      </button>
    </div>
  );
}

function CallUI() {
  const { useCallCallingState } = useCallStateHooks();

  const callingState = useCallCallingState();

  if (callingState !== CallingState.JOINED) {
    return (
      <Loader2 className="mx-auto animate-spin text-gray-900 dark:text-gray-100" />
    );
  }

  return <FlexibleCallLayout />;
}

function UpcomingMeetingScreen() {
  const call = useStreamCall();

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <p className="text-gray-900 dark:text-gray-100">
        Cette réunion n'a pas encore commencé. Elle débutera le{" "}
        <span className="font-bold">
          {call.state.startsAt?.toLocaleString()}
        </span>
      </p>
      {call.state.custom.description && (
        <p className="text-gray-900 dark:text-gray-100">
          Description :{" "}
          <span className="font-bold">{call.state.custom.description}</span>
        </p>
      )}
      <Link
        href="/meeting"
        className={`${buttonClassName} bg-blue-500 hover:bg-blue-600`}
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}

function MeetingEndedScreen() {
  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <p className="font-bold text-gray-900 dark:text-gray-100">
        Cette réunion est terminée.
      </p>
      <Link
        href="/meeting"
        className={`${buttonClassName} bg-blue-500 hover:bg-blue-600`}
      >
        Retour à l'accueil
      </Link>
      <div className="space-y-3">
        <h2 className="text-center text-xl font-bold text-gray-900 dark:text-gray-100">
          Enregistrements
        </h2>
        <RecordingsList />
      </div>
    </div>
  );
}
