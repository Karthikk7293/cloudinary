const ALLOWED_IMAGE_FORMATS = ["jpg", "jpeg", "png", "webp", "svg"];
const ALLOWED_VIDEO_FORMATS = ["mp4"];
const ALLOWED_RAW_FORMATS = ["pdf"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_RAW_BYTES = 20 * 1024 * 1024; // 20MB

export function getResourceType(
  mimeType: string
): "image" | "video" | "raw" | null {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "raw";
  return null;
}

export function validateFile(
  fileName: string,
  mimeType: string,
  sizeBytes: number
): { valid: boolean; error?: string; resourceType?: "image" | "video" | "raw" } {
  const resourceType = getResourceType(mimeType);
  if (!resourceType) {
    return { valid: false, error: "Unsupported file type" };
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (resourceType === "image") {
    if (!ALLOWED_IMAGE_FORMATS.includes(ext)) {
      return {
        valid: false,
        error: `Image format "${ext}" not allowed. Use: ${ALLOWED_IMAGE_FORMATS.join(", ")}`,
      };
    }
    if (sizeBytes > MAX_IMAGE_BYTES) {
      return { valid: false, error: "Image must be under 10MB" };
    }
  }

  if (resourceType === "video") {
    if (!ALLOWED_VIDEO_FORMATS.includes(ext)) {
      return {
        valid: false,
        error: `Video format "${ext}" not allowed. Use: ${ALLOWED_VIDEO_FORMATS.join(", ")}`,
      };
    }
    if (sizeBytes > MAX_VIDEO_BYTES) {
      return { valid: false, error: "Video must be under 50MB" };
    }
  }

  if (resourceType === "raw") {
    if (!ALLOWED_RAW_FORMATS.includes(ext)) {
      return {
        valid: false,
        error: `Document format "${ext}" not allowed. Use: ${ALLOWED_RAW_FORMATS.join(", ")}`,
      };
    }
    if (sizeBytes > MAX_RAW_BYTES) {
      return { valid: false, error: "Document must be under 20MB" };
    }
  }

  return { valid: true, resourceType };
}
