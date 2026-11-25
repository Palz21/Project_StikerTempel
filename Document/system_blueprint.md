# System Design & Technical Blueprint
## Sistem Manajemen Operasional, Pre-Order, & Analitik Laba UMKM Percetakan Kemasan Custom & Sablon DTF

---

## 1. Ringkasan Eksekutif & Batasan Proyek
Proyek ini merupakan aplikasi web manajemen operasional internal (*Admin-First*) yang dirancang khusus untuk UMKM jasa percetakan dan sablon *custom* (gelas *cup* minuman, plastik kemasan/kresek, serta sablon DTF pakaian/souvenir) dengan sistem produksi *Pre-Order* (*made by order*).

### Prinsip Desain & Batasan Teknis
* **Lingkungan Eksekusi:** 100% *Localhost* (tanpa ketergantungan layanan *cloud*, tanpa *Payment Gateway* berbayar, dan tanpa WhatsApp API berbayar).
* **Arsitektur:** *Modular Monolith* dengan pola *Server-Side Rendering* (SSR) & *Server Actions* untuk menjaga integritas transaksi basis data (*ACID*).
* **Tema Visual:** *Minimalist UI* dengan *subtle shadowing*:
  * Latar belakang utama: `bg-slate-50` (`#F8FAFC`).
  * Permukaan kartu (*card*): `bg-white` dengan batas tipis `border-slate-200/70` dan bayangan halus `shadow-sm` (transisi ke `shadow-md` saat *hover*).
  * Hierarki warna: Netral gelap (`slate-900`) untuk teks/tombol primer, serta *soft badge* berwarna lembut khusus untuk status produksi dan status pembayaran.

---

## 2. Tech Stack & Infrastruktur Lokal

| Komponen | Teknologi | Alasan Pemilihan |
| :--- | :--- | :--- |
| **Framework Fullstack** | Next.js (App Router) + TypeScript | Satu repositori terpadu, *type-safe*, performa tinggi, dan mendukung *Server Actions* untuk CRUD cepat. |
| **UI & Styling** | Tailwind CSS + `shadcn/ui` | Tampilan minimalis modern yang konsisten, ringan, dan mempercepat pembangunan komponen form/tabel/modal. |
| **Database & ORM** | PostgreSQL (Lokal) + Prisma ORM | Mendukung relasi kompleks, tipe data `JSON` untuk spesifikasi multi-layanan, serta transaksi atomik (`prisma.$transaction`). |
| **Visualisasi Data** | Recharts | Komponen grafik responsif (Spline/Area Chart & Donut Chart) yang mudah diintegrasikan dengan React. |
| **Penyimpanan File** | Local Filesystem (`/storage/uploads`) | File unggahan dinamis disimpan di luar folder `/public` dan disajikan melalui Route Handler `/api/files/[filename]` agar langsung terbaca tanpa *restart* server Next.js. |
| **Optimasi Gambar** | `browser-image-compression` | Kompresi otomatis gambar *mockup*, logo, dan bukti transfer di *browser* (< 200 KB) sebelum dikirim ke server lokal. |
| **Autentikasi & Keamanan** | Session Cookie (`httpOnly`) + `bcryptjs` + UUID v4 | Proteksi *dashboard* admin berbasis *role* (Owner/Staff) serta pencegahan celah **IDOR** pada link *tracking client* menggunakan UUID acak. |

---

## 3. Alur Bisnis Lengkap (*End-to-End Workflows*)

### 3.1. Dua Skenario Pemesanan Terpadu
Kedua skenario bermuara ke satu tabel pesanan dan satu papan antrean kerja yang sama:

1. **Skenario A — Pesan via WhatsApp $\rightarrow$ Pengusaha Input Sendiri (*Fast Input*):**
   * Pelanggan deal lewat WA $\rightarrow$ Admin membuka menu `+ Order Baru` $\rightarrow$ Mengisi data pelanggan, rincian item, total harga, dan nominal pembayaran awal (boleh `0`).
   * **Perilaku Sistem:** Pesanan langsung valid (status `WAITING_ACC_PAYMENT` atau langsung `PRODUCTION_QUEUE` jika desain sudah ACC dan DP masuk). Sistem langsung menerbitkan UUID *tracking* dan menampilkan *popup* **Generator Teks WA**.
