# System Design & Technical Blueprint
## UMKM Percetakan Kemasan Custom Berbasis Web (Mitra: Cindy Advertising)

**Mata Kuliah:** Pemrograman Web dan Aplikasi  
**Dosen Pengampu:** Afifah Dwi Ramadhani, S.ST., M.Tr.T.  
**Mitra UMKM:** Cindy Advertising, Sidoarjo (Pemilik: Ibu Diana dan Bapak Hermanto)  
**Tim Pengembang:** Muhammad Farrel Setiawan (`2424600036`), Fauzan Alwahyu Utomo (`2424600054`), Naufal Ridho Athallah (`2424600058`)  
**Stack Teknologi:** Laravel 11, Filament v3, Blade + Livewire 3 (Tailwind CSS), SQLite

---

## 1. Ringkasan Eksekutif dan Penyelarasan Pedoman

Aplikasi ini merupakan sistem manajemen operasional, pemesanan *pre-order*, manajemen stok bahan baku, dan pencatatan arus kas berbasis web yang dirancang khusus untuk menjawab permasalahan nyata pada **Cindy Advertising** di Sidoarjo. Cindy Advertising beroperasi dengan sekitar 4 tenaga kerja dan menerima rata-rata 4 hingga 5 pesanan setiap hari dalam jumlah partai besar, melayani empat produk utama yaitu **Gelas Cup Sablon**, **Plastik Kemasan/Sablon**, **Sablon DTF Baju**, dan **Stiker**.

Rancangan ini disusun mengikuti pedoman proyek mata kuliah Pemrograman Web dan Aplikasi menggunakan **Laravel 11**, **Filament v3**, **Blade/Livewire**, dan **SQLite**, dengan penyesuaian khusus yang telah disetujui dosen pengampu yaitu mempertahankan **halaman publik tanpa login** untuk pelanggan (`/order` dan `/track/{uuid}`) serta **cakupan 8 tabel basis data**.

### Prinsip Desain dan Batasan Operasional
1. **Lingkungan Eksekusi Lokal dan Ringan:** Berjalan 100% secara lokal menggunakan PHP 8.2+ dan SQLite tanpa ketergantungan layanan *cloud*, *payment gateway* berbayar, maupun WhatsApp API berbayar.
2. **Responsif Lintas Perangkat (*Mobile-First*):** Karena operasional harian Cindy Advertising utamanya dilakukan melalui ponsel pintar (HP), seluruh halaman admin Filament maupun halaman publik pelanggan wajib tampil nyaman pada layar HP, tablet, maupun PC/desktop.
3. **Arsitektur *Hybrid Modular Monolith*:** Panel internal Owner dan Admin/Karyawan dibangun dengan **Filament v3** untuk kecepatan CRUD, filter, relasi, dan analitik; sedangkan halaman publik pelanggan (`/order` dan `/track/{uuid}`) dibangun dengan **Blade + Livewire 3 + Tailwind CSS** tanpa mewajibkan akun login.
4. **Kepatuhan Keamanan Data Sensitif:** Sesuai ketentuan pedoman, seluruh data contoh pada *Seeder*, *Factory*, tangkapan layar laporan, dan demo kelas wajib memakai data fiktif atau anonim. Data transaksi serta keuangan asli Cindy Advertising hanya disimpan secara lokal pada perangkat mitra.
5. **Pemetaan Lapisan Basis Data (8 Tabel):** Untuk menjaga keteraturan pembangunan pada Minggu 3 hingga Minggu 4, delapan tabel dikelompokkan menjadi **Lapisan Inti Operasional (MVP)** yang meliputi `orders`, `order_items`, dan `order_payments`, serta **Lapisan Pendukung Terintegrasi** yang meliputi `users`, `raw_materials`, `order_revisions`, `cash_flows`, dan `shop_settings`.

---

## 2. Tech Stack dan Infrastruktur Lokal

