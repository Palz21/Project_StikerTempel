# Alur Kerja & Pembagian Tugas Tim (3 Anggota)
**Proyek:** Sistem Manajemen Operasional, Pre-Order, & Analitik Laba UMKM Percetakan Kemasan Custom & Sablon DTF  
**Repository:** `https://github.com/Palz21/Project_StikerTempel.git`  
**Dokumen Referensi Utama:** `Document/system_blueprint.md`

Dokumen ini menjadi panduan operasional bersama agar ketiga anggota tim bekerja selaras, tidak saling menimpa file (*merge conflict*), dan mengikuti kontrak data yang sama sejak awal.

---

## 1. Kesepakatan Teknis & Kontrak Bersama (Wajib Dipatuhi Semua Anggota)

Agar kode dari Anggota 1, 2, dan 3 langsung terhubung tanpa perlu bongkar-pasang ulang, seluruh anggota wajib mematuhi kontrak berikut:

1. **Role Pengguna (`enum Role`):**
   - Menggunakan **`OWNER`** dan **`ADMIN`** (menyelaraskan aturan autentikasi dan akun seed `owner@sablon.local` / `admin@sablon.local`).
   - `OWNER` memiliki akses penuh ke seluruh `/admin/*`, termasuk `/admin/finance` dan manajemen user di `/admin/settings`.
   - `ADMIN` dapat mengakses `/admin`, `/admin/orders/*`, `/admin/inventory`, dan profil workshop pada `/admin/settings`, tetapi **ditolak** saat mengakses `/admin/finance` serta fitur manajemen akun user.
2. **Autentikasi:**
   - Menggunakan `bcryptjs` (hash password) + `jose` (JWT di `httpOnly` cookie) + `src/middleware.ts` untuk proteksi rute `/admin/*`.
   - Tidak menggunakan NextAuth/Auth.js.
3. **Validasi & Struktur `order_items.specs` (`JSON`):**
   - Semua form dan Server Actions wajib divalidasi dengan `zod` dari `src/lib/validations/`.
   - Struktur JSON `specs` dikunci sesuai kategori:
     - `CUP`: `{ size: string, cupType: "Datar" | "Oval", colorCount: number, lidType: string }`
     - `PLASTIK`: `{ size: string, plasticColor: string, colorCount: number, sides: "1 Sisi" | "2 Sisi" }`
     - `DTF_BAJU`: `{ apparelType: string, bringOwnApparel: boolean, printArea: string, sizeBreakdown: string }`
4. **Penyimpanan File Lokal:**
   - File gambar (logo, mockup, bukti bayar) dikompresi di browser (`browser-image-compression`), dikirim ke `/api/upload`, dan disimpan di `./storage/uploads` via `fs/promises`.
   - Validasi server: hanya **JPG, PNG, WEBP** dengan ukuran maksimal **2 MB**.
   - Penyajian gambar hanya melalui `/api/files/[filename]` dengan validasi *path traversal*.
5. **Tipe Data Uang & Format Nomor WA:**
   - Seluruh nominal Rupiah menggunakan tipe `Int` (bilangan bulat IDR).
   - Nomor WhatsApp dinormalisasi ke awalan `628...` sebelum disimpan/dipakai pada deep link `https://wa.me/...`.
6. **Standar UI/UX (*Minimalist UI*):**
   - Latar halaman: `bg-slate-50`, kartu: `bg-white border border-slate-200/70 shadow-sm`, teks & tombol primer: `slate-900`.
   - Gunakan komponen dari `shadcn/ui` (`src/components/ui/`) dan grafik dari `Recharts`.
7. **Larangan *Hard Delete* Order & Integritas Keuangan:**
   - Order tidak pernah dihapus (`DELETE`); pembatalan selalu melalui mekanisme *soft cancel* (`status = CANCELLED`) dan pencatatan refund di `cash_flows`.
   - Pemasukan order pada `cash_flows` dibuat otomatis oleh transaksi pembayaran (`OrderPayment -> CashFlow`) dan tidak boleh diedit/dihapus manual di halaman finance.

