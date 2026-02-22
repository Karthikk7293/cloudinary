import { NextRequest } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth-guard";
import { hasPermission } from "@/lib/permissions";
import { softDeleteInCloudinary } from "@/lib/cloudinary";
import { adminDb } from "@/lib/firebase-admin";
import { logActivity } from "@/lib/activity";
import { errorResponse, successResponse } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const authResult = await authenticateRequest();
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    // 2. Authorize
    if (!hasPermission(user, "delete")) {
      return errorResponse("You do not have delete permission", 403);
    }

    // 3. Parse body
    const { publicId, resourceType, folder } = await request.json();

    if (!publicId || !resourceType || typeof folder !== "string") {
      return errorResponse(
        "Missing publicId, resourceType, or folder",
        400
      );
    }

    // 4. Soft delete in Cloudinary (move to _trash)
    const moveResult = await softDeleteInCloudinary(
      publicId,
      resourceType,
      folder
    );

    // 5. Update Firestore status
    const docId = publicId.replace(/\//g, "__");
    await adminDb.collection("media_files").doc(docId).update({
      status: "DELETED",
      deletedAt: Date.now(),
      deletedBy: user.uid,
    });

    // 6. Log activity
    await logActivity("DELETE", user.uid, publicId);

    return successResponse({
      deleted: true,
      newPublicId: moveResult.public_id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Delete failed";
    return errorResponse(message, 500);
  }
}