| Komponen | Teknologi | Alasan Pemilihan |
| :--- | :--- | :--- |
| **Framework Utama** | Laravel 11 (PHP 8.2+) | Sesuai ketentuan pedoman mata kuliah, menyediakan Eloquent ORM, Migration, Seeder/Factory, Policy RBAC, dan transaksi basis data `DB::transaction()`. |
| **Panel Admin (Owner & Admin)** | Filament v3 (`filament/filament:^3.2`) | Sesuai materi modul 5 dan 6 pedoman; menyediakan Resource CRUD, Relation Manager, Filter, Quick Actions, dan Dashboard Widgets yang otomatis responsif di HP, tablet, dan PC. |
| **Halaman Publik Client** | Blade + Livewire 3 + Tailwind CSS | Livewire 3 dan Tailwind CSS sudah terpasang bersama Filament v3, ideal untuk membangun formulir dinamis `/order` dan halaman pelacakan `/track/{uuid}` tanpa login. |
| **Database** | SQLite (`database/database.sqlite`) | Ringan, tanpa instalasi server database terpisah antar anggota tim, sudah didukung penuh secara bawaan oleh Laravel 11 termasuk *foreign key constraints* dan transaksi ACID. |
| **Visualisasi Data** | Filament Chart Widgets (Chart.js) | Terintegrasi langsung dengan panel Filament untuk menampilkan grafik tren Omset vs Pengeluaran vs Laba Bersih 6 bulan serta proporsi layanan. |
| **Penyimpanan File Lokal** | Laravel Storage Disk (`storage/app/private/uploads`) | File unggahan (logo, *mockup*, bukti bayar) divalidasi ketat (`jpg`, `jpeg`, `png`, `webp`, maks 2 MB) dan disajikan aman lewat `FileController` dengan validasi *path traversal*. |
| **Autentikasi & Keamanan** | Laravel Session Auth + Filament Policies + UUID v4 | Autentikasi panel admin bawaan Laravel/Filament (`FilamentUser`), pemisahan peran `OWNER` vs `ADMIN` melalui Policy, serta token UUID v4 untuk mencegah celah IDOR pada `/track/{uuid}`. |

---

## 3. Alur Bisnis Lengkap (*End-to-End Workflows*)

### 3.1. Dua Skenario Pemesanan Terpadu
Kedua jalur pemesanan bermuara ke satu tabel `orders` dan satu antrean kerja yang sama pada `OrderResource` di panel Filament:

1. **Skenario A (Pesan via WhatsApp atau Langsung, Admin Input Cepat):** Pelanggan bersepakat lewat chat WhatsApp atau datang langsung ke workshop Cindy Advertising. Admin atau Owner membuka panel Filament, memilih menu tambah pesanan baru, mengisi identitas pelanggan, rincian item layanan, total harga, serta nominal pembayaran awal (boleh `0`). Pesanan langsung aktif pada status `WAITING_ACC_PAYMENT` (atau langsung `PRODUCTION_QUEUE` jika desain sudah disetujui dan DP masuk), sistem menerbitkan UUID pelacakan, lalu menampilkan aksi cepat **Generator Teks WhatsApp**.
2. **Skenario B (Pelanggan Input Mandiri Tanpa Login melalui `/order`):** Pemilik mengirim tautan `/order` kepada pelanggan. Pelanggan mengisi nama, nomor WhatsApp, kategori layanan, spesifikasi dinamis, jumlah pesanan, unggah logo mentah, dan metode pengambilan tanpa perlu mendaftar akun. Sistem menyimpannya dengan status **`PENDING_REVIEW` (`Pesanan Masuk`)**. Pada tahap ini stok bahan baku belum dipotong dan nilai omset belum dihitung. Setelah admin memeriksa desain serta menetapkan harga final di Filament, admin menekan aksi **Konfirmasi Order** untuk memindahkannya ke tahap berikutnya dan mengirim tautan pelacakan `/track/{uuid}`.

### 3.2. Multi-Layanan dan Spesifikasi Dinamis (`order_items.specs`)
Cindy Advertising melayani empat produk utama yang spesifikasinya berbeda. Seluruh spesifikasi khusus disimpan pada kolom `specs` bertipe `json` (di-cast sebagai `array` pada model `OrderItem`) dengan struktur kunci yang divalidasi oleh Form Request / skema Filament:

