# BloodHelp — Blood Donor Management Platform
## Complete Project Documentation

> Generated: September 2026 · Codebase version `0.1.0` · Branch `master`
> Monorepo root: `blood-donor-platform/` (`apps/api`, `apps/web`, `prisma/`, `packages/shared-types`)

---

## 1. What Is This Project?

**BloodHelp** is a full-stack web platform that connects **blood donors** with people in need:

- **Public (anonymous) users** can search donors by blood group, location (country → state → city → area), PIN code, and distance radius, and view results on an interactive map.
- **Registered donors (USER role)** get a dashboard, exact contact details of other donors, proximity search ("Near me"), appreciation/thanks system, report system, notifications, profile + location management, and email/mobile verification.
- **Admins (ADMIN role)** manage users (activate/deactivate/soft-delete), triage user reports, manage master data (blood groups, countries, states, cities, country codes), manage email templates, view audit logs, and see platform-wide dashboards.

Key product flows: registration with mandatory GPS/map location capture → email/mobile verification → donor discovery (list + Leaflet map) → appreciation / reporting → notifications → admin moderation. Full password-recovery, session rotation, and audit-trail support are built in.

---

## 2. Tech Stack & Libraries

### 2.1 Backend — `apps/api` (NestJS 11 modular monolith)

| Library | Version | Purpose |
|---|---|---|
| `@nestjs/common, core, platform-express` | 11.1.6 | Modular monolith framework (controllers, guards, pipes, filters) |
| `@nestjs/config` | 4.0.2 | Central env-driven config (`app.config.ts`) |
| `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt` | 11.x / 0.7.0 / 4.0.1 | Access-token JWT auth (passport `jwt` strategy) |
| `@nestjs/swagger` | 11.2.0 | OpenAPI docs at `/api/docs` |
| `@prisma/client` (+ `prisma` CLI) | 6.11.0 | ORM over MySQL 8 |
| `argon2` | 0.41.1 | Password hashing (also dummy-hash for timing-safe login) |
| `class-validator`, `class-transformer` | 0.14.2 / 0.5.1 | DTO validation via global `ValidationPipe` (`whitelist + forbidNonWhitelisted + transform`) |
| `cookie-parser` | 1.4.7 | HttpOnly refresh-token cookie handling |
| `helmet` | 8.1.0 | Security headers |
| `ioredis` | 5.6.1 | Redis client (rate limiting); in-memory fallback per instance when `REDIS_URL` is empty |
| `nodemailer` | 10.0.0 | SMTP email sending via templated `EmailTemplateService` |
| `pino`, `pino-http` | 9.9.0 / 10.5.0 | Structured logging (`LoggingInterceptor`) |
| `rxjs` | 7.8.2 | Async primitives |
| Jest 30, ts-jest, ts-node, TypeScript 5.9 | dev | Unit/integration tests, build |

### 2.2 Frontend — `apps/web` (Angular 17 standalone SPA)

| Library | Version | Purpose |
|---|---|---|
| `@angular/core, common, router, forms, animations, compiler` | 17.3.12 | Standalone components, lazy `loadComponent` routes, signals |
| `primeng` | 17.18.8 | UI kit (card, table, dialog, paginator, dropdown, toast, sidebar, tabview…) |
| `primeflex` | 4.0.0 | Responsive grid (`col-12 md:col-6`, flex utilities) |
| `primeicons` | 8.0.0 | Icons |
| `@primeuix/themes` | 3.0.0 | Theming support |
| `rxjs` | 7.8.2 | HTTP, interceptors, debounced search |
| `zone.js`, `tslib` | 0.14.10 / 2.8.1 | Change detection, TS helpers |
| Leaflet 1.9.4 (CDN script + CSS in `index.html`) | global `L` | Donor map pins, search-center marker, registration map picker (OSM tiles) |
| Jest 29 + jest-preset-angular | dev | Unit tests (`ng`-style specs via Jest) |

### 2.3 Data & Infra

