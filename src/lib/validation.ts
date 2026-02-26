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

// ─── UGC Validation ──────────────────────────────────────────────

const MAX_UGC_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

export const VALID_UGC_STATUSES = ["pending", "approved", "rejected"] as const;

export function validateUgcVideo(
  fileName: string,
  mimeType: string,
  sizeBytes: number
): { valid: boolean; error?: string } {
  if (!mimeType.startsWith("video/")) {
    return { valid: false, error: "Only video files are allowed" };
  }
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext !== "mp4") {
    return { valid: false, error: "Only MP4 format is allowed" };
  }
  if (sizeBytes > MAX_UGC_VIDEO_BYTES) {
    return { valid: false, error: "Video must be under 50MB" };
  }
  return { valid: true };
}

export function sanitizeUgcFields(data: {
  title?: string;
  description?: string;
  propertyId?: string;
  isFeatured?: boolean;
}): {
  title: string;
  description: string;
  propertyId: string;
  isFeatured: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const title = (data.title ?? "").trim();
  const description = (data.description ?? "").trim();
  const propertyId = (data.propertyId ?? "").trim();
  const isFeatured = data.isFeatured === true;

  if (!title) errors.push("Title is required");
  if (title.length > MAX_TITLE_LENGTH)
    errors.push(`Title must be under ${MAX_TITLE_LENGTH} characters`);
  if (description.length > MAX_DESCRIPTION_LENGTH)
    errors.push(`Description must be under ${MAX_DESCRIPTION_LENGTH} characters`);
  if (!propertyId) errors.push("Property is required");

  return { title, description, propertyId, isFeatured, errors };
}
