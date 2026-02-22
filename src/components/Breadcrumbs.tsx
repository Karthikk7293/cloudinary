"use client";

import { useUIStore } from "@/stores/useUIStore";

interface BreadcrumbsProps {
  onNavigate: (folder: string) => void;
}

export default function Breadcrumbs({ onNavigate }: BreadcrumbsProps) {
  const breadcrumbs = useUIStore((s) => s.breadcrumbs);

  function handleClick(index: number) {
    const path = breadcrumbs.slice(0, index + 1).join("/");
    onNavigate(path);
  }

  return (
    <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
      <button
        onClick={() => onNavigate("")}
        className="hover:text-primary"
      >
        Root
      </button>
      {breadcrumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          <span>/</span>
          <button
            onClick={() => handleClick(i)}
            className={`hover:text-primary ${
              i === breadcrumbs.length - 1
                ? "font-medium text-gray-900 dark:text-gray-100"
                : ""
            }`}
          >
            {crumb}
          </button>
        </span>
      ))}
    </nav>
  );
}
