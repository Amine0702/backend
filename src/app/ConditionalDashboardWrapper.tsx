"use client";
import type React from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DashboardWrapper from "./dashboardWrapper";

interface ConditionalDashboardWrapperProps {
  children: React.ReactNode;
}

const ConditionalDashboardWrapper: React.FC<
  ConditionalDashboardWrapperProps
> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  const landingPages = ["/", "/landing"];
  const isLandingPage = landingPages.includes(pathname);

  const adminPages = [
    "/admin/apk",
    "/admin/apk/vue",
    "/admin/apk/profile",
    "/admin/apk/users",
    "/admin/apk/tableau",
    "/admin/apk/sauvgarde",
    "/admin/apk/historique",
    "/admin/apk/analyseretard",
    "/admin/apk/Reports",
    "/admin/apk/logs",
    "/admin/apk/cycle",
  ];
  const isadminPage = adminPages.includes(pathname);

  // Check if the current page is a meeting page
  const isMeetingPage = pathname.startsWith("/meeting");

  if (isLandingPage || isadminPage) {
    return <>{children}</>;
  }

  // For meeting pages, we still want the dashboard wrapper, but we need to handle
  // the content differently in the meeting components
  return <DashboardWrapper>{children}</DashboardWrapper>;
};

export default ConditionalDashboardWrapper;
