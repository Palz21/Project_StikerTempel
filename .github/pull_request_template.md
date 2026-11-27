## Ringkasan Perubahan
<!-- Jelaskan singkat fitur, perbaikan, atau pembaruan dokumen pada PR ini -->

## Peran & Modul Terkait
- [ ] Core Backend, Migrations, Models, Services, & Policies (Fauzan)
- [ ] Filament Resources, Pages, & Halaman Publik `/order` `/track/{uuid}` (Farrel)
- [ ] Seeders, Factories, Widgets, WA Helper, Validasi, & Dokumentasi (Naufal)

## Zona File Bersama yang Disentuh
Centang jika mengubah file bersama (wajib koordinasi di grup tim):
- [ ] `composer.json` / `package.json`
- [ ] `database/migrations/*` atau `database/seeders/*`
- [ ] `app/Models/*` atau `app/Enums/*`
- [ ] `routes/web.php`

## Checklist Sebelum Merge
- [ ] `php artisan migrate:fresh --seed` berjalan tanpa error pada SQLite lokal
- [ ] `php artisan test` berjalan tanpa error (jika aplikasi Laravel sudah aktif)
- [ ] Tampilan diuji responsif pada layar HP (`375px`) dan desktop
- [ ] Tidak ada file `.env`, `vendor/`, `node_modules/`, `database/database.sqlite`, atau file tes di `storage/app/private/uploads/` yang ikut ter-commit
- [ ] Sudah melakukan `git pull` terbaru sebelum membuka PR
