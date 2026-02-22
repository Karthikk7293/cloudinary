"use client";

import { useUIStore } from "@/stores/useUIStore";
import Modal from "./Modal";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function CopyField({ value, label }: { value: string; label: string }) {
  const { addToast } = useUIStore();

  function handleCopy() {
    navigator.clipboard.writeText(value).then(
      () => addToast("success", `${label} copied`),
      () => addToast("error", "Failed to copy")
    );
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span
        className="truncate text-gray-700 dark:text-gray-300"
        title={value}
      >
        {value}
      </span>
      <button
        onClick={handleCopy}
        title={`Copy ${label}`}
        className="flex-shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:text-primary"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>
    </div>
  );
}

export default function PreviewModal() {
  const {
    isPreviewModalOpen,
    previewUrl,
    previewType,
    previewFile,
    closePreview,
  } = useUIStore();

  const fileName = previewFile?.public_id.split("/").pop() ?? "";
  const typeLabel =
    previewType === "image"
      ? "Image"
      : previewType === "video"
        ? "Video"
        : "Document";

  return (
    <Modal open={isPreviewModalOpen} onClose={closePreview} title="Preview">
      <div className="space-y-4">
        {/* Preview area */}
        <div className="flex items-center justify-center rounded bg-gray-50 dark:bg-dark-bg">
          {previewType === "image" && previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-[50vh] max-w-full rounded object-contain"
            />
          )}
          {previewType === "video" && previewUrl && (
            <video
              src={previewUrl}
              controls
              className="max-h-[50vh] max-w-full rounded"
            />
          )}
          {previewType === "raw" && previewUrl && (
            <div className="flex flex-col items-center gap-3 py-8">
              <svg
                className="h-14 w-14 text-red-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Open in new tab
              </a>
            </div>
          )}
        </div>

        {/* Metadata details */}
        {previewFile && (
          <div className="space-y-2 rounded border border-border-light p-3 dark:border-border-dark">
            <p
              className="truncate text-sm font-medium text-gray-800 dark:text-gray-200"
              title={fileName}
            >
              {fileName}
            </p>

            <div className="space-y-1.5 text-xs">
              {/* Public URL — copyable */}
              <div className="flex items-center justify-between gap-2">
                <span className="flex-shrink-0 text-gray-400">Public URL</span>
                <CopyField value={previewFile.secure_url} label="Public URL" />
              </div>

              {/* Signed URL — copyable */}
              <div className="flex items-center justify-between gap-2">
                <span className="flex-shrink-0 text-gray-400">Signed URL</span>
                <CopyField
                  value={previewFile.secure_url}
                  label="Signed URL"
                />
              </div>

              {/* Type */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-400">Type</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {typeLabel}
                </span>
              </div>

              {/* Format */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-400">Format</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {previewFile.format.toUpperCase()}
                </span>
              </div>

              {/* Size */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-400">Size</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {formatSize(previewFile.bytes)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
