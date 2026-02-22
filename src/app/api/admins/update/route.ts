import { NextRequest } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth-guard";
import { hasPermission } from "@/lib/permissions";
import { adminDb } from "@/lib/firebase-admin";
import { logActivity } from "@/lib/activity";
import { errorResponse, successResponse } from "@/lib/errors";
import type { UserRole, UserStatus, UserAccess } from "@/types";

const VALID_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "MEDIA_MANAGER"];
const VALID_STATUSES: UserStatus[] = ["ACTIVE", "INACTIVE"];

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest();
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    if (!hasPermission(user, "manageAdmins")) {
      return errorResponse("Only super admins can manage users", 403);
    }

    const { targetUid, role, status, access } = await request.json();

    if (!targetUid || typeof targetUid !== "string") {
      return errorResponse("Missing targetUid", 400);
    }

    // Prevent self-demotion
    if (targetUid === user.uid) {
      return errorResponse("Cannot modify your own account", 400);
    }

    const updateData: Record<string, unknown> = {};

    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return errorResponse("Invalid role", 400);
      }
      updateData.role = role;
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return errorResponse("Invalid status", 400);
      }
      updateData.status = status;
    }

    if (access !== undefined) {
      const a = access as Partial<UserAccess>;
      const boolFields: (keyof UserAccess)[] = [
        "canUpload",
        "canDelete",
        "canCreateFolder",
        "canManageAdmins",
      ];
      for (const field of boolFields) {
        if (a[field] !== undefined && typeof a[field] !== "boolean") {
          return errorResponse(`access.${field} must be boolean`, 400);
        }
      }
      updateData.access = access;
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse("No fields to update", 400);
    }

    await adminDb.collection("cloudinary_admins").doc(targetUid).update(updateData);
    await logActivity("ACCESS_UPDATE", user.uid, targetUid);

    return successResponse({ updated: true, targetUid });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update user";
    return errorResponse(message, 500);
  }
}
