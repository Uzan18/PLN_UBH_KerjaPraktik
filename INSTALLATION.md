# Panduan Instalasi — Windows Server

Dokumen ini memuat prosedur instalasi aplikasi pada Windows Server.

---

## Prasyarat

Pastikan seluruh komponen berikut sudah terpasang sebelum memulai:

- **Node.js 20.x LTS** — https://nodejs.org (pilih Windows Installer)
- **Oracle Database** — sudah berjalan dan dapat diakses dari server ini
- **Oracle Instant Client** — https://www.oracle.com/database/technologies/instant-client/winx64-64-downloads.html

Setelah menginstal Oracle Instant Client, tambahkan direktori instalasinya ke `PATH` sistem Windows.

Verifikasi instalasi Node.js menggunakan Command Prompt:

```cmd
node --version
npm --version
```

---

## Instalasi

### 1. Salin Source Code

Salin seluruh folder aplikasi ke server, misalnya ke `C:\apps\siat`.

### 2. Install Dependensi

Buka Command Prompt, masuk ke folder aplikasi, lalu jalankan:

```cmd
cd C:\apps\siat
npm install
```

### 3. Konfigurasi Environment

Salin file `.env.example` menjadi `.env`:

```cmd
copy .env.example .env
```

Buka file `.env` dengan Notepad dan isi seluruh nilainya:

```env
ORACLE_HOST=<IP Oracle Database>
ORACLE_PORT=1521
ORACLE_SERVICE_NAME=<nama service Oracle>
ORACLE_USER=<username database>
ORACLE_PASSWORD=<password database>

NEXTAUTH_URL=http://<IP-server>:<port>
NEXTAUTH_SECRET=<jalankan perintah di bawah untuk mendapatkan nilai ini>

NODE_ENV=production
```

Untuk menghasilkan nilai `NEXTAUTH_SECRET`:

```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Salin output perintah tersebut ke file `.env`.

### 4. Sinkronisasi Skema Database

Perintah ini membuat seluruh tabel yang dibutuhkan di Oracle Database. Jalankan hanya sekali pada instalasi pertama.

```cmd
npm run sync-db
```

### 5. Seeding Data Master Awal

Mengisi data master awal (jenis aset, parameter pengujian, kriteria penilaian). Jalankan hanya sekali pada instalasi pertama.

```cmd
npm run seed
```

### 6. Build Aplikasi

```cmd
npm run build
```

### 7. Jalankan Aplikasi

```cmd
npm start
```

Aplikasi berjalan pada port 3000 secara default. Akses melalui browser di `http://<IP-server>:3000`.

---

## Menjalankan sebagai Background Service (PM2)

Agar aplikasi tetap berjalan setelah Command Prompt ditutup atau server restart, gunakan PM2.

```cmd
npm install -g pm2
pm2 start npm --name "siat" -- start
pm2 save
pm2 startup
```

Perintah pengelolaan:

```cmd
pm2 status          :: melihat status
pm2 logs siat       :: melihat log
pm2 restart siat    :: restart setelah update
pm2 stop siat       :: menghentikan aplikasi
```

---

## Prosedur Update

Ketika ada versi baru:

```cmd
cd C:\apps\siat
npm install
npm run sync-db
npm run build
pm2 restart siat
```

---

## Troubleshooting

**Error: `DPI-1047: Cannot locate a 64-bit Oracle Client library`**
Pastikan direktori Oracle Instant Client sudah ditambahkan ke `PATH` sistem Windows, kemudian restart Command Prompt.

**Error: koneksi database gagal**
Periksa nilai `ORACLE_HOST`, `ORACLE_PORT`, dan `ORACLE_SERVICE_NAME` di file `.env`. Pastikan firewall Windows mengizinkan koneksi ke port Oracle (1521).

**Aplikasi tidak bisa diakses dari browser**
Pastikan port 3000 (atau port yang dikonfigurasi) tidak diblokir oleh Windows Firewall. Buka port menggunakan Windows Defender Firewall > Inbound Rules.
