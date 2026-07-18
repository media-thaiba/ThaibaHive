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
 * Upload buffer to Supabase Storage via REST
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
    body: buffer,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to upload to Supabase Storage: ${response.statusText} (${errText})`);
  }

  return `/api/upload/files/${filename}`;
}

/**
 * Download buffer/stream from Supabase Storage
 */
export async function downloadFromSupabase(
  filename: string,
  bucket = "uploads"
): Promise<{
  buffer: Buffer;
  mimeType: string;
} | null> {
  if (!isStorageConfigured) {
    return null;
  }

  const downloadUrl = new URL(`/storage/v1/object/authenticated/${bucket}/${filename}`, supabaseUrl).toString();

  const response = await fetch(downloadUrl, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${supabaseKey}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch file from Supabase Storage: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const arrayBuffer = await response.arrayBuffer();
  
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: contentType,
  };
}
