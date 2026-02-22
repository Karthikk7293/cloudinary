import { NextRequest } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth-guard";
import { searchResourcesInFolder } from "@/lib/cloudinary";
import { errorResponse, successResponse } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest();
    if (isAuthError(authResult)) return authResult;

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder") ?? "";
    const cursor = searchParams.get("cursor") ?? undefined;

    // Search API returns all resource types in one call with exact folder matching
    const result = await searchResourcesInFolder(folder, cursor);

    const files = result.resources.map((r) => ({
      public_id: r.public_id,
      secure_url: r.secure_url,
      folder,
      format: r.format ?? r.public_id.split(".").pop() ?? "",
      bytes: r.bytes,
      resource_type: r.resource_type as "image" | "video" | "raw",
      status: "ACTIVE" as const,
    }));

    return successResponse({
      files,
      total: files.length,
      next_cursor: result.next_cursor,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list media";
    return errorResponse(message, 500);
  }
}
