"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import ThemeProvider from "@/components/ThemeProvider";
import AuthProvider from "@/components/AuthProvider";
import ToastContainer from "@/components/ToastContainer";
import Sidebar from "@/components/Sidebar";
import { useAuthStore } from "@/stores/useAuthStore";

export default function ClientShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoginPage = pathname === "/login";

  return (
    <ThemeProvider>
      <AuthProvider>
        {isLoginPage || !isAuthenticated ? (
          <main>{children}</main>
        ) : (
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        )}
        <ToastContainer />
      </AuthProvider>
    </ThemeProvider>
  );
}
