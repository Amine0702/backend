import "@/app/globals.css";
import type React from "react";
import { frFR } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import AuthWrapper from "@/app/AuthWrapper";
import StoreProvider from "./(components)/redux";
import { SidebarProvider } from "./admin/context/SidebarContext";
import { ThemeProvider } from "./admin/context/ThemeContext";

const inter = Inter({ subsets: ["latin"] });

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <ClerkProvider localization={frFR}>
      <html lang="en">
        <body
          className={`${inter.className} bg-gray-50 text-gray-900 dark:bg-dark-bg dark:text-white`}
        >
          <StoreProvider>
            <ThemeProvider>
              <SidebarProvider>
                <AuthWrapper>{children}</AuthWrapper>
              </SidebarProvider>
            </ThemeProvider>
          </StoreProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
