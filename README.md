# Sistem Digitalisasi Assesment Peralatan Utama Pembangkit Listrik
PT PLN Indonesia Power – Unit Bisnis Pemeliharaan

## Deskripsi
Sistem Digitalisasi Assesment Peralatan Utama Pembangkit Listrik adalah platform berbasis web untuk reporting, trending, dan visualisasi hasil assessment peralatan utama pembangkit listrik di lingkungan PT PLN Indonesia Power Unit Bisnis Pemeliharaan.

## Prasyarat Sistem
Sebelum memulai instalasi, pastikan lingkungan pengembangan telah memenuhi persyaratan berikut:
1. **Runtime & Package Manager**:
   - Node.js versi 18.x atau lebih tinggi (disarankan versi 20.x LTS)
   - npm versi 9.x atau lebih tinggi
2. **Database**:
   - Oracle Database (versi 19c atau 21c)
   - Oracle Instant Client (diperlukan jika berjalan di Windows/macOS tanpa Docker)
3. **Containerization (Opsional untuk Development)**:
   - Docker & Docker Compose (untuk menjalankan container database Oracle XE secara lokal)

## Konfigurasi Lingkungan (Environment Variables)
Salin berkas template konfigurasi `.env.example` menjadi `.env` di root direktori proyek:
```bash
cp .env.example .env
```
Sesuaikan nilai variabel berikut di dalam berkas `.env`:
- `ORACLE_HOST`: Alamat host database Oracle (misal: localhost)
- `ORACLE_PORT`: Port database (default: 1521)
- `ORACLE_SID` atau `ORACLE_SERVICE_NAME`: Service Name database Oracle (default: XEPDB1)
- `ORACLE_USER`: Username database (default: db_admin)
- `ORACLE_PASSWORD`: Password database
- `NEXTAUTH_URL`: URL host aplikasi (misal: http://localhost:3000)
- `NEXTAUTH_SECRET`: Kunci rahasia untuk otentikasi session

## Langkah Instalasi

1. **Instalasi Dependensi**:
   Unduh paket Node.js yang diperlukan:
   ```bash
   npm install
   ```

2. **Menjalankan Database (Development)**:
   Jika menggunakan Docker untuk database lokal, jalankan container Oracle XE:
   ```bash
   docker-compose up -d
   ```

3. **Sinkronisasi Schema Database**:
   Jalankan script untuk sinkronisasi schema database dengan entitas ORM:
   ```bash
   npx tsx src/scripts/sync-db.ts
   ```

4. **Seeding Data Awal**:
   Jalankan script seed untuk memasukkan data awal master dan user administrator default:
   ```bash
   npm run seed
   ```

5. **Seeding Data Damage Mechanisms**:
   Jalankan script seed tambahan untuk inisialisasi damage mechanisms pada parameter:
   ```bash
   npx tsx src/scripts/seed-mechanisms.ts
   ```

## Menjalankan Aplikasi

### Mode Pengembangan (Development)
Menjalankan server Next.js lokal dengan fitur hot-reload:
```bash
npm run dev
```
Aplikasi dapat diakses melalui browser pada alamat http://localhost:3000.

### Mode Produksi (Production Build & Start)
1. Lakukan kompilasi kode dan optimasi produksi:
   ```bash
   npm run build
   ```
2. Jalankan aplikasi hasil kompilasi:
   ```bash
   npm run start
   ```

## Struktur Direktori Utama
- `src/app`: Kontroler routing halaman dan endpoint API Next.js (App Router)
- `src/components`: Komponen UI modular
- `src/entities`: Definisi skema dan entitas TypeORM untuk Oracle Database
- `src/lib`: Modul eksternal seperti auth helper, konfigurasi db client, dan scoring logic
- `src/scripts`: Skrip migrasi data, seeding database, dan pemeliharaan skema
- `public`: Aset statis seperti gambar, dokumen, dan logo instansi
