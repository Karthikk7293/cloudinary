import { NextRequest } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth-guard";
import { hasPermission } from "@/lib/permissions";
import { adminDb } from "@/lib/firebase-admin";
import { errorResponse, successResponse } from "@/lib/errors";
import type { ActivityLog } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest();
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    if (!hasPermission(user, "viewAdmins")) {
      return errorResponse("Access denied", 403);
    }

    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get("limit") ?? "50", 10);
    const limit = Math.min(Math.max(limitParam, 1), 200);

    const snapshot = await adminDb
      .collection("activity_logs")
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    const logs: ActivityLog[] = snapshot.docs.map(
      (doc) => doc.data() as ActivityLog
    );

    return successResponse({ logs });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch logs";
    return errorResponse(message, 500);
  }
}