1. **Gelas Cup (`CUP`):** `size` (contoh `12oz`, `14oz`, `16oz`, `22oz`), `cupType` (`Datar` atau `Oval`), `colorCount` (angka jumlah warna sablon), dan `lidType` (`Flat`, `Dome`, atau `Tanpa Tutup`).
2. **Plastik Kemasan/Sablon (`PLASTIK`):** `size` (contoh `15x30`, `20x35`, `25x40`), `plasticColor` (warna dasar plastik), `colorCount` (jumlah warna), dan `sides` (`1 Sisi` atau `2 Sisi`).
3. **Sablon DTF Baju (`DTF_BAJU`):** `apparelType` (contoh `Kaos`, `Hoodie`, `Flanel`), `bringOwnApparel` (`true` jika pelanggan membawa pakaian sendiri), `printArea` (`Logo Dada`, `A4`, `A3`), dan `sizeBreakdown` (rincian ukuran `S/M/L/XL`).
4. **Stiker (`STIKER`):** `material` (`Chromo`, `Vinyl`, `Transparan`, atau bahan lain), `size` (ukuran satuan atau lembar `A3+`), `cutType` (`Kiss-Cut`, `Die-Cut`, atau `Potong Persegi`), dan `lamination` (`Tanpa Laminasi`, `Glossy`, atau `Doff`).
5. **Lainnya (`LAINNYA`):** `customNotes` (uraian bebas untuk pekerjaan percetakan khusus di luar empat kategori utama).

**Integrasi Stok Fleksibel:** Item `CUP`, `PLASTIK`, `STIKER`, maupun kaos polos pada `DTF_BAJU` dapat ditautkan ke `raw_materials` agar stok terpotong otomatis saat masuk antrean produksi. Apabila pelanggan membawa pakaian sendiri (`bringOwnApparel == true`) atau memakai bahan non-stok, kolom `raw_material_id` dibiarkan `null`.

### 3.3. Sistem Pembayaran Angka Langsung (*Payment Ledger*)
Fitur ini menjawab langsung permasalahan utama Cindy Advertising yang selama ini harus mencari nota kertas satu per satu dan rentan salah tulis saat pelanggan mencicil pembayaran:

1. Seluruh pembayaran dicatat sebagai baris transaksi nominal langsung (bilangan bulat Rupiah) pada tabel `order_payments` melalui `PaymentsRelationManager` atau tombol *Quick Action* **`+ Bayar`** di daftar pesanan.
2. Tersedia tombol pintas **`Isi Sisa Tagihan`** yang otomatis mengisi input nominal sesuai sisa piutang pelanggan saat itu.
3. Status pembayaran dihitung otomatis (*computed accessor* pada model `Order`):
   $$\text{Total Terbayar} = \sum (\text{order\_payments.amount})$$
   $$\text{Sisa Tagihan} = \text{orders.total\_price} - \text{Total Terbayar}$$
   Jika Total Terbayar bernilai `0` tampil badge abu-abu **`Belum Bayar`**, jika lebih dari `0` namun kurang dari Total Harga tampil badge kuning **`Kurang Rp[Sisa]`**, dan jika sama dengan atau melebihi Total Harga tampil badge hijau **`Lunas`**.
4. **Sinkronisasi Arus Kas Atomik:** Setiap pencatatan pembayaran di `OrderPaymentService` wajib dijalankan dalam `DB::transaction()` agar sekaligus membuat satu baris `INCOME` pada tabel `cash_flows` yang terkunci dari pengeditan manual.

### 3.4. Alur Pengerjaan 6 Tahap (*Finite State Machine*)

| No | Enum `OrderStatus` | Label Antarmuka | Aturan Bisnis dan Aksi Sistem |
| :---: | :--- | :--- | :--- |
| 1 | `PENDING_REVIEW` | Pesanan Masuk | Khusus Skenario B dari `/order`. Admin memverifikasi spesifikasi, menetapkan harga final, lalu mengonfirmasi pesanan. |
| 2 | `WAITING_ACC_PAYMENT` | Menunggu ACC & Bayar | Admin mengunggah *mockup* desain dan mengirim tagihan. Pelanggan dapat menyetujui (ACC) atau mengajukan revisi di `/track/{uuid}`. |
| 3 | `PRODUCTION_QUEUE` | Antre Produksi | **Trigger Atomik:** Di dalam `DB::transaction()`, jika `stock_deducted == false`, stok pada `raw_materials` yang tertaut dikurangi sesuai `qty` item, lalu `stock_deducted` diset `true`. |
| 4 | `IN_PROGRESS` | Proses Pengerjaan | Tahap cetak/sablon/cutting/press DTF. Perubahan desain dan item dikunci permanen. |
| 5 | `READY_FOR_PICKUP` | Siap Diambil / Dikirim | Barang selesai dikemas. Menampilkan peringatan jika Sisa Tagihan masih lebih dari `0`, serta alamat Maps (*Self-Pickup*) atau nomor resi (*Ekspedisi*). |
| 6 | `COMPLETED` | Selesai | Barang telah diserahkan dan pembayaran telah lunas. |
| 7 | `CANCELLED` | Dibatalkan | Status terminasi (*soft cancel*). Data pesanan dilarang dihapus permanen (*hard delete*) demi keutuhan audit keuangan. |

