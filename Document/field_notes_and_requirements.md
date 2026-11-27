# Catatan Lapangan, Profil Mitra, dan Dokumen Kebutuhan
## UMKM Percetakan Kemasan Custom Berbasis Web (Mitra: Cindy Advertising)

Dokumen ini memuat rangkuman hasil penggalian informasi lapangan pada mitra UMKM **Cindy Advertising** di Sidoarjo sebagai landasan perancangan sistem berbasis web menggunakan Laravel 11, Filament v3, Blade/Livewire, dan SQLite.

---

## 1. Profil Mitra

| Komponen | Keterangan |
| :--- | :--- |
| Nama Usaha | Cindy Advertising |
| Bidang Usaha | Percetakan kemasan *custom* dan sablon (gelas cup, plastik kemasan/sablon, sablon DTF baju, dan stiker) |
| Lokasi | Sidoarjo, Jawa Timur |
| Penanggung Jawab / Pemilik | Ibu Diana dan Bapak Hermanto |
| Jumlah Tenaga Operasional | Sekitar 4 orang |
| Volume Pesanan Rata-Rata | 4 hingga 5 pesanan per hari dengan kuantitas per pesanan umumnya berskala partai besar, menyesuaikan permintaan pasar |
| Metode Pencatatan Saat Ini | Sepenuhnya manual menggunakan nota kertas, catatan tulis tangan, serta percakapan WhatsApp dan komunikasi langsung tanpa perangkat lunak pendukung |

---

## 2. Pelaksanaan Penggalian Informasi Lapangan

Penggalian informasi dilaksanakan pada tanggal **16 November 2026** di workshop Cindy Advertising, Sidoarjo. Kegiatan dilakukan melalui wawancara terbuka secara langsung bersama Ibu Diana dan Bapak Hermanto selaku pemilik usaha, disertai observasi terhadap alur penerimaan pesanan, penanganan revisi desain, pencatatan pembayaran menggunakan buku nota, serta pengecekan ketersediaan bahan baku polosan. Sebelum kegiatan berlangsung, tim meminta izin terlebih dahulu kepada pemilik usaha terkait pencatatan informasi operasional, serta menyepakati bahwa seluruh data transaksi dan keuangan asli milik usaha tetap dijaga kerahasiaannya dan hanya akan dipakai secara lokal oleh mitra, sedangkan keperluan demo akademik menggunakan data contoh samaran.

### Ringkasan Hasil Wawancara Lapangan

| Pertanyaan Terbuka | Ringkasan Jawaban Narasumber (Ibu Diana dan Bapak Hermanto) |
| :--- | :--- |
| Jenis produk dan layanan percetakan apa saja yang dikerjakan Cindy Advertising setiap hari, serta seberapa besar skala operasionalnya? | Saat ini kami melayani pembuatan sablon DTF untuk baju, sablon gelas cup minuman, sablon plastik kemasan, serta cetak stiker dengan berbagai bahan dan potongan. Usaha dijalankan bersama sekitar empat orang tenaga kerja. Dalam sehari pesanan yang masuk rata-rata sekitar empat sampai lima pesanan, tetapi jumlah barang dalam satu kali pesan biasanya banyak karena pelanggan memesan dalam skala usaha, dan ramainya tetap bergantung pada kondisi pasar. |
| Bagaimana cara mencatat pesanan masuk, revisi desain, pembayaran pelanggan, dan stok bahan baku selama ini? | Semuanya masih dilakukan dengan cara tradisional tanpa aplikasi apa pun. Ketika ada pesanan masuk, kami langsung menuliskannya sendiri dari obrolan WhatsApp atau saat pelanggan datang berbicara langsung. Proses revisi desain juga masih dibahas lewat chat atau tatap muka tanpa penyimpanan versi yang rapi. Untuk pembayaran DP maupun pelunasan, kami masih menulis manual di nota kertas. Begitu pula stok bahan baku seperti cup dan plastik, kami catat secara manual di nota atau lewat chat internal. |
| Bagian mana dari alur pencatatan tersebut yang dirasa paling merepotkan atau paling sering menimbulkan kesalahan? | Bagian yang paling menyulitkan adalah pencatatan keuangan dan daftar pesanan yang masih bergantung pada nota kertas. Setiap kali ada pelanggan yang datang membayar cicilan atau melunasi sisa tagihan, kami harus membongkar dan mencari lembar nota pelanggan tersebut satu per satu. Proses itu sangat menyita waktu, apalagi ketika terjadi berulang kali di tengah kesibukan produksi. |
| Pernahkah terjadi kejadian nyata atau kesalahan akibat sistem pencatatan manual tersebut, dan apa dampaknya bagi usaha? | Pernah beberapa kali terjadi salah tulis pada catatan nominal pembayaran pelanggan di nota karena harus bolak-balik mencari dan memperbarui catatan manual. Selain itu, karena stok bahan baku hanya dicatat lewat chat atau secarik nota, ketersediaan bahan sulit dipantau dengan cepat. Dampak paling terasa lainnya adalah kami kesulitan menghitung laba bersih usaha secara akurat karena catatan pemasukan pesanan dan berbagai pengeluaran operasional tercampur menjadi satu. |
| Siapa saja yang nantinya akan menggunakan aplikasi jika sistem ini dibangun, dan perangkat apa yang paling sering dipakai sehari-hari? | Nantinya sistem dipakai oleh tiga pihak, yaitu kami selaku pemilik usaha, admin atau karyawan yang membantu operasional harian, serta pelanggan untuk memesan atau memantau pesanannya. Sehari-hari kami paling sering membuka lewat ponsel pintar karena lebih praktis saat bergerak di workshop, tetapi sangat diharapkan tampilannya tetap nyaman dibuka melalui tablet maupun komputer. |
| Jika aplikasi ini selesai dibuat, hal utama apa yang paling diharapkan dapat langsung dirasakan manfaatnya oleh Cindy Advertising? | Kami berharap ada satu sistem terpadu yang langsung membereskan persoalan utama tadi: pesanan dan pembayaran pelanggan tercatat rapi sehingga tidak perlu lagi membongkar nota kertas satu per satu saat ada pelunasan, stok bahan baku terpantau jelas tanpa takut terlewat, dan pemilik bisa langsung melihat perhitungan laba bersih usaha secara otomatis tanpa tercampur. |

