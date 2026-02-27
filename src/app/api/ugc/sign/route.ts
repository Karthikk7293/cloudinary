import { authenticateRequest, isAuthError } from "@/lib/auth-guard";
import { hasPermission } from "@/lib/permissions";
import { sanitizeUgcFields } from "@/lib/validation";
import { generateUgcUploadSignature } from "@/lib/cloudinary";
import { adminDb } from "@/lib/firebase-admin";
import { errorResponse, successResponse } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    // 1. Authenticate
    const authResult = await authenticateRequest();
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    // 2. Authorize
    if (!hasPermission(user, "ugcUpload")) {
      return errorResponse("You do not have upload permission", 403);
    }

    // 3. Parse JSON body (metadata only, no file)
    const body = await request.json();
    const { title, description, propertyId, isFeatured } = body;

    // 4. Sanitize and validate metadata
    const sanitized = sanitizeUgcFields({
      title,
      description,
      propertyId,
      isFeatured: isFeatured === true,
    });
    if (sanitized.errors.length > 0) {
      return errorResponse(sanitized.errors.join(", "), 400);
    }

    // 5. Validate propertyId exists
    const propertyDoc = await adminDb
      .collection("properties")
      .doc(sanitized.propertyId)
      .get();
    if (!propertyDoc.exists) {
      return errorResponse("Invalid property selected", 400);
    }

    // 6. Generate Cloudinary signature
    const signData = generateUgcUploadSignature("ugc_videos");

    return successResponse(signData);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate signature";
    return errorResponse(message, 500);
  }
}