- **MySQL 8** (local, no Docker): `DATABASE_URL=mysql://root:root@localhost:3306/bloodhelp`. Prisma-managed migrations in `prisma/migrations/`, seed in `prisma/seed.ts` (seeded admin `admin@bloodhelp.local`).
- **Prisma ORM 6.11**: single `prisma/schema.prisma` + generated clients for root and `apps/api`.
- **Redis (optional)**: `REDIS_URL` empty → in-memory rate-limit fallback (dev); set it in prod for shared throttling.
- **Email**: SMTP (`nodemailer`) or log provider; SMS defaults to `log` provider (OTP printed server-side only in dev).
- **Maps**: OSM tile layer client-side; geocoding proxied through the API (`/api/geocoding/*`).
- **Monorepo tooling**: root `package.json` scripts (`start:api`, `start:web`, `build`, `test`, `seed`), `pnpm-workspace.yaml`, `packages/shared-types` (shared `ApiSuccess/ApiError/PaginationMeta` types).

---

## 3. Repository Layout

```
blood-donor-platform/
├── PROJECT_DOCUMENTATION.md      ← this file
├── 01-architecture.md            ← original architecture reference (Phase 1)
├── README.md                     ← quick-start
├── .env / .env.example
├── prisma/
│   ├── schema.prisma             ← 19 models + 5 enums (source of truth)
│   ├── seed.ts                   ← admin + master data seed
│   └── migrations/
├── packages/shared-types/src/index.ts
├── apps/api/src/
│   ├── main.ts                   ← bootstrap: env guard, Helmet, CORS, ValidationPipe, Swagger
│   ├── app.module.ts
│   ├── config/app.config.ts      ← all env knobs (JWT, rate limit, password, mail, OTP…)
│   ├── auth/                     ← register/login/refresh/logout/forgot/reset/verify/OTP
│   ├── users/                    ← GET/PATCH /users/me, status toggle
│   ├── donors/                   ← public search, map markers, single donor (tiered DTOs)
│   ├── dashboard/                ← user + admin aggregates
│   ├── appreciations/            ← thanks with 24h anti-spam
│   ├── notifications/            ← list, unread-count, mark read/all-read (ownership-checked)
│   ├── reports/                  ← file/list-mine + admin triage + reasons
│   ├── master-data/              ← blood-groups / country-codes / countries / states / cities
│   ├── admin/                    ← user management, reports triage, dashboard, email templates
│   ├── audit/                    ← GET /admin/audit-logs
│   ├── geocoding/                ← forward/reverse proxy
│   ├── contact/                  ← public contact form → support email
│   ├── mail/                     ← EmailTemplateService, SmsService, templates
│   ├── health/                   ← GET /api/health (liveness), /ready (readiness, 503 when down)
│   ├── redis/                    ← RedisService with memory fallback
│   ├── database/                 ← global PrismaService
│   └── common/                   ← JwtAuthGuard, OptionalJwtGuard, RolesGuard, decorators,
│                                   GlobalExceptionFilter (Prisma→HTTP mapping), LoggingInterceptor,
│                                   PaginationDto, hash + password-policy utils
└── apps/web/src/
    ├── index.html                ← viewport meta + Leaflet CDN
    ├── main.ts                   ← bootstrap (router, apiInterceptor, APP_INITIALIZER restore)
    ├── styles.css                ← design tokens + responsive breakpoints
    └── app/
        ├── app.routes.ts         ← lazy routes (public / user / admin + ** not-found)
        ├── core/ (guards, api.interceptor, auth/api/loading/error services)
        ├── layout/ (public-layout, user-layout, admin-layout)
        ├── shared/ (shared-ui.module, donor-map.component, not-found)
        └── features/
            ├── public/ (home, about, contact, blood-information, public-search)
            ├── auth/ (login, register, forgot/reset-password, verify-email)
            ├── dashboard/ · donors/ · appreciations/ · profile/ (+change-password)
            ├── notifications/ · reports/ (my-reports)
            └── admin/ (dashboard, users, reports, audit-logs, email-templates,
                        master-data ×5 + tabs, admin-profile)
```

---

## 4. Users, Roles & Permissions

