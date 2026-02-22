import { NextRequest } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth-guard";
import { hasPermission } from "@/lib/permissions";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { adminDb } from "@/lib/firebase-admin";
import { logActivity } from "@/lib/activity";
import { validateFile } from "@/lib/validation";
import { errorResponse, successResponse } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const authResult = await authenticateRequest();
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    // 2. Authorize
    if (!hasPermission(user, "upload")) {
      return errorResponse("You do not have upload permission", 403);
    }

    // 3. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "";

    if (!file) {
      return errorResponse("No file provided", 400);
    }

    // 4. Validate file
    const validation = validateFile(file.name, file.type, file.size);
    if (!validation.valid || !validation.resourceType) {
      return errorResponse(validation.error ?? "Invalid file", 400);
    }

    // 5. Upload to Cloudinary
    const buffer = Buffer.from(await file.arrayBuffer());
    const cloudResult = await uploadToCloudinary(
      buffer,
      folder,
      validation.resourceType
    );

    // 6. Save metadata to Firestore
    const mediaDoc = {
      public_id: cloudResult.public_id,
      secure_url: cloudResult.secure_url,
      folder,
      format: cloudResult.format,
      bytes: cloudResult.bytes,
      resource_type: validation.resourceType,
      uploadedBy: user.uid,
      uploadedAt: Date.now(),
      status: "ACTIVE" as const,
    };

    await adminDb
      .collection("media_files")
      .doc(cloudResult.public_id.replace(/\//g, "__"))
      .set(mediaDoc);

    // 7. Log activity
    await logActivity("UPLOAD", user.uid, cloudResult.public_id);

    return successResponse(mediaDoc, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload failed";
    return errorResponse(message, 500);
  }
}
