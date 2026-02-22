"use client";

import { useState, useRef, useMemo, type DragEvent } from "react";
import { useUIStore } from "@/stores/useUIStore";
import { apiFetch } from "@/lib/api-client";
import Modal from "./Modal";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "application/pdf",
];
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;
const MAX_RAW = 20 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getFileCategory(type: string): string {
  if (type.startsWith("image/")) return "Image";
  if (type.startsWith("video/")) return "Video";
  if (type === "application/pdf") return "PDF Document";
  return "File";
}

export default function UploadModal() {
  const { isUploadModalOpen, closeUploadModal, selectedFolder, addToast } =
    useUIStore();

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    if (file.type.startsWith("image/")) return URL.createObjectURL(file);
    return null;
  }, [file]);

  function validateAndSet(f: File) {
    if (!ALLOWED_TYPES.includes(f.type)) {
      addToast("error", "File type not allowed. Use jpg, png, webp, svg, mp4, or pdf.");
      return;
    }
    const isVideo = f.type.startsWith("video/");
    const isRaw = f.type === "application/pdf";
    if (!isVideo && !isRaw && f.size > MAX_IMAGE) {
      addToast("error", "Image must be under 10 MB.");
      return;
    }
    if (isVideo && f.size > MAX_VIDEO) {
      addToast("error", "Video must be under 50 MB.");
      return;
    }
    if (isRaw && f.size > MAX_RAW) {
      addToast("error", "PDF must be under 20 MB.");
      return;
    }
    setFile(f);
    setConfirmed(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSet(dropped);
  }

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", selectedFolder);

      await apiFetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      addToast("success", "File uploaded successfully");
      handleClose();
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "Upload failed"
      );
    } finally {
      setUploading(false);
    }
  }

  function handleClose() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setConfirmed(false);
    setUploading(false);
    setDragOver(false);
    closeUploadModal();
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setConfirmed(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  const ext = file?.name.split(".").pop()?.toUpperCase() ?? "";
  const lastModified = file
    ? new Date(file.lastModified).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <Modal open={isUploadModalOpen} onClose={handleClose} title="Upload File">
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Folder: <span className="font-medium">{selectedFolder || "root"}</span>
        </p>

        {/* Drop zone — shown when no file selected */}
        {!file && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded border-2 border-dashed p-10 text-center transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border-light dark:border-border-dark"
            }`}
          >
            <svg
              className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm text-gray-400">
              Drop a file here or click to select
            </p>
            <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">
              JPG, PNG, WEBP, SVG, MP4, PDF
            </p>
          </div>
        )}

        {/* File preview — shown when file selected */}
        {file && (
          <div className="overflow-hidden rounded border border-border-light dark:border-border-dark">
            {/* Preview area */}
            <div className="flex h-40 items-center justify-center bg-gray-50 dark:bg-dark-bg">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="h-full max-w-full object-contain"
                />
              ) : file.type.startsWith("video/") ? (
                <div className="flex flex-col items-center gap-1">
                  <svg
                    className="h-12 w-12 text-gray-300 dark:text-gray-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="2" />
                    <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
                  </svg>
                  <span className="text-xs text-gray-400">Video</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <svg
                    className="h-12 w-12 text-red-300"
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
                  <span className="text-xs text-gray-400">PDF Document</span>
                </div>
              )}
            </div>

            {/* File details */}
            <div className="space-y-1.5 p-3">
              <div className="flex items-start justify-between gap-2">
                <p
                  className="truncate text-sm font-medium text-gray-800 dark:text-gray-200"
                  title={file.name}
                >
                  {file.name}
                </p>
                <button
                  onClick={clearFile}
                  className="flex-shrink-0 text-xs text-gray-400 hover:text-danger"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="text-gray-400">Type</div>
                <div className="text-gray-700 dark:text-gray-300">
                  {getFileCategory(file.type)}
                </div>

                <div className="text-gray-400">Format</div>
                <div className="text-gray-700 dark:text-gray-300">{ext}</div>

                <div className="text-gray-400">Size</div>
                <div className="text-gray-700 dark:text-gray-300">
                  {formatSize(file.size)}
                </div>

                {file.type.startsWith("image/") && (
                  <>
                    <div className="text-gray-400">MIME</div>
                    <div className="text-gray-700 dark:text-gray-300">
                      {file.type}
                    </div>
                  </>
                )}

                <div className="text-gray-400">Modified</div>
                <div className="text-gray-700 dark:text-gray-300">
                  {lastModified}
                </div>
              </div>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.svg,.mp4,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) validateAndSet(f);
          }}
        />

        {/* Confirmation + Upload */}
        {file && !confirmed && (
          <button
            onClick={() => setConfirmed(true)}
            className="w-full rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-soft-purple"
          >
            Confirm Upload
          </button>
        )}

        {file && confirmed && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full rounded bg-success px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload Now"}
          </button>
        )}
      </div>
    </Modal>
  );
}
