"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { auth } from "@/lib/firebase";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  { label: "Media", href: "/media" },
  { label: "UGC", href: "/ugc" },
  { label: "Dashboard", href: "/dashboard", minRole: "ADMIN" as const },
  { label: "Admins", href: "/admins", minRole: "SUPER_ADMIN" as const },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { email, role, clearAuth } = useAuthStore();

  async function handleLogout() {
    await auth.signOut();
    clearAuth();
  }

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.minRole) return true;
    if (item.minRole === "ADMIN")
      return role === "ADMIN" || role === "SUPER_ADMIN";
    if (item.minRole === "SUPER_ADMIN") return role === "SUPER_ADMIN";
    return false;
  });

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border-light bg-card-light dark:border-border-dark dark:bg-dark-card">
      <div className="border-b border-border-light p-4 dark:border-border-dark">
        <h1 className="text-sm font-bold text-primary">CMA</h1>
        <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
          {email}
        </p>
        <span className="mt-1 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {role}
        </span>
      </div>

      <nav className="flex-1 p-2">
        {visibleItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded px-3 py-2 text-sm ${
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-border-light p-4 dark:border-border-dark">
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="w-full rounded border border-danger/30 px-3 py-1.5 text-xs text-danger hover:bg-danger/5"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