### 3.5. Pengelolaan Revisi Desain dan Pembatalan (*Soft Cancel* & *Refund*)
1. **Batas Aman Revisi (*Point of No Return*):** Pelanggan hanya dapat mengajukan revisi atau menyetujui desain melalui `/track/{uuid}` pada Tahap 1 dan Tahap 2. Begitu pesanan masuk Tahap 3 (`PRODUCTION_QUEUE`), tombol revisi di halaman publik otomatis dinonaktifkan. Setiap versi desain dicatat berurutan (`v1`, `v2`, `v3`) pada `order_revisions` bersama sub-status `DesignStatus` (`PENDING`, `WAITING_ACC`, `REVISION_REQUESTED`, `APPROVED`).
2. **Penyesuaian Jumlah/Harga oleh Admin:** Pada Tahap 1 dan 2, pengubahan item otomatis menghitung ulang `total_price` dan sisa tagihan tanpa mengganggu riwayat `order_payments`. Jika terpaksa diubah pada Tahap 3 sebelum proses cetak dimulai, `OrderService` menghitung selisih stok ($\Delta = \text{Qty Baru} - \text{Qty Lama}$) dan menyesuaikannya secara atomik.
3. **Pembatalan Order dan *Refund*:** Jika order belum dibayar dan belum masuk produksi, status cukup diubah menjadi `CANCELLED` disertai `cancel_reason`. Jika sudah ada pembayaran, admin mengisi nominal **`Nominal Refund (Rp)`** sehingga sistem mempertahankan baris `INCOME` lama dan menyisipkan baris `EXPENSE` baru berkategori `Refund Pembatalan` pada `cash_flows`. Jika `stock_deducted == true`, tersedia opsi *toggle* **"Kembalikan stok bahan baku polosan ke gudang?"** (diaktifkan jika bahan belum tercetak, dan dimatikan jika bahan sudah telanjur rusak/tercetak).

---

## 4. Arsitektur Antarmuka (Panel Filament dan Halaman Publik)

### 4.1. Halaman Publik Pelanggan Tanpa Login (Blade + Livewire 3)
1. **`/order` (Pemesanan Mandiri):** Formulir responsif mobile-first dengan pemilihan kategori layanan (`CUP`, `PLASTIK`, `DTF_BAJU`, `STIKER`, `LAINNYA`), field spesifikasi yang berubah dinamis dengan Livewire, unggah logo mentah (JPG/PNG/WEBP maks 2 MB), serta pilihan metode pengambilan.
2. **`/track/{uuid}` (Pelacakan Pesanan & Persetujuan Desain):** Menampilkan bilah progres 6 tahap (atau spanduk pembatalan jika `CANCELLED`), pratinjau *mockup* terbaru beserta tombol **`Setujui Desain (ACC)`** dan **`Ajukan Revisi`** ketika `design_status == WAITING_ACC` dan tahap belum mencapai `PRODUCTION_QUEUE`, ringkasan tagihan (`Total`, `Terbayar`, `Sisa Tagihan`) plus info rekening Cindy Advertising, informasi pengambilan/resi, serta tombol pintas **Chat Admin WhatsApp**. Permintaan dengan UUID yang tidak valid mengembalikan halaman `404 Not Found`.

