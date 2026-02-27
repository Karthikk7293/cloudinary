import { authenticateRequest, isAuthError } from "@/lib/auth-guard";
import { hasPermission } from "@/lib/permissions";
import { buildHlsUrl, buildThumbnailUrl } from "@/lib/cloudinary";
import { adminDb } from "@/lib/firebase-admin";
import { logActivity } from "@/lib/activity";
import { errorResponse, successResponse } from "@/lib/errors";

const MAX_DURATION_SECONDS = 60;

export async function POST(request: Request) {
  try {
    // 1. Authenticate
    const authResult = await authenticateRequest();
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    // 2. Authorize
    if (!hasPermission(user, "ugcUpload")) {
      return errorResponse("You do not have upload permission", 403);
    }

    // 3. Parse JSON body
    const body = await request.json();
    const {
      public_id,
      secure_url,
      duration,
      title,
      description,
      propertyId,
      isFeatured,
    } = body;

    // 4. Validate Cloudinary fields
    if (!public_id || typeof public_id !== "string") {
      return errorResponse("Missing or invalid public_id", 400);
    }
    if (!secure_url || typeof secure_url !== "string") {
      return errorResponse("Missing or invalid secure_url", 400);
    }
    if (typeof duration !== "number" || duration < 0) {
      return errorResponse("Missing or invalid duration", 400);
    }

    // 5. Security: verify upload went to the expected folder
    if (!public_id.startsWith("ugc_videos/")) {
      return errorResponse("Invalid upload location", 403);
    }

    // 6. Validate metadata
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return errorResponse("Title is required", 400);
    }
    if (title.trim().length > 100) {
      return errorResponse("Title must be under 100 characters", 400);
    }
    if (
      description &&
      typeof description === "string" &&
      description.trim().length > 500
    ) {
      return errorResponse("Description must be under 500 characters", 400);
    }
    if (!propertyId || typeof propertyId !== "string") {
      return errorResponse("Property is required", 400);
    }

    // 7. Validate propertyId exists
    const propertyDoc = await adminDb
      .collection("properties")
      .doc(propertyId.trim())
      .get();
    if (!propertyDoc.exists) {
      return errorResponse("Invalid property selected", 400);
    }

    // 8. Server-side duration check
    const roundedDuration = Math.ceil(duration);
    if (roundedDuration > MAX_DURATION_SECONDS) {
      return errorResponse(
        `Video is ${roundedDuration}s. Maximum allowed is ${MAX_DURATION_SECONDS}s.`,
        400
      );
    }

    // 9. Construct URLs
    const hlsUrl = buildHlsUrl(public_id);
    const thumbnailUrl = buildThumbnailUrl(public_id);

    // 10. Save metadata to Firestore
    const videoId = public_id.replace(/\//g, "__");
    const videoDoc = {
      videoId,
      propertyId: propertyId.trim(),
      uploaderId: user.uid,
      title: title.trim(),
      description: (description ?? "").trim(),
      cloudinaryPublicId: public_id,
      thumbnailUrl,
      previewUrl: secure_url,
      hlsUrl,
      duration: roundedDuration,
      aspectRatio: "9:16",
      likes: 0,
      views: 0,
      status: "pending" as const,
      createdAt: Date.now(),
      isFeatured: isFeatured === true,
    };

    await adminDb.collection("ugc_videos").doc(videoId).set(videoDoc);

    // 11. Log activity
    await logActivity("UGC_UPLOAD", user.uid, public_id);

    return successResponse(videoDoc, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to confirm UGC upload";
    return errorResponse(message, 500);
  }
}
