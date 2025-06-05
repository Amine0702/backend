import type React from "react";
import type { Metadata } from "next";
import ClientProvider from "@/app/meeting/ClientProvider";
import { ThemeProvider } from "@/app/meeting/components/theme-provider";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Meetings",
  description: "Video meetings for project management",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function MeetingLayout({ children }: RootLayoutProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <ClientProvider>{children}</ClientProvider>
      </div>
    </ThemeProvider>
  );
}
