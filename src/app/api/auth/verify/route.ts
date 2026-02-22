import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { errorResponse, successResponse } from "@/lib/errors";
import type { AppUser } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken || typeof idToken !== "string") {
      return errorResponse("Missing ID token", 400);
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const userDoc = await adminDb
      .collection("cloudinary_admins")
      .doc(decoded.uid)
      .get();

    if (!userDoc.exists) {
      return errorResponse("User record not found in system", 403);
    }

    const userData = userDoc.data() as Omit<AppUser, "uid">;

    if (!userData.role) {
      return errorResponse("User has no assigned role", 403);
    }

    if (userData.status !== "ACTIVE") {
      return errorResponse("User account is inactive", 403);
    }

    const user: AppUser = { uid: decoded.uid, ...userData };

    return successResponse({
      uid: user.uid,
      email: user.email,
      role: user.role,
      access: user.access,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Token verification failed";
    return errorResponse(message, 401);
  }
}
