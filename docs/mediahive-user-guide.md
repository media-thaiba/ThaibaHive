# MediaHive Media Library — User Guide

The Media Library feature provides comprehensive institutional media management across 23+ campuses.

---

## Features & Workflows

### 1. Media Asset Browsing & Grid/List View
- Navigate to `/media-library` (or `/media`) from the sidebar under **Services > Media Library**.
- Toggle between **Grid View** (cards with image thumbnails) and **List View** (tabular details with sizes and upload dates).
- Click any file to open the **File Preview** modal.

### 2. File Uploading & Drag-and-Drop
- Drag and drop files directly onto the **Upload Media** dropzone or click to open file picker.
- Supports Images, Videos, Audio, PDFs, and Office Documents up to **100MB**.
- Executable files (`.exe`, `.bat`, `.sh`, `.dll`) are strictly blocked for security.
- Progress bar tracks file status, speed, and allows individual retry or cancellation.

### 3. Folder Organization
- Create root and subfolders via the sidebar **Folder Tree**.
- Select a folder to view its contents.
- Use **Breadcrumb Navigation** to move back to parent folders.
- Rename or delete empty folders using the inline actions.

### 4. File Preview & Metadata Panel
- View high-resolution images with zoom in/out and rotation controls.
- Play video and audio directly in browser HTML5 media player.
- Inspect EXIF/file details in the side **Metadata Panel** (dimensions, size, mime type, uploader, timestamp).
- Use `ESC` or keyboard `Left/Right Arrow keys` to cycle between media items.

### 5. Secure Share Links
- Select **Share** on any asset or folder to open the **Share Dialog**.
- Set expiration options: **1 Hour**, **24 Hours (Default)**, **7 Days**, or **Never**.
- Optionally enforce a password requirement.
- Copy generated share links directly to clipboard for external or internal sharing.
- Revoke active share links anytime from the **Share Management** panel.

### 6. Batch Selection & ZIP Downloads
- Check individual file checkboxes or click **Select All**.
- Click **Download ZIP** to package selected items into a compressed ZIP archive.
- View live packaging progress in the bottom overlay indicator.

### 7. Search & Filtering
- Search files in real-time by filename or tags (300ms debounced).
- Filter by file category (**Images**, **Videos**, **Audio**, **Documents**, **Other**).
- Filter by date range (**Today**, **Last 7 Days**, **Last 30 Days**).