---

## 2. Alur Pengerjaan Bertahap (Timeline & Dependensi)

Pengembangan dibagi agar **tidak ada anggota yang menunggu terlalu lama atau bentrok di `main`**:

### Tahap 0 — Persiapan Lokal & Fondasi Awal (Anggota 1)
- Anggota 1 menyiapkan project Next.js App Router + Tailwind + `shadcn/ui`, `prisma/schema.prisma`, `.env.example`, `prisma/seed.ts`, helper database (`src/lib/prisma.ts`), serta validasi `zod` inti (`src/lib/validations/`).
- Anggota 1 memastikan tidak ada TypeScript error (`npx tsc --noEmit`), database lokal berhasil di-push dan di-seed, lalu **push fondasi awal ke branch `main`**.
- **Titik Sinkronisasi 1:** Anggota 2 dan Anggota 3 melakukan `git clone` (atau `git pull origin main`), membuat `.env` lokal masing-masing, menjalankan `npm install`, `npx prisma db push`, dan `npx prisma db seed`.

### Tahap 1 — Fondasi Auth, Upload, & Shell Admin (Anggota 1 + Anggota 3)
- **Anggota 1** menyelesaikan modul Auth (`login`, `logout`, `src/lib/auth.ts`, `src/middleware.ts`), API file upload/reader (`/api/upload`, `/api/files/[filename]`), dan kontrak Server Actions transaksi inti (`order`, `payment`, `inventory`, `finance`).
- **Anggota 3** menyiapkan komponen UI bersama (`src/components/ui/*` dari `shadcn/ui`) dan layout sidebar `/admin/layout.tsx` (diselaraskan dengan helper session dari Anggota 1).
- **Titik Sinkronisasi 2:** Merge ke `main` via Pull Request agar Anggota 2 bisa langsung memakai layout admin, komponen UI dasar, uploader gambar, dan Server Actions order/payment.

### Tahap 2 — Kerja Paralel Fitur Utama (Semua Anggota)
Masing-masing anggota bekerja di branch fitur terpisah:
- **Anggota 1:** Memfinalkan seluruh logika bisnis backend, transaksi atomik `prisma.$transaction`, skenario revisi/kunci produksi, pembatalan/refund, validasi edge case keamanan (IDOR UUID, RBAC, path traversal), serta membantu integrasi PR.
- **Anggota 2:** Membangun seluruh UI & alur **Client** (`/order`, `/track/[uuid]`) serta **Manajemen Order Admin** (`/admin/orders`, `/admin/orders/new`, `/admin/orders/[id]`, form dinamis 3 layanan, modal bayar, modal cancel/refund, dan WA Message Generator).
- **Anggota 3:** Membangun **Dashboard Overview** (`/admin` KPI + grafik Recharts), **Inventory** (`/admin/inventory` + restock terintegrasi kas), **Finance** (`/admin/finance` khusus `OWNER`), dan **Settings** (`/admin/settings`).

### Tahap 3 — Integrasi, Uji Skenario Kritis, & Finalisasi
- Seluruh PR digabung bertahap ke `main`.
- Tim menjalankan `npx tsc --noEmit`, `npm run build`, dan **6 skenario uji kritis** secara end-to-end sebelum demo.

---

## 3. Pembagian Tugas & Kepemilikan File per Anggota

Untuk mencegah *merge conflict*, setiap anggota memiliki area file utama masing-masing:

### Anggota 1 — Core Backend, Database, Auth, & Transaksi Kritis
**Fokus:** Fondasi sistem, integritas data PostgreSQL, keamanan akses, upload lokal, dan logika transaksi atomik.

