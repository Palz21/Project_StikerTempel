<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class FileController extends Controller
{
    private const DISK = 'local_uploads';

    private const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

    /**
     * Store uploaded image (logo, mockup, payment proof) securely outside /public.
     * Validated strictly to JPG/PNG/WEBP <= 2 MB.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $file = $validated['file'];
        $extension = strtolower($file->guessExtension() ?: $file->getClientOriginalExtension());

        if (! in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            return response()->json(['message' => 'Format file tidak didukung.'], 422);
        }

        $filename = Str::uuid()->toString().'.'.$extension;
        Storage::disk(self::DISK)->putFileAs('', $file, $filename);

        return response()->json([
            'filename' => $filename,
            'url' => route('files.show', ['filename' => $filename]),
        ], 201);
    }

    /**
     * Serve uploaded file safely with path traversal prevention.
     */
    public function show(string $filename): BinaryFileResponse
    {
        if (
            $filename === ''
            || basename($filename) !== $filename
            || str_contains($filename, '..')
            || ! preg_match('/^[A-Za-z0-9._-]+$/', $filename)
        ) {
            abort(404);
        }

        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        if (! in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            abort(404);
        }

        $disk = Storage::disk(self::DISK);
        if (! $disk->exists($filename)) {
            abort(404);
        }

        return response()->file($disk->path($filename), [
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }
}