### 4.2. Panel Admin Filament (`/admin` — RBAC `OWNER` vs `ADMIN`)
Navigasi sidebar Filament disusun ringkas menjadi 5 kelompok menu utama yang ramah layar HP:
1. **Dashboard Overview (`/admin`):** 4 Kartu KPI (`StatsOverviewWidget`: *Omset Bulan Ini*, *Laba Bersih* [khusus `OWNER`], *Total Piutang Aktif*, *Perlu Tindakan*), 2 Grafik (`ChartWidget`: Tren Omset vs Pengeluaran vs Laba Bersih 6 bulan & Proporsi 4 Layanan), serta widget tabel *Stok Menipis*.
2. **Manajemen Pesanan (`OrderResource`):** Tab filter cepat (`Perlu Review`, `Revisi Desain`, `Antre & Proses`, `Siap Diambil`, `Belum Lunas`, `Selesai`, `Dibatalkan`), pencarian instan berdasarkan kode order, nama pelanggan, dan nomor WA, *Relation Manager* untuk Item, Revisi Mockup, dan Pembayaran, serta aksi cepat (`+ Bayar`, `Naikkan Status`, `Salin Link Tracking`, `Generator Teks WA`, `Batalkan Pesanan`).
3. **Stok Bahan Baku (`RawMaterialResource`):** Pengelolaan stok cup polosan, plastik, kaos polos, dan bahan stiker dengan badge `Aman` atau `Menipis`, dilengkapi aksi **`Restock Bahan`** yang menyediakan opsi mencentang pencatatan biaya kulakan otomatis sebagai `EXPENSE` di `cash_flows`.
4. **Arus Kas & Keuangan (`CashFlowResource` — Khusus `OWNER`):** Tersembunyi dan diblokir melalui `CashFlowPolicy` bagi peran `ADMIN`. Menyediakan filter rentang tanggal, ringkasan Pemasukan vs Pengeluaran vs **Laba Bersih**, form **`+ Catat Pengeluaran`** (tinta, film DTF, screen, kertas stiker, listrik), dan jurnal transaksi gabungan di mana baris pemasukan dari pembayaran order berlabel `Auto` dan terkunci dari edit/hapus manual.
5. **Pengaturan Workshop (`ShopSettingPage` & `UserResource`):** Salin tautan `/order`, ubah profil/alamat/Maps/rekening Cindy Advertising, serta manajemen akun `ADMIN` (khusus `OWNER`).

---

## 5. Skema Database Lengkap (8 Tabel — Laravel 11 & SQLite)

Seluruh nominal uang (Rupiah) menggunakan `unsignedBigInteger` atau `integer` bilangan bulat IDR agar bebas dari masalah pembulatan *floating point*.

### 5.1. Ringkasan Tabel, Kolom, dan Relasi Eloquent

| No | Nama Tabel | Lapisan | Kolom Utama | Relasi Eloquent |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `users` | Pendukung (Auth) | `id`, `name`, `email` (unique), `password`, `role` (`OWNER`/`ADMIN`), `is_active`, `timestamps` | Implementasi `FilamentUser` (`canAccessPanel()`) |
| 2 | `raw_materials` | Pendukung (Stok) | `id`, `name`, `category` (`CUP`/`PLASTIK`/`DTF_BAJU`/`STIKER`/`LAINNYA`), `stock_qty`, `min_stock`, `unit`, `timestamps` | `hasMany(OrderItem::class)` |
| 3 | `orders` | **Inti (MVP)** | `id`, `uuid` (unique), `order_code` (unique, `ORD-YYMM-XXX`), `source` (`ADMIN`/`CLIENT_LINK`), `customer_name`, `customer_wa`, `status`, `design_status`, `revision_count`, `pickup_method`, `tracking_number`, `total_price`, `current_mockup_url`, `notes`, `stock_deducted`, `cancelled_at`, `cancel_reason`, `refund_amount`, `timestamps` | `hasMany(OrderItem::class)`, `hasMany(OrderRevision::class)`, `hasMany(OrderPayment::class)`, `hasMany(CashFlow::class)` |
| 4 | `order_items` | **Inti (MVP)** | `id`, `order_id` (FK cascade), `category`, `raw_material_id` (FK nullable set null), `item_name`, `specs` (JSON), `qty`, `unit_price`, `subtotal`, `logo_url`, `timestamps` | `belongsTo(Order::class)`, `belongsTo(RawMaterial::class)` |
| 5 | `order_revisions` | Pendukung (Desain) | `id`, `order_id` (FK cascade), `version`, `mockup_url`, `client_note`, `admin_note`, `timestamps` (`unique(order_id, version)`) | `belongsTo(Order::class)` |
| 6 | `order_payments` | **Inti (MVP)** | `id`, `order_id` (FK cascade), `amount`, `payment_method` (`TRANSFER`/`TUNAI`/`QRIS`), `proof_url`, `note`, `paid_at`, `timestamps` | `belongsTo(Order::class)`, `hasOne(CashFlow::class)` |
| 7 | `cash_flows` | Pendukung (Keuangan) | `id`, `type` (`INCOME`/`EXPENSE`), `category`, `amount`, `order_payment_id` (FK unique nullable), `order_id` (FK nullable), `description`, `date`, `timestamps` | `belongsTo(OrderPayment::class)`, `belongsTo(Order::class)` |
| 8 | `shop_settings` | Pendukung (Konfig) | `id` (singleton = 1), `shop_name`, `whatsapp_number`, `address`, `maps_url`, `bank_info`, `timestamps` | Singleton konfigurasi workshop Cindy Advertising |

