import { google } from "googleapis";
import { Readable } from "stream";

function getDriveClient() {
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    return null;
  }

  // Trim and strip surrounding quotes
  email = email.trim().replace(/^"/, "").replace(/"$/, "");
  privateKey = privateKey.trim().replace(/^"/, "").replace(/"$/, "");

  // Handle newline characters in private key
  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

export async function uploadToDrive(filename: string, mimeType: string, buffer: Buffer): Promise<string> {
  const drive = getDriveClient();
  if (!drive) {
    throw new Error("Google Drive client not configured. Check environment variables.");
  }

  let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (folderId) {
    folderId = folderId.trim().replace(/^"/, "").replace(/"$/, "");
  }

  const stream = Readable.from(buffer);

  try {
    const fileMetadata = {
      name: filename,
      parents: folderId ? [folderId] : undefined,
    };

    const media = {
      mimeType,
      body: stream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id",
      supportsAllDrives: true, // Crucial for Shared Drive support
    });

    if (!response.data.id) {
      throw new Error("Google Drive returned an empty file ID");
    }

    return response.data.id;
  } catch (error) {
    console.error("Google Drive upload error:", error);
    throw error;
  }
}

export async function downloadFromDrive(filename: string): Promise<{ stream: any; mimeType: string } | null> {
  const drive = getDriveClient();
  if (!drive) return null;

  try {
    let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (folderId) {
      folderId = folderId.trim().replace(/^"/, "").replace(/"$/, "");
    }

    // Search for the file by name
    let query = `name = '${filename}' and trashed = false`;
    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }

    const listRes = await drive.files.list({
      q: query,
      fields: "files(id, name, mimeType)",
      pageSize: 1,
      includeItemsFromAllDrives: true, // Crucial for Shared Drive support
      supportsAllDrives: true,         // Crucial for Shared Drive support
    });

    const file = listRes.data.files?.[0];
    if (!file || !file.id) {
      return null;
    }

    // Fetch the file download stream
    const fileRes = (await drive.files.get(
      { fileId: file.id, alt: "media", supportsAllDrives: true },
      { responseType: "stream" }
    )) as any;

    return {
      stream: fileRes.data,
      mimeType: file.mimeType || "application/octet-stream",
    };
  } catch (error) {
    console.error("Google Drive download error:", error);
    return null;
  }
}
