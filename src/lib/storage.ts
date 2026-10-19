const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isStorageConfigured = !!(supabaseUrl && supabaseKey);

export function checkStorageConfig() {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && !isStorageConfigured) {
    if (process.env.STORAGE_FALLBACK_ALLOWED === "true") {
      console.warn(
        "[Storage] Warning: Supabase Storage credentials are missing in production. Local storage fallback allowed via STORAGE_FALLBACK_ALLOWED override."
      );
      return;
    }
    throw new Error("CRITICAL CONFIGURATION ERROR: Supabase Storage url and keys are required in production.");
  }
}

/**
 * Upload a file buffer to Supabase Storage
 */
export async function uploadToSupabase(
  filename: string,
  contentType: string,
  buffer: Buffer,
  bucket = "uploads"
): Promise<string> {
  checkStorageConfig();

  if (!isStorageConfigured) {
    throw new Error("Supabase Storage is not configured.");
  }

  const uploadUrl = new URL(`/storage/v1/object/${bucket}/${filename}`, supabaseUrl).toString();

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": contentType,
    },
    body: new Uint8Array(buffer),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to upload to Supabase Storage: ${response.statusText} (${errText})`);
  }

  // Return the local proxy URL path that points to our route
  if (bucket === "avatars") {
    return `/api/upload/files/avatars/${filename}`;
  }
  return `/api/upload/files/${filename}`;
}

/**
 * Download a file stream from Supabase Storage
 */
export async function downloadFromSupabase(
  filename: string,
  bucket = "uploads",
  range?: string
): Promise<{
  stream: ReadableStream;
  mimeType: string;
  contentLength?: string;
  contentRange?: string;
} | null> {
  if (!isStorageConfigured) {
    return null;
  }

  const downloadUrl = new URL(`/storage/v1/object/authenticated/${bucket}/${filename}`, supabaseUrl).toString();

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${supabaseKey}`,
  };

  if (range) {
    headers["Range"] = range;
  }

  const response = await fetch(downloadUrl, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch file from Supabase Storage: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const contentLength = response.headers.get("content-length") || undefined;
  const contentRange = response.headers.get("content-range") || undefined;
  
  if (!response.body) {
    throw new Error("Empty response body from Supabase Storage");
  }

  return {
    stream: response.body,
    mimeType: contentType,
    contentLength,
    contentRange,
  };
}

/**
 * Copy an object within Supabase Storage
 */
export async function copySupabaseObject(
  sourcePath: string,
  destPath: string,
  bucket = "uploads"
): Promise<void> {
  if (!isStorageConfigured) {
    throw new Error("Supabase Storage is not configured.");
  }

  const copyUrl = new URL(`/storage/v1/object/copy`, supabaseUrl).toString();

  const response = await fetch(copyUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bucketId: bucket,
      sourceKey: sourcePath,
      destinationKey: destPath,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to copy object in Supabase Storage: ${response.statusText} (${errText})`);
  }
}

/**
 * Delete one or more objects from Supabase Storage
 */
export async function deleteFromSupabase(
  paths: string[],
  bucket = "uploads"
): Promise<void> {
  if (!isStorageConfigured) {
    throw new Error("Supabase Storage is not configured.");
  }

  const deleteUrl = new URL(`/storage/v1/object/${bucket}`, supabaseUrl).toString();

  const response = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(paths),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to delete from Supabase Storage: ${response.statusText} (${errText})`);
  }
}

export interface StorageObjectItem {
  name: string;
  id?: string;
  updated_at?: string;
  created_at?: string;
  last_accessed_at?: string;
  metadata?: Record<string, unknown>;
}

/**
 * List objects within a bucket prefix in Supabase Storage
 */
export async function listSupabaseObjects(
  prefix: string,
  bucket = "uploads",
  options: { limit?: number; offset?: number; sortBy?: { column: string; order: string } } = {}
): Promise<StorageObjectItem[]> {
  if (!isStorageConfigured) {
    return [];
  }

  const listUrl = new URL(`/storage/v1/object/list/${bucket}`, supabaseUrl).toString();

  const response = await fetch(listUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prefix,
      limit: options.limit ?? 100,
      offset: options.offset ?? 0,
      sortBy: options.sortBy ?? { column: "created_at", order: "asc" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to list objects in Supabase Storage: ${response.statusText} (${errText})`);
  }

  return (await response.json()) as StorageObjectItem[];
}
