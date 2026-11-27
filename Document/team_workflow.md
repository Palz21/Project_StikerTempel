# Alur Kerja, Pembagian Peran Pedoman, dan SOP Tim (3 Mahasiswa)

**Judul Proyek:** UMKM Percetakan Kemasan Custom Berbasis Web  
**Mitra UMKM:** Cindy Advertising, Sidoarjo (Ibu Diana dan Bapak Hermanto)  
**Mata Kuliah / Dosen Pengampu:** Pemrograman Web dan Aplikasi / Afifah Dwi Ramadhani, S.ST., M.Tr.T.  
**Repository:** `https://github.com/Palz21/Project_StikerTempel.git`  
**Dokumen Referensi Utama:** `Document/system_blueprint.md` dan `Document/field_notes_and_requirements.md`  
**Status Pelaksanaan Saat Ini:** **Minggu 3** (Pembangunan Aplikasi Laravel 11 + Filament v3 + SQLite)

---

## 1. Struktur Tim dan Pemetaan 4 Peran Pedoman

Pedoman menetapkan empat peran utama dalam kelompok dan memperbolehkan perangkapan peran bagi kelompok beranggotakan tiga orang, dengan syarat **seluruh anggota wajib berkontribusi pada kode** yang tercatat dalam riwayat commit Git.

| NRP | Nama Mahasiswa | Peran Sesuai Pedoman | Tanggung Jawab Non-Teknis & Lapangan | Tanggung Jawab Kode & Teknis (Laravel 11 + Filament) |
| :---: | :--- | :--- | :--- | :--- |
| `2424600054` | **Fauzan Alwahyu Utomo** | **Koordinator Mitra** & **Pengembang Utama** (rangkap peran) | Penghubung tunggal ke Cindy Advertising (Ibu Diana & Bapak Hermanto), mengatur jadwal kunjungan 1 & 2, menyimpan bukti izin mitra. | Setup proyek Laravel 11 + Filament v3 + SQLite, seluruh 8 Migration, Eloquent Models & Enums, Policies RBAC (`OWNER`/`ADMIN`), Services transaksional (`DB::transaction` stok, payment, cancel/refund, revisi), dan `FileController` upload aman. |
| `2424600036` | **Muhammad Farrel Setiawan** | **Pengembang Antarmuka dan Pengujian** | Memimpin sesi uji coba langsung bersama Cindy Advertising (Minggu 4), mencatat temuan bug/umpan balik usability di HP/tablet/PC, dan memverifikasi perbaikan. | Membangun Filament Resources & Relation Managers (`OrderResource`, `RawMaterialResource`, `CashFlowResource`, `UserResource`, `ManageShopSettings`), halaman publik Blade + Livewire 3 (`/order` & `/track/{uuid}`), serta memastikan tampilan responsif HP/tablet/PC. |
| `2424600058` | **Naufal Ridho Athallah** | **Pencatat Lapangan** (+ Kontributor Kode Wajib) | Menulis & merapikan catatan wawancara/observasi 16 November 2026, dokumen kebutuhan, penyusunan Laporan Akhir (maks 15 halaman), serta materi presentasi. | Membangun `DatabaseSeeder` & Model `Factory` (data contoh anonim 6 bulan), `WaTemplateHelper` & `FormatterHelper`, skema validasi spesifikasi dinamis 4 layanan (`CUP`, `PLASTIK`, `DTF_BAJU`, `STIKER`), Filament Dashboard Widgets (KPI & Charts), serta `README.md` instalasi. |

---

## 2. Kesepakatan Teknis dan Kontrak Bersama (Wajib Dipatuhi)

Agar hasil kerja Fauzan, Farrel, dan Naufal dapat digabungkan mulus tanpa konflik:

