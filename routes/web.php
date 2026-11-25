<?php

use App\Http\Controllers\FileController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect('/admin');
});

// Secure local file serving & upload endpoint (Anggota 1 - Fauzan)
Route::post('/files/upload', [FileController::class, 'store'])->name('files.upload');
Route::get('/files/{filename}', [FileController::class, 'show'])
    ->where('filename', '[^/]+')
    ->name('files.show');

// Public client routes (/order and /track/{uuid}) will be added by Anggota 2 (Farrel)
