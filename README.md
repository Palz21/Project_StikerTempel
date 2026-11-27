# UMKM Percetakan Kemasan Custom Berbasis Web (Cindy Advertising)

Aplikasi web manajemen operasional, pemesanan *pre-order*, stok bahan baku, dan analitik arus kas/laba bersih untuk mitra UMKM **Cindy Advertising** (Sidoarjo, Jawa Timur). Proyek ini dikembangkan sebagai pemenuhan tugas proyek mata kuliah **Pemrograman Web dan Aplikasi**, Program Studi D4 Teknologi Rekayasa Internet, Politeknik Elektronika Negeri Surabaya (PENS).

- **Dosen Pengampu:** Afifah Dwi Ramadhani, S.ST., M.Tr.T.
- **Mitra UMKM:** Cindy Advertising, Sidoarjo (Pemilik: Ibu Diana dan Bapak Hermanto)
- **Produk Mitra:** Gelas Cup Sablon (`CUP`), Plastik Kemasan/Sablon (`PLASTIK`), Sablon DTF Baju (`DTF_BAJU`), dan Stiker (`STIKER`)
- **Stack Resmi Pedoman:** Laravel 11, Filament v3, Blade + Livewire 3 (Tailwind CSS), dan SQLite

---

## Anggota Kelompok & Pembagian Peran

| NRP | Nama Mahasiswa | Peran Pedoman | Fokus Teknis |
| :---: | :--- | :--- | :--- |
| `2424600036` | **Muhammad Farrel Setiawan** | Pengembang Antarmuka & Pengujian | Filament Resources, Relation Managers, Halaman Publik `/order` & `/track/{uuid}`, responsivitas HP/tablet/PC, pemimpin uji coba mitra |
| `2424600054` | **Fauzan Alwahyu Utomo** | Koordinator Mitra & Pengembang Utama | Penghubung Cindy Advertising, setup Laravel 11 + SQLite, 8 Migrations, Eloquent Models & Enums, RBAC Policies, Services transaksional, `FileController` |
| `2424600058` | **Naufal Ridho Athallah** | Pencatat Lapangan (+ Kontributor Kode) | Dokumentasi lapangan & laporan akhir, `DatabaseSeeder` & Factories, `WaTemplateHelper`, validasi spesifikasi 4 layanan, Filament Widgets |

---

## Fitur Utama

1. **Panel Admin Filament (`/admin` — Responsif HP, Tablet, dan PC):**
   - Manajemen pesanan terpadu (Skenario A input cepat admin & Skenario B verifikasi pesanan masuk dari pelanggan) dengan alur kerja 6 tahap.
   - Spesifikasi dinamis untuk 4 layanan (`CUP`, `PLASTIK`, `DTF_BAJU`, `STIKER`) tersimpan sebagai JSON pada `order_items.specs`.
   - **Payment Ledger** pengganti nota kertas: pencatatan DP/cicilan angka langsung, tombol pintas `Isi Sisa Tagihan`, badge status otomatis (`Belum Bayar`, `Kurang Rp[Sisa]`, `Lunas`), serta sinkronisasi otomatis ke `cash_flows` dalam `DB::transaction()`.
   - Pemotongan stok bahan baku secara idempoten (tepat satu kali saat status naik ke `PRODUCTION_QUEUE`) dan fitur restock terintegrasi pencatatan pengeluaran kas.
   - Pembatalan aman (*soft cancel* ke `CANCELLED`) dengan opsi pengembalian stok polosan dan pencatatan `Refund Pembatalan`.
   - Pembatasan hak akses berbasis peran (`OWNER` vs `ADMIN`): menu Arus Kas, kartu Laba Bersih, dan Manajemen User khusus untuk `OWNER`.