2. **Skenario B — Pengusaha Kirim Link $\rightarrow$ Pelanggan Input Mandiri (*Gatekeeper Pattern*):**
   * Pengusaha mengirim link `http://localhost:3000/order` $\rightarrow$ Pelanggan mengisi identitas, kategori layanan, spesifikasi, jumlah, *upload* logo mentah, dan metode pengambilan.
   * **Perilaku Sistem:** Masuk ke *dashboard* admin dengan status **`PENDING_REVIEW` (`Pesanan Masuk`)**. Stok bahan baku **belum dipotong** dan omset **belum dihitung**. Setelah admin mengecek desain dan menetapkan harga final, admin menekan **Konfirmasi Order** $\rightarrow$ muncul *popup* **Generator Teks WA + Link Tracking UUID**.

### 3.2. Multi-Layanan & Formulir Dinamis (*Dynamic Specs*)
Kolom input spesifikasi menyesuaikan kategori yang dipilih dan disimpan dalam kolom `specs` bertipe `JSON`:
* **Gelas Cup (`CUP`):** Ukuran (`12oz`, `14oz`, `16oz`, `22oz`), Tipe (`Datar`/`Oval`), Jumlah Warna (`1`/`2`), Opsi Tutup (`Flat`/`Dome`/`Tanpa Tutup`).
* **Plastik (`PLASTIK`):** Ukuran (mis. `15x30`, `20x35`), Warna Plastik, Jumlah Warna & Sisi (`1 Sisi`/`2 Sisi`).
* **Sablon DTF Baju (`DTF_BAJU`):** Jenis Pakaian (`Kaos`, `Flanel`, `Hoodie`, atau `Bawa Baju Sendiri`), Area Cetak (`Logo Dada`, `A4`, `A3`), Rincian Ukuran (`S/M/L/XL`).
* **Integrasi Stok Fleksibel (*Optional Stock Link*):** Item `CUP` dan `PLASTIK` ditautkan ke `raw_materials` agar stok otomatis terpotong saat produksi. Untuk `DTF_BAJU` (jika pelanggan membawa baju sendiri), `raw_material_id` dibiarkan `null`.

### 3.3. Sistem Pembayaran Berbasis Angka Langsung (*Payment Ledger*)
Tanpa *dropdown* manual "DP 50% / Sebagian / Lunas". Seluruh pembayaran dicatat sebagai deretan transaksi nominal langsung pada tabel `order_payments`:
* Admin cukup menginput angka pada kolom **`Nominal Dibayar (Rp)`** (bisa dicicil berkali-kali).
* **Tombol Pintas Efisiensi:** Tersedia tombol **`Isi Sisa Tagihan`** yang otomatis mengisi kolom input sesuai sisa utang pelanggan.
* **Kalkulasi Status Otomatis (*Computed State*):**
  $$\text{Total Terbayar} = \sum (\text{order\_payments.amount})$$
  $$\text{Sisa Tagihan} = \text{orders.total\_price} - \text{Total Terbayar}$$
  * $\text{Total Terbayar} = 0$ $\rightarrow$ Badge Abu-abu: **`Belum Bayar`**
  * $0 < \text{Total Terbayar} < \text{Total Harga}$ $\rightarrow$ Badge Kuning: **`Kurang Rp[Sisa]`**
  * $\text{Total Terbayar} \ge \text{Total Harga}$ $\rightarrow$ Badge Hijau: **`Lunas`**
* **Sinkronisasi Arus Kas:** Setiap kali pembayaran dicatat, sistem otomatis menyisipkan baris `INCOME` ke tabel `cash_flows` dalam satu transaksi atomik.

### 3.4. Alur Pengerjaan (*Finite State Machine* — 6 Tahap)

