import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ─── Upload ─────────────────────────────────────────────────────

export async function uploadToCloudinary(
  fileBuffer: Buffer,
  folder: string,
  resourceType: "image" | "video" | "raw"
): Promise<{
  public_id: string;
  secure_url: string;
  format: string;
  bytes: number;
  resource_type: string;
}> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Upload returned no result"));
          return;
        }
        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
          format: result.format,
          bytes: result.bytes,
          resource_type: result.resource_type,
        });
      }
    );
    stream.end(fileBuffer);
  });
}

// ─── Soft Delete (move to _trash) ───────────────────────────────

export async function softDeleteInCloudinary(
  publicId: string,
  resourceType: "image" | "video" | "raw",
  originalFolder: string
): Promise<{ public_id: string }> {
  const date = new Date().toISOString().split("T")[0];
  const newFolder = `_trash/${date}/${originalFolder}`;
  const filename = publicId.split("/").pop();

  const result = await cloudinary.uploader.rename(
    publicId,
    `${newFolder}/${filename}`,
    { resource_type: resourceType }
  );

  return { public_id: result.public_id };
}

// ─── List Folders ───────────────────────────────────────────────

export async function listCloudinaryFolders(
  prefix?: string
): Promise<{ name: string; path: string }[]> {
  const result = prefix
    ? await cloudinary.api.sub_folders(prefix)
    : await cloudinary.api.root_folders();

  return result.folders.map((f: { name: string; path: string }) => ({
    name: f.name,
    path: f.path,
  }));
}

// ─── List Resources by prefix (for dashboard totals) ────────────

export async function listCloudinaryResources(
  folder: string,
  resourceType: "image" | "video" | "raw" = "image",
  nextCursor?: string
): Promise<{
  resources: {
    public_id: string;
    secure_url: string;
    format: string;
    bytes: number;
    resource_type: string;
  }[];
  next_cursor?: string;
}> {
  const result = await cloudinary.api.resources({
    type: "upload",
    prefix: folder,
    resource_type: resourceType,
    max_results: 50,
    next_cursor: nextCursor,
  });

  return {
    resources: result.resources.map(
      (r: {
        public_id: string;
        secure_url: string;
        format: string;
        bytes: number;
        resource_type: string;
      }) => ({
        public_id: r.public_id,
        secure_url: r.secure_url,
        format: r.format,
        bytes: r.bytes,
        resource_type: r.resource_type,
      })
    ),
    next_cursor: result.next_cursor,
  };
}

// ─── Search Resources in exact Folder (for media browser) ──────

export async function searchResourcesInFolder(
  folder: string,
  nextCursor?: string
): Promise<{
  resources: {
    public_id: string;
    secure_url: string;
    format: string;
    bytes: number;
    resource_type: string;
  }[];
  next_cursor?: string;
}> {
  // Search API does exact folder matching — works with both
  // dynamic-folder and fixed/structured-folder (DAM) accounts
  const expression = folder ? `folder="${folder}"` : `folder=""`;

  let query = cloudinary.search
    .expression(expression)
    .sort_by("created_at", "desc")
    .max_results(100);

  if (nextCursor) {
    query = query.next_cursor(nextCursor);
  }

  const result = await query.execute();

  return {
    resources: (result.resources ?? []).map(
      (r: {
        public_id: string;
        secure_url: string;
        format: string;
        bytes: number;
        resource_type: string;
      }) => ({
        public_id: r.public_id,
        secure_url: r.secure_url,
        format: r.format,
        bytes: r.bytes,
        resource_type: r.resource_type,
      })
    ),
    next_cursor: result.next_cursor,
  };
}

// ─── Create Folder ──────────────────────────────────────────────

export async function createCloudinaryFolder(
  path: string
): Promise<{ success: boolean }> {
  await cloudinary.api.create_folder(path);
  return { success: true };
}

export default cloudinary;
