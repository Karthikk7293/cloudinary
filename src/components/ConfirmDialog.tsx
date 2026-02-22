"use client";

import Modal from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        {message}
      </p>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={loading}
          className="rounded border border-border-light px-4 py-1.5 text-xs dark:border-border-dark dark:text-gray-300"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`rounded px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50 ${
            danger
              ? "bg-danger hover:bg-danger/90"
              : "bg-primary hover:bg-soft-purple"
          }`}
        >
          {loading ? "Please wait..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