1. **Stack Resmi Pedoman:** Menggunakan **Laravel 11**, **Filament v3** (`filament/filament:^3.2`), **Blade + Livewire 3 + Tailwind CSS**, dan **SQLite** (`database/database.sqlite`). Codebase lama berbasis Next.js/Prisma tidak dilanjutkan untuk pengumpulan akhir; migrasi codebase dilakukan pada branch baru setelah konfirmasi tim.
2. **RBAC (`UserRole` Enum):** Menggunakan `OWNER` dan `ADMIN` dengan akun *seed* contoh `owner@cindyadv.local` dan `admin@cindyadv.local`. `CashFlowResource`, `UserResource`, dan kartu KPI *Laba Bersih* wajib dibatasi khusus `OWNER` melalui Policy dan metode `canView()`.
3. **Kontrak JSON `order_items.specs`:** Disimpan sebagai JSON dan di-cast ke `array` pada `OrderItem`:
   - `CUP`: `{ size, cupType ("Datar"|"Oval"), colorCount, lidType }`
   - `PLASTIK`: `{ size, plasticColor, colorCount, sides ("1 Sisi"|"2 Sisi") }`
   - `DTF_BAJU`: `{ apparelType, bringOwnApparel, printArea, sizeBreakdown }`
   - `STIKER`: `{ material, size, cutType, lamination }`
   - `LAINNYA`: `{ customNotes }`
4. **Penyimpanan File Lokal:** Seluruh unggahan (logo, *mockup*, bukti bayar) disimpan di `storage/app/private/uploads`, divalidasi hanya JPG/PNG/WEBP maksimal 2 MB, dan disajikan melalui `FileController` dengan proteksi *path traversal*.
5. **Integritas Keuangan dan Data Sensitif:** Nominal Rupiah bertipe bilangan bulat IDR; nomor WhatsApp dinormalisasi ke awalan `628...`; pesanan dilarang dihapus permanen (*soft cancel* ke `CANCELLED`); pemasukan order di `cash_flows` otomatis dibuat dari `OrderPayment` dan terkunci dari ubah/hapus manual; seluruh data *seed* dan demo wajib memakai data contoh fiktif/anonim.
6. **Prioritas Responsivitas Perangkat:** Setiap halaman admin Filament maupun halaman publik `/order` dan `/track/{uuid}` wajib diuji pada lebar layar HP (`375px`), tablet (`768px`), dan desktop (`1280px+`).

---

## 3. Peta Jalan 4 Minggu Sesuai Pedoman (Posisi Aktif: Minggu 3)

| Minggu | Kegiatan Utama | Penanggung Jawab | Keluaran Checkpoint | Status |
| :---: | :--- | :--- | :--- | :---: |
| **1** | Kunjungan pertama ke Cindy Advertising (16 Nov 2026), wawancara Ibu Diana & Bapak Hermanto, observasi alur nota manual, pemetaan masalah & 5 kebutuhan prioritas. | Fauzan (Koordinator), Naufal (Pencatat), Farrel (Observasi) | Catatan lapangan, bukti izin, daftar masalah, dan daftar kebutuhan prioritas (`Document/field_notes_and_requirements.md`). | Selesai |
| **2** | Analisis kebutuhan, perancangan ERD 8 tabel, daftar fitur, mockup antarmuka HP & desktop, serta konfirmasi rancangan ke mitra. | Seluruh tim | ERD, daftar fitur, mockup antarmuka (`Document/system_blueprint.md` & aset Bab 4 laporan), persetujuan mitra. | Selesai |
| **3** | **Pembangunan aplikasi Laravel 11 + Filament v3 + SQLite:** migrasi 8 tabel, model & relasi, factory/seeder, service transaksional, Filament Resources, Dashboard Widgets, serta halaman publik `/order` & `/track/{uuid}`. | **Fauzan** (Core/DB/Services), **Farrel** (Filament UI & Publik), **Naufal** (Seeder/Widgets/WA/Validasi) | Fitur inti berjalan dengan data contoh anonim dan riwayat commit merata dari ketiga anggota. | **Aktif Sekarang** |
| **4** | Kunjungan kedua uji coba langsung bersama Cindy Advertising di HP & PC, perbaikan umpan balik mitra, finalisasi Laporan Akhir (maks 15 hal), presentasi & demo (10+5 menit), refleksi individu (1 hal/orang), dan *peer assessment*. | **Farrel** (Pimpin Uji Coba), **Naufal** (Finalisasi Laporan & Slide), **Fauzan** (Perbaikan Inti & Koordinasi Mitra) | Aplikasi final + README, bukti uji coba & daftar perbaikan, Laporan Akhir PDF, slide presentasi, 3 refleksi individu. | Berikutnya |