| No | Enum Status | Label UI | Aksi & Aturan Sistem |
| :---: | :--- | :--- | :--- |
| 1 | `PENDING_REVIEW` | Pesanan Masuk | Khusus Skenario B. Menunggu admin memverifikasi spesifikasi & menetapkan harga. |
| 2 | `WAITING_ACC_PAYMENT` | Menunggu ACC & Bayar | Admin kirim *mockup* & tagihan. Pelanggan dapat ACC/Ajukan Revisi di halaman *tracking*. |
| 3 | `PRODUCTION_QUEUE` | Antre Produksi | **Trigger Atomik:** Jika `stock_deducted == false`, stok `raw_materials` tertaut otomatis dikurangi sesuai `qty` item, lalu `stock_deducted` diset `true`. |
| 4 | `IN_PROGRESS` | Proses Pengerjaan | Sedang tahap afdruk/sablon/press DTF. Perubahan desain & item dikunci permanen. |
| 5 | `READY_FOR_PICKUP` | Siap Diambil / Dikirim | Barang selesai & dikemas. Sistem menampilkan peringatan jika $\text{Sisa Tagihan} > 0$. Menampilkan alamat Maps (*Self-Pickup*) atau nomor resi (*Ekspedisi*). |
| 6 | `COMPLETED` | Selesai | Barang telah diserahkan dan pembayaran telah lunas. |
| - | `CANCELLED` | Dibatalkan | Status terminasi (*soft cancel*). Tidak boleh *hard delete*. |

### 3.5. Skenario Revisi Desain & Spesifikasi
* **Batas Aman (*Point of No Return*):** Revisi hanya terbuka pada Tahap 1 dan Tahap 2. Begitu masuk Tahap 3 (`PRODUCTION_QUEUE`), tombol revisi di *client* dikunci total.
* **Sub-Status Desain (`design_status`):** `PENDING` $\rightarrow$ `WAITING_ACC` $\rightarrow$ `REVISION_REQUESTED` $\rightarrow$ `APPROVED`.
* **Versioning Mockup:** Setiap unggahan *mockup* disimpan di tabel `order_revisions` (`v1, v2, v3...`) beserta catatan *client* dan *timestamp*. Bagian produksi selalu mengacu pada versi terakhir yang berstatus `APPROVED`.
* **Revisi Jumlah/Harga:** Hanya boleh dilakukan Admin.
  * Di Tahap 1–2: Edit item otomatis menghitung ulang `total_price` dan sisa tagihan tanpa merusak riwayat pembayaran lama.
  * Di Tahap 3 (jika terpaksa diubah sebelum tinta naik): Sistem menghitung selisih stok ($\Delta = \text{Qty Baru} - \text{Qty Lama}$) dan menyesuaikan `raw_materials.stock_qty` dalam `prisma.$transaction`.

### 3.6. Skenario Pembatalan Order & Refund
Dilarang menghapus (*hard delete*) data order demi keutuhan *audit trail* keuangan.
1. **Belum Bayar & Belum Produksi:** Status diubah ke `CANCELLED` + isi `cancel_reason`. Tidak ada efek ke stok maupun kas.
2. **Sudah Ada Pembayaran, Belum Produksi:** Admin mengisi angka langsung **`Nominal Refund (Rp)`** (bisa penuh atau dipotong jasa desain). Pemasukan awal tidak dihapus; sistem mencatat baris baru `EXPENSE` berkategori `Refund Pembatalan` di `cash_flows` sebesar nominal *refund*.
3. **Sudah Masuk Produksi (`stock_deducted == true`):**
   * Muncul *checkbox*: **"Kembalikan stok bahan baku polosan ke gudang?"** (Centang *Ya* jika masih di `PRODUCTION_QUEUE` / belum kena tinta; pilih *Tidak* jika sudah di `IN_PROGRESS` agar stok rusak tercatat akurat).
   * Kolom **`Nominal Refund (Rp)`** terisi default `0` (dapat diubah jika ada kebijakan khusus).

---

## 4. Arsitektur Dua Dashboard & Generator Pesan WA

### 4.1. Dashboard Client (Publik Tanpa Login)
* **`/order`:** Formulir pemesanan mandiri (Skenario B) dengan *dynamic fields* berdasarkan kategori dan kompresi file logo otomatis.
* **`/track/[uuid]`:**
  * *Progress bar* 6 tahap yang bersih (atau banner pembatalan jika `CANCELLED`).
  * Pratinjau *mockup* terbaru + tombol **`Setujui Desain (ACC)`** dan **`Ajukan Revisi`** (khusus saat `design_status == WAITING_ACC`).
  * Ringkasan pembayaran angka langsung (`Total`, `Terbayar`, `Sisa Tagihan`) + info rekening *workshop*.
  * Informasi metode pengambilan (link Google Maps untuk *Self-Pickup* atau nomor resi untuk *Ekspedisi*).
  * Tombol pintas **Chat Admin WhatsApp**.

