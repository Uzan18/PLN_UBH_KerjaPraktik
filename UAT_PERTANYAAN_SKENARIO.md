# Form & Skenario User Acceptance Testing (UAT)
## Sistem Digitalisasi Assessment Peralatan Utama Pembangkit Listrik (SIAT)
**PT PLN Indonesia Power – Unit Bisnis Pemeliharaan**

---

## 📋 Informasi Pengujian

| Parameter | Keterangan |
| :--- | :--- |
| **Nama Sistem** | Sistem Digitalisasi Assessment Peralatan Utama Pembangkit Listrik (SIAT) |
| **Tanggal Pengujian** | `[ Tanggal / Bulan / Tahun ]` |
| **Lokasi / UBP** | `[ Nama Unit Bisnis Pemeliharaan / Pembangkit ]` |
| **Versi Aplikasi** | `v1.0.0` |

---

## 🎯 Petunjuk Pengisian

1. Setiap penguji (Tester) melakukan pengujian berdasarkan perannya (**Admin**, **Admin Input**, atau **Validator**).
2. Jalankan skenario pengujian yang tercantum pada tabel skenario.
3. Berikan penilaian pada kolom **Status Hasil** (`Pass` / `Fail`) serta nilai kepuasan (Skala 1 - 5):
   - **1**: Sangat Tidak Memuaskan / Sangat Sulit
   - **2**: Tidak Memuaskan / Sulit
   - **3**: Cukup / Netral
   - **4**: Memuaskan / Mudah
   - **5**: Sangat Memuaskan / Sangat Mudah
4. Tuliskan **Catatan / Temuan** jika terdapat keluhan, kegagalan sistem, bug, atau masukan perbaikan.

---

## 👤 ROLE 1: ADMIN (Administrator Sistem)

Role **Admin** bertanggung jawab dalam pengelolaan master data, manajemen akun pengguna, pengaturan kriteria assessment, serta monitoring sistem secara keseluruhan.

### A. Skenario & Pertanyaan Pengujian Fungsi Admin

| No | Modul / Fitur | Skenario Pengujian | Hasil yang Diharapkan | Status (Pass/Fail) | Skor (1-5) | Catatan / Temuan |
| :-: | :--- | :--- | :--- | :-: | :-: | :--- |
| **A1** | **Login & Autentikasi Admin** | Mengakses halaman login dan masuk menggunakan kredensial Admin | Berhasil login dan masuk ke Dashboard Utama dengan menu penuh khusus Admin. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |
| **A2** | **Manajemen User - Tambah User** | Menambahkan akun pengguna baru (misal: Admin Input / Validator) beserta peran (role) dan akses UBP | Akun baru berhasil dibuat, terdaftar di tabel pengguna, dan bisa digunakan untuk login. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |
| **A3** | **Manajemen User - Edit & Hak Akses** | Mengubah informasi pengguna (nama, email, role, atau pemetaan `allowed_ubp_ids`) | Data pengguna berhasil diperbarui dan pembatasan UBP sesuai dengan pengaturan baru. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |
| **A4** | **Manajemen User - Nonaktifkan Akun** | Mengubah status pengguna menjadi Non-Aktif (*Deactivate*) | Pengguna yang dinonaktifkan tidak dapat login ke dalam sistem. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |
| **A5** | **Master Data - UBP & Unit Pembangkit** | Menambah/mengubah data Unit Bisnis Pemeliharaan (UBP) & Unit Pembangkit | Data UBP dan Unit Pembangkit tersimpan dan tampil pada dropdown pilihan di seluruh sistem. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |
| **A6** | **Master Data - Asset Trafo** | Menambah dan mengelola master data Peralatan Utama/Asset (Nomor Serial, Kapasitas, Merk, Lokasi) | Asset baru berhasil terdaftar dan siap digunakan pada sesi pengujian/assessment. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |
| **A7** | **Master Data - Jenis Pengujian & Parameter** | Mengatur Jenis Pengujian (Visual, DGA, Furan, Elektrikal, dll.) serta Parameter ukurannya | Parameter pengujian terkonfigurasi dengan benar beserta satuan dan batasan nilainya. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |
| **A8** | **Konfigurasi Kriteria & Scoring** | Mengatur kriteria kondisi (*Good, Fair, Poor, Critical*) dan mekanisme kerusakan (*Damage Mechanisms*) | Formula/standar kondisi tersimpan dan menjadi acuan kalkulasi scoring otomatis. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |
| **A9** | **Audit Log & Activity Tracking** | Memeriksa log aktivitas pengguna sistem pada menu Audit Log | Aktivitas penting (input, edit, hapus, validasi) tercatat lengkap dengan waktu dan identitas user. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |

