import type { AppUser, UserRole } from "@/types";

type Action =
  | "upload"
  | "delete"
  | "createFolder"
  | "manageAdmins"
  | "viewMedia"
  | "viewAdmins";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 3,
  ADMIN: 2,
  MEDIA_MANAGER: 1,
};

/**
 * Server-side permission check. Must NEVER rely on client state.
 */
export function hasPermission(user: AppUser, action: Action): boolean {
  if (user.status !== "ACTIVE") return false;

  switch (action) {
    case "upload":
      return user.access.canUpload;
    case "delete":
      return user.access.canDelete;
    case "createFolder":
      return user.access.canCreateFolder;
    case "manageAdmins":
      return user.access.canManageAdmins && user.role === "SUPER_ADMIN";
    case "viewMedia":
      return true;
    case "viewAdmins":
      return user.role === "SUPER_ADMIN";
    default:
      return false;
  }
}

export function isRoleAtLeast(role: UserRole, minimum: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimum];
}
