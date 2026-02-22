import { authenticateRequest, isAuthError } from "@/lib/auth-guard";
import { adminDb } from "@/lib/firebase-admin";
import { errorResponse, successResponse } from "@/lib/errors";
import { isRoleAtLeast } from "@/lib/permissions";
import type { DashboardMetrics } from "@/types";
import {
  listCloudinaryFolders,
  listCloudinaryResources,
} from "@/lib/cloudinary";

export async function GET() {
  try {
    const authResult = await authenticateRequest();
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    if (!isRoleAtLeast(user.role, "ADMIN")) {
      return errorResponse("Access denied", 403);
    }

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const [
      cloudinaryImages,
      cloudinaryVideos,
      cloudinaryRaw,
      folders,
      recentLogsSnap,
      usersSnap,
    ] = await Promise.all([
      listCloudinaryResources("", "image"),
      listCloudinaryResources("", "video"),
      listCloudinaryResources("", "raw"),
      listCloudinaryFolders(),
      adminDb
        .collection("activity_logs")
        .where("timestamp", ">=", thirtyDaysAgo)
        .get(),
      adminDb.collection("cloudinary_admins").count().get(),
    ]);

    const adminsSnap = await adminDb
      .collection("cloudinary_admins")
      .where("role", "in", ["SUPER_ADMIN", "ADMIN"])
      .count()
      .get();

    // Count uploads and deletes + build daily activity
    let uploads30d = 0;
    let deletes30d = 0;
    const dailyMap: Record<string, { uploads: number; deletes: number }> = {};

    // Pre-fill last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      dailyMap[key] = { uploads: 0, deletes: 0 };
    }

    recentLogsSnap.forEach((doc) => {
      const data = doc.data();
      const action = data.action;
      if (action === "UPLOAD") uploads30d++;
      else if (action === "DELETE") deletes30d++;

      const dateKey = new Date(data.timestamp).toISOString().split("T")[0];
      if (dailyMap[dateKey]) {
        if (action === "UPLOAD") dailyMap[dateKey].uploads++;
        else if (action === "DELETE") dailyMap[dateKey].deletes++;
      }
    });

    const recentActivity = Object.entries(dailyMap).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    // Storage by type (sum of bytes)
    const imgStorage = cloudinaryImages.resources.reduce(
      (sum, r) => sum + r.bytes,
      0
    );
    const vidStorage = cloudinaryVideos.resources.reduce(
      (sum, r) => sum + r.bytes,
      0
    );
    const rawStorage = cloudinaryRaw.resources.reduce(
      (sum, r) => sum + r.bytes,
      0
    );

    const metrics: DashboardMetrics = {
      totalActiveFiles:
        cloudinaryImages.resources.length +
        cloudinaryVideos.resources.length +
        cloudinaryRaw.resources.length,
      totalFolders: folders.length,
      uploadsLast30Days: uploads30d,
      deletesLast30Days: deletes30d,
      totalAdmins: adminsSnap.data().count,
      totalUsers: usersSnap.data().count,
      filesByType: {
        images: cloudinaryImages.resources.length,
        videos: cloudinaryVideos.resources.length,
        documents: cloudinaryRaw.resources.length,
      },
      storageByType: {
        images: imgStorage,
        videos: vidStorage,
        documents: rawStorage,
      },
      recentActivity,
    };

    return successResponse(metrics);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch metrics";
    return errorResponse(message, 500);
  }
}
