"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
import { useUIStore } from "@/stores/useUIStore";
import Modal from "./Modal";
import type { UgcVideo } from "@/types";

interface UgcEditModalProps {
  open: boolean;
  video: UgcVideo | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function UgcEditModal({
  open,
  video,
  onClose,
  onSaved,
}: UgcEditModalProps) {
  const addToast = useUIStore((s) => s.addToast);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (video) {
      setTitle(video.title);
      setDescription(video.description);
    }
  }, [video]);

  async function handleSave() {
    if (!video) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle.length > 100) {
      addToast("error", "Title must be 1-100 characters");
      return;
    }
    if (description.trim().length > 500) {
      addToast("error", "Description must be under 500 characters");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/api/ugc/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.videoId,
          title: trimmedTitle,
          description: description.trim(),
        }),
      });
      addToast("success", "Video updated");
      onSaved();
      onClose();
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "Update failed"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Video">
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
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
            className="w-full resize-none rounded border border-border-light px-3 py-1.5 text-sm text-gray-800 outline-none focus:border-primary dark:border-border-dark dark:bg-dark-bg dark:text-gray-200"
          />
          <p className="mt-0.5 text-right text-[10px] text-gray-400">
            {description.length}/500
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded border border-border-light px-4 py-1.5 text-xs dark:border-border-dark dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="rounded bg-primary px-4 py-1.5 text-xs font-medium text-white hover:bg-soft-purple disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
