import { authenticateRequest, isAuthError } from "@/lib/auth-guard";
import { hasPermission } from "@/lib/permissions";
import { adminDb } from "@/lib/firebase-admin";
import { errorResponse, successResponse } from "@/lib/errors";
import type { AppUser } from "@/types";

export async function GET() {
  try {
    const authResult = await authenticateRequest();
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    if (!hasPermission(user, "viewAdmins")) {
      return errorResponse("Access denied", 403);
    }

    const snapshot = await adminDb.collection("cloudinary_admins").get();
    const defaultAccess = {
      canUpload: false,
      canDelete: false,
      canCreateFolder: false,
    };
    const users: AppUser[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: data.email ?? "",
        role: data.role ?? "MEDIA_MANAGER",
        status: data.status ?? "ACTIVE",
        access: { ...defaultAccess, ...data.access },
        createdAt: data.createdAt ?? Date.now(),
      };
    });

    return successResponse({ users });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list admins";
    return errorResponse(message, 500);
  }
}
