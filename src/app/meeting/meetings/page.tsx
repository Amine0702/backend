import type { Metadata } from "next";
import MyMeetingsPage from "./MyMeetingsPage";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: "Mes Réunions",
};

export default function Page() {
  return (
    <>
      <Navbar />
      <MyMeetingsPage />
    </>
  );
}