---

## 3. Analisis Akar Masalah

Berdasarkan hasil wawancara dan observasi langsung di Cindy Advertising, ditemukan empat persoalan utama yang saling berkaitan:

1. **Ketergantungan pada nota kertas memicu pemborosan waktu dan kesalahan nominal pembayaran.** Saat pelanggan melakukan pembayaran bertahap (uang muka lalu cicilan atau pelunasan), staf harus mencari lembar nota lama secara manual. Pengulangan aktivitas ini di tengah proses produksi telah menyebabkan kesalahan pencatatan nominal uang pelanggan.
2. **Pencatatan pesanan dan revisi desain tersebar di berbagai kanal komunikasi.** Detail spesifikasi produk yang beragam (mulai dari ukuran cup, warna plastik, ukuran baju DTF, hingga bahan dan jenis potongan stiker) serta riwayat revisi desain hanya tersimpan di riwayat chat atau obrolan lisan sehingga rawan tertukar atau terlewat saat masuk tahap cetak.
3. **Pemantauan stok bahan baku manual tidak terhubung dengan antrean produksi.** Stok cup polosan, plastik, kaos polos, dan bahan stiker hanya dicatat lewat chat atau nota terpisah, sehingga risiko kekurangan bahan secara mendadak cukup tinggi mengingat satu pesanan dapat berjumlah besar.
4. **Perhitungan laba bersih tidak terpisah dan sulit direkap.** Karena pemasukan pembayaran pelanggan, pembelian bahan baku, dan pengeluaran operasional tidak terstruktur dalam satu buku kas digital, pemilik kesulitan mengetahui kondisi arus kas dan keuntungan bersih usaha secara cepat.

---

## 4. Daftar Kebutuhan Prioritas dan Ukuran Keberhasilan

| No | Kebutuhan Prioritas | Uraian Fungsional | Ukuran Keberhasilan yang Dapat Diperiksa Mitra |
| :---: | :--- | :--- | :--- |
| 1 | Pencatatan pesanan terpadu untuk 4 layanan utama | Mencatat pesanan melalui input cepat admin maupun formulir mandiri pelanggan tanpa login (`/order`) lengkap dengan spesifikasi dinamis untuk Gelas Cup, Plastik, Sablon DTF Baju, dan Stiker. | Seluruh pesanan harian beserta spesifikasi detail dan file logo tersimpan terpusat dan dapat dicari dalam hitungan detik dari HP maupun PC. |
| 2 | Pencatatan pembayaran bertahap (*Payment Ledger*) pengganti nota fisik | Mencatat nominal pembayaran masuk secara langsung tanpa mencari nota kertas, dilengkapi tombol pintas `Isi Sisa Tagihan` dan perhitungan otomatis status `Belum Bayar`, `Kurang Rp[Sisa]`, atau `Lunas`. | Saat pelanggan melunasi utang, admin cukup mencari nama/kode pesanan dan melihat sisa tagihan akurat dalam satu kali klik tanpa membuka tumpukan nota. |
| 3 | Alur produksi 6 tahap, pelacakan publik, dan kontrol revisi desain | Mengelola status pesanan dari `Pesanan Masuk` hingga `Selesai`, menyediakan halaman publik `/track/{uuid}` tanpa login bagi pelanggan untuk melihat progres serta menyetujui/merevisi desain sebelum masuk produksi, plus generator pesan WhatsApp. | Pelanggan dapat memantau status dan ACC desain lewat tautan pribadi, dan tombol revisi terkunci otomatis begitu barang masuk antrean produksi. |
| 4 | Pemantauan stok bahan baku terintegrasi produksi | Mencatat stok bahan baku polosan dengan indikator `Aman` atau `Menipis`, pemotongan stok otomatis tepat satu kali saat pesanan masuk `Antre Produksi`, serta fitur restock yang dapat langsung mencatat biaya kulakan. | Stok berkurang otomatis sesuai jumlah pesanan yang naik produksi dan bahan yang menipis langsung terlihat pada halaman utama dashboard. |
| 5 | Rekap arus kas dan laba bersih khusus Pemilik (RBAC) | Menyinkronkan otomatis setiap pembayaran pelanggan sebagai pemasukan kas, mencatat pengeluaran operasional serta *refund* pembatalan, dan menampilkan ringkasan Omset, Pengeluaran, Piutang Aktif, dan Laba Bersih yang hanya dapat diakses akun `OWNER`. | Ibu Diana dan Bapak Hermanto dapat melihat total omset, pengeluaran, piutang belum lunas, dan laba bersih periode berjalan langsung dari HP, sementara akun karyawan tidak dapat membuka laporan keuangan sensitif. |

