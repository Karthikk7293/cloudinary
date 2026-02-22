"use client";

import { useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter, usePathname } from "next/navigation";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        clearAuth();
        setLoading(false);
        if (pathname !== "/login") {
          router.replace("/login");
        }
        return;
      }

      try {
        const idToken = await firebaseUser.getIdToken();
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          clearAuth();
          await auth.signOut();
          router.replace("/login");
          return;
        }

        setAuth({
          uid: json.data.uid,
          email: json.data.email,
          role: json.data.role,
          access: json.data.access,
        });

        if (pathname === "/login") {
          router.replace("/media");
        }
      } catch {
        clearAuth();
        await auth.signOut();
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setAuth, clearAuth, router, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-light-bg dark:bg-dark-bg">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
