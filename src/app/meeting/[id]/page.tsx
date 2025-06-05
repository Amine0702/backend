import type { Metadata } from "next";
import MeetingPage from "@/app/meeting/[id]/MeetingPage";
import Navbar from "@/app/meeting/components/Navbar";

interface PageProps {
  params: { id: string };
}

export function generateMetadata({ params: { id } }: PageProps): Metadata {
  return {
    title: `Réunion ${id}`,
  };
}

export default function Page({ params: { id } }: PageProps) {
  return (
    <>
      <Navbar />
      <MeetingPage id={id} />
    </>
  );
}