| Capability | Anonymous | USER | ADMIN |
|---|---|---|---|
| Public donor search + map (masked names, approx. location) | ✅ | ✅ | ✅ (via donor endpoints) |
| Authenticated donor details (full name, mobile, PIN, rounded coords) | ❌ | ✅ | ✅ |
| Register / login / forgot / reset / verify-email | ✅ | — | — |
| Dashboard (own stats) | ❌ | ✅ | ❌ (has own admin dashboard) |
| Find donors, appreciations, profile, change-password, notifications, my-reports | ❌ | ✅ | ❌ |
| Email / mobile verification (OTP) | ❌ | ✅ (own) | ✅ (own) |
| Admin: list/get/patch users, activate/deactivate, soft-delete | ❌ | ❌ | ✅ |
| Admin: report triage, master-data CRUD, email templates, audit logs, admin dashboard | ❌ | ❌ | ✅ |
| Contact form, blood-info pages | ✅ | ✅ | ✅ |

Enforcement: server-side `JwtAuthGuard` + `RolesGuard(['ADMIN'])` on admin controllers, ownership checks in services (e.g. notification `userId` match), and Angular `authGuard / roleGuard(['ADMIN']) / guestGuard` for UX only. Anonymous vs authenticated donor responses are tiered by mappers (`PublicDonorDto` vs `AuthenticatedDonorDto`).

---

## 5. Core Workflows

### 5.1 Registration → verification
`RegisterComponent` (all fields required, DOB 18–65, mobile + PIN validation) → mandatory location capture (GPS `navigator.geolocation` or Leaflet pick-map dialog) → `POST /api/auth/register` (validates FKs, lowercases email, argon2 hash, writes `UserLocationHistory` + `AuditLog`, issues access JWT + HttpOnly refresh cookie, sends verification email) → `pendingChangesGuard` warns on unsaved form → verify email link (`/verify-email?token=`) and 6-digit SMS OTP (`send-mobile-otp` / `verify-mobile`, 10-min TTL, 5 attempts, dev-only `devOtp` echo).

### 5.2 Login / session
`POST /api/auth/login` (`{identifier, password, rememberMe}`; identifier = email or 10-digit/E.164 mobile; dummy-hash verify to block timing enumeration; login/identifier + IP rate limits) → access JWT (in-memory signal in Angular, ~10–15 min) + refresh cookie (`/api/auth`, persistent iff remember-me, else session cookie). `apiInterceptor` attaches `Authorization`, queues concurrent 401s behind a single `POST /api/auth/refresh` (rotation in same `familyId`, reuse ⇒ whole family revoked + `REFRESH_TOKEN_REUSE_DETECTED`), retries once, else clears session → `/login?returnUrl=`. `POST /api/auth/logout` is public and revokes by refresh cookie alone (works with expired access token). Cross-tab login/logout sync via `localStorage` events.

### 5.3 Password recovery
`POST /api/auth/forgot-password` (always generic 200; invalidates prior tokens; single-use short-lived SHA-256-hashed token; emails reset link; raw token never logged, `devToken` only in development/test) → `/reset-password?token=` → `POST /api/auth/reset-password` (policy check, marks token used, revokes all refresh tokens, notifies). Logged-in users use `POST /api/auth/change-password` (verifies current password, revokes other sessions, rotates own tokens).

### 5.4 Donor discovery
Filters: blood group, country/state/city dropdowns (cascading), area, PIN, `lat/lng + radiusKm (5/10/25/50/100/any)`, text search, `sortBy (distance/recent/name)`, pagination (page/pageSize ≤ 100). `GET /api/donors` (Haversine SQL over indexed lat/lng when geo present, Prisma fallback otherwise; anonymous masked, authenticated enriched), `GET /api/donors/map` (lightweight markers, anon-capped), `GET /api/donors/:id` (UUID-validated). Frontend: debounced live search, URL-synced filters (`Number.isFinite` guards), desktop table + mobile cards, Leaflet pins with popups, "Near me" via profile location, `hasThanked` state.