---

## 4. Rencana Eksekusi Cepat Minggu 3 (Fase Migrasi ke Laravel 11 + Filament)

Karena posisi proyek sudah berada di **Minggu 3**, pengerjaan kode dibagi menjadi tiga gelombang terkoordinasi:

1. **Gelombang 1 — Fondasi Laravel 11, SQLite, & 8 Tabel (Fauzan — Hari 1–2):**
   - Inisialisasi proyek Laravel 11 + `composer require filament/filament:"^3.2" -W` + `php artisan filament:install --panels`.
   - Konfigurasi `.env.example` untuk `DB_CONNECTION=sqlite`, buat 8 Migration, Eloquent Models + Relasi, PHP Backed Enums, dan Policies RBAC.
   - Push ke branch dasar Laravel agar Farrel dan Naufal langsung menarik fondasi yang sama.
2. **Gelombang 2 — Implementasi Paralel (Hari 3–5):**
   - **Fauzan:** `OrderService` (6 tahap + potong stok idempoten + *soft cancel*/*refund*), `PaymentService` (auto-sync `cash_flows`), `RevisionService`, `InventoryService` (restock terintegrasi kas), dan `FileController`.
   - **Farrel:** `OrderResource` (+ `ItemsRelationManager`, `RevisionsRelationManager`, `PaymentsRelationManager`), `RawMaterialResource`, `CashFlowResource`, `UserResource`, `ManageShopSettings`, serta Livewire publik `PublicOrderForm` (`/order`) dan `OrderTracker` (`/track/{uuid}`).
   - **Naufal:** `DatabaseSeeder` + Factories (minimal 30 data contoh realistis anonim lintas 6 bulan mencakup Cup, Plastik, DTF Baju, dan Stiker), `WaTemplateHelper` + `FormatterHelper`, aturan validasi `specs` 4 layanan, `OverviewStatsWidget`, `FinanceTrendChart`, `ServiceProportionChart`, `LowStockMaterialsWidget`, dan `README.md`.
3. **Gelombang 3 — Integrasi & Uji 6 Skenario Kritis (Semua Anggota — Hari 6–7):**
   - Merge seluruh Pull Request ke branch utama, jalankan `php artisan migrate:fresh --seed`, dan uji bersama 6 skenario wajib pada `Document/system_blueprint.md` Bagian 7 di layar HP dan desktop sebelum uji coba ke Cindy Advertising di Minggu 4.

---

## 5. Pembagian Kepemilikan File (Anti *Merge Conflict*)

1. **Fauzan (`feat/laravel-core-services`):** `database/migrations/*`, `app/Enums/*`, `app/Models/*`, `app/Policies/*`, `app/Services/*`, `app/Http/Controllers/FileController.php`, `app/Providers/Filament/AdminPanelProvider.php`.
2. **Farrel (`feat/filament-resources-and-public`):** `app/Filament/Resources/*`, `app/Filament/Pages/*`, `app/Livewire/Public/*`, `resources/views/layouts/public.blade.php`, `resources/views/livewire/public/*`, `routes/web.php`.
3. **Naufal (`feat/seeders-widgets-helpers-docs`):** `database/factories/*`, `database/seeders/*`, `app/Filament/Widgets/*`, `app/Helpers/*`, `app/Http/Requests/*`, `README.md`, serta pemeliharaan dokumen di `Document/`.

**Zona Rawan Konflik (Wajib Koordinasi Sebelum Ubah):** `composer.json`, `database/migrations/*`, `app/Models/*`, `routes/web.php`.

---

## 6. SOP Instalasi Lokal dan Alur Kerja Git

### A. Prasyarat Lingkungan Lokal
Pastikan setiap anggota memiliki **PHP 8.2+** (dengan ekstensi `pdo_sqlite`, `sqlite3`, `intl`, `zip`, `mbstring`, `fileinfo` aktif — misalnya melalui **Laragon** atau **Laravel Herd** di Windows), **Composer**, dan **Node.js 20+** (untuk kompilasi aset Vite/Tailwind).

### B. Langkah Setup Setelah Fondasi Laravel di-Push
```bash
git clone https://github.com/Palz21/Project_StikerTempel.git
cd Project_StikerTempel
composer install
npm install
copy .env.example .env
php artisan key:generate
New-Item -ItemType File -Path database\database.sqlite -Force
php artisan migrate:fresh --seed
npm run build
php artisan serve
```

### C. Aturan Branch, Commit, dan File Lokal
1. Setiap anggota bekerja pada *feature branch* masing-masing, melakukan commit berkala dengan pesan deskriptif (contoh: `feat(order): add idempotent stock deduction in production queue`), lalu menggabungkan ke branch utama melalui Pull Request.
2. File yang wajib diabaikan oleh `.gitignore` dan tidak boleh masuk repositori: `.env`, `vendor/`, `node_modules/`, `database/database.sqlite`, dan isi `storage/app/private/uploads/*` (kecuali `.gitkeep`).

---

## 7. Checklist 8 Produk Luaran dan Strategi Rubrik Penilaian

| No | Produk Luaran Pedoman | Target Lokasi / File | Penanggung Jawab Utama | Target Rubrik (Skor 4) |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Catatan lapangan & bukti izin | `Document/field_notes_and_requirements.md` + Lampiran Laporan | Naufal & Fauzan | Wawancara & observasi mendalam, etika terpenuhi, bukti izin ditandatangani mitra. |
| 2 | Dokumen kebutuhan | `Document/field_notes_and_requirements.md` & Bab III Laporan | Naufal | Masalah tajam, 5 kebutuhan prioritas jelas, batas lingkup tegas. |
| 3 | Rancangan (ERD, fitur, mockup) | `Document/system_blueprint.md` & Bab IV Laporan (beserta gambar ERD & mockup) | Fauzan & Farrel | ERD akurat, mockup jelas (HP & PC), konfirmasi mitra tercatat. |
| 4 | Aplikasi Laravel 11 + Filament | Root repositori Git + `README.md` + `DatabaseSeeder` | Seluruh Tim | Fitur inti penuh, relasi & validasi tepat, seeder siap pakai, 6 skenario lolos. |
| 5 | Bukti uji coba & daftar perbaikan | Foto/catatan uji coba di Bab VI Laporan (Minggu 4) | Farrel & Fauzan | Diuji langsung dengan Cindy Advertising, umpan balik & perbaikan terdokumentasi. |
| 6 | Laporan akhir (maks 15 halaman) | `Document/Laporan-Proyek-Akhir/*.docx` & `.pdf` | Naufal (review semua) | Lengkap 8 bab sesuai outline, bahasa resmi & mengalir, lampiran utuh. |
| 7 | Presentasi dan demo (10 + 5 menit) | `Document/presentation_and_reflection_guide.md` + demo lokal | Seluruh Tim | Alur runtut, demo lancar tanpa error, jawaban pertanyaan tepat. |
| 8 | Refleksi individu (1 hal/orang) & *Peer Assessment* | `Document/presentation_and_reflection_guide.md` + 3 lembar refleksi di Minggu 4 | Masing-masing individu | Menjawab 4 pertanyaan refleksi secara jujur, didukung bukti commit merata. |
