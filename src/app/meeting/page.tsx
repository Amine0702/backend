import Navbar from "@/app/meeting/components/Navbar";
import CreateMeetingPage from "./CreateMeetingPage";

export default function Home() {
  return (
    <div className="meeting-container h-full w-full bg-white dark:bg-gray-950">
      <Navbar />
      <CreateMeetingPage />
    </div>
  );
}