### 5.2. Pemetaan Fitur ke Materi Modul Pedoman

| Kebutuhan Mitra | Implementasi Laravel 11 & Filament v3 | Modul Pedoman |
| :--- | :--- | :---: |
| Tabel 8 entitas, relasi, dan enum status | Migration SQLite, Eloquent Model, `hasMany`/`belongsTo`/`hasOne`, PHP Backed Enums | Modul 2, 3 |
| Data contoh anonim lintas 6 bulan untuk uji & demo | `DatabaseSeeder` dan Model `Factory` (`RawMaterialFactory`, `OrderFactory`, dll.) | Modul 4 |
| Daftar, tambah, ubah, filter, dan cari pesanan/stok/kas | Filament Resources (`OrderResource`, `RawMaterialResource`, `CashFlowResource`) | Modul 5, 6 |
| Pilih bahan baku dan kelola item/pembayaran/revisi | `Select::make()->relationship()` dan Filament `RelationManager` | Modul 6 |
| Rekap omset, laba bersih, piutang aktif, dan grafik | Filament `StatsOverviewWidget`, `ChartWidget`, dan `TableWidget` stok menipis | Modul 6 |
| Halaman pesan & lacak publik tanpa login (permintaan dosen) | Blade + Livewire 3 (`/order`, `/track/{uuid}`) + UUID anti-IDOR | Perluasan |
| Potong stok idempoten, payment ledger, dan soft cancel/refund | Service Layer dengan `DB::transaction()` dan Policy RBAC `OWNER`/`ADMIN` | Perluasan |

---

## 6. Struktur Direktori Laravel 11 + Filament v3

