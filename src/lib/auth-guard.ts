import { headers } from "next/headers";
import { adminAuth, adminDb } from "./firebase-admin";
import { errorResponse } from "./errors";
import type { AppUser } from "@/types";
import { NextResponse } from "next/server";

interface AuthResult {
  user: AppUser;
}

/**
 * Validates the Firebase JWT from the Authorization header,
 * fetches the Firestore user document, and checks that
 * the role exists and status is ACTIVE.
 *
 * Returns the validated AppUser or a NextResponse error.
 */
export async function authenticateRequest(): Promise<
  AuthResult | NextResponse
> {
  try {
    const headersList = await headers();
    const authorization = headersList.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return errorResponse("Missing or invalid authorization header", 401);
    }

    const token = authorization.slice(7);
    const decoded = await adminAuth.verifyIdToken(token);

    const userDoc = await adminDb
      .collection("cloudinary_admins")
      .doc(decoded.uid)
      .get();

    if (!userDoc.exists) {
      return errorResponse("User record not found", 403);
    }

    const userData = userDoc.data() as Omit<AppUser, "uid">;

    if (!userData.role) {
      return errorResponse("User has no assigned role", 403);
    }

    if (userData.status !== "ACTIVE") {
      return errorResponse("User account is not active", 403);
    }

    const user: AppUser = {
      uid: decoded.uid,
      ...userData,
    };

    return { user };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Authentication failed";
    return errorResponse(message, 401);
  }
}

/**
 * Type guard to check if authenticateRequest returned an error response.
 */
export function isAuthError(
  result: AuthResult | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
