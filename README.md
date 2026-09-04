# BloodHelp — Blood Donor Management Platform

Production-oriented monorepo foundation for the Blood Donor Management Platform.

## Stack
- Angular 17 standalone frontend
- NestJS modular backend
- Local MySQL 8 (no Docker)
- Prisma ORM
- Swagger/OpenAPI

## Prerequisites
- Node.js 20.19+
- Local MySQL 8 running on port 3306

## Setup
```bash
cp .env.example .env
```

Ensure `.env` points at your local MySQL:
```
DATABASE_URL=mysql://root:root@localhost:3306/bloodhelp
```

Create the database, then migrate + seed:
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS bloodhelp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
cd apps/api && npm run prisma:migrate && npm run seed
```

## Install dependencies
```bash
npm --prefix apps/api install
npm --prefix apps/web install
```

## Start API
```bash
npm run start:api
```
API: http://localhost:3000/api/health
Swagger: http://localhost:3000/api/docs

## Start web
```bash
npm run start:web
```
Web: http://localhost:4200 (proxies `/api` to the NestJS API)

## Database
Local MySQL 8 with Prisma-managed migrations in `prisma/migrations`.
Donor distance search uses the Haversine formula over indexed `latitude`/`longitude` columns (no spatial extension required).

Seeded admin: `admin@bloodhelp.local` / `Admin!12345678`

## Current implementation status
Module boundaries exist for auth, users, donors, dashboards, appreciations, notifications, reports, master data, admin and audit.

## Security defaults
- No secrets committed
- CORS restricted via `FRONTEND_URL`
- Helmet enabled
- Backend validation configured with whitelist + forbidNonWhitelisted
- Swagger available for API contract development
- Refresh/reset tokens stored as hashes
