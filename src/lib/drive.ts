import { google } from "googleapis";
import { Readable } from "stream";

function getDriveClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    return null;
  }

  // Handle newline characters in private key
  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  // Use the options object configuration for authentication
  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

export async function uploadToDrive(filename: string, mimeType: string, buffer: Buffer): Promise<string | null> {
  const drive = getDriveClient();
  if (!drive) return null;

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
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
    });

    return response.data.id || null;
  } catch (error) {
    console.error("Google Drive upload error:", error);
    return null;
  }
}

export async function downloadFromDrive(filename: string): Promise<{ stream: any; mimeType: string } | null> {
  const drive = getDriveClient();
  if (!drive) return null;

  try {
    // 1. Search for the file by name
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    let query = `name = '${filename}' and trashed = false`;
    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }

    const listRes = await drive.files.list({
      q: query,
      fields: "files(id, name, mimeType)",
      pageSize: 1,
    });

    const file = listRes.data.files?.[0];
    if (!file || !file.id) {
      return null;
    }

    // 2. Fetch the file download stream (cast to any to bypass return overload resolution type issues)
    const fileRes = (await drive.files.get(
      { fileId: file.id, alt: "media" },
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
