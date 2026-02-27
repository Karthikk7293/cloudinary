import { NextRequest } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth-guard";
import { listCloudinaryFolders } from "@/lib/cloudinary";
import { errorResponse, successResponse } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest();
    if (isAuthError(authResult)) return authResult;

    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get("prefix") ?? undefined;

    const HIDDEN_FOLDERS = ["ugc_videos", "_trash"];

    const allFolders = await listCloudinaryFolders(prefix);
    const folders = prefix
      ? allFolders
      : allFolders.filter((f) => !HIDDEN_FOLDERS.includes(f.name));

    return successResponse({ folders });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list folders";
    return errorResponse(message, 500);
  }
}
