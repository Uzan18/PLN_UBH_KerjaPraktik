# Panduan Deployment pada Server Windows Bersih (Clean Windows Server)
PT PLN Indonesia Power – Unit Bisnis Pemeliharaan

Dokumen ini berisi panduan langkah demi langkah untuk melakukan instalasi dan deployment sistem aplikasi "Sistem Digitalisasi Assesment Peralatan Utama Pembangkit Listrik" pada server fisik atau VM baru berbasis Windows Server yang masih kosong.

---

## Langkah 1: Instalasi Perangkat Lunak Prasyarat

Instal perangkat lunak berikut pada sistem Windows Server:

1. **Node.js (LTS v20.x atau lebih tinggi)**
   - Unduh installer Windows (`.msi`) dari situs resmi [nodejs.org](https://nodejs.org/).
   - Jalankan instalasi dengan opsi default (pastikan opsi "Add to PATH" tercentang).
   - Verifikasi melalui Command Prompt / PowerShell:
     ```cmd
     node -v
     npm -v
     ```

2. **Git for Windows (Opsional)**
   - Unduh dari [git-scm.com](https://git-scm.com/).
   - Berguna untuk mendownload/menarik kode program dari repositori GitHub secara langsung.
   - *Alternatif:* Jika server tidak memiliki akses internet ke GitHub, Anda dapat mengompresi folder proyek di komputer lokal Anda menjadi berkas `.zip`, lalu mengekstraknya di server Windows.

---

## Langkah 2: Persiapan Database Oracle

Sistem ini membutuhkan **Oracle Database** (versi 19c, 21c, atau versi Express/XE).

### Opsi A: Menggunakan Database Server PLN Terpisah (Direkomendasikan)
Jika PLN menyediakan server database terpisah:
- Pastikan port database Oracle (default: `1521`) pada server database dapat diakses oleh server Windows aplikasi (cek koneksi port menggunakan perintah telnet atau Test-NetConnection di PowerShell).
- Buatlah satu skema database kosong khusus untuk aplikasi ini dan catat username serta password-nya.

### Opsi B: Menginstal Oracle XE Secara Lokal di Server Menggunakan Docker
Jika database harus diinstal di server Windows yang sama:
1. Instal **Docker Desktop** di Windows Server.
2. Jalankan perintah berikut di root folder proyek untuk menjalankan container database:
   ```cmd
   docker-compose up -d
   ```
   *Catatan:* Pastikan WSL 2 (Windows Subsystem for Linux) sudah terinstal dan aktif di server.

---

## Langkah 3: Konfigurasi Berkas Lingkungan (.env)

1. Buat berkas baru bernama `.env` pada root folder proyek (satu tingkat dengan `package.json`).
2. Masukkan konfigurasi berikut dan sesuaikan nilainya dengan detail server produksi PLN:

```env
# Oracle Database Connection
ORACLE_HOST=127.0.0.1                  # Ganti dengan IP server database PLN
ORACLE_PORT=1521                       # Port default Oracle
ORACLE_SID=XEPDB1                      # Ganti dengan SID/Service Name database PLN
ORACLE_USER=db_admin                   # Username database
ORACLE_PASSWORD=db_secret_2024         # Password database

# NextAuth Authentication Config
# Ganti NEXTAUTH_URL dengan domain IP server Windows Anda yang dapat diakses pengguna
NEXTAUTH_URL="http://localhost:3000" 
NEXTAUTH_SECRET="buat-kunci-rahasia-yang-panjang-dan-acak-di-sini"
NEXTAUTH_TRUST_HOST=true

# App Config
NODE_ENV="production"
```

---

## Langkah 4: Instalasi Dependensi dan Kompilasi (Build)

Jalankan perintah-perintah berikut melalui Command Prompt atau PowerShell di dalam root folder proyek:

1. **Instalasi Paket Node.js**:
   ```cmd
   npm install
   ```
   *Catatan:* Jangan gunakan `--production` saat melakukan instalasi pertama kali karena compiler TypeScript (`typescript` & `tsx`) diperlukan untuk melakukan proses build.

2. **Kompilasi Aplikasi ke Mode Produksi**:
   ```cmd
   npm run build
   ```
   Perintah ini akan melakukan kompilasi kode TypeScript, Next.js, dan Tailwind CSS ke dalam folder `.next` yang teroptimasi untuk produksi.

---

## Langkah 5: Inisialisasi Database (Skema & Seed Data)

Jalankan perintah berikut secara berurutan untuk membuat skema tabel dan mengisi data awal ke dalam database Oracle PLN yang baru:

1. **Sinkronisasi Skema Tabel**:
   ```cmd
   npx tsx src/scripts/sync-db.ts
   ```

2. **Inisialisasi Data Master & Akun Administrator Awal**:
   ```cmd
   npm run seed
   ```
    *Daftar Akun Bawaan (Default):*
    - **Admin:** `admin@plnip.co.id` (Password: `admin123`)
    - **Input:** `input@plnip.co.id` (Password: `input123`)
    - **QC (Validator):** `qc@plnip.co.id` (Password: `qc123`)
    - **Viewer:** `viewer@plnip.co.id` (Password: `viewer123`)

3. **Inisialisasi Damage Mechanisms**:
   ```cmd
   npx tsx src/scripts/seed-mechanisms.ts
   ```

---

## Langkah 6: Pengoperasian di Latar Belakang menggunakan PM2

Agar aplikasi Next.js terus berjalan di latar belakang (background process) Windows secara mandiri meskipun Command Prompt ditutup, gunakan **PM2** (Process Manager 2):

1. **Instalasi PM2 secara Global**:
   ```cmd
   npm install -g pm2
   ```

2. **Jalankan Aplikasi dengan PM2**:
   ```cmd
   pm2 start npm --name "assesment-peralatan-utama" -- run start
   ```

3. **Perintah PM2 yang Berguna**:
   - Melihat daftar proses aktif: `pm2 list`
   - Melihat log real-time aplikasi: `pm2 logs`
   - Restart aplikasi: `pm2 restart assesment-peralatan-utama`
   - Stop aplikasi: `pm2 stop assesment-peralatan-utama`

4. **Konfigurasi Auto-Start Saat Windows Booting**:
   Gunakan package `pm2-windows-startup` agar aplikasi otomatis menyala kembali jika Windows Server melakukan restart:
   ```cmd
   npm install -g pm2-windows-startup
   pm2-startup install
   pm2 save
   ```

---

## Langkah 7: Konfigurasi Web Server Reverse Proxy (Opsional & Direkomendasikan)

Aplikasi Next.js secara default berjalan pada port `3000`. Untuk dapat diakses di port standar HTTP (`80`) atau HTTPS (`443`) secara profesional, Anda direkomendasikan mengonfigurasi reverse proxy:

* **Opsi 1: Menggunakan IIS (Internet Information Services)**

  IIS adalah web server bawaan Windows Server yang sangat stabil untuk produksi. Ikuti langkah detail berikut untuk mengaturnya sebagai Reverse Proxy:

  1. **Aktifkan Peran Web Server (IIS) di Windows Server**:
     - Buka **Server Manager** (biasanya otomatis terbuka saat startup, atau cari di **Start Menu**, atau jalankan `Windows + R` lalu ketik `ServerManager` dan tekan Enter), lalu klik **Add Roles and Features**.
     - Lanjutkan dengan klik *Next* hingga halaman **Server Roles**.
     - Centang **Web Server (IIS)**.
     - Pada halaman **Role Services** (di bawah bagian Web Server), pastikan Anda mencentang layanan berikut:
       - *Application Development* -> Centang **WebSocket Protocol** (sangat penting untuk koneksi Next.js).
     - Selesaikan instalasi dan tunggu hingga selesai.

  2. **Instal Modul Tambahan (Penting)**:
     Anda harus mengunduh dan menginstal dua modul resmi Microsoft berikut pada server:
     - **URL Rewrite Module**: [Unduh URL Rewrite](https://www.iis.net/downloads/microsoft/url-rewrite) (pilih versi x64 installer).
     - **Application Request Routing (ARR) 3.0**: [Unduh ARR](https://www.iis.net/downloads/microsoft/application-request-routing) (pilih versi x64 installer).

  3. **Aktifkan Fitur Proxy pada ARR**:
     Setelah ARR terinstal, Anda wajib mengaktifkan fitur proxy-nya agar IIS dapat mem-forward request:
     - Buka **IIS Manager** (ketik `inetmgr` di Start Menu).
     - Pada panel sebelah kiri (*Connections*), klik nama server Anda.
     - Di panel tengah, cari dan klik dua kali menu **Application Request Routing Cache**.
     - Di panel sebelah kanan (*Actions*), klik **Server Proxy Settings...**
     - Centang pilihan **Enable proxy**, lalu klik **Apply** di sebelah kanan atas.

  4. **Konfigurasi `web.config` untuk Reverse Proxy**:
     Konfigurasikan website agar meneruskan trafik dari port `80` (HTTP) ke port `3000` (Next.js):
     - Masuk ke direktori root dari website Anda di Windows Explorer (secara default berada di `C:\inetpub\wwwroot`).
     - Buat berkas baru bernama `web.config` di dalam folder tersebut.
     - Buka berkas tersebut dengan Notepad, lalu salin dan tempel kode XML berikut:
       ```xml
       <?xml version="1.0" encoding="UTF-8"?>
       <configuration>
           <system.webServer>
               <rewrite>
                   <rules>
                       <rule name="ReverseProxyToNextJS" stopProcessing="true">
                           <match url="(.*)" />
                           <action type="Rewrite" url="http://127.0.0.1:3000/{R:1}" />
                       </rule>
                   </rules>
               </rewrite>
               <security>
                   <requestFiltering>
                       <!-- Mengizinkan upload file dokumen hingga 50MB (dalam satuan bytes) -->
                       <requestLimits maxAllowedContentLength="52428800" />
                   </requestFiltering>
               </security>
           </system.webServer>
       </configuration>
       ```
     - Simpan berkas tersebut.
     - Jalankan ulang IIS melalui Command Prompt Administrator dengan mengetik `iisreset`.

* **Opsi 2: Menggunakan Nginx untuk Windows**
  1. Unduh Nginx for Windows.
  2. Atur berkas `nginx.conf` pada blok server port `80`:
     ```nginx
     location / {
         proxy_pass http://localhost:3000;
         proxy_http_version 1.1;
         proxy_set_header Upgrade $http_upgrade;
         proxy_set_header Connection 'upgrade';
         proxy_set_header Host $host;
         proxy_cache_bypass $http_upgrade;
     }
     ```

---

## Langkah 8: Konfigurasi Akses Jaringan (Akses dari Laptop/PC Lain)

Agar aplikasi yang berjalan di server Windows dapat diakses oleh semua laptop/PC pengguna di jaringan PLN (intranet/LAN), lakukan langkah-langkah berikut:

### 1. Dapatkan IP Address Server Windows
Buka PowerShell / Command Prompt di server Windows, lalu ketik:
```cmd
ipconfig
```
Cari bagian `IPv4 Address` pada network adapter yang terhubung ke jaringan PLN (misal: `10.x.x.x` atau `192.168.x.x`). IP Address ini yang akan digunakan oleh laptop lain untuk mengakses aplikasi.

### 2. Buka Port di Windows Defender Firewall (Penting)
Secara default, Windows Server memblokir seluruh koneksi masuk. Anda harus membuat aturan Firewall baru:
1. Buka **Windows Defender Firewall with Advanced Security** (cari di Start Menu).
2. Di panel sebelah kiri, klik **Inbound Rules**.
3. Di panel sebelah kanan, klik **New Rule...**
4. Pilih tipe rule: **Port** dan klik *Next*.
5. Pilih **TCP** dan pada bagian **Specific local ports**, isi port aplikasi Anda:
   - Isi `3000` (jika laptop lain mengakses langsung menggunakan IP + port 3000, misal: `http://10.x.x.x:3000`).
   - Isi `80` atau `443` (jika menggunakan IIS/Nginx reverse proxy, misal: `http://10.x.x.x`).
   - Klik *Next*.
6. Pilih **Allow the connection** dan klik *Next*.
7. Centang opsi **Domain**, **Private**, dan **Public** (sesuaikan kebijakan IT PLN), lalu klik *Next*.
8. Beri nama aturan ini (misal: `Aplikasi Assessment Peralatan Utama`), lalu klik *Finish*.

### 3. Update NEXTAUTH_URL di Berkas `.env`
Di root folder aplikasi server, buka berkas `.env` dan ubah variabel `NEXTAUTH_URL` menggunakan IP Address server tersebut. Jangan biarkan tetap `localhost`:
```env
# Contoh jika langsung menggunakan port 3000:
NEXTAUTH_URL="http://10.12.34.56:3000"

# Contoh jika menggunakan IIS/Nginx reverse proxy port 80:
NEXTAUTH_URL="http://10.12.34.56"
```
*Catatan:* Jika nilai ini salah/tetap localhost, proses login (NextAuth) di laptop client akan gagal karena akan dialihkan kembali ke laptop masing-masing pengguna.

### 4. Pastikan Laptop Client Terhubung di Jaringan yang Sama
Semua laptop client yang ingin mengakses aplikasi harus terhubung ke Wi-Fi / jaringan kabel LAN PLN yang sama dengan server Windows tersebut, atau terhubung melalui jalur VPN perusahaan PLN.
