import { authenticateRequest, isAuthError } from "@/lib/auth-guard";
import { adminDb } from "@/lib/firebase-admin";
import { errorResponse, successResponse } from "@/lib/errors";

export async function GET() {
  try {
    const authResult = await authenticateRequest();
    if (isAuthError(authResult)) return authResult;

    const snapshot = await adminDb
      .collection("ugc_videos")
      .orderBy("createdAt", "desc")
      .get();

    const videos = snapshot.docs.map((doc) => ({
      videoId: doc.id,
      ...doc.data(),
    }));

    return successResponse({ videos, total: videos.length });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list UGC videos";
    return errorResponse(message, 500);
  }
}