**File yang Dikelola:**
- Konfigurasi root: `package.json`, `tsconfig.json`, `next.config.*`, `.env.example`, `.gitignore`, `storage/uploads/.gitkeep`
- Database & Seed: `prisma/schema.prisma`, `prisma/seed.ts`
- Core Library & Validasi:
  - `src/lib/prisma.ts`
  - `src/lib/auth.ts` (`jose` JWT sign/verify, `httpOnly` cookie helper, `bcryptjs`, helper RBAC)
  - `src/lib/upload.ts` (validasi MIME/ekstensi JPG/PNG/WEBP, max 2 MB, sanitasi filename)
  - `src/lib/formatters.ts` (format IDR, normalisasi WA `628xxx`, generator `ORD-YYMM-XXX`)
  - `src/lib/validations/*` (skema `zod` untuk auth, order, specs JSON, payment, revision, inventory, finance, settings)
- Middleware & API Routes:
  - `src/middleware.ts` (proteksi `/admin/*`, blokir `/admin/finance` untuk non-`OWNER`)
  - `src/app/api/upload/route.ts`
  - `src/app/api/files/[filename]/route.ts`
- Login & Server Actions Inti:
  - `src/app/(auth)/login/page.tsx`
  - `src/actions/auth.actions.ts`
  - `src/actions/order.actions.ts` (create Skenario A & B, update status 6 tahap, potong stok idempoten dalam `prisma.$transaction`, update qty/harga, soft cancel + refund)
  - `src/actions/revision.actions.ts` (upload mockup `v1/v2/...`, client ACC, request revisi dengan kunci tahap produksi)
  - `src/actions/payment.actions.ts` (input nominal langsung + auto insert `INCOME` ke `cash_flows` dalam `prisma.$transaction`)
  - `src/actions/inventory.actions.ts` (CRUD bahan baku + restock terintegrasi `EXPENSE` ke `cash_flows`)
  - `src/actions/finance.actions.ts` (catat pengeluaran + query agregasi omset/pengeluaran/laba bersih)
  - `src/actions/settings.actions.ts` (update `shop_settings`, CRUD user `ADMIN` khusus `OWNER`)

**Output Kontrak untuk Anggota 2 & 3:**
- Helper `getCurrentSession()` dan `requireRole(["OWNER"])` agar halaman & Server Actions aman.
- Daftar fungsi Server Actions beserta tipe input/output `zod` yang jelas sehingga Anggota 2 dan 3 cukup memanggilnya dari komponen UI.

---

### Anggota 2 — Alur Pemesanan Client & Operasional Order Admin
**Fokus:** Pengalaman pemesanan mandiri client, halaman tracking publik, operasional order admin, pembayaran ledger, revisi mockup, pembatalan, dan WA Generator.

**File yang Dikelola:**
- Halaman Publik Client:
  - `src/app/(public)/order/page.tsx` (Skenario B: form mandiri + dynamic specs + upload logo terkompresi)
  - `src/app/(public)/track/[uuid]/page.tsx` (progress 6 tahap, mockup review, tombol ACC/Revisi terkunci saat `PRODUCTION_QUEUE`, ringkasan tagihan, info pengambilan/resi, tombol WA admin, handling `404` jika UUID tidak valid)
- Halaman Order Admin:
  - `src/app/admin/orders/page.tsx` (daftar order, tab filter cepat, pencarian instan, quick actions)
  - `src/app/admin/orders/new/page.tsx` (Skenario A: Fast Input Order)
  - `src/app/admin/orders/[id]/page.tsx` (detail order, timeline/upload mockup versi, edit qty/harga sesuai aturan tahap, riwayat pembayaran, kontrol naik status, tombol cancel)