---

## 5. Batas Lingkup dan Rencana Pengembangan Lanjutan

Agar pengembangan terselesaikan tuntas dan teruji bersama mitra dalam empat minggu, lingkup aplikasi dibatasi pada seluruh kebutuhan prioritas di atas dalam lingkungan eksekusi lokal Laravel 11, Filament v3, Blade/Livewire, dan SQLite. Adapun fitur berikut dicatat secara eksplisit sebagai **pengembangan lanjutan** di luar lingkup proyek saat ini:

1. Pengiriman notifikasi WhatsApp otomatis penuh melalui WhatsApp Business API berbayar (pada versi sekarang diganti dengan generator teks dan tautan langsung `wa.me` gratis).
2. Integrasi *payment gateway* otomatis seperti Midtrans atau Xendit untuk verifikasi transfer bank secara waktu nyata.
3. Pencetakan struk fisik langsung menuju printer termal Bluetooth.
4. Modul akuntansi pembukuan lengkap termasuk laporan neraca, penyusutan aset mesin cetak, dan perhitungan pajak bulanan.

---

## 6. Format Bukti Izin Mitra dan Catatan Uji Coba (Untuk Lampiran)

### A. Bukti Persetujuan Penggalian Informasi dan Uji Coba Mitra
> **Pernyataan Izin Mitra UMKM**  
> Yang bertanda tangan di bawah ini, selaku pemilik/penanggung jawab **Cindy Advertising** (Sidoarjo), menyatakan memberikan izin kepada tim mahasiswa Program Studi D4 Teknologi Rekayasa Internet Politeknik Elektronika Negeri Surabaya (Muhammad Farrel Setiawan, Fauzan Alwahyu Utomo, dan Naufal Ridho Athallah) untuk melakukan wawancara, observasi alur pencatatan usaha, perancangan prototipe aplikasi web, serta uji coba aplikasi pada lingkungan operasional Cindy Advertising dalam rangka proyek mata kuliah Pemrograman Web dan Aplikasi. Seluruh data keuangan dan data pelanggan asli tetap menjadi milik mitra dan tidak dipublikasikan pada materi demo akademik.  
>
> Sidoarjo, 16 November 2026  
> Pemilik Mitra Cindy Advertising: Ibu Diana / Bapak Hermanto (Tanda Tangan / Bukti Persetujuan)  
> Koordinator Mitra: Fauzan Alwahyu Utomo (`2424600054`)

### B. Format Pencatatan Uji Coba Kunjungan Kedua (Minggu 4)
Tabel berikut akan diisi pada saat pengujian langsung bersama Ibu Diana, Bapak Hermanto, dan karyawan Cindy Advertising di Minggu 4:

| No | Skenario Uji Coba | Perangkat | Umpan Balik Mitra | Tindak Lanjut Perbaikan Tim | Status |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | Input pesanan baru & spesifikasi 4 layanan (Cup, Plastik, DTF, Stiker) | HP / PC | *(Diisi saat kunjungan Minggu 4)* | *(Diisi setelah perbaikan)* | Terjadwal |
| 2 | Pemesanan mandiri `/order` & pelacakan + ACC desain `/track/{uuid}` | HP | *(Diisi saat kunjungan Minggu 4)* | *(Diisi setelah perbaikan)* | Terjadwal |
| 3 | Pencatatan DP, cicilan, dan pelunasan dengan tombol `Isi Sisa Tagihan` | HP / PC | *(Diisi saat kunjungan Minggu 4)* | *(Diisi setelah perbaikan)* | Terjadwal |
| 4 | Kenaikan status ke `Antre Produksi` & pemotongan stok otomatis | PC / HP | *(Diisi saat kunjungan Minggu 4)* | *(Diisi setelah perbaikan)* | Terjadwal |
| 5 | Pembatalan order (*soft cancel*) & pencatatan *refund* | PC | *(Diisi saat kunjungan Minggu 4)* | *(Diisi setelah perbaikan)* | Terjadwal |
| 6 | Pengecekan Dashboard Laba Bersih (`OWNER`) vs pembatasan akun `ADMIN` | HP / PC | *(Diisi saat kunjungan Minggu 4)* | *(Diisi setelah perbaikan)* | Terjadwal |
