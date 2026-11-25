import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { getMimeForFilename, resolveSafeUploadPath } from "@/lib/upload";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;
  const safePath = resolveSafeUploadPath(filename);

  if (!safePath) {
    return NextResponse.json(
      { error: "Nama file tidak valid." },
      { status: 400 }
    );
  }

  const contentType = getMimeForFilename(filename);
  if (!contentType) {
    return NextResponse.json(
      { error: "Tipe file tidak diizinkan." },
      { status: 400 }
    );
  }

  try {
    const fileBuffer = await readFile(safePath);
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      return NextResponse.json(
        { error: "File tidak ditemukan." },
        { status: 404 }
      );
    }

    console.error("Read file error:", err);
    return NextResponse.json(
      { error: "Gagal membaca file." },
      { status: 500 }
    );
  }
}
