# Panduan Presentasi, Demo, Refleksi Individu, dan *Peer Assessment* (Minggu 4)

Dokumen ini melengkapi Produk Luaran #7 (Presentasi dan Demo) serta Produk Luaran #8 (Refleksi Individu dan *Peer Assessment*) pada pedoman mata kuliah Pemrograman Web dan Aplikasi untuk proyek **UMKM Percetakan Kemasan Custom Berbasis Web (Cindy Advertising)**.

---

## 1. Struktur Presentasi & Demo (10 Menit Presentasi + 5 Menit Tanya Jawab)

| Segmen | Durasi | Pembicara Disarankan | Isi Pokok yang Disampaikan |
| :--- | :---: | :--- | :--- |
| 1. Profil Mitra & Masalah Nyata | 1,5 menit | Fauzan (Koordinator Mitra) | Profil Cindy Advertising Sidoarjo (Ibu Diana & Bapak Hermanto, 4 pekerja, 4–5 order/hari skala besar, 4 layanan termasuk Stiker) serta 3 masalah inti (pencarian nota fisik dan salah catat nominal, stok manual, laba bersih tercampur). |
| 2. Kebutuhan & Rancangan Sistem | 2 menit | Naufal (Pencatat Lapangan) | 5 kebutuhan prioritas, batas lingkup vs pengembangan lanjutan, arsitektur hibrida Laravel 11 + Filament v3 + Blade/Livewire + SQLite, dan ERD 8 tabel (Lapisan Inti vs Pendukung). |
| 3. Live Demo Skenario Nyata Mitra | 4,5 menit | Farrel (Pengembang UI & Pengujian) & Fauzan | Demonstrasi langsung lokal (data contoh anonim) mencakup 6 skenario uji kritis di tampilan desktop dan simulasi layar HP. |
| 4. Hasil Uji Coba Mitra & Perbaikan | 1,5 menit | Farrel | Dokumentasi kunjungan kedua bersama Cindy Advertising, umpan balik nyata pemilik/karyawan, serta bukti perbaikan yang telah diterapkan. |
| 5. Penutup & Keterbatasan | 0,5 menit | Naufal | Ringkasan pencapaian proyek, keterbatasan versi lokal, dan peluang pengembangan lanjutan. |

### Skrip Alur Live Demo (4,5 Menit — Data Contoh Anonim)
1. **Pemesanan Mandiri Publik (`/order` — Mobile view):** Tunjukkan pelanggan memesan Stiker atau Gelas Cup tanpa login, lalu pesanan masuk ke Filament berstatus `Pesanan Masuk` tanpa memotong stok.
2. **Konfirmasi, Mockup, & Pelacakan Publik (`/track/{uuid}`):** Admin menetapkan harga dan mengunggah mockup `v1`; buka `/track/{uuid}` untuk mengajukan revisi, unggah `v2`, lalu klik `Setujui Desain (ACC)`.
3. **Antre Produksi & Idempotensi Stok:** Pindahkan order ke `PRODUCTION_QUEUE`, tunjukkan stok bahan baku berkurang tepat satu kali (`stock_deducted = true`), dan tidak berkurang ulang saat masuk `IN_PROGRESS`.
4. **Payment Ledger Pengganti Nota Kertas:** Catat DP parsial (badge `Kurang Rp...`), lalu klik tombol pintas `Isi Sisa Tagihan` (badge `Lunas`), dan tunjukkan dua pemasukan `INCOME` otomatis masuk di Arus Kas.
5. **Soft Cancel & RBAC:** Tunjukkan pembatalan dengan refund tercatat sebagai `EXPENSE` tanpa menghapus order, serta login dengan akun `ADMIN` untuk membuktikan menu Arus Kas & Manajemen User tersembunyi dan ditolak (`403`).

---

## 2. Template Refleksi Individu (1 Halaman per Mahasiswa)

Setiap anggota (**Muhammad Farrel Setiawan**, **Fauzan Alwahyu Utomo**, dan **Naufal Ridho Athallah**) wajib mengumpulkan satu lembar refleksi mandiri pada Minggu 4 yang ditulis dalam bentuk paragraf naratif mengalir dan menjawab empat pertanyaan pedoman:

1. **Hal paling mengejutkan dari kondisi lapangan:** Ceritakan perbedaan antara bayangan awal tentang pencatatan UMKM percetakan dengan realitas langsung yang diamati di Cindy Advertising (misalnya bagaimana pesanan skala besar dan cicilan bertahap selama ini masih mengandalkan pencarian nota kertas satu per satu).
2. **Kesulitan terbesar dan cara mengatasinya:** Jelaskan hambatan teknis maupun koordinasi terbesar yang dihadapi pribadi (misalnya transisi stack ke Laravel 11 + Filament v3 + SQLite di Minggu 3, sinkronisasi transaksi atomik, atau penyesuaian tampilan mobile) beserta langkah konkret penyelesaiannya.
3. **Kontribusi pribadi pada proyek:** Uraikan secara jujur peran non-teknis dan kontribusi kode nyata yang dikerjakan sendiri beserta bukti riwayat commit di repositori GitHub.
4. **Hal yang akan dilakukan berbeda jika proyek diulang:** Refleksikan perbaikan strategi teknis, manajemen waktu, atau komunikasi yang akan diterapkan pada proyek serupa di masa depan.

---

## 3. Checklist Penilaian Antar-Anggota (*Peer Assessment* — Minggu 4)

Pada Minggu 4, setiap mahasiswa menilai dua rekan kelompoknya secara rahasia (skala 1 sampai 4) pada empat indikator berikut:

| Indikator | Skala 1 (Kurang) | Skala 4 (Sangat Baik) |
| :--- | :--- | :--- |
| Ketepatan waktu | Sering melewati tenggat checkpoint | Selalu menepati tenggat checkpoint dan PR |
| Kualitas kontribusi | Kode/dokumen tidak lengkap atau banyak error | Kode rapi, teruji, dan sesuai kontrak bersama |
| Komunikasi | Sulit dihubungi atau tidak mengabari progres | Responsif, aktif koordinasi, dan transparan saat ada kendala |
| Tanggung jawab | Melepas tugas peran yang disepakati | Menuntaskan penuh peran pedoman beserta kontribusi kode wajib |
