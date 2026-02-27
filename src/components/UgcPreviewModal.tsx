"use client";

import { useRef, useEffect, useState } from "react";
import { useUIStore } from "@/stores/useUIStore";
import Modal from "./Modal";

const PREVIEW_DURATION = 5; // seconds

export default function UgcPreviewModal() {
  const { isUgcPreviewOpen, ugcPreviewVideo, closeUgcPreview } = useUIStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showFullVideo, setShowFullVideo] = useState(false);

  // Reset to preview mode when a new video opens
  useEffect(() => {
    setShowFullVideo(false);
  }, [ugcPreviewVideo?.videoId]);

  // Enforce 5s limit in preview mode
  useEffect(() => {
    const video = videoRef.current;
    if (!video || showFullVideo) return;

    function handleTimeUpdate() {
      if (video && video.currentTime >= PREVIEW_DURATION) {
        video.pause();
        video.currentTime = PREVIEW_DURATION;
      }
    }

    function handlePlay() {
      if (video && video.currentTime >= PREVIEW_DURATION) {
        video.currentTime = 0;
      }
    }

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
    };
  }, [showFullVideo, ugcPreviewVideo?.videoId]);

  if (!ugcPreviewVideo) return null;

  return (
    <Modal open={isUgcPreviewOpen} onClose={closeUgcPreview} title="UGC Video Preview">
      <div className="space-y-4">
        {/* Video player */}
        <div className="relative flex items-center justify-center rounded bg-gray-50 dark:bg-dark-bg">
          <video
            ref={videoRef}
            key={`${ugcPreviewVideo.videoId}-${showFullVideo}`}
            src={ugcPreviewVideo.previewUrl}
            controls
            className="max-h-[50vh] max-w-full rounded"
          />
          {!showFullVideo && (
            <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
              Preview (5s)
            </span>
          )}
        </div>

        {/* Toggle preview / full */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFullVideo(false)}
            className={`rounded px-3 py-1 text-xs font-medium ${
              !showFullVideo
                ? "bg-primary/10 text-primary"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            Preview (5s)
          </button>
          <button
            onClick={() => setShowFullVideo(true)}
            className={`rounded px-3 py-1 text-xs font-medium ${
              showFullVideo
                ? "bg-primary/10 text-primary"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            Full Video ({ugcPreviewVideo.duration}s)
          </button>
        </div>

        {/* Thumbnail */}
        {ugcPreviewVideo.thumbnailUrl && (
          <div>
            <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              Thumbnail
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ugcPreviewVideo.thumbnailUrl}
              alt={ugcPreviewVideo.title}
              className="h-24 rounded border border-border-light object-cover dark:border-border-dark"
            />
          </div>
        )}

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