### 5.5 Thanks / reports / notifications
Appreciations: `POST /api/appreciations` (self-block, 24h sender→receiver anti-spam) → receiver notification + email. Reports: `POST /api/reports` (self-block, 24h duplicate suppression, active-reason check) → per-admin notifications (batched `createMany`) + audit log; reporter tracks `GET /api/reports/mine` (paginated) and status changes via notifications; admins triage `OPEN → UNDER_REVIEW → RESOLVED/REJECTED` with audit + reporter notification. Notifications: polling unread-count badge (30s + navigation/focus), mark read (ownership-checked) / read-all.

### 5.6 Admin & master data
`GET /api/admin/users` (filters + search + pagination), `GET/PATCH /users/:id` (allow-listed fields only), `PATCH /status` (audited + notify), `DELETE` (soft-delete + revoke tokens). Master data CRUD with in-use delete protection (409 + sample users where relevant). Email templates per notification type with test-send. Audit log records actor/action/entity/diff/IP/UA for admin actions, auth events, and report transitions. Contact form rate-limited → support + confirmation emails.

---

## 6. API Surface (base `/api`)

| Area | Endpoints |
|---|---|
| Health | `GET /health`, `GET /health/ready` |
| Auth | `POST register/login/refresh/logout/forgot-password/reset-password/change-password/verify-email/resend-verification/send-mobile-otp/verify-mobile`, `GET me` |
| Users | `GET me`, `PATCH me`, `PATCH me/status` |
| Donors | `GET /`, `GET /map`, `GET /:id` |
| Dashboard | `GET /` (user), via admin controller (global) |
| Appreciations | `POST /`, `GET received`, `GET given` |
| Notifications | `GET /`, `GET unread-count`, `PATCH read-all`, `PATCH :id/read` |
| Reports | `GET reasons/mine/:id`, `POST /` |
| Master | `GET/POST/PATCH/DELETE blood-groups, country-codes, countries, states, cities` (+ nested `countries/:id/states`, `states/:id/cities`) |
| Admin | `GET/PATCH users`, `GET users/:id`, `PATCH users/:id/status`, `DELETE users/:id`, `GET/PATCH reports`, `GET dashboard`, email-template CRUD + `POST :id/test` + notification-types |
| Audit | `GET /admin/audit-logs` |
| Geocoding | `GET forward` (public, rate-limited), `GET reverse` (auth) |
| Contact | `POST /` (public, rate-limited) |
| Docs | `/api/docs` (Swagger) |

Standard envelope: success `{success:true, data, message}`, errors `{success:false, error:{code, message, details?}}`; pagination `{items, page, pageSize, total, totalPages}`.

## 7. Frontend Routes (`app.routes.ts`, all lazy `loadComponent`)

- **PublicLayout**: `/` home, `/about`, `/contact`, `/blood-information`, `/search`, `/login|/register|/forgot-password|/reset-password` (`guestGuard`, register also `pendingChangesGuard`), `/verify-email`
- **UserLayout** (`authGuard`): `/dashboard`, `/donors`, `/appreciations`, `/profile`, `/change-password`, `/notifications`, `/reports`
- **AdminLayout** (`authGuard + roleGuard(['ADMIN'])`, prefix `/admin`): `dashboard`, `profile`, `users`, `reports`, `audit-logs`, `email-templates`, `master-data/blood-groups|country-codes|countries|states|cities`
- `**` → `NotFoundComponent`

## 8. Database (MySQL 8 + Prisma)

Enums: `Role (USER|ADMIN)`, `ReportStatus`, `NotificationType (8)`, `SecurityEventType (10)`, `AuditAction (8)`.
Master: `BloodGroup`, `Country`, `State` (unique per country), `City` (unique per state), `CountryCode`, `ReportReason`, `EmailTemplate`.
Core: `User` (UUID PK, unique email/mobile, `Decimal(9,6)` lat/lng, `active/role/deletedAt`, FKs → master), `RefreshToken` (hash + `familyId` rotation chain), `PasswordResetToken`, `EmailVerificationToken`, `MobileVerificationOtp`, `Appreciation` (sender→receiver + 24h index), `Notification`, `UserReport` (+ status/adminComment), `AuditLog`, `SecurityEvent`, `LoginHistory`, `UserLocationHistory`. Distance search uses Haversine over indexed lat/lng (no spatial extension).