### 4.2. Dashboard Admin (`/admin` — RBAC: `OWNER` vs `STAFF`)
Terdiri dari 5 menu sidebar minimalis:
1. **Overview (`/admin`):** 4 Kartu KPI (*Omset Bulan Ini*, *Laba Bersih* [khusus Owner], *Total Piutang Aktif*, *Perlu Tindakan*), 2 grafik Recharts (*Spline Chart* Omset vs Pengeluaran vs Laba Bersih & *Donut Chart* Proporsi Layanan), serta widget *Stok Menipis*.
2. **Manajemen Pesanan (`/admin/orders`):** Tab filter cepat (`Perlu Review`, `Revisi Desain`, `Antre & Proses`, `Siap Diambil`, `Belum Lunas`, `Selesai`, `Dibatalkan`), pencarian instan, serta tombol *Quick Actions* di setiap baris (`+ Bayar`, `Naikkan Status`, `Salin Link Tracking`).
3. **Stok Bahan Baku (`/admin/inventory`):** Manajemen stok *cup* polosan, plastik, dan kaos polos dengan *badge* `Aman`/`Menipis`. Dilengkapi fitur **Restock Terintegrasi**: saat menambah stok kulakan, admin bisa mencentang opsi pencatatan biaya kulakan langsung ke `cash_flows`.
4. **Arus Kas & Keuangan (`/admin/finance` — Khusus Owner):** Filter periode tanggal, ringkasan Pemasukan vs Pengeluaran vs **Laba Bersih**, form `+ Catat Pengeluaran` (tinta, film DTF, screen, listrik), dan jurnal transaksi gabungan (baris pemasukan order berlabel `Auto` dan terkunci).
5. **Pengaturan (`/admin/settings`):** Tombol salin link `/order`, pengaturan profil/Maps/rekening *workshop*, serta manajemen akun Staff (khusus Owner).

### 4.3. Generator Pesan WhatsApp Otomatis
Muncul otomatis sebagai *modal* setiap kali order dibuat atau status dinaikkan. Menyediakan dua tombol:
* **`Salin Teks`** (`navigator.clipboard.writeText`).
* **`Buka WhatsApp`** (`https://wa.me/628xxx?text=[encoded_message]`).

---

## 5. Skema Database Lengkap (`prisma/schema.prisma`)

> **Catatan Teknis Tipe Data Uang:** Seluruh nominal Rupiah (IDR) menggunakan tipe `Int` (mendukung hingga Rp2,14 miliar per transaksi) agar bersih dari kendala serialisasi `BigInt`/`Decimal` pada Next.js *Server Actions* dan komponen Recharts.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==========================================
// ENUMS
// ==========================================

enum Role {
  OWNER
  STAFF
}

enum OrderSource {
  ADMIN
  CLIENT_LINK
}

enum OrderStatus {
  PENDING_REVIEW
  WAITING_ACC_PAYMENT
  PRODUCTION_QUEUE
  IN_PROGRESS
  READY_FOR_PICKUP
  COMPLETED
  CANCELLED
}

enum DesignStatus {
  PENDING
  WAITING_ACC
  REVISION_REQUESTED
  APPROVED
}

enum ServiceCategory {
  CUP
  PLASTIK
  DTF_BAJU
  LAINNYA
}

enum PickupMethod {
  SELF_PICKUP
  INSTANT_COURIER
  EXPEDITION
}

enum PaymentMethod {
  TRANSFER
  TUNAI
  QRIS
}

enum CashFlowType {
  INCOME
  EXPENSE
}

// ==========================================
// MODELS (8 TABEL INTI)
// ==========================================

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String   @map("password_hash")
  role         Role     @default(STAFF)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("users")
}

model RawMaterial {
  id        String          @id @default(cuid())
  name      String          // Contoh: "Cup 16oz Oval", "Plastik Kresek 20x35"
  category  ServiceCategory
  stockQty  Int             @default(0) @map("stock_qty")
  minStock  Int             @default(100) @map("min_stock")
  unit      String          @default("pcs") // pcs, lembar, dus
  createdAt DateTime        @default(now()) @map("created_at")
  updatedAt DateTime        @updatedAt @map("updated_at")

  orderItems OrderItem[]

  @@map("raw_materials")
}

