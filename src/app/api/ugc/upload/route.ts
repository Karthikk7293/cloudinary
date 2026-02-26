import { NextRequest } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth-guard";
import { hasPermission } from "@/lib/permissions";
import {
  uploadUgcVideo,
  buildHlsUrl,
  buildThumbnailUrl,
  softDeleteInCloudinary,
} from "@/lib/cloudinary";
import { adminDb } from "@/lib/firebase-admin";
import { logActivity } from "@/lib/activity";
import { validateUgcVideo, sanitizeUgcFields } from "@/lib/validation";
import { errorResponse, successResponse } from "@/lib/errors";

const MAX_DURATION_SECONDS = 60;

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const authResult = await authenticateRequest();
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    // 2. Authorize
    if (!hasPermission(user, "ugcUpload")) {
      return errorResponse("You do not have upload permission", 403);
    }

    // 3. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const propertyId = formData.get("propertyId") as string;
    const isFeatured = formData.get("isFeatured") === "true";

    if (!file) {
      return errorResponse("No file provided", 400);
    }

    // 4. Validate file
    const fileValidation = validateUgcVideo(file.name, file.type, file.size);
    if (!fileValidation.valid) {
      return errorResponse(fileValidation.error ?? "Invalid file", 400);
    }

    // 5. Sanitize fields
    const sanitized = sanitizeUgcFields({
      title,
      description,
      propertyId,
      isFeatured,
    });
    if (sanitized.errors.length > 0) {
      return errorResponse(sanitized.errors.join(", "), 400);
    }

    // 6. Validate propertyId exists in Firestore
    const propertyDoc = await adminDb
      .collection("properties")
      .doc(sanitized.propertyId)
      .get();
    if (!propertyDoc.exists) {
      return errorResponse("Invalid property selected", 400);
    }

    // 7. Upload to Cloudinary with HLS eager transform
    const buffer = Buffer.from(await file.arrayBuffer());
    const cloudResult = await uploadUgcVideo(buffer, "ugc_videos");

    // 8. Server-side duration check
    if (cloudResult.duration > MAX_DURATION_SECONDS) {
      // Clean up the uploaded video
      await softDeleteInCloudinary(
        cloudResult.public_id,
        "video",
        "ugc_videos"
      );
      return errorResponse(
        `Video is ${Math.ceil(cloudResult.duration)}s. Maximum allowed is ${MAX_DURATION_SECONDS}s.`,
        400
      );
    }

    // 9. Construct URLs
    const hlsUrl = buildHlsUrl(cloudResult.public_id);
    const thumbnailUrl = buildThumbnailUrl(cloudResult.public_id);

    // 10. Save metadata to Firestore
    const videoId = cloudResult.public_id.replace(/\//g, "__");
    const videoDoc = {
      videoId,
      propertyId: sanitized.propertyId,
      uploaderId: user.uid,
      title: sanitized.title,
      description: sanitized.description,
      cloudinaryPublicId: cloudResult.public_id,
      thumbnailUrl,
      previewUrl: cloudResult.secure_url,
      hlsUrl,
      duration: Math.ceil(cloudResult.duration),
      aspectRatio: "9:16",
      likes: 0,
      views: 0,
      status: "pending" as const,
      createdAt: Date.now(),
      isFeatured: sanitized.isFeatured,
    };

    await adminDb.collection("ugc_videos").doc(videoId).set(videoDoc);

    // 11. Log activity
    await logActivity("UGC_UPLOAD", user.uid, cloudResult.public_id);

    return successResponse(videoDoc, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "UGC upload failed";
    return errorResponse(message, 500);
  }
}