## 9. Security Posture

- argon2 passwords; tokens stored as SHA-256 hashes only; JWT secrets fail-closed in production (boot refuses defaults <32B).
- Access JWT in memory (never localStorage); refresh as `HttpOnly; Secure (prod); SameSite=Strict` cookie on `/api/auth`.
- Rate limits: login per-IP (10/15m) + per-identifier (5/15m), refresh per-IP (30/15m), plus register/forgot/contact/geocoding guards (Redis-shared when configured).
- Generic auth error messages + dummy-hash verify (anti-enumeration/timing); single-use short-lived reset/OTP; refresh reuse ⇒ family revoke.
- Helmet, restrictive CORS (`FRONTEND_URL`, credentials), global `ValidationPipe` whitelist, Prisma→HTTP error mapping (no 500 leaks), IDOR ownership checks, tiered PII DTOs, XSS-safe Leaflet popups (HTML-escaped), audit + security-event trails.

## 10. Coding Practices

- Backend: thin controllers → services (business logic + authz) → Prisma; DTOs only cross HTTP; explicit mappers (never raw entities / never `passwordHash`); guards/pipes/filters/interceptors for cross-cutting concerns; `P2002→409` conflict handling; `Math.max/Math.floor` pagination clamps; batched writes (`createMany`) for fan-out.
- Frontend: standalone + OnPush + signals (`AuthService`), functional guards/interceptors, `firstValueFrom` one-shot HTTP (auto-complete), debounced search with `unsubscribe`, URL-synced filters, inline `p-message` banners via `getUserMessage` (no duplicate toasts), `ariaLabel`/roles/live regions, `overflow-wrap:anywhere` for long strings.
- Responsive: PrimeFlex grid + `styles.css` breakpoints (960/767/480px), `94vw` dialog/sidebar caps, scrollable tables with min-widths, desktop-table/mobile-card pattern, touch-aware Leaflet (`scrollWheelZoom` off on touch).
- Tests: API Jest (85: password-policy, hash, pagination, mail templates, geocoding, redis, donors); Web Jest (38: loading/api/auth services, all guards, not-found). Builds: `nest build`, `ng build` clean.

## 11. Implemented Status & Recent Hardening (Sept 2026)

Fully implemented: auth/session/OTP/recovery, tiered donor search + map, dashboard(s), thanks, reports + triage, notifications, profile/location, master-data, email templates, audit, contact, health. Latest commit `22645b8` ("auth hardening and responsive/mobile bug fixes", 13 files): prod secret guards, public logout, dev-only token echoes, Prisma error mapping, 503 readiness, 401-hang fix, single-toast, dashboard error text, NaN guards, responsive CSS. Deliberately deferred for simplicity: per-request JWT↔DB revalidation, rotation-race atomicity, global APP_GUARD, CAPTCHA, centralized `ApiService` base URL (endpoints still hardcode `/api/`), DB index migration.

## 12. Run & Operate

```bash
cp .env.example .env   # set DATABASE_URL, JWT_* (>=32B), FRONTEND_URL
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS bloodhelp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
cd apps/api && npm run prisma:migrate && npm run seed
npm --prefix apps/api install; npm --prefix apps/web install
npm run start:api   # http://localhost:3000/api/health, docs /api/docs
npm run start:web   # http://localhost:4200 (proxies /api)
npm run test        # api 85 + web 38
```

## 13. Configuration Highlights (`.env.example`)

`NODE_ENV, PORT, FRONTEND_URL, DATABASE_URL, REDIS_URL`, `RATE_LIMIT_*` (login/refresh windows), `JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / *_EXPIRES_IN*`, `PASSWORD_*` policy (min 12, upper/lower/number/special), `EMAIL_*/SMTP_*`, `MOBILE_OTP_*` (10m, 5 attempts, pepper), `MAP_TILE_*` (OSM), `GEOCODING_*`.