- Komponen Order & Client:
  - `src/components/client/OrderProgressBar.tsx`
  - `src/components/client/MockupReviewCard.tsx`
  - `src/components/admin/DynamicItemForm.tsx` (form dinamis `CUP`, `PLASTIK`, `DTF_BAJU` sesuai kontrak `zod`)
  - `src/components/admin/QuickPaymentModal.tsx` (input nominal langsung + tombol pintas `Isi Sisa Tagihan`)
  - `src/components/admin/CancelOrderModal.tsx` (opsi pengembalian stok polosan jika `stockDeducted == true` + input `Nominal Refund`)
  - `src/components/shared/WaGeneratorModal.tsx` (popup salin teks + deep link `wa.me`)
  - `src/lib/wa-templates.ts` (template pesan dinamis per status order)

---

### Anggota 3 — Layout Admin, Overview Analitik, Inventory, Finance, & Settings
**Fokus:** Kerangka UI Minimalist, komponen `shadcn/ui`, analitik dashboard Owner/Admin, stok bahan baku, laporan arus kas/laba bersih, dan pengaturan workshop.

**File yang Dikelola:**
- Styling, Komponen Dasar, & Komponen Bersama:
  - `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`
  - `components.json` & `src/components/ui/*` (`shadcn/ui`)
  - `src/components/shared/StatusBadge.tsx` (badge status produksi, status desain, dan badge pembayaran otomatis `Belum Bayar` / `Kurang Rp...` / `Lunas`)
  - `src/components/shared/ImageUploader.tsx` (kompresi gambar via `browser-image-compression` + upload ke `/api/upload`)
- Layout & Halaman Admin Non-Order:
  - `src/app/admin/layout.tsx` & `src/components/admin/AdminSidebar.tsx` (5 menu minimalis; sembunyikan menu Keuangan bila role bukan `OWNER`)
  - `src/app/admin/page.tsx` (4 kartu KPI: *Omset Bulan Ini*, *Laba Bersih* [khusus `OWNER`], *Total Piutang Aktif*, *Perlu Tindakan*; plus widget *Stok Menipis*)
  - `src/components/admin/AnalyticsCharts.tsx` (Recharts: Spline/Area Chart Omset vs Pengeluaran vs Laba Bersih 6 bulan & Donut Chart Proporsi Layanan)
  - `src/app/admin/inventory/page.tsx` (tabel stok bahan baku, status `Aman`/`Menipis`, form tambah/edit bahan, modal restock dengan checkbox catat biaya ke `cash_flows`)
  - `src/app/admin/finance/page.tsx` (khusus `OWNER`: filter periode, ringkasan Pemasukan/Pengeluaran/Laba Bersih, form `+ Catat Pengeluaran`, tabel jurnal kas dengan baris dari order berlabel `Auto` dan terkunci)
  - `src/app/admin/settings/page.tsx` (salin link `/order`, edit `shop_settings`, serta manajemen akun `ADMIN` khusus `OWNER`)

---

## 4. Aturan File Bersama (Zona Rawan Konflik)

File berikut berdampak ke seluruh tim. **Jangan diubah diam-diam di branch masing-masing** tanpa memberi tahu anggota lain:
1. `prisma/schema.prisma` dan `prisma/seed.ts` (koordinasi dengan Anggota 1 sebelum mengubah kolom/enum).
2. `package.json` dan `package-lock.json` (jika perlu menambah library baru, infokan di grup sebelum PR).
3. `src/lib/validations/*` (kontrak validasi form & `specs` JSON).
4. `src/actions/*` (signature fungsi yang dipanggil UI Anggota 2 dan 3).
5. `src/components/shared/*` dan `src/components/ui/*` (dipakai lintas halaman oleh Anggota 2 dan 3).

---

## 5. SOP Penggunaan Git & GitHub Tim

### A. Setup Pertama Kali (Anggota 2 & Anggota 3 setelah Tahap 0 di-push Anggota 1)
1. Clone repository:
   ```bash
   git clone https://github.com/Palz21/Project_StikerTempel.git
   cd Project_StikerTempel
   ```
2. Install dependensi lokal:
   ```bash
   npm install
   ```