### B. Pertanyaan Evaluasi Pengalaman Pengguna (Admin)

1. **Apakah navigasi dan tata letak menu manajemen master data cukup intuitif dan mudah dipahami?**
   - [ ] Ya, Sangat Mudah
   - [ ] Cukup Mudah
   - [ ] Sulit / Membingungkan
   - *Catatan:* `__________________________________________________`

2. **Apakah proses pengaturan pembatasan akses UBP (*Allowed UBP*) pada pengguna berfungsi sesuai kebutuhan operasional?**
   - [ ] Ya, Sesuai
   - [ ] Belum Sesuai
   - *Catatan:* `__________________________________________________`

---

## 📝 ROLE 2: ADMIN INPUT (Operator / Staff Input Data)

Role **Admin Input** bertugas mencatat dan menginputkan hasil pengujian/assessment lapangan atau laboratorium, mengunggah berkas pendukung, serta mengajukan sesi pengujian untuk divalidasi.

### A. Skenario & Pertanyaan Pengujian Fungsi Admin Input

| No | Modul / Fitur | Skenario Pengujian | Hasil yang Diharapkan | Status (Pass/Fail) | Skor (1-5) | Catatan / Temuan |
| :-: | :--- | :--- | :--- | :-: | :-: | :--- |
| **B1** | **Login Admin Input** | Login dengan akun role Admin Input | Masuk ke dashboard yang menampilkan daftar Asset dan Sesi Pengujian sesuai UBP yang diizinkan. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |
| **B2** | **Pencarian & Seleksi Asset** | Memilih Unit Pembangkit dan mencari Asset Trafo yang akan diuji | Sistem menampilkan detail asset, riwayat pengujian sebelumnya, serta tombol buat sesi baru. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |
| **B3** | **Membuat Sesi Pengujian Baru** | Membuat Sesi Pengujian (*Test Session*) baru dengan menentukan tanggal, jenis pengujian, dan pelaksana | Sesi pengujian baru terbentuk dalam status `Draft`. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |
| **B4** | **Input Data Hasil Pengujian** | Memasukkan nilai parameter hasil pengujian (misal: Gas H2, CH4, C2H2 pada DGA, Nilai Breakdown Voltage, dll.) | Nilai parameter berhasil diinput, sistem memvalidasi batas format angka/tipe data. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |
| **B5** | **Kalkulasi & Preview Kondisi** | Memeriksa hasil kalkulasi skor/kondisi otomatis setelah parameter diisi | Sistem otomatis menghitung indeks kondisi trafo berdasarkan kriteria yang berlaku. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |
| **B6** | **Upload Berkas / Laporan Pendukung** | Mengunggah file sertifikat/laporan lab (Format PDF/Gambar/Doc) pada sesi pengujian | File berhasil diunggah, tersimpan di direktori laporan, dan dapat diunduh/dilihat kembali. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |
| **B7** | **Simpan Draft & Edit Sesi** | Menyimpan pengujian sebagai draft dan mengubah kembali nilai parameter sebelum diajukan | Data perubahan tersimpan tanpa mengubah status draft. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |
| **B8** | **Pengajuan Validasi (Submit)** | Mengirim sesi pengujian yang telah selesai diisi kepada Validator (`Submit for Validation`) | Status sesi berubah menjadi `Submitted` / `Pending Validation` dan mengunci input sementara. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |

### B. Pertanyaan Evaluasi Pengalaman Pengguna (Admin Input)

1. **Seberapa mudah formulir penginputan data parameter pengujian untuk digunakan?**
   - [ ] Sangat Praktis dan Cepat
   - [ ] Cukup Mudah
   - [ ] Membutuhkan Terlalu Banyak Klik / Lambat
   - *Catatan:* `__________________________________________________`

2. **Apakah fitur upload berkas/sertifikat laporan pengujian berjalan lancar tanpa batasan file yang menyulitkan?**
   - [ ] Ya, Berjalan Baik
   - [ ] Terjadi Kendala (Sebutkan kendalanya): `____________________`

---

## 🔍 ROLE 3: VALIDATOR (Checker / Supervisor / Verifikator)

Role **Validator** bertugas mengulas (*review*), memverifikasi kebenaran kalkulasi & parameter, serta menyetujui (*approve*) atau menolak (*reject*) sesi pengujian yang diajukan oleh Admin Input.

### A. Skenario & Pertanyaan Pengujian Fungsi Validator

