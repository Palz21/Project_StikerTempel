import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  detectImageMimeFromBuffer,
  generateSafeFilename,
  getExtensionForMime,
  MAX_UPLOAD_BYTES,
  UPLOAD_DIR,
} from "@/lib/upload";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const entry = formData.get("file");

    if (!(entry instanceof File)) {
      return NextResponse.json(
        { success: false, error: "File gambar tidak ditemukan pada request." },
        { status: 400 }
      );
    }

    if (entry.size <= 0) {
      return NextResponse.json(
        { success: false, error: "File tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (entry.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { success: false, error: "Ukuran file melebihi batas maksimal 2 MB." },
        { status: 400 }
      );
    }

    const declaredExt = getExtensionForMime(entry.type);
    if (!declaredExt) {
      return NextResponse.json(
        {
          success: false,
          error: "Tipe file tidak didukung. Hanya JPG, PNG, atau WEBP.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await entry.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const detectedMime = detectImageMimeFromBuffer(buffer);
    if (!detectedMime) {
      return NextResponse.json(
        {
          success: false,
          error: "Isi file tidak valid sebagai gambar JPG, PNG, atau WEBP.",
        },
        { status: 400 }
      );
    }

    const extension = getExtensionForMime(detectedMime);
    if (!extension) {
      return NextResponse.json(
        { success: false, error: "Ekstensi file tidak diizinkan." },
        { status: 400 }
      );
    }

    const filename = generateSafeFilename(extension);
    await mkdir(UPLOAD_DIR, { recursive: true });
    const destination = path.join(UPLOAD_DIR, filename);
    await writeFile(destination, buffer);

    return NextResponse.json(
      {
        success: true,
        filename,
        url: `/api/files/${filename}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan file ke server lokal." },
      { status: 500 }
    );
  }
}
