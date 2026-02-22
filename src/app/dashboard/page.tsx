"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";
import { apiFetch } from "@/lib/api-client";
import type { DashboardMetrics } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────

function formatStorage(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      current = Math.min(Math.round(increment * step), value);
      setDisplay(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return <>{display.toLocaleString()}</>;
}

// ─── Donut Chart (pure SVG) ──────────────────────────────────────

function DonutChart({
  segments,
  size = 140,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 120 120" width={size} height={size}>
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="16"
            className="text-gray-200 dark:text-gray-700"
          />
          <text
            x="60"
            y="64"
            textAnchor="middle"
            className="fill-gray-400 text-[11px]"
          >
            No data
          </text>
        </svg>
      </div>
    );
  }

  return (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      {segments.map((seg) => {
        const pct = seg.value / total;
        const dashLength = pct * circumference;
        const offset = -(accumulated * circumference) + circumference * 0.25;
        accumulated += pct;
        return (
          <circle
            key={seg.label}
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth="16"
            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
            strokeDashoffset={offset}
            strokeLinecap="butt"
            className="transition-all duration-1000 ease-out"
            style={{
              animation: "donut-draw 1s ease-out forwards",
            }}
          />
        );
      })}
      <text
        x="60"
        y="58"
        textAnchor="middle"
        className="fill-gray-800 text-[18px] font-bold dark:fill-gray-100"
      >
        {total}
      </text>
      <text
        x="60"
        y="72"
        textAnchor="middle"
        className="fill-gray-400 text-[9px]"
      >
        Total
      </text>
    </svg>
  );
}

// ─── Bar Chart (pure CSS) ────────────────────────────────────────