| No | Modul / Fitur | Skenario Pengujian | Hasil yang Diharapkan | Status (Pass/Fail) | Skor (1-5) | Catatan / Temuan |
| :-: | :--- | :--- | :--- | :-: | :-: | :--- |
| **C1** | **Login & Dashboard Notifikasi** | Login dengan akun role Validator dan memeriksa antrean validasi | Dashboard menampilkan daftar pengujian yang menunggu persetujuan (*Pending Validation*). | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |
| **C2** | **Review Detail Sesi Pengujian** | Membuka dan meninjau rincian nilai parameter, skor kalkulasi, serta lampiran dokumen yang diunggah | Validator dapat melihat seluruh data secara komprehensif beserta perbandingan standar kriteria. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |
| **C3** | **Analisis Trending & History** | Melihat grafik *trending* hasil pengujian trafo dari waktu ke waktu | Grafik visualisasi kondisi dan grafik parameter (seperti DGA Duval Triangle / Furan) tampil jelas. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |
| **C4** | **Persetujuan (Approve Validasi)** | Menyutujui sesi pengujian yang datanya sudah sesuai | Status sesi pengujian berubah menjadi `Validated` / `Approved` dan tercatat nama Validator-nya. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |
| **C5** | **Penolakan (Reject / Revisi)** | Menolak sesi pengujian dengan memberikan alasan/catatan revisi kepada Admin Input | Status sesi berubah menjadi `Rejected` / `Revision Required` dan mengembalikan akses edit ke Admin Input. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |
| **C6** | **Cetak / Export Laporan Final** | Mengunduh atau mencetak laporan resmi assessment trafo yang telah divalidasi | Laporan terunduh dalam format PDF/Excel secara rapi lengkap dengan ringkasan status & rekomendasi. | `[ Pass / Fail ]` | `[ 1 - 5 ]` | |

### B. Pertanyaan Evaluasi Pengalaman Pengguna (Validator)

1. **Apakah visualisasi grafik trending dan indikator kondisi trafo membantu dalam pengambilan keputusan validasi?**
   - [ ] Sangat Membantu
   - [ ] Cukup Membantu
   - [ ] Kurang Jelas / Perlu Diperbaiki
   - *Catatan:* `__________________________________________________`

2. **Apakah alur kerja persetujuan (Approve/Reject) beserta fitur catatan perbaikan sudah memenuhi kebutuhan prosedur di UBP?**
   - [ ] Ya, Sudah Sesuai Standar Operasional
   - [ ] Belum Sesuai (Berikan masukan): `_________________________`

---

## 📊 EVALUASI UMUM SISTEM (Usability & System Performance)

Pengisian evaluasi umum oleh seluruh peserta UAT (**Admin**, **Admin Input**, dan **Validator**).

| No | Aspek Penilaian | Pertanyaan Evaluasi | Skala (1 - 5) | Catatan Tambahan |
| :-: | :--- | :--- | :-: | :--- |
| **1** | **Antarmuka (UI Design)** | Desain antarmuka bersih, modern, dan nyaman dilihat saat pengoperasian. | `[ 1 - 5 ]` | |
| **2** | **Kecepatan (Performance)** | Respon perpindahan halaman dan proses simpan data terasa cepat tanpa *lag*. | `[ 1 - 5 ]` | |
| **3** | **Keamanan Akses** | Pembatasan hak akses sesuai role dan lokasi UBP bekerja dengan ketat. | `[ 1 - 5 ]` | |
| **4** | **Keandalan (Reliability)** | Sistem tidak mengalami error, crash, atau bug fatal selama pengujian. | `[ 1 - 5 ]` | |
| **5** | **Kemudahan (Usability)** | Alur kerja dari input hingga validasi laporan mudah dipelajari oleh pengguna baru. | `[ 1 - 5 ]` | |

---

## 📝 TEMUAN BUG / MASUKAN PERBAIKAN (FEEDBACK FORM)

| No | Role Penguji | Modul / Halaman | Deskripsi Masukan / Kendala (Bug) | Tingkat Prioritas (High/Medium/Low) |
| :-: | :--- | :--- | :--- | :-: |
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## ✍️ BERITA ACARA PENGESAHAN UAT

Dokumen User Acceptance Testing ini menandakan bahwa pengujian sistem telah dilaksanakan oleh perwakilan dari setiap peran pengguna.

| Peran (Role) | Nama Penguji | Jabatan / Unit | Tanda Tangan | Tanggal |
| :--- | :--- | :--- | :---: | :---: |
| **Admin System** | `____________________` | `____________________` | `___________` | `____/____/2026` |
| **Admin Input** | `____________________` | `____________________` | `___________` | `____/____/2026` |
| **Validator** | `____________________` | `____________________` | `___________` | `____/____/2026` |

---
*Dokumen ini dibuat otomatis sebagai acuan pelaksanaan User Acceptance Testing (UAT) Sistem SIAT.*
