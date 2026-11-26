"use client";

import imageCompression from "browser-image-compression";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_RAW_BYTES = 10 * 1024 * 1024; // 10 MB pre-compression guard
const MAX_SERVER_BYTES = 2 * 1024 * 1024; // 2 MB server limit

export interface UploadImageResult {
  success: true;
  url: string;
  filename: string;
}

export interface UploadImageError {
  success: false;
  error: string;
}

/**
 * TODO(anggota-3): Replace inline upload helper with shared `ImageUploader` component once Anggota 3 merges.
 * Compresses JPG/PNG/WEBP in the browser (< 200 KB target) and uploads to `/api/upload`.
 */
export async function compressAndUploadImage(
  file: File
): Promise<UploadImageResult | UploadImageError> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      success: false,
      error: "Format file harus JPG, PNG, atau WEBP.",
    };
  }

  if (file.size > MAX_RAW_BYTES) {
    return {
      success: false,
      error: "Ukuran file asli terlalu besar (maksimal 10 MB sebelum kompresi).",
    };
  }

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
    });

    if (compressed.size > MAX_SERVER_BYTES) {
      return {
        success: false,
        error: "Ukuran gambar setelah kompresi masih melebihi 2 MB.",
      };
    }

    const formData = new FormData();
    formData.append("file", compressed, file.name);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as {
      success?: boolean;
      url?: string;
      filename?: string;
      error?: string;
    };

    if (!response.ok || !data.success || !data.url || !data.filename) {
      return {
        success: false,
        error: data.error ?? "Gagal mengunggah gambar.",
      };
    }

    return {
      success: true,
      url: data.url,
      filename: data.filename,
    };
  } catch {
    return {
      success: false,
      error: "Terjadi kesalahan saat memproses atau mengunggah gambar.",
    };
  }
}