3. Salin `.env.example` menjadi `.env`, lalu sesuaikan `DATABASE_URL` dengan PostgreSQL lokal masing-masing dan isi `AUTH_SECRET`:
   ```env
   DATABASE_URL="postgresql://<db_user>:<db_password>@localhost:5432/stiker_tempel_db?schema=public"
   AUTH_SECRET="string-acak-minimal-32-karakter"
   ```
4. Buat database kosong `stiker_tempel_db` di PostgreSQL lokal masing-masing, lalu sinkronkan skema dan seed:
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```
5. Jalankan aplikasi:
   ```bash
   npm run dev
   ```

### B. Alur Kerja Harian di Feature Branch
Jangan melakukan commit fitur langsung ke `main`. Gunakan pola berikut:
1. Pastikan `main` lokal terbaru sebelum membuat branch baru:
   ```bash
   git checkout main
   git pull origin main
   ```
2. Buat branch sesuai tugas:
   - Anggota 1: `git checkout -b feat/core-backend-auth`
   - Anggota 2: `git checkout -b feat/client-and-orders`
   - Anggota 3: `git checkout -b feat/admin-ui-inventory-finance`
3. Commit secara berkala per sub-fitur yang jelas (contoh pesan commit: `feat(auth): add jwt cookie session and rbac middleware`).
4. Sebelum membuka Pull Request ke `main`, pastikan:
   - `npx tsc --noEmit` bebas error.
   - Tidak ada file `.env`, `node_modules/`, atau gambar tes di `storage/uploads/` yang ikut ter-stage.
5. Push branch ke GitHub dan buat **Pull Request** ke `main`:
   ```bash
   git push -u origin <nama-branch>
   ```
6. Setelah PR di-merge ke `main`, seluruh anggota menjalankan:
   ```bash
   git checkout main
   git pull origin main
   ```
   Jika terdapat perubahan pada `package.json` atau `prisma/schema.prisma`, jalankan ulang `npm install`, `npx prisma generate`, dan `npx prisma db push`.

### C. File yang Wajib Tetap Lokal (Tidak Boleh Masuk Git)
- `.env` dan `.env*.local`
- `node_modules/` dan `.next/`
- Semua file unggahan di `storage/uploads/*` (kecuali `storage/uploads/.gitkeep`)

---

## 6. Checklist Verifikasi Akhir Sebelum Demo

Sebelum dinyatakan selesai, ketiga anggota menguji bersama 6 skenario wajib dari `Document/system_blueprint.md`:
1. **Idempotensi Stok:** Order masuk ke `PRODUCTION_QUEUE` memotong stok tepat sekali (`stockDeducted = true`), tidak terpotong ulang saat naik ke `IN_PROGRESS`.
2. **Payment Ledger:** Cicilan parsial mengubah badge menjadi `Kurang Rp[Sisa]`, tombol `Isi Sisa Tagihan` melunasi sisa utang (`Lunas`), dan setiap transaksi otomatis tercatat sebagai `INCOME` di `/admin/finance`.
3. **Revisi & Kunci Produksi:** Client bisa ajukan revisi dan ACC di `/track/[uuid]` pada tahap awal, lalu tombol revisi hilang otomatis begitu masuk `PRODUCTION_QUEUE`.
4. **Soft Cancel & Refund:** Order yang dibatalkan tidak terhapus; pemasukan lama tetap ada dan nominal refund tercatat sebagai `EXPENSE` kategori `Refund Pembatalan`.
5. **RBAC (`OWNER` vs `ADMIN`):** Login dengan `admin@sablon.local` (`ADMIN`) menyembunyikan menu `/admin/finance` serta menolak akses langsung lewat URL; `owner@sablon.local` (`OWNER`) dapat mengakses seluruh menu.
6. **Keamanan UUID & Upload:** Akses `/track/[uuid]` dengan UUID tidak valid mengembalikan `404`, file non-gambar / > 2 MB ditolak `/api/upload`, dan `/api/files/[filename]` menolak path traversal.