model Order {
  id               String       @id @default(cuid())
  uuid             String       @unique @default(uuid()) // Token publik untuk /track/[uuid]
  orderCode        String       @unique @map("order_code") // Contoh: ORD-2611-001
  source           OrderSource  @default(ADMIN)
  customerName     String       @map("customer_name")
  customerWa       String       @map("customer_wa") // Format normalisasi: 628xxx
  status           OrderStatus  @default(WAITING_ACC_PAYMENT)
  designStatus     DesignStatus @default(PENDING) @map("design_status")
  revisionCount    Int          @default(0) @map("revision_count")
  pickupMethod     PickupMethod @default(SELF_PICKUP) @map("pickup_method")
  trackingNumber   String?      @map("tracking_number")
  totalPrice       Int          @default(0) @map("total_price")
  currentMockupUrl String?      @map("current_mockup_url")
  notes            String?      @db.Text

  // Flag idempotensi untuk mencegah pemotongan stok ganda
  stockDeducted    Boolean      @default(false) @map("stock_deducted")

  // Field pembatalan & refund (soft cancel)
  cancelledAt      DateTime?    @map("cancelled_at")
  cancelReason     String?      @map("cancel_reason") @db.Text
  refundAmount     Int          @default(0) @map("refund_amount")

  createdAt        DateTime     @default(now()) @map("created_at")
  updatedAt        DateTime     @updatedAt @map("updated_at")

  items            OrderItem[]
  revisions        OrderRevision[]
  payments         OrderPayment[]
  cashFlows        CashFlow[]

  @@index([status])
  @@index([designStatus])
  @@index([createdAt])
  @@map("orders")
}

model OrderItem {
  id            String          @id @default(cuid())
  orderId       String          @map("order_id")
  category      ServiceCategory
  rawMaterialId String?         @map("raw_material_id") // Nullable (mis. DTF bawa baju sendiri)
  itemName      String          @map("item_name")
  specs         Json            // Menyimpan ukuran, jumlah warna, area cetak DTF, dll.
  qty           Int
  unitPrice     Int             @default(0) @map("unit_price")
  subtotal      Int             @default(0)
  logoUrl       String?         @map("logo_url")
  createdAt     DateTime        @default(now()) @map("created_at")

  order         Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  rawMaterial   RawMaterial?    @relation(fields: [rawMaterialId], references: [id], onDelete: SetNull)

  @@index([orderId])
  @@map("order_items")
}

model OrderRevision {
  id         String   @id @default(cuid())
  orderId    String   @map("order_id")
  version    Int      // 1, 2, 3, ...
  mockupUrl  String   @map("mockup_url")
  clientNote String?  @map("client_note") @db.Text
  adminNote  String?  @map("admin_note") @db.Text
  createdAt  DateTime @default(now()) @map("created_at")

  order      Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@unique([orderId, version])
  @@map("order_revisions")
}

model OrderPayment {
  id            String        @id @default(cuid())
  orderId       String        @map("order_id")
  amount        Int           // Input nominal langsung (Rp)
  paymentMethod PaymentMethod @default(TRANSFER) @map("payment_method")
  proofUrl      String?       @map("proof_url")
  note          String?
  paidAt        DateTime      @default(now()) @map("paid_at")

  order         Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  cashFlow      CashFlow?

  @@index([orderId])
  @@map("order_payments")
}

model CashFlow {
  id             String        @id @default(cuid())
  type           CashFlowType
  category       String        // Contoh: "Pembayaran Order", "Kulakan Bahan", "Tinta/DTF", "Refund Pembatalan"
  amount         Int
  orderPaymentId String?       @unique @map("order_payment_id") // Terisi otomatis dari OrderPayment
  orderId        String?       @map("order_id") // Terisi untuk menautkan pembayaran/refund ke Order
  description    String?       @db.Text
  date           DateTime      @default(now())
  createdAt      DateTime      @default(now()) @map("created_at")

  orderPayment   OrderPayment? @relation(fields: [orderPaymentId], references: [id], onDelete: SetNull)
  order          Order?        @relation(fields: [orderId], references: [id], onDelete: SetNull)

  @@index([date, type])
  @@map("cash_flows")
}

