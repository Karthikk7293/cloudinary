// ─── User & Roles ───────────────────────────────────────────────

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "MEDIA_MANAGER";
export type UserStatus = "ACTIVE" | "INACTIVE";

export interface UserAccess {
  canUpload: boolean;
  canDelete: boolean;
  canCreateFolder: boolean;
  canManageAdmins: boolean;
}

export interface AppUser {
  uid: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  access: UserAccess;
  createdAt: number;
}

// ─── Media ──────────────────────────────────────────────────────

export type FileStatus = "ACTIVE" | "INACTIVE" | "PENDING" | "DELETED";
export type ResourceType = "image" | "video" | "raw";

export interface MediaFile {
  public_id: string;
  secure_url: string;
  folder: string;
  format: string;
  bytes: number;
  resource_type: ResourceType;
  uploadedBy: string;
  uploadedAt: number;
  status: FileStatus;
  deletedAt?: number;
  deletedBy?: string;
}

// ─── Activity Logging ───────────────────────────────────────────

export type ActivityAction =
  | "UPLOAD"
  | "DELETE"
  | "CREATE_FOLDER"
  | "ACCESS_UPDATE";

export interface ActivityLog {
  action: ActivityAction;
  performedBy: string;
  targetId: string;
  timestamp: number;
}

// ─── API Responses ──────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Toast ──────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

// ─── Folder ─────────────────────────────────────────────────────

export interface CloudinaryFolder {
  name: string;
  path: string;
}

// ─── Dashboard Metrics ──────────────────────────────────────────

export interface DashboardMetrics {
  totalActiveFiles: number;
  totalFolders: number;
  uploadsLast30Days: number;
  deletesLast30Days: number;
  totalAdmins: number;
  totalUsers: number;
  filesByType: { images: number; videos: number; documents: number };
  storageByType: { images: number; videos: number; documents: number };
  recentActivity: { date: string; uploads: number; deletes: number }[];
}
