"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";
import { apiFetch } from "@/lib/api-client";
import Breadcrumbs from "@/components/Breadcrumbs";
import UploadModal from "@/components/UploadModal";
import PreviewModal from "@/components/PreviewModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import FileCardDropdown from "@/components/FileCardDropdown";
import type { MediaFile, CloudinaryFolder } from "@/types";

export default function MediaPage() {
  const { access } = useAuthStore();
  const {
    selectedFolder,
    setSelectedFolder,
    setBreadcrumbs,
    openUploadModal,
    openPreview,
    addToast,
    isLoading,
    setLoading,
  } = useUIStore();

  const [folders, setFolders] = useState<CloudinaryFolder[]>([]);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [folderSearch, setFolderSearch] = useState("");

  // Confirmation dialog state
  const [confirmDelete, setConfirmDelete] = useState<MediaFile | null>(null);
  const [confirmCreateFolder, setConfirmCreateFolder] = useState(false);

  const loadContent = useCallback(
    async (folder: string) => {
      setLoading(true);
      try {
        const [foldersRes, filesRes] = await Promise.all([
          apiFetch<{ folders: CloudinaryFolder[] }>(
            `/api/folders/list${folder ? `?prefix=${encodeURIComponent(folder)}` : ""}`
          ),
          apiFetch<{ files: MediaFile[] }>(
            `/api/media/list?folder=${encodeURIComponent(folder)}`
          ),
        ]);

        setFolders(foldersRes.data?.folders ?? []);
        setFiles(filesRes.data?.files ?? []);
      } catch (error) {
        addToast(
          "error",
          error instanceof Error ? error.message : "Failed to load content"
        );
      } finally {
        setLoading(false);
      }
    },
    [setLoading, addToast]
  );

  useEffect(() => {
    loadContent(selectedFolder);
  }, [selectedFolder, loadContent]);

  function navigateToFolder(folder: string) {
    setSelectedFolder(folder);
    setBreadcrumbs(folder ? folder.split("/") : []);
  }

  function handleFolderClick(folderPath: string) {
    navigateToFolder(folderPath);
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const path = selectedFolder
        ? `${selectedFolder}/${newFolderName.trim()}`
        : newFolderName.trim();

      await apiFetch("/api/folders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });

      addToast("success", "Folder created");
      setNewFolderName("");
      setConfirmCreateFolder(false);
      loadContent(selectedFolder);
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "Failed to create folder"
      );
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleDelete(file: MediaFile) {
    setDeletingId(file.public_id);
    try {
      await apiFetch("/api/media/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId: file.public_id,
          resourceType: file.resource_type,
          folder: file.folder,
        }),
      });

      addToast("success", "File moved to trash");
      setFiles((prev) =>
        prev.filter((f) => f.public_id !== file.public_id)
      );
      setConfirmDelete(null);
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "Delete failed"
      );
    } finally {
      setDeletingId(null);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(
      () => addToast("success", `${label} copied to clipboard`),
      () => addToast("error", "Failed to copy")
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Media
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadContent(selectedFolder)}
            disabled={isLoading}
            className="rounded border border-border-light px-3 py-1.5 text-xs dark:border-border-dark dark:text-gray-300"
          >
            Refresh
          </button>
          {access?.canUpload && (
            <button
              onClick={openUploadModal}
              className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-soft-purple"
            >
              Upload
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumbs */}
      <Breadcrumbs onNavigate={navigateToFolder} />

      {/* Search + Create Folder row */}
      <div className="flex items-center justify-between gap-2">
        {/* Search folders */}
        <div className="relative w-64">
          <svg
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search folders..."
            value={folderSearch}
            onChange={(e) => setFolderSearch(e.target.value)}
            className="w-full rounded border border-border-light bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary dark:border-border-dark dark:bg-dark-bg dark:text-gray-100"
          />
          {folderSearch && (
            <button
              onClick={() => setFolderSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              &times;
            </button>
          )}
        </div>

        {/* Create folder */}
        {access?.canCreateFolder && (
          <div className="flex flex-shrink-0 items-center gap-2">
            <input
              type="text"
              placeholder="New folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newFolderName.trim())
                  setConfirmCreateFolder(true);
              }}
              className="w-40 rounded border border-border-light bg-white px-3 py-1.5 text-sm outline-none focus:border-primary dark:border-border-dark dark:bg-dark-bg dark:text-gray-100"
            />
            <button
              onClick={() => setConfirmCreateFolder(true)}
              disabled={creatingFolder || !newFolderName.trim()}
              className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-soft-purple disabled:opacity-50"
            >
              Create
            </button>
          </div>
        )}
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-4">
          {/* Folder Skeletons */}
          <div>
            <div className="mb-2 h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`fs-${i}`}
                  className="overflow-hidden rounded border border-border-light bg-card-light dark:border-border-dark dark:bg-dark-card"
                >
                  {/* Folder icon area skeleton */}
                  <div className="flex h-20 items-center justify-center bg-gray-50 dark:bg-dark-bg">
                    <svg
                      className="h-10 w-12 animate-pulse text-gray-200 dark:text-gray-700"
                      viewBox="0 0 24 20"
                      fill="currentColor"
                    >
                      <path d="M1 4a2 2 0 0 1 2-2h5.5l2 2H21a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V4z" />
                      <path d="M1 6h22v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6z" opacity="0.85" />
                    </svg>
                  </div>
                  {/* Folder name skeleton */}
                  <div className="flex justify-center p-2">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* File Skeletons */}
          <div>
            <div className="mb-2 h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={`fls-${i}`}
                  className="overflow-hidden rounded border border-border-light bg-card-light dark:border-border-dark dark:bg-dark-card"
                >
                  {/* Thumbnail skeleton */}
                  <div className="flex h-32 items-center justify-center bg-gray-50 dark:bg-dark-bg">
                    <svg
                      className="h-10 w-10 animate-pulse text-gray-200 dark:text-gray-700"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                    </svg>
                  </div>
                  {/* Info skeleton */}
                  <div className="space-y-2 p-2">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Folders */}
      {!isLoading && folders.length > 0 && (() => {
        const filtered = folderSearch.trim()
          ? folders.filter((f) =>
            f.name.toLowerCase().includes(folderSearch.trim().toLowerCase())
          )
          : folders;

        return (
          <div>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Folders{folderSearch.trim() ? ` (${filtered.length} of ${folders.length})` : ""}
            </h2>
            {filtered.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {filtered.map((folder) => (
                  <button
                    key={folder.path}
                    onClick={() => handleFolderClick(folder.path)}
                    className="group overflow-hidden rounded border border-border-light bg-card-light transition-all duration-200 hover:scale-[1.03] hover:border-primary hover:shadow-md dark:border-border-dark dark:bg-dark-card dark:hover:shadow-primary/10"
                  >
                    {/* Folder icon area */}
                    <div className="flex h-20 items-center justify-center bg-gray-50 dark:bg-dark-bg">
                      <svg
                        className="h-10 w-12 text-amber-400 drop-shadow transition-transform duration-200 group-hover:scale-110"
                        viewBox="0 0 24 20"
                        fill="currentColor"
                      >
                        <path d="M1 4a2 2 0 0 1 2-2h5.5l2 2H21a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V4z" />
                        <path d="M1 6h22v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6z" opacity="0.85" />
                      </svg>
                    </div>
                    {/* Folder name */}
                    <div className="p-2">
                      <p className="truncate text-center text-xs font-medium text-gray-700 dark:text-gray-300">
                        {folder.name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                No folders matching &ldquo;{folderSearch.trim()}&rdquo;
              </p>
            )}
          </div>
        );
      })()}

      {/* Files */}
      {!isLoading && files.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Files ({files.length})
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {files.map((file) => (
              <div
                key={file.public_id}
                className="group overflow-hidden rounded border border-border-light bg-card-light transition-all duration-200 hover:shadow-md dark:border-border-dark dark:bg-dark-card dark:hover:shadow-primary/10"
              >
                {/* Thumbnail — click opens preview */}
                <div
                  className="relative flex h-32 cursor-pointer items-center justify-center bg-gray-50 dark:bg-dark-bg"
                  onClick={() =>
                    openPreview({
                      public_id: file.public_id,
                      secure_url: file.secure_url,
                      format: file.format,
                      bytes: file.bytes,
                      resource_type: file.resource_type,
                    })
                  }
                >
                  {file.resource_type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={file.secure_url}
                      alt={file.public_id}
                      className="h-full w-full object-cover"
                    />
                  ) : file.resource_type === "video" ? (
                    <span className="text-2xl text-gray-400">&#9654;</span>
                  ) : (
                    <svg
                      className="h-10 w-10 text-red-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <text
                        x="12"
                        y="16"
                        textAnchor="middle"
                        fontSize="5"
                        fill="currentColor"
                        stroke="none"
                        fontWeight="bold"
                      >
                        PDF
                      </text>
                    </svg>
                  )}

                  {/* Action buttons overlay — top right */}
                  <div
                    className="absolute right-1 top-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Signed URL button */}
                    <button
                      onClick={() =>
                        copyToClipboard(file.secure_url, "Signed URL")
                      }
                      title="Copy signed URL"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm transition-colors hover:bg-white hover:text-primary dark:bg-dark-card/90 dark:text-gray-300 dark:hover:text-primary"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                    </button>

                    {/* 3-dot dropdown */}
                    <div className="rounded-full bg-white/90 shadow-sm dark:bg-dark-card/90">
                      <FileCardDropdown
                        options={[
                          {
                            label: "Copy Signed URL",
                            onClick: () =>
                              copyToClipboard(file.secure_url, "Signed URL"),
                          },
                          {
                            label: "Copy Public URL",
                            onClick: () =>
                              copyToClipboard(file.secure_url, "Public URL"),
                          },
                          {
                            label: "View File",
                            onClick: () =>
                              openPreview({
                                public_id: file.public_id,
                                secure_url: file.secure_url,
                                format: file.format,
                                bytes: file.bytes,
                                resource_type: file.resource_type,
                              }),
                          },
                          {
                            label: "Delete File",
                            danger: true,
                            hidden: !access?.canDelete,
                            onClick: () => setConfirmDelete(file),
                          },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-2">
                  <p
                    className="truncate text-xs text-gray-700 dark:text-gray-300"
                    title={file.public_id}
                  >
                    {file.public_id.split("/").pop()}
                  </p>
                  <p className="text-xs text-gray-400">
                    {file.format.toUpperCase()} &middot;{" "}
                    {(file.bytes / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && folders.length === 0 && files.length === 0 && (
        <p className="text-sm text-gray-400">
          No folders or files in this location.
        </p>
      )}

      <UploadModal />
      <PreviewModal />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete File"
        message={`Are you sure you want to delete "${confirmDelete?.public_id.split("/").pop()}"? The file will be moved to trash.`}
        confirmLabel="Delete"
        danger
        loading={!!deletingId}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Create Folder Confirmation */}
      <ConfirmDialog
        open={confirmCreateFolder}
        title="Create Folder"
        message={`Create folder "${newFolderName.trim()}"${selectedFolder ? ` inside "${selectedFolder}"` : " at root level"}?`}
        confirmLabel="Create"
        loading={creatingFolder}
        onConfirm={handleCreateFolder}
        onCancel={() => setConfirmCreateFolder(false)}
      />
    </div>
  );
}
