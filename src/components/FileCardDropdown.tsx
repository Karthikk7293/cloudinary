"use client";

import { useState, useRef, useEffect } from "react";

interface DropdownOption {
  label: string;
  onClick: () => void;
  danger?: boolean;
  hidden?: boolean;
}

interface FileCardDropdownProps {
  options: DropdownOption[];
}

export default function FileCardDropdown({ options }: FileCardDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const visible = options.filter((o) => !o.hidden);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-30 min-w-[160px] overflow-hidden rounded-md border border-border-light bg-white shadow-lg dark:border-border-dark dark:bg-dark-card">
          {visible.map((opt) => (
            <button
              key={opt.label}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                opt.onClick();
              }}
              className={`block w-full px-3 py-2 text-left text-xs transition-colors ${
                opt.danger
                  ? "text-danger hover:bg-danger/5"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
