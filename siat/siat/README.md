# SIAT — Sistem Digitalisasi Assessment Trafo PT PLN Indonesia Power

## Setup Development

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Oracle Instant Client (untuk `oracledb` driver)

### Installation
```bash
git clone <repo>
cd siat
npm install
cp .env.example .env
# Edit .env sesuai environment
```

### Database Setup
```bash
sudo docker compose up -d oracle
# Tunggu ~60 detik
npm run typeorm migration:run
npm run seed
```

### Run Development
```bash
npm run dev
# Buka http://localhost:3000
```

### Login Credentials (Dev)
- **Viewer**: `viewer@pln.co.id` / `password123`
- **Input**: `input@pln.co.id` / `password123`
- **QC**: `qc@pln.co.id` / `password123`
- **Admin**: `admin@pln.co.id` / `password123`

### Tech Stack
- Next.js 14 (App Router) + TypeScript
- Oracle Database 19c + TypeORM
- TailwindCSS + shadcn/ui
- NextAuth.js
- Recharts + React Query

### Project Structure
```text
siat/
├── src/
│   ├── app/                    # Next.js App Router (Pages & API)
│   ├── components/             # Reusable UI components
│   ├── entities/               # TypeORM Entity classes
│   ├── lib/                    # Business logic (scoring, rbac)
│   └── migrations/             # TypeORM migration files
├── db.ts                       # TypeORM DataSource config
├── seed.ts                     # Database seeder
└── ...
```