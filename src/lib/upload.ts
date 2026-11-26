import crypto from "crypto";
import path from "path";

export const UPLOAD_DIR = path.resolve(process.cwd(), "storage", "uploads");
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/;

/**
 * Inspect magic bytes to verify actual file payload matches JPG, PNG, or WEBP.
 */
export function detectImageMimeFromBuffer(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WEBP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export function getExtensionForMime(mimeType: string): string | null {
  return ALLOWED_MIME_TO_EXT[mimeType] ?? null;
}

export function getMimeForFilename(filename: string): string | null {
  const ext = path.extname(filename).toLowerCase();
  return EXT_TO_MIME[ext] ?? null;
}

export function generateSafeFilename(extension: string): string {
  return `${Date.now()}-${crypto.randomUUID()}.${extension}`;
}

/**
 * Strictly resolve a filename inside UPLOAD_DIR while preventing path traversal.
 */
export function resolveSafeUploadPath(filename: string): string | null {
  if (
    !filename ||
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.includes("..") ||
    filename.includes("\0") ||
    !SAFE_FILENAME_REGEX.test(filename)
  ) {
    return null;
  }

  const resolved = path.resolve(UPLOAD_DIR, filename);
  const uploadPrefix = UPLOAD_DIR.endsWith(path.sep)
    ? UPLOAD_DIR
    : `${UPLOAD_DIR}${path.sep}`;

  if (!resolved.startsWith(uploadPrefix)) {
    return null;
  }

  return resolved;
}
