"use client";

import { useUIStore } from "@/stores/useUIStore";
import Modal from "./Modal";

export default function UgcPreviewModal() {
  const { isUgcPreviewOpen, ugcPreviewVideo, closeUgcPreview } = useUIStore();

  if (!ugcPreviewVideo) return null;

  return (
    <Modal open={isUgcPreviewOpen} onClose={closeUgcPreview} title="UGC Video Preview">
      <div className="space-y-4">
        {/* Video player */}
        <div className="flex items-center justify-center rounded bg-gray-50 dark:bg-dark-bg">
          <video
            src={ugcPreviewVideo.previewUrl}
            controls
            className="max-h-[50vh] max-w-full rounded"
          />
        </div>

        {/* Metadata */}
        <div className="space-y-2 rounded border border-border-light p-3 dark:border-border-dark">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {ugcPreviewVideo.title}
          </p>
          {ugcPreviewVideo.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {ugcPreviewVideo.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 text-xs">
            <div className="text-gray-400">Status</div>
            <div>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  ugcPreviewVideo.status === "approved"
                    ? "bg-success/10 text-success"
                    : ugcPreviewVideo.status === "rejected"
                      ? "bg-danger/10 text-danger"
                      : "bg-warning/10 text-warning"
                }`}
              >
                {ugcPreviewVideo.status}
              </span>
            </div>

            <div className="text-gray-400">Property</div>
            <div className="text-gray-700 dark:text-gray-300">
              {ugcPreviewVideo.propertyId}
            </div>

            <div className="text-gray-400">Duration</div>
            <div className="text-gray-700 dark:text-gray-300">
              {ugcPreviewVideo.duration}s
            </div>

            <div className="text-gray-400">Aspect Ratio</div>
            <div className="text-gray-700 dark:text-gray-300">
              {ugcPreviewVideo.aspectRatio}
            </div>

            <div className="text-gray-400">Featured</div>
            <div className="text-gray-700 dark:text-gray-300">
              {ugcPreviewVideo.isFeatured ? "Yes" : "No"}
            </div>

            <div className="text-gray-400">Views</div>
            <div className="text-gray-700 dark:text-gray-300">
              {ugcPreviewVideo.views}
            </div>

            <div className="text-gray-400">Likes</div>
            <div className="text-gray-700 dark:text-gray-300">
              {ugcPreviewVideo.likes}
            </div>

            <div className="text-gray-400">HLS URL</div>
            <div className="truncate text-gray-700 dark:text-gray-300" title={ugcPreviewVideo.hlsUrl}>
              <a
                href={ugcPreviewVideo.hlsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Open HLS
              </a>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
