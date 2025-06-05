"use client";

import {
  CallControls,
  PaginatedGridLayout,
  SpeakerLayout,
} from "@stream-io/video-react-sdk";
import useStreamCall from "../hooks/useStreamCall";
import { useState } from "react";
import {
  BetweenHorizonalEnd,
  BetweenVerticalEnd,
  LayoutGrid,
} from "lucide-react";
import EndCallButton from "./EndCallButton";
import { useRouter } from "next/navigation";

type CallLayout = "speaker-vert" | "speaker-horiz" | "grid";

export default function FlexibleCallLayout() {
  const [layout, setLayout] = useState<CallLayout>("speaker-vert");

  const call = useStreamCall();

  const router = useRouter();

  return (
    <div className="space-y-3">
      <CallLayoutButtons layout={layout} setLayout={setLayout} />
      <CallLayoutView layout={layout} />
      <CallControls onLeave={() => router.push(`${call.id}/left`)} />
      <EndCallButton />
    </div>
  );
}

interface CallLayoutButtonsProps {
  layout: CallLayout;
  setLayout: (layout: CallLayout) => void;
}

function CallLayoutButtons({ layout, setLayout }: CallLayoutButtonsProps) {
  return (
    <div className="mx-auto w-fit space-x-6">
      <button onClick={() => setLayout("speaker-vert")}>
        <BetweenVerticalEnd
          className={
            layout !== "speaker-vert" ? "text-gray-400" : "text-blue-500"
          }
        />
      </button>
      <button onClick={() => setLayout("speaker-horiz")}>
        <BetweenHorizonalEnd
          className={
            layout !== "speaker-horiz" ? "text-gray-400" : "text-blue-500"
          }
        />
      </button>
      <button onClick={() => setLayout("grid")}>
        <LayoutGrid
          className={layout !== "grid" ? "text-gray-400" : "text-blue-500"}
        />
      </button>
    </div>
  );
}

interface CallLyoutViewProps {
  layout: CallLayout;
}

function CallLayoutView({ layout }: CallLyoutViewProps) {
  if (layout === "speaker-vert") {
    return <SpeakerLayout />;
  }

  if (layout === "speaker-horiz") {
    return <SpeakerLayout participantsBarPosition="right" />;
  }

  if (layout === "grid") {
    return <PaginatedGridLayout />;
  }

  return null;
}