2. **Halaman Publik Pelanggan Tanpa Login (Blade + Livewire 3):**
   - `/order`: Formulir pemesanan mandiri dengan input spesifikasi dinamis dan unggah file logo.
   - `/track/{uuid}`: Pelacakan progres 6 tahap, pratinjau *mockup*, tombol **Setujui Desain (ACC)** dan **Ajukan Revisi** (terkunci otomatis saat masuk `PRODUCTION_QUEUE`), ringkasan tagihan, serta tombol WhatsApp admin.

---

## Prasyarat & Cara Instalasi Lokal (Laravel 11 + SQLite)

> **Catatan Status (Minggu 3):** Dokumen perencanaan, arsitektur, alur kerja, dan draft laporan resmi telah diselaraskan penuh ke Laravel 11 + Filament v3 + SQLite. Proses inisialisasi codebase Laravel 11 menggantikan prototipe awal dijalankan pada fase eksekusi Minggu 3 sesuai `Document/team_workflow.md`.

### Prasyarat
- **PHP 8.2+** dengan ekstensi `pdo_sqlite`, `sqlite3`, `intl`, `zip`, `mbstring`, `fileinfo` aktif (disarankan menggunakan **Laragon** atau **Laravel Herd** pada Windows)
- **Composer 2.x**
- **Node.js 20+** dan **npm** (untuk kompilasi aset Vite/Tailwind)

### Langkah Instalasi
```bash
git clone https://github.com/Palz21/Project_StikerTempel.git
cd Project_StikerTempel

composer install
npm install

copy .env.example .env
php artisan key:generate

# Buat file database SQLite lokal (PowerShell)
New-Item -ItemType File -Path database\database.sqlite -Force

# Jalankan migrasi 8 tabel dan isi data contoh anonim (lintas 6 bulan)
php artisan migrate:fresh --seed

# Kompilasi aset frontend dan jalankan server lokal
npm run build
php artisan serve
```

Setelah server berjalan, buka:
- Panel Admin Filament: `http://127.0.0.1:8000/admin`
- Form Pemesanan Mandiri Publik: `http://127.0.0.1:8000/order`
- Pelacakan Pesanan Publik: `http://127.0.0.1:8000/track/{uuid}`

### Akun Contoh (*Seeder* — Data Fiktif/Anonim)
| Peran | Email | Password | Akses |
| :--- | :--- | :--- | :--- |
| `OWNER` | `owner@cindyadv.local` | `owner123` | Akses penuh termasuk Arus Kas, Laba Bersih, dan Manajemen User |
| `ADMIN` | `admin@cindyadv.local` | `admin123` | Operasional Pesanan, Stok Bahan Baku, dan Profil Workshop (tanpa Arus Kas & Manajemen User) |

> **Kepatuhan Data Sensitif:** Seluruh data pada `DatabaseSeeder` dan materi demo merupakan data contoh fiktif/anonim sesuai ketentuan pedoman. Data keuangan asli Cindy Advertising hanya disimpan secara lokal pada perangkat mitra.

---

## Peta Dokumen Proyek (`Document/`)

- `Document/system_blueprint.md` — Arsitektur teknis lengkap Laravel 11, Filament v3, Blade/Livewire, skema 8 tabel SQLite, dan checklist 6 skenario uji.
- `Document/team_workflow.md` — Pemetaan 4 peran pedoman ke 3 anggota, pembagian kepemilikan file, jadwal 4 minggu, SOP Git, dan checklist 8 produk luaran.
- `Document/field_notes_and_requirements.md` — Profil Cindy Advertising, catatan wawancara 16 November 2026, analisis masalah, 5 kebutuhan prioritas, dan template bukti izin/uji coba.
- `Document/presentation_and_reflection_guide.md` — Panduan presentasi 10 menit, skrip demo 6 skenario, template refleksi individu (1 halaman/mahasiswa), dan format *peer assessment*.
- `Document/Laporan-Proyek-Akhir/` — Skrip generator, diagram ERD & mockup, serta Draft Laporan Proyek Akhir resmi (`.docx` dan `.pdf`).