model ShopSetting {
  id             Int      @id @default(1) // Singleton row (id = 1)
  shopName       String   @default("Sablon Kemasan Custom") @map("shop_name")
  whatsappNumber String   @default("6281234567890") @map("whatsapp_number")
  address        String   @default("Alamat Workshop") @db.Text
  mapsUrl        String?  @map("maps_url")
  bankInfo       String   @default("BCA 1234567890 a.n. Pemilik") @map("bank_info") @db.Text
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@map("shop_settings")
}
```

---

## 6. Struktur Folder Next.js (App Router)

```text
umkm-sablon-web/
├── prisma/
│   ├── schema.prisma              # Skema 8 tabel inti di atas
│   └── seed.ts                    # Data awal: akun Owner/Staff, ShopSetting, contoh stok & order
├── storage/
│   └── uploads/                   # Direktori penyimpanan lokal (logo, mockup, bukti bayar)
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── order/page.tsx             # Skenario B: Form pemesanan mandiri client
│   │   │   └── track/[uuid]/page.tsx      # Dashboard Client (progress, ACC/revisi, tagihan)
│   │   ├── (auth)/
│   │   │   └── login/page.tsx             # Halaman login internal Owner & Staff
│   │   ├── admin/
│   │   │   ├── layout.tsx                 # Sidebar Minimalis (5 menu + cek RBAC)
│   │   │   ├── page.tsx                   # Overview: 4 KPI Cards & 2 Grafik Recharts
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx               # Daftar Order, Tab Filter, & Quick Actions
│   │   │   │   ├── new/page.tsx           # Skenario A: Fast Input Order oleh Admin
│   │   │   │   └── [id]/page.tsx          # Detail Order (Mockup, Pembayaran, Status, Cancel)
│   │   │   ├── inventory/page.tsx         # Stok Bahan Baku + Restock Terintegrasi Kas
│   │   │   ├── finance/page.tsx           # Arus Kas, Pengeluaran, & Laba Bersih (Owner Only)
│   │   │   └── settings/page.tsx          # Link Order Publik, Profil Workshop, Manajemen Staff
│   │   ├── api/
│   │   │   ├── upload/route.ts            # Endpoint simpan file gambar ke /storage/uploads
│   │   │   └── files/[filename]/route.ts  # Endpoint penyaji gambar lokal dengan aman
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── actions/                           # Next.js Server Actions (Logika Bisnis & Transaksi)
│   │   ├── auth.actions.ts                # Login, Logout, Manajemen User
│   │   ├── order.actions.ts               # Create (A & B), Update Status, Potong Stok, Cancel/Refund
│   │   ├── revision.actions.ts            # Upload Mockup v1/v2, Client ACC, Ajukan Revisi
│   │   ├── payment.actions.ts             # Input Nominal Bayar + Auto Sync CashFlow
│   │   ├── inventory.actions.ts           # CRUD Bahan Baku + Restock Terintegrasi
│   │   └── finance.actions.ts             # Catat Pengeluaran + Agregasi Grafik Omset/Laba
│   ├── components/
│   │   ├── ui/                            # Komponen dasar shadcn/ui (Button, Card, Dialog, Table...)
│   │   ├── shared/
│   │   │   ├── WaGeneratorModal.tsx       # Popup Salin Teks & Deep Link wa.me
│   │   │   ├── ImageUploader.tsx          # Komponen upload + browser-image-compression
│   │   │   └── StatusBadge.tsx            # Soft badge konsisten untuk status order & bayar
│   │   ├── admin/
│   │   │   ├── QuickPaymentModal.tsx      # Modal + Bayar dengan tombol "Isi Sisa Tagihan"
│   │   │   ├── CancelOrderModal.tsx       # Modal pembatalan + opsi stok & nominal refund
│   │   │   ├── DynamicItemForm.tsx        # Form dinamis Cup / Plastik / DTF Baju
│   │   │   └── AnalyticsCharts.tsx        # Spline Chart Omset vs Laba & Donut Chart Kategori
│   │   └── client/
│   │       ├── OrderProgressBar.tsx       # Visualisasi 6 tahap produksi
│   │       └── MockupReviewCard.tsx       # Pratinjau mockup + tombol ACC / Revisi
│   ├── lib/
│   │   ├── prisma.ts                      # Singleton PrismaClient
│   │   ├── auth.ts                        # Helper verifikasi session cookie & RBAC
│   │   ├── formatters.ts                  # Format Rupiah, normalisasi WA (628...), generator kode ORD
│   │   └── wa-templates.ts                # Template teks WA dinamis per status pesanan
│   └── middleware.ts                      # Proteksi rute /admin & pembatasan /admin/finance untuk Owner
└── package.json
```

---

## 7. Pembagian Kerja Tim (3 Orang)

Agar pengembangan berjalan paralel tanpa saling menghambat:

* **Anggota 1 — Core Backend, Database, & Auth:**
  * Inisialisasi proyek Next.js + PostgreSQL lokal + `prisma/schema.prisma` + `prisma/seed.ts`.
  * Implementasi autentikasi (`login`, `middleware.ts` RBAC), API penyimpanan file lokal (`/api/upload` & `/api/files/[filename]`), serta *Server Actions* kritis yang melibatkan `prisma.$transaction` (potong stok, pembayaran $\rightarrow$ arus kas, dan pembatalan/refund).
* **Anggota 2 — Alur Client & Operasional Order:**
  * Membangun halaman `/order` (Skenario B) dan `/track/[uuid]` (*progress bar*, pratinjau *mockup*, tombol ACC/Revisi).
  * Membangun `/admin/orders`, `/admin/orders/new` (Skenario A + `DynamicItemForm`), `/admin/orders/[id]`, `QuickPaymentModal`, `CancelOrderModal`, dan `WaGeneratorModal`.
* **Anggota 3 — Dashboard Owner, Stok, Keuangan, & Visualisasi:**
  * Membangun *layout* Minimalist UI (`shadcn/ui` + sidebar responsif).
  * Membangun `/admin` (*Overview*: 4 KPI Cards + 2 grafik Recharts), `/admin/inventory` (*Restock* terintegrasi kas), `/admin/finance` (Jurnal Arus Kas & Laba Bersih), serta `/admin/settings`.

---

## 8. Daftar Periksa Validasi (*Double-Check Checklist*)
Sebelum demo di hadapan dosen, pastikan 6 skenario uji kritis berikut berjalan tanpa *bug*:
1. **Uji Idempotensi Stok:** Naikkan status order ke `PRODUCTION_QUEUE` $\rightarrow$ pastikan stok berkurang tepat satu kali (`stockDeducted = true`), dan tidak berkurang lagi saat naik ke `IN_PROGRESS`.
2. **Uji Pembayaran Bertahap:** Buat order Rp500.000 $\rightarrow$ bayar Rp150.000 (status: `Kurang Rp350.000`) $\rightarrow$ klik tombol `Isi Sisa Tagihan` (status: `Lunas`) $\rightarrow$ pastikan dua baris pemasukan muncul di `/admin/finance`.
3. **Uji Revisi & Kunci Produksi:** Ajukan revisi di `/track/[uuid]` $\rightarrow$ admin unggah `v2` $\rightarrow$ *client* klik ACC $\rightarrow$ pastikan setelah masuk `PRODUCTION_QUEUE`, tombol revisi di halaman *client* tidak muncul lagi.
4. **Uji Pembatalan & Refund:** Batalkan order yang sudah bayar Rp200.000 dengan *refund* Rp150.000 $\rightarrow$ pastikan pemasukan awal tetap tercatat, muncul pengeluaran *Refund* Rp150.000, sehingga Laba Bersih mencerminkan sisa Rp50.000 secara akurat.
5. **Uji Hak Akses (RBAC):** Login sebagai akun `STAFF` $\rightarrow$ pastikan menu `/admin/finance` tidak tampil di sidebar dan akses langsung lewat URL ditolak/diarahkan kembali ke `/admin`.
6. **Uji Keamanan UUID:** Coba ubah satu karakter pada URL `/track/[uuid]` $\rightarrow$ pastikan halaman mengembalikan tampilan *404 Not Found* yang rapi tanpa membocorkan data order lain.
