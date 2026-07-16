import { Router } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import { join } from "path";
import { mkdirSync, statSync } from "fs";
import { authenticate, AuthRequest } from "../../middleware/auth";

export const uploadRouter = Router();
uploadRouter.use(authenticate);

const UPLOAD_DIR = join(process.cwd(), "uploads");

try {
  mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {}

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = file.originalname.split(".").pop() || "bin";
    cb(null, `${uuid()}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type "${file.mimetype}" is not allowed`));
    }
  },
});

uploadRouter.post("/", upload.single("file"), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const fileUrl = `/api/upload/files/${req.file.filename}`;

    res.status(201).json({
      url: fileUrl,
      filename: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

uploadRouter.get("/files/:filename", async (req: AuthRequest, res) => {
  try {
    const { filename } = req.params;
    if (!filename || filename.includes("..") || filename.includes("/")) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    const filepath = join(UPLOAD_DIR, filename);

    try {
      statSync(filepath);
    } catch {
      return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(filepath);
  } catch (err: any) {
    console.error("File serve error:", err);
    res.status(500).json({ error: "Failed to serve file" });
  }
});
