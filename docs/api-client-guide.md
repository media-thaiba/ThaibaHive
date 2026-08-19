# Unified API Client Guide (`src/lib/api/client.ts`)

The Unified API Client Wrapper is the single source of truth for making HTTP requests to ThaibaHive backend API routes.

---

## Key Features

1. **Automatic Authentication:** Sends JWT session tokens via httpOnly cookies (`credentials: "same-origin"`).
2. **Standardized Error Handling:** Formats error messages and displays user notifications using `sonner`.
3. **Automatic Retries:** Automatically retries GET requests once upon encountering network failures or 5xx server errors, using exponential backoff.
4. **Permission & Security Handlers:**
   - `401 Unauthorized`: Redirects to `/auth/login` and notifies session expiration.
   - `403 Forbidden`: Displays access denied toast message.
   - `429 Rate Limit`: Reads `retry-after` response header and alerts user to wait before retrying.
5. **Loading Callbacks:** Supports `onLoading?: (isLoading: boolean) => void` for tracking loading states.
6. **Development Logging:** Logs `[API METHOD] URL` during local development mode.

---

## Usage Examples

### 1. GET Request with Parameters and Type Safety

```ts
import { api } from "@/lib/api/client";

interface Asset {
  id: string;
  name: string;
  fileSize: number;
}

async function loadAssets(folderId?: string) {
  const { data, ok, error, status } = await api.get<{ assets: Asset[] }>(
    "/api/media/assets",
    {
      params: { folderId, fileType: "image" },
    }
  );

  if (ok && data) {
    console.log("Fetched assets:", data.assets);
  }
}
```

### 2. POST Request with Payload

```ts
import { api } from "@/lib/api/client";

async function createFolder(name: string, parentId?: string) {
  const { data, ok, error } = await api.post<{ folder: any }>(
    "/api/media/folders",
    { name, parentId }
  );

  if (ok && data) {
    console.log("Folder created:", data.folder);
  }
}
```

### 3. File Uploads

```ts
import { api } from "@/lib/api/client";

async function uploadFile(file: File) {
  const { data, ok } = await api.upload<{ fileUrl: string }>(
    "/api/media/upload/chunk",
    file,
    {
      errorMessage: "Failed to upload file chunk",
    }
  );
}
```

### 4. File Downloads (Binary / ZIP Blobs)

```ts
import { api } from "@/lib/api/client";

async function downloadBatchZip(assetIds: string[]) {
  const { data, ok } = await api.download("/api/media/batch-download", {
    method: "POST",
    body: { assetIds },
  });

  if (ok && data) {
    const url = window.URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "export.zip";
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
```
