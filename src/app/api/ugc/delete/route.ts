import { NextRequest } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth-guard";
import { hasPermission } from "@/lib/permissions";
import { softDeleteInCloudinary } from "@/lib/cloudinary";
import { adminDb } from "@/lib/firebase-admin";
import { logActivity } from "@/lib/activity";
import { errorResponse, successResponse } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest();
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    if (!hasPermission(user, "ugcDelete")) {
      return errorResponse("You do not have delete permission", 403);
    }

    const { videoId, cloudinaryPublicId } = await request.json();

    if (!videoId || !cloudinaryPublicId) {
      return errorResponse("Missing videoId or cloudinaryPublicId", 400);
    }

    // Verify document exists
    const docRef = adminDb.collection("ugc_videos").doc(videoId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return errorResponse("Video not found", 404);
    }

    // Soft delete in Cloudinary (move to _trash)
    await softDeleteInCloudinary(cloudinaryPublicId, "video", "ugc_videos");

    // Delete Firestore document
    await docRef.delete();

    // Log activity
    await logActivity("UGC_DELETE", user.uid, videoId);

    return successResponse({ deleted: true, videoId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete UGC video";
    return errorResponse(message, 500);
  }
}