```text
Project_StikerTempel/
├── Document/
│   ├── system_blueprint.md                # Dokumen arsitektur teknis (file ini)
│   ├── team_workflow.md                   # Pembagian peran pedoman, jadwal 4 minggu, SOP Git
│   ├── field_notes_and_requirements.md    # Catatan wawancara 16 Nov, profil mitra, kebutuhan
│   ├── shared/                            # Utilitas konversi dokumen
│   └── Laporan-Proyek-Akhir/              # Skrip generator, aset ERD/mockup/logo, DOCX & PDF
├── app/
│   ├── Enums/                             # UserRole, OrderSource, OrderStatus, DesignStatus,
│   │                                      # ServiceCategory, PickupMethod, PaymentMethod, CashFlowType
│   ├── Models/                            # User, RawMaterial, Order, OrderItem, OrderRevision,
│   │                                      # OrderPayment, CashFlow, ShopSetting
│   ├── Policies/                          # CashFlowPolicy, UserPolicy, OrderPolicy, RawMaterialPolicy
│   ├── Services/                          # OrderService, PaymentService, RevisionService,
│   │                                      # InventoryService, FinanceAnalyticsService
│   ├── Helpers/                           # WaTemplateHelper, FormatterHelper, FileUploadHelper
│   ├── Filament/
│   │   ├── Resources/
│   │   │   ├── OrderResource.php (+ RelationManagers: Items, Revisions, Payments)
│   │   │   ├── RawMaterialResource.php
│   │   │   ├── CashFlowResource.php       # Khusus OWNER (dibatasi CashFlowPolicy)
│   │   │   └── UserResource.php           # Khusus OWNER (dibatasi UserPolicy)
│   │   ├── Pages/
│   │   │   └── ManageShopSettings.php     # Pengaturan profil, rekening, Maps, salin link /order
│   │   └── Widgets/
│   │       ├── OverviewStatsWidget.php    # 4 KPI Cards (Laba Bersih hanya tampil untuk OWNER)
│   │       ├── FinanceTrendChart.php      # Grafik Omset vs Pengeluaran vs Laba Bersih 6 bulan
│   │       ├── ServiceProportionChart.php # Donut Chart proporsi Cup, Plastik, DTF, Stiker
│   │       └── LowStockMaterialsWidget.php
│   ├── Livewire/
│   │   └── Public/
│   │       ├── PublicOrderForm.php        # Skenario B (/order) dengan dynamic specs 4 layanan
│   │       └── OrderTracker.php           # Pelacakan /track/{uuid} + ACC/Revisi desain
│   └── Http/Controllers/
│       └── FileController.php             # Penyaji file tervalidasi dari storage/app/private/uploads
├── database/
│   ├── database.sqlite                    # File database SQLite lokal (di-ignore Git)
│   ├── migrations/                        # 8 tabel inti + indeks status/tanggal
│   ├── factories/                         # Factory data contoh anonim
│   └── seeders/                           # DatabaseSeeder (akun default, setting, bahan, order 6 bulan)
├── resources/views/
│   ├── layouts/public.blade.php           # Layout minimalis mobile-first halaman publik
│   └── livewire/public/                   # public-order-form.blade.php, order-tracker.blade.php
├── routes/web.php                         # Route /order, /track/{uuid}, /files/{path}
└── storage/app/private/uploads/           # Penyimpanan lokal logo, mockup, bukti bayar (.gitkeep)
```

---

## 7. Daftar Periksa Validasi (*Double-Check Checklist*) Sebelum Uji Coba & Demo

Enam skenario kritis berikut wajib lulus pengujian lokal sebelum kunjungan uji coba ke Cindy Advertising pada Minggu 4 dan demo di hadapan dosen:

1. **Uji Idempotensi Stok:** Naikkan status order dari `WAITING_ACC_PAYMENT` ke `PRODUCTION_QUEUE`, pastikan stok `raw_materials` berkurang tepat sekali (`stock_deducted = true`), lalu naikkan ke `IN_PROGRESS` dan pastikan stok tidak terpotong ulang.
2. **Uji *Payment Ledger* (Pengganti Nota Kertas):** Buat pesanan Rp500.000, catat pembayaran Rp150.000 (badge otomatis `Kurang Rp350.000`), klik tombol `Isi Sisa Tagihan` (badge menjadi `Lunas`), dan verifikasi dua baris `INCOME` otomatis muncul di `CashFlowResource`.
3. **Uji Revisi Desain & Kunci Produksi:** Ajukan revisi pada `/track/{uuid}`, unggah mockup `v2` di Filament, klik ACC pada `/track/{uuid}`, lalu pindahkan ke `PRODUCTION_QUEUE` dan pastikan tombol revisi di halaman publik otomatis terkunci/hilang.
4. **Uji Pembatalan (*Soft Cancel*) & *Refund*:** Batalkan pesanan yang sudah dibayar Rp200.000 dengan nominal *refund* Rp150.000; pastikan order tidak terhapus, pemasukan lama tetap tercatat, muncul pengeluaran `Refund Pembatalan` Rp150.000, sehingga Laba Bersih mencerminkan selisih Rp50.000 secara akurat.
5. **Uji Hak Akses (RBAC `OWNER` vs `ADMIN`):** Masuk sebagai akun `admin@cindyadv.local` (`ADMIN`), pastikan menu Arus Kas & Manajemen User tersembunyi dan akses URL langsung ke `/admin/cash-flows` ditolak (`403 Forbidden`); masuk sebagai `owner@cindyadv.local` (`OWNER`) dan pastikan seluruh menu terbuka.
6. **Uji Keamanan UUID, Upload, & Responsivitas HP:** Ubah satu karakter pada `/track/{uuid}` dan pastikan tampil `404 Not Found`; unggah file non-gambar atau di atas 2 MB dan pastikan ditolak; uji seluruh alur di layar ukuran HP (`375px`) dan desktop.