function BarChart({
  data,
}: {
  data: { label: string; uploads: number; deletes: number }[];
}) {
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.uploads, d.deletes)),
    1
  );

  return (
    <div className="flex items-end gap-2" style={{ height: 120 }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full items-end justify-center gap-0.5" style={{ height: 100 }}>
            <div
              className="w-3 rounded-t bg-primary transition-all duration-700 ease-out"
              style={{
                height: `${(d.uploads / maxVal) * 100}%`,
                minHeight: d.uploads > 0 ? 4 : 0,
              }}
              title={`${d.uploads} uploads`}
            />
            <div
              className="w-3 rounded-t bg-danger transition-all duration-700 ease-out"
              style={{
                height: `${(d.deletes / maxVal) * 100}%`,
                minHeight: d.deletes > 0 ? 4 : 0,
              }}
              title={`${d.deletes} deletes`}
            />
          </div>
          <span className="text-[10px] text-gray-400">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Horizontal Bar ──────────────────────────────────────────────

function HorizontalBar({
  items,
}: {
  items: { label: string; value: number; color: string; display: string }[];
}) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">
              {item.label}
            </span>
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {item.display}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${(item.value / total) * 100}%`,
                backgroundColor: item.color,
                minWidth: item.value > 0 ? 8 : 0,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Dashboard Page ──────────────────────────────────────────────

export default function DashboardPage() {
  const { role } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch<DashboardMetrics>("/api/dashboard");
        if (res.data) setMetrics(res.data);
      } catch (error) {
        addToast(
          "error",
          error instanceof Error ? error.message : "Failed to load dashboard"
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [addToast]);

  const cards = useMemo(() => {
    if (!metrics) return [];
    return [
      {
        label: "Active Files",
        value: metrics.totalActiveFiles,
        icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
        bg: "from-primary/10 to-soft-purple/10",
        iconColor: "text-primary",
        border: "border-primary/20",
      },
      {
        label: "Folders",
        value: metrics.totalFolders,
        icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
        bg: "from-warning/10 to-amber-100/50 dark:to-amber-900/10",
        iconColor: "text-warning",
        border: "border-warning/20",
      },
      {
        label: "Uploads (30d)",
        value: metrics.uploadsLast30Days,
        icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12",
        bg: "from-success/10 to-emerald-100/50 dark:to-emerald-900/10",
        iconColor: "text-success",
        border: "border-success/20",
      },
      {
        label: "Deletes (30d)",
        value: metrics.deletesLast30Days,
        icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
        bg: "from-danger/10 to-red-100/50 dark:to-red-900/10",
        iconColor: "text-danger",
        border: "border-danger/20",
      },
      {
        label: "Admins",
        value: metrics.totalAdmins,
        icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
        bg: "from-soft-purple/10 to-violet-100/50 dark:to-violet-900/10",
        iconColor: "text-soft-purple",
        border: "border-soft-purple/20",
      },
      {
        label: "Total Users",
        value: metrics.totalUsers,
        icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
        bg: "from-cyan-500/10 to-sky-100/50 dark:to-sky-900/10",
        iconColor: "text-cyan-500",
        border: "border-cyan-500/20",
      },
    ];
  }, [metrics]);

  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return (
      <p className="text-sm text-gray-500">
        You do not have access to the dashboard.
      </p>
    );
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-xl border border-border-light bg-card-light p-4 dark:border-border-dark dark:bg-dark-card"
            >
              <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-7 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-xl border border-border-light bg-card-light dark:border-border-dark dark:bg-dark-card"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return <p className="text-sm text-gray-400">No data available.</p>;
  }

  const donutSegments = [
    { value: metrics.filesByType.images, color: "#6C63FF", label: "Images" },
    { value: metrics.filesByType.videos, color: "#F59E0B", label: "Videos" },
    { value: metrics.filesByType.documents, color: "#EF4444", label: "Documents" },
  ];

  const storageItems = [
    {
      label: "Images",
      value: metrics.storageByType.images,
      color: "#6C63FF",
      display: formatStorage(metrics.storageByType.images),
    },
    {
      label: "Videos",
      value: metrics.storageByType.videos,
      color: "#F59E0B",
      display: formatStorage(metrics.storageByType.videos),
    },
    {
      label: "Documents",
      value: metrics.storageByType.documents,
      color: "#EF4444",
      display: formatStorage(metrics.storageByType.documents),
    },
  ];

  const barData = (metrics.recentActivity ?? []).map((a) => ({
    label: new Date(a.date).toLocaleDateString("en-US", { weekday: "short" }),
    uploads: a.uploads,
    deletes: a.deletes,
  }));

  const totalStorage =
    metrics.storageByType.images +
    metrics.storageByType.videos +
    metrics.storageByType.documents;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Dashboard
      </h1>

      {/* Metric tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((card, i) => (
          <div
            key={card.label}
            className={`rounded-xl border bg-gradient-to-br ${card.bg} ${card.border} p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-md`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div
              className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/80 dark:bg-dark-card/80 ${card.iconColor}`}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={card.icon} />
              </svg>
            </div>
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              {card.label}
            </p>
            <p className="mt-0.5 text-2xl font-bold text-gray-900 dark:text-gray-100">
              <AnimatedNumber value={card.value} />
            </p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* File Type Distribution — Donut */}
        <div className="rounded-xl border border-border-light bg-card-light p-5 dark:border-border-dark dark:bg-dark-card">
          <h2 className="mb-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
            File Distribution
          </h2>
          <div className="flex items-center justify-center gap-6">
            <DonutChart segments={donutSegments} />
            <div className="space-y-2">
              {donutSegments.map((seg) => (
                <div key={seg.label} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {seg.label}
                  </span>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                    {seg.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Storage Breakdown — Horizontal Bars */}
        <div className="rounded-xl border border-border-light bg-card-light p-5 dark:border-border-dark dark:bg-dark-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Storage Usage
            </h2>
            <span className="text-xs font-medium text-gray-500">
              {formatStorage(totalStorage)}
            </span>
          </div>
          <HorizontalBar items={storageItems} />
        </div>

        {/* Activity Chart — Bar */}
        <div className="rounded-xl border border-border-light bg-card-light p-5 dark:border-border-dark dark:bg-dark-card">
          <h2 className="mb-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
            Activity (Last 7 Days)
          </h2>
          <BarChart data={barData} />
          <div className="mt-3 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-[10px] text-gray-500">Uploads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-danger" />
              <span className="text-[10px] text-gray-500">Deletes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
