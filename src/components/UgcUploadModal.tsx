"use client";

import { useState, useRef, useEffect, type DragEvent } from "react";
import { useUIStore } from "@/stores/useUIStore";
import { apiFetch } from "@/lib/api-client";
import Modal from "./Modal";
import type { Property } from "@/types";

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const MAX_DURATION_SECONDS = 60;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function UgcUploadModal() {
  const { isUgcUploadModalOpen, closeUgcUploadModal, addToast } = useUIStore();

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);

  // UI state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load properties when modal opens
  useEffect(() => {
    if (isUgcUploadModalOpen) {
      apiFetch<{ properties: Property[] }>("/api/ugc/properties")
        .then((res) => setProperties(res.data?.properties ?? []))
        .catch(() => addToast("error", "Failed to load properties"));
    }
  }, [isUgcUploadModalOpen, addToast]);

  function validateAndSet(f: File) {
    if (!f.type.startsWith("video/") || !f.name.toLowerCase().endsWith(".mp4")) {
      addToast("error", "Only MP4 videos are allowed");
      return;
    }
    if (f.size > MAX_VIDEO_BYTES) {
      addToast("error", "Video must be under 500 MB");
      return;
    }

    // Check duration via video element
    const videoEl = document.createElement("video");
    videoEl.preload = "metadata";
    videoEl.onloadedmetadata = () => {
      URL.revokeObjectURL(videoEl.src);
      const dur = Math.ceil(videoEl.duration);
      setDuration(dur);
      if (dur > MAX_DURATION_SECONDS) {
        setDurationError(
          `Video is ${dur}s. Maximum allowed is ${MAX_DURATION_SECONDS}s.`
        );
      } else {
        setDurationError(null);
      }
    };
    videoEl.src = URL.createObjectURL(f);

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
    if (!file || durationError) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Get Cloudinary signature from our server
      const signRes = await apiFetch<{
        signature: string;
        timestamp: number;
        folder: string;
        eager: string;
        eager_async: string;
        api_key: string;
        cloud_name: string;
      }>("/api/ugc/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          propertyId,
          isFeatured,
        }),
      });

      const signData = signRes.data!;

      // Step 2: Upload directly to Cloudinary (bypasses Next.js body limit)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signData.api_key);
      formData.append("timestamp", String(signData.timestamp));
      formData.append("signature", signData.signature);
      formData.append("folder", signData.folder);
      formData.append("resource_type", "video");
      formData.append("eager", signData.eager);
      formData.append("eager_async", signData.eager_async);

      const cloudinaryResult = await new Promise<{
        public_id: string;
        secure_url: string;
        duration: number;
      }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          "POST",
          `https://api.cloudinary.com/v1_1/${signData.cloud_name}/video/upload`
        );

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error("Cloudinary upload failed"));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(formData);
      });

      // Step 3: Confirm upload and save metadata on our server
      await apiFetch("/api/ugc/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_id: cloudinaryResult.public_id,
          secure_url: cloudinaryResult.secure_url,
          duration: cloudinaryResult.duration,
          title: title.trim(),
          description: description.trim(),
          propertyId,
          isFeatured,
        }),
      });

      addToast("success", "UGC video uploaded successfully");
      handleClose();
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "Upload failed"
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  function handleClose() {
    setFile(null);
    setTitle("");
    setDescription("");
    setPropertyId("");
    setIsFeatured(false);
    setDuration(null);
    setDurationError(null);
    setConfirmed(false);
    setUploading(false);
    setUploadProgress(0);
    setDragOver(false);
    closeUgcUploadModal();
  }

  function clearFile() {
    setFile(null);
    setDuration(null);
    setDurationError(null);
    setConfirmed(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  const canConfirm =
    file &&
    !durationError &&
    title.trim().length > 0 &&
    title.trim().length <= 100 &&
    description.trim().length <= 500 &&
    propertyId;

  return (
    <Modal
      open={isUgcUploadModalOpen}
      onClose={handleClose}
      title="Upload UGC Video"
    >
      <div className="space-y-4">
        {/* Drop zone */}
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
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <polygon
                points="10 8 16 12 10 16 10 8"
                fill="currentColor"
                stroke="none"
              />
            </svg>
            <p className="text-sm text-gray-400">
              Drop an MP4 video here or click to select
            </p>
            <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">
              MP4 only &middot; Max 500 MB &middot; Max 60 seconds
            </p>
          </div>
        )}

        {/* File preview */}
        {file && (
          <div className="overflow-hidden rounded border border-border-light dark:border-border-dark">
            <div className="flex h-28 items-center justify-center bg-gray-50 dark:bg-dark-bg">
              <div className="flex flex-col items-center gap-1">
                <svg
                  className="h-12 w-12 text-gray-300 dark:text-gray-600"
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
                <span className="text-xs text-gray-400">Video</span>
              </div>
            </div>

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
                <div className="text-gray-400">Size</div>
                <div className="text-gray-700 dark:text-gray-300">
                  {formatSize(file.size)}
                </div>
                <div className="text-gray-400">Duration</div>
                <div
                  className={
                    durationError
                      ? "text-danger"
                      : "text-gray-700 dark:text-gray-300"
                  }
                >
                  {duration !== null ? `${duration}s` : "Checking..."}
                </div>
              </div>

              {durationError && (
                <p className="text-xs text-danger">{durationError}</p>
              )}
            </div>
          </div>
        )}

        {/* Form fields */}
        {file && (
          <div className="space-y-3">
            {/* Title */}
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                Title <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="Video title"
                className="w-full rounded border border-border-light px-3 py-1.5 text-sm text-gray-800 outline-none focus:border-primary dark:border-border-dark dark:bg-dark-bg dark:text-gray-200"
              />
              <p className="mt-0.5 text-right text-[10px] text-gray-400">
                {title.length}/100
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Brief description (optional)"
                className="w-full resize-none rounded border border-border-light px-3 py-1.5 text-sm text-gray-800 outline-none focus:border-primary dark:border-border-dark dark:bg-dark-bg dark:text-gray-200"
              />
              <p className="mt-0.5 text-right text-[10px] text-gray-400">
                {description.length}/500
              </p>
            </div>

            {/* Property */}
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                Property <span className="text-danger">*</span>
              </label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full rounded border border-border-light px-3 py-1.5 text-sm text-gray-800 outline-none focus:border-primary dark:border-border-dark dark:bg-dark-bg dark:text-gray-200"
              >
                <option value="">Select a property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Featured */}
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary accent-primary"
              />
              Featured (Home special video)
            </label>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".mp4"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) validateAndSet(f);
          }}
        />

        {/* Confirm */}
        {file && !confirmed && (
          <button
            onClick={() => setConfirmed(true)}
            disabled={!canConfirm}
            className="w-full rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-soft-purple disabled:opacity-50"
          >
            Confirm Upload
          </button>
        )}

        {/* Upload */}
        {file && confirmed && (
          <>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full rounded bg-success px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {uploading
                ? uploadProgress > 0
                  ? `Uploading... ${uploadProgress}%`
                  : "Preparing..."
                : "Upload Now"}
            </button>
            {uploading && uploadProgress > 0 && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
