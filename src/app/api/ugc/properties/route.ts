import { authenticateRequest, isAuthError } from "@/lib/auth-guard";
import { adminDb } from "@/lib/firebase-admin";
import { errorResponse, successResponse } from "@/lib/errors";

export async function GET() {
  try {
    const authResult = await authenticateRequest();
    if (isAuthError(authResult)) return authResult;

    const snapshot = await adminDb.collection("properties").get();
    const properties = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: (doc.data().name as string) ?? doc.id,
    }));

    return successResponse({ properties });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list properties";
    return errorResponse(message, 500);
  }
}
