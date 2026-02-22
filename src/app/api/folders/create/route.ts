import { NextRequest } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth-guard";
import { hasPermission } from "@/lib/permissions";
import { createCloudinaryFolder } from "@/lib/cloudinary";
import { logActivity } from "@/lib/activity";
import { errorResponse, successResponse } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest();
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    if (!hasPermission(user, "createFolder")) {
      return errorResponse("You do not have folder creation permission", 403);
    }

    const { path } = await request.json();

    if (!path || typeof path !== "string" || path.trim().length === 0) {
      return errorResponse("Invalid folder path", 400);
    }

    // Sanitize: no leading/trailing slashes, no double slashes, alphanumeric + hyphens + underscores
    const sanitized = path
      .replace(/^\/+|\/+$/g, "")
      .replace(/\/+/g, "/");

    if (!/^[a-zA-Z0-9_\-/]+$/.test(sanitized)) {
      return errorResponse(
        "Folder path may only contain letters, numbers, hyphens, underscores, and slashes",
        400
      );
    }

    await createCloudinaryFolder(sanitized);
    await logActivity("CREATE_FOLDER", user.uid, sanitized);

    return successResponse({ created: true, path: sanitized }, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create folder";
    return errorResponse(message, 500);
  }
}
