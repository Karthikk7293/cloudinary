"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";
import { apiFetch } from "@/lib/api-client";
import UgcUploadModal from "@/components/UgcUploadModal";
import UgcPreviewModal from "@/components/UgcPreviewModal";
import UgcEditModal from "@/components/UgcEditModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import FileCardDropdown from "@/components/FileCardDropdown";
import type { UgcVideo } from "@/types";

const STATUS_FILTERS = ["all", "pending", "approved", "rejected"] as const;

export default function UgcPage() {
  const { access, role } = useAuthStore();
  const {
    openUgcUploadModal,
    openUgcPreview,
    addToast,
    isLoading,
    setLoading,
  } = useUIStore();

  const [videos, setVideos] = useState<UgcVideo[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confirmDelete, setConfirmDelete] = useState<UgcVideo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingVideo, setEditingVideo] = useState<UgcVideo | null>(null);

  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ videos: UgcVideo[] }>("/api/ugc/list");
      setVideos(res.data?.videos ?? []);
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "Failed to load UGC videos"
      );
    } finally {
      setLoading(false);
    }
  }, [setLoading, addToast]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const filteredVideos =
    statusFilter === "all"
      ? videos
      : videos.filter((v) => v.status === statusFilter);

  async function handleDelete(video: UgcVideo) {
    setDeleting(true);
    try {
      await apiFetch("/api/ugc/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.videoId,
          cloudinaryPublicId: video.cloudinaryPublicId,
        }),
      });
      addToast("success", "Video deleted");
      setConfirmDelete(null);
      loadVideos();
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "Delete failed"
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleFeatured(video: UgcVideo) {
    try {
      await apiFetch("/api/ugc/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.videoId,
          isFeatured: !video.isFeatured,
        }),
      });
      addToast("success", video.isFeatured ? "Unfeatured" : "Featured");
      loadVideos();
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "Update failed"
      );
    }
  }

  async function handleStatusChange(video: UgcVideo, newStatus: string) {
    try {
      await apiFetch("/api/ugc/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.videoId,
          status: newStatus,
        }),
      });
      addToast("success", `Status changed to ${newStatus}`);
      loadVideos();
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "Update failed"
      );
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          UGC Videos
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadVideos()}
            disabled={isLoading}
            className="rounded border border-border-light px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-border-dark dark:text-gray-300 dark:hover:bg-white/5"
          >
            Refresh
          </button>
          {access?.canUpload && (
            <button
              onClick={openUgcUploadModal}
              className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-soft-purple"
            >
              Upload Video
            </button>
          )}
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded px-3 py-1 text-xs font-medium capitalize ${
              statusFilter === s
                ? "bg-primary/10 text-primary"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            {s}
            {s !== "all" &&
              ` (${videos.filter((v) => v.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded border border-border-light dark:border-border-dark"
            >
              <div className="h-40 bg-gray-100 dark:bg-gray-800" />
              <div className="space-y-1.5 p-2">
                <div className="h-3 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-2.5 w-1/2 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video grid */}
      {!isLoading && filteredVideos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredVideos.map((video) => (
            <div
              key={video.videoId}
              className="group overflow-hidden rounded border border-border-light bg-card-light transition-all duration-200 hover:shadow-md dark:border-border-dark dark:bg-dark-card dark:hover:shadow-primary/10"
            >
              {/* Thumbnail */}
              <div
                className="relative flex h-40 cursor-pointer items-center justify-center bg-gray-50 dark:bg-dark-bg"
                onClick={() => openUgcPreview(video)}
              >
                {video.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl text-gray-300 dark:text-gray-600">
                    &#9654;
                  </span>
                )}

                {/* Status badge */}
                <span
                  className={`absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    video.status === "approved"
                      ? "bg-success/90 text-white"
                      : video.status === "rejected"
                        ? "bg-danger/90 text-white"
                        : "bg-warning/90 text-white"
                  }`}
                >
                  {video.status}
                </span>

                {/* Featured badge */}
                {video.isFeatured && (
                  <span className="absolute right-1.5 top-1.5 rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    Featured
                  </span>
                )}

                {/* Duration badge */}
                <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {video.duration}s
                </span>

                {/* Action dropdown */}
                <div
                  className="absolute bottom-1 left-1 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="rounded-full bg-white/90 shadow-sm dark:bg-dark-card/90">
                    <FileCardDropdown
                      options={[
                        {
                          label: "View Preview",
                          onClick: () => openUgcPreview(video),
                        },
                        {
                          label: "Edit",
                          onClick: () => setEditingVideo(video),
                          hidden: !isAdmin,
                        },
                        {
                          label: video.isFeatured ? "Unfeature" : "Feature",
                          onClick: () => handleToggleFeatured(video),
                          hidden: !isAdmin,
                        },
                        {
                          label: "Approve",
                          onClick: () =>
                            handleStatusChange(video, "approved"),
                          hidden:
                            video.status === "approved" || !isAdmin,
                        },
                        {
                          label: "Reject",
                          onClick: () =>
                            handleStatusChange(video, "rejected"),
                          hidden:
                            video.status === "rejected" || !isAdmin,
                          danger: true,
                        },
                        {
                          label: "Delete",
                          danger: true,
                          onClick: () => setConfirmDelete(video),
                          hidden: !access?.canDelete,
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-2">
                <p
                  className="truncate text-xs font-medium text-gray-700 dark:text-gray-300"
                  title={video.title}
                >
                  {video.title}
                </p>
                <p className="text-[11px] text-gray-400">
                  {video.propertyId}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredVideos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg
            className="mb-3 h-12 w-12 text-gray-200 dark:text-gray-700"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="2" y="2" width="20" height="20" rx="2" />
            <polygon
              points="10 8 16 12 10 16 10 8"
              fill="currentColor"
              stroke="none"
            />
          </svg>
          <p className="text-sm text-gray-400">No UGC videos found.</p>
        </div>
      )}

      {/* Modals */}
      <UgcUploadModal />
      <UgcPreviewModal />
      <UgcEditModal
        open={!!editingVideo}
        video={editingVideo}
        onClose={() => setEditingVideo(null)}
        onSaved={loadVideos}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete UGC Video"
        message={`Are you sure you want to delete "${confirmDelete?.title}"? The video will be moved to trash.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
