import { NextRequest } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth-guard";
import { hasPermission } from "@/lib/permissions";
import { adminDb } from "@/lib/firebase-admin";
import { logActivity } from "@/lib/activity";
import { errorResponse, successResponse } from "@/lib/errors";
import { VALID_UGC_STATUSES } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest();
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    if (!hasPermission(user, "ugcUpdate")) {
      return errorResponse(
        "You do not have permission to update UGC videos",
        403
      );
    }

    const { videoId, status, isFeatured, title, description } =
      await request.json();

    if (!videoId || typeof videoId !== "string") {
      return errorResponse("Missing videoId", 400);
    }

    const updateData: Record<string, unknown> = {};

    if (status !== undefined) {
      if (
        !VALID_UGC_STATUSES.includes(
          status as (typeof VALID_UGC_STATUSES)[number]
        )
      ) {
        return errorResponse(
          "Invalid status. Must be: pending, approved, or rejected",
          400
        );
      }
      updateData.status = status;
    }

    if (isFeatured !== undefined) {
      if (typeof isFeatured !== "boolean") {
        return errorResponse("isFeatured must be boolean", 400);
      }
      updateData.isFeatured = isFeatured;
    }

    if (title !== undefined) {
      const trimmedTitle = (title as string).trim();
      if (!trimmedTitle || trimmedTitle.length > 100) {
        return errorResponse("Title must be 1-100 characters", 400);
      }
      updateData.title = trimmedTitle;
    }

    if (description !== undefined) {
      const trimmedDesc = (description as string).trim();
      if (trimmedDesc.length > 500) {
        return errorResponse("Description must be under 500 characters", 400);
      }
      updateData.description = trimmedDesc;
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No fields to update", 400);
    }

    // Verify document exists
    const docRef = adminDb.collection("ugc_videos").doc(videoId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return errorResponse("Video not found", 404);
    }

    await docRef.update(updateData);
    await logActivity("UGC_UPDATE", user.uid, videoId);

    return successResponse({ updated: true, videoId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update UGC video";
    return errorResponse(message, 500);
  }
}
