# Blood Donor Management Platform — Phase 1: Architecture

**Status:** Draft for approval. No implementation code is included in this phase, per the requested process (Section 80/81).

This document is the single architecture reference for all subsequent phases (2–10). Every later phase must conform to what's defined here; if a later phase needs to deviate, that deviation must be called out explicitly and this document updated.

---

## Table of Contents

1. System Architecture
2. Database ER Diagram
3. Complete Database Schema (Prisma)
4. API Contract
5. JWT / Authentication Flow
6. Password Recovery Flow
7. Location & Mapping Architecture
8. Angular Route Architecture
9. Security Threat Model
10. Implementation Roadmap
11. Open Ambiguities & Proposed Defaults

---

## 1. System Architecture

### 1.1 High-level component diagram

```
                                   ┌─────────────────────────┐
                                   │        Browser           │
                                   │  Angular 19 (standalone) │
                                   │  Leaflet + OSM tiles     │
                                   └────────────┬─────────────┘
                                                │ HTTPS (TLS 1.2+)
                                                ▼
                                   ┌─────────────────────────┐
                                   │  Reverse Proxy / Gateway │
                                   │  (nginx / Traefik)       │
                                   │  - TLS termination       │
                                   │  - Static asset caching  │
                                   │  - Rate limiting (edge)  │
                                   └────────────┬─────────────┘
                                                │
                          ┌─────────────────────┼─────────────────────┐
                          ▼                                           ▼
              ┌───────────────────────┐                  ┌─────────────────────────┐
              │   Angular static SPA   │                  │        NestJS API        │
              │   (served as static    │                  │  /api/v1/*                │
              │   files, or its own    │                  │  Modular monolith         │
              │   container)           │                  └────────────┬─────────────┘
              └───────────────────────┘                                │
                                                                        │
                    ┌───────────────────────────────┬───────────────────┼─────────────────────────────┐
                    ▼                               ▼                   ▼                             ▼
        ┌────────────────────┐        ┌───────────────────────┐ ┌──────────────┐        ┌──────────────────────────┐
        │ PostgreSQL + PostGIS│        │  Redis                 │ │ Email Provider│        │ Map / Geocoding Provider  │
        │ (Prisma ORM)         │        │  - rate limiting        │ │ (SMTP/SES/... │        │ (OSM tiles / self-hosted  │
        │ - donors, masters,   │        │  - refresh-token        │ │  via          │        │  Nominatim / commercial)  │
        │   audit, tokens      │        │    blacklist cache      │ │  EmailService)│        │ accessed via              │
        │                       │        │  - BullMQ job queue     │ └──────────────┘        │ GeocodingService          │
        └────────────────────┘        └───────────────────────┘                            └──────────────────────────┘
```

### 1.2 Architectural style

- **Backend:** NestJS **modular monolith** (not microservices). Rationale: the domain is cohesive (one relational dataset, tight referential integrity across users/appreciations/reports/audit), team size is presumably small-to-medium, and a monolith with clean module boundaries gives 90% of microservice maintainability benefits without the operational cost of distributed transactions, service discovery, and network reliability engineering. Module boundaries are drawn so extraction into services later (e.g., `notifications`, `reports`) is possible without a rewrite — each module talks to others only through its exported service interface, never by reaching into another module's Prisma models directly from a controller.
- **Frontend:** Angular SPA, standalone components, lazy-loaded feature routes, strict TypeScript.
- **Database:** Single PostgreSQL instance with PostGIS extension. One schema, normalized, UUID PKs.
- **Cross-cutting concerns** (auth, validation, logging, error mapping, rate limiting) implemented as Nest guards/interceptors/filters/pipes — not duplicated per module.
- **Async work** (emails, notification fan-out) goes through a queue (BullMQ on Redis) so user-facing requests never block on SMTP latency.

### 1.3 Layering (per module)

```
HTTP Request
   │
   ▼
Controller            — route + DTO binding + Swagger decorators only. No business logic.
   │
   ▼
Guards (Auth/Roles) → Pipes (ValidationPipe on DTOs) → Interceptor (logging/response shape)
   │
   ▼
Service               — business logic, orchestration, authorization decisions beyond RBAC
   │                     (e.g., "can this actor edit this resource")
   ▼
Repository (Prisma)   — data access; for donor/geo queries, raw parameterized PostGIS SQL
   │                     via Prisma's $queryRaw with typed results
   ▼
PostgreSQL / PostGIS
```

- DTO classes (class-validator/class-transformer) are the only shape crossing the HTTP boundary — never raw Prisma models.
- Mapping from Prisma entity → DTO happens in the service layer via dedicated mapper functions (`toPublicDonorDto`, `toAuthenticatedDonorDto`, `toAdminUserDto`), so a new field on `User` can never leak into a response by accident.

### 1.4 Why NestJS + Prisma + PostGIS via raw SQL

- Prisma does not have first-class geometry/geography types or spatial functions. Standard practice: model the `location` column as `Unsupported("geography(Point,4326)")` in the Prisma schema (so migrations still manage it), but perform `ST_DWithin`/`ST_Distance`/`ST_MakePoint` operations through `prisma.$queryRaw`/`$queryRawUnsafe` with **parameterized** template literals (never string concatenation) inside a dedicated `DonorsRepository`. This isolates raw SQL to one place, fully testable in integration tests against a real Postgres/PostGIS test container.

---

## 2. Database ER Diagram

```
 countries 1───* states 1───* cities
     │                              
     │ 1                            
     *                              
 country_codes                     

 roles (enum, not a table — see §11) 

 blood_groups 1───* users
 countries    1───* users
 states       1───* users
 cities       1───* users
 country_codes 1───* users

 users 1───* refresh_tokens
 users 1───* password_reset_tokens
 users 1───* email_verification_tokens
 users 1───* notifications
 users 1───* audit_logs            (actor_user_id, nullable → system actions)
 users 1───* login_history
 users 1───* security_events
 users 1───* user_location_history

 users 1───* appreciations (as sender_user_id)
 users 1───* appreciations (as receiver_user_id)

 users 1───* user_reports (as reported_by_user_id)
 users 1───* user_reports (as reported_user_id)
 report_reasons 1───* user_reports
```

Full field-level ERD is expressed precisely by the Prisma schema in §3 — that schema is the authoritative source of truth for relationships, cardinality, and constraints.

---

## 3. Complete Database Schema (Prisma)

```prisma
// packages/shared-types or apps/api/prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [postgis]
}

// ────────────────────────────────────────────────────────────
// ENUMS
// ────────────────────────────────────────────────────────────

enum Role {
  USER
  ADMIN
}

enum ReportStatus {
  OPEN
  UNDER_REVIEW
  RESOLVED
  REJECTED
}

enum NotificationType {
  APPRECIATION_RECEIVED
  REPORT_CREATED
  REPORT_STATUS_CHANGED
  ACCOUNT_ACTIVATED
  ACCOUNT_DEACTIVATED
  PASSWORD_CHANGED
  SECURITY_EVENT
  ADMIN_ANNOUNCEMENT
}

enum SecurityEventType {
  LOGIN_SUCCESS
  LOGIN_FAILED
  LOGOUT
  PASSWORD_RESET_REQUESTED
  PASSWORD_RESET_COMPLETED
  PASSWORD_CHANGED
  REFRESH_TOKEN_REUSE_DETECTED
  ACCOUNT_LOCKED
  EMAIL_CHANGED
  MOBILE_CHANGED
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  ACTIVATE
  DEACTIVATE
  SOFT_DELETE
  STATUS_CHANGE
  ROLE_CHANGE
}

// ────────────────────────────────────────────────────────────
// MASTER DATA
// ────────────────────────────────────────────────────────────

model BloodGroup {
  id        String   @id @default(uuid())
  code      String   @unique // "A+", "O-", etc.
  label     String
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  users User[]

  @@map("blood_groups")
}

model Country {
  id        String   @id @default(uuid())
  name      String   @unique
  isoCode2  String   @unique @map("iso_code2") // "IN", "US"
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  states       State[]
  countryCodes CountryCode[]
  users        User[]

  @@map("countries")
}

model State {
  id        String   @id @default(uuid())
  countryId String   @map("country_id")
  name      String
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  country Country @relation(fields: [countryId], references: [id], onDelete: Restrict)
  cities  City[]
  users   User[]

  @@unique([countryId, name])
  @@index([countryId])
  @@map("states")
}

model City {
  id        String   @id @default(uuid())
  stateId   String   @map("state_id")
  name      String
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  state State  @relation(fields: [stateId], references: [id], onDelete: Restrict)
  users User[]

  @@unique([stateId, name])
  @@index([stateId])
  @@map("cities")
}

model CountryCode {
  id        String   @id @default(uuid())
  countryId String?  @map("country_id")
  dialCode  String   // "+91"
  label     String   // "India (+91)"
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  country Country? @relation(fields: [countryId], references: [id], onDelete: SetNull)
  users   User[]

  @@map("country_codes")
}

model ReportReason {
  id        String   @id @default(uuid())
  code      String   @unique
  label     String
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  reports UserReport[]

  @@map("report_reasons")
}

// ────────────────────────────────────────────────────────────
// USERS
// ────────────────────────────────────────────────────────────

model User {
  id String @id @default(uuid())

  firstName   String    @map("first_name")
  lastName    String    @map("last_name")
  dateOfBirth DateTime  @map("date_of_birth") @db.Date

  email         String  @unique
  emailVerified Boolean @default(false) @map("email_verified")

  countryCodeId String @map("country_code_id")
  mobile        String @unique // full E.164, e.g. +919876543210
  mobileVerified Boolean @default(false) @map("mobile_verified")

  passwordHash String @map("password_hash")

  bloodGroupId String @map("blood_group_id")

  countryId String @map("country_id")
  stateId   String @map("state_id")
  cityId    String @map("city_id")

  area    String
  pinCode String @map("pin_code")

  latitude  Decimal @db.Decimal(9, 6)
  longitude Decimal @db.Decimal(9, 6)

  /// Geography point, SRID 4326. Managed via raw SQL trigger/generated column —
  /// see migration notes below. Prisma treats this as Unsupported so it is
  /// excluded from the generated client's normal CRUD; all reads/writes to
  /// this column happen through DonorsRepository raw queries.
  location Unsupported("geography(Point,4326)")?

  active Boolean @default(true)
  role   Role    @default(USER)

  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  countryCode CountryCode @relation(fields: [countryCodeId], references: [id], onDelete: Restrict)
  bloodGroup  BloodGroup  @relation(fields: [bloodGroupId], references: [id], onDelete: Restrict)
  country     Country     @relation(fields: [countryId], references: [id], onDelete: Restrict)
  state       State       @relation(fields: [stateId], references: [id], onDelete: Restrict)
  city        City        @relation(fields: [cityId], references: [id], onDelete: Restrict)

  refreshTokens         RefreshToken[]
  passwordResetTokens   PasswordResetToken[]
  emailVerificationTokens EmailVerificationToken[]
  notifications         Notification[]
  loginHistory          LoginHistory[]
  securityEvents        SecurityEvent[]
  locationHistory       UserLocationHistory[]

  appreciationsSent     Appreciation[] @relation("AppreciationSender")
  appreciationsReceived Appreciation[] @relation("AppreciationReceiver")

  reportsFiled   UserReport[] @relation("ReportedBy")
  reportsAgainst UserReport[] @relation("ReportedUser")

  auditLogsAsActor AuditLog[] @relation("AuditActor")

  @@index([active])
  @@index([bloodGroupId])
  @@index([countryId])
  @@index([stateId])
  @@index([cityId])
  @@index([pinCode])
  @@index([createdAt])
  @@index([active, bloodGroupId])
  @@index([countryId, stateId, cityId])
  // Spatial GIST index on `location` is created via raw SQL migration
  // (Prisma cannot express GIST index type natively):
  //   CREATE INDEX users_location_gist_idx ON users USING GIST (location);
  @@map("users")
}

// ────────────────────────────────────────────────────────────
// AUTH / TOKENS
// ────────────────────────────────────────────────────────────

model RefreshToken {
  id         String    @id @default(uuid())
  userId     String    @map("user_id")
  tokenHash  String    @unique @map("token_hash")
  familyId   String    @map("family_id") // groups a rotation chain for reuse detection
  expiresAt  DateTime  @map("expires_at")
  revokedAt  DateTime? @map("revoked_at")
  replacedByTokenHash String? @map("replaced_by_token_hash")
  createdAt  DateTime  @default(now()) @map("created_at")
  lastUsedAt DateTime? @map("last_used_at")
  ipAddress  String?   @map("ip_address")
  userAgent  String?   @map("user_agent")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([familyId])
  @@index([expiresAt])
  @@map("refresh_tokens")
}

model PasswordResetToken {
  id        String    @id @default(uuid())
  userId    String    @map("user_id")
  tokenHash String    @unique @map("token_hash")
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")
  ipAddress String?   @map("ip_address")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("password_reset_tokens")
}

model EmailVerificationToken {
  id        String    @id @default(uuid())
  userId    String    @map("user_id")
  newEmail  String?   @map("new_email") // set when this verification is for an email change
  tokenHash String    @unique @map("token_hash")
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("email_verification_tokens")
}

// ────────────────────────────────────────────────────────────
// SOCIAL / ENGAGEMENT
// ────────────────────────────────────────────────────────────

model Appreciation {
  id             String   @id @default(uuid())
  senderUserId   String   @map("sender_user_id")
  receiverUserId String   @map("receiver_user_id")
  message        String?  @db.VarChar(500)
  createdAt      DateTime @default(now()) @map("created_at")

  sender   User @relation("AppreciationSender", fields: [senderUserId], references: [id], onDelete: Cascade)
  receiver User @relation("AppreciationReceiver", fields: [receiverUserId], references: [id], onDelete: Cascade)

  @@index([receiverUserId])
  @@index([senderUserId])
  // Soft anti-spam guard: one appreciation per sender→receiver per rolling 24h,
  // enforced in the service layer (see §11 ambiguity notes) plus this composite
  // index to make the lookup cheap.
  @@index([senderUserId, receiverUserId, createdAt])
  @@map("appreciations")
}

model Notification {
  id            String           @id @default(uuid())
  userId        String           @map("user_id")
  type          NotificationType
  title         String
  message       String
  referenceType String?          @map("reference_type") // "APPRECIATION" | "REPORT" | ...
  referenceId   String?          @map("reference_id")
  isRead        Boolean          @default(false) @map("is_read")
  createdAt     DateTime         @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([isRead])
  @@index([userId, isRead])
  @@map("notifications")
}

model UserReport {
  id               String       @id @default(uuid())
  reportedByUserId String       @map("reported_by_user_id")
  reportedUserId   String       @map("reported_user_id")
  reasonId         String       @map("reason_id")
  description      String?      @db.VarChar(1000)
  status           ReportStatus @default(OPEN)
  adminComment     String?      @map("admin_comment") @db.VarChar(1000)
  createdAt        DateTime     @default(now()) @map("created_at")
  updatedAt        DateTime     @updatedAt @map("updated_at")

  reportedBy User         @relation("ReportedBy", fields: [reportedByUserId], references: [id], onDelete: Cascade)
  reportedUser User       @relation("ReportedUser", fields: [reportedUserId], references: [id], onDelete: Cascade)
  reason     ReportReason @relation(fields: [reasonId], references: [id], onDelete: Restrict)

  @@index([status])
  @@index([reportedUserId])
  @@index([reportedByUserId])
  @@map("user_reports")
}

// ────────────────────────────────────────────────────────────
// AUDIT / SECURITY / OBSERVABILITY
// ────────────────────────────────────────────────────────────

model AuditLog {
  id           String      @id @default(uuid())
  actorUserId  String?     @map("actor_user_id") // null = system
  action       AuditAction
  entityType   String      @map("entity_type") // "User", "BloodGroup", ...
  entityId     String      @map("entity_id")
  oldValue     Json?       @map("old_value")
  newValue     Json?       @map("new_value")
  ipAddress    String?     @map("ip_address")
  userAgent    String?     @map("user_agent")
  createdAt    DateTime    @default(now()) @map("created_at")

  actor User? @relation("AuditActor", fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([entityType, entityId])
  @@index([actorUserId])
  @@index([createdAt])
  @@map("audit_logs")
}

model SecurityEvent {
  id        String            @id @default(uuid())
  userId    String?           @map("user_id")
  type      SecurityEventType
  metadata  Json?
  ipAddress String?           @map("ip_address")
  userAgent String?           @map("user_agent")
  createdAt DateTime          @default(now()) @map("created_at")

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([type])
  @@index([createdAt])
  @@map("security_events")
}

model LoginHistory {
  id        String   @id @default(uuid())
  userId    String?  @map("user_id") // null when identifier didn't match any user
  identifier String  // raw email/mobile attempted, for forensic purposes only
  success   Boolean
  ipAddress String?  @map("ip_address")
  userAgent String?  @map("user_agent")
  createdAt DateTime @default(now()) @map("created_at")

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([createdAt])
  @@map("login_history")
}

model UserLocationHistory {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  latitude  Decimal  @db.Decimal(9, 6)
  longitude Decimal  @db.Decimal(9, 6)
  source    String   // "GPS" | "MAP_PICK" | "GEOCODE"
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("user_location_history")
}
```

**Migration notes (not code, just the plan for Phase 2):**

1. Enable `CREATE EXTENSION IF NOT EXISTS postgis;` in the first migration.
2. After Prisma creates the `users` table, a follow-up raw-SQL migration adds:
   ```sql
   ALTER TABLE users ADD COLUMN location geography(Point,4326);
   CREATE INDEX users_location_gist_idx ON users USING GIST (location);
   ```
3. A Postgres trigger (`BEFORE INSERT OR UPDATE ON users`) keeps `location` in sync with `latitude`/`longitude`:
   ```sql
   CREATE OR REPLACE FUNCTION sync_user_location() RETURNS trigger AS $$
   BEGIN
     NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude::float8, NEW.latitude::float8), 4326)::geography;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER trg_sync_user_location
   BEFORE INSERT OR UPDATE OF latitude, longitude ON users
   FOR EACH ROW EXECUTE FUNCTION sync_user_location();
   ```
   This guarantees `location` can never drift from `latitude`/`longitude`, and application code never has to write PostGIS geometry directly — it just writes `latitude`/`longitude` like normal columns and the trigger derives the geography column used for spatial queries.

---

## 4. API Contract

Base path: `/api/v1`. All responses use the standard envelope from §51 of the requirements. Pagination uses `page` (1-based) and `pageSize` (default 20, max 100) query params, response includes `{ items, page, pageSize, total, totalPages }` inside `data`.

Legend: 🔓 Public · 🔐 Authenticated (any role) · 👑 Admin only

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | 🔓 | Creates USER, active=true. Rate-limited per IP. |
| POST | `/auth/login` | 🔓 | `{identifier, password}`. Rate-limited + progressive lockout per identifier+IP. |
| POST | `/auth/refresh` | 🔓 (refresh cookie) | Rotates refresh token; detects reuse. |
| POST | `/auth/logout` | 🔐 | Revokes current refresh token family. |
| GET | `/auth/me` | 🔐 | Returns current user's own full profile (AuthenticatedSelfDto). |
| POST | `/auth/forgot-password` | 🔓 | Always 200 + generic message. Rate-limited per IP + per email. |
| POST | `/auth/reset-password` | 🔓 | `{token, newPassword, confirmPassword}`. |
| POST | `/auth/verify-email` | 🔓 | Token-based, optional feature flag. |
| POST | `/auth/verify-mobile` | 🔐 | OTP-based, optional feature flag. |
| POST | `/auth/resend-verification` | 🔐 | Rate-limited. |
| GET | `/users/me` | 🔐 | Alias of `/auth/me`, kept for REST symmetry with PATCH below. |
| PATCH | `/users/me` | 🔐 | Profile edit. Email/mobile change triggers re-verification, does not apply immediately to the unique-checked field until verified (see §11). |
| PATCH | `/users/me/status` | 🔐 | `{active: boolean}` — self toggle only. |
| GET | `/donors` | 🔓 (tiered response) | Filters: country/state/city/area/pinCode/bloodGroupId/active/lat/lng/radiusKm/page/pageSize/sortBy. Anonymous → `PublicDonorDto[]`; authenticated → `AuthenticatedDonorDto[]`. |
| GET | `/donors/:id` | 🔓 (tiered response) | Same tiering as above for a single donor. |
| GET | `/donors/map` | 🔓 (tiered response) | Same filters as `/donors`, returns lightweight marker DTOs (id, approx/exact lat-lng per tier, bloodGroup, name/masked name), capped at e.g. 500 markers server-side with a "narrow your filters" error above that. |
| GET | `/dashboard` | 🔐 | Aggregated stats scoped to the logged-in user's location/blood group. |
| POST | `/appreciations` | 🔐 | `{receiverUserId, message?}`. Self-appreciation blocked, rate-limited. |
| GET | `/appreciations/received` | 🔐 | Paginated. |
| GET | `/appreciations/given` | 🔐 | Paginated. |
| GET | `/notifications` | 🔐 | Paginated, filter `isRead`. |
| PATCH | `/notifications/:id/read` | 🔐 | Ownership-checked (IDOR guard). |
| PATCH | `/notifications/read-all` | 🔐 | |
| POST | `/reports` | 🔐 | `{reportedUserId, reasonId, description?}`. Self-report blocked, rate-limited. |
| GET | `/master/blood-groups` | 🔓 | Cacheable, long TTL. |
| GET | `/master/country-codes` | 🔓 | Cacheable. |
| GET | `/master/countries` | 🔓 | Cacheable. |
| GET | `/master/countries/:countryId/states` | 🔓 | Cacheable. |
| GET | `/master/states/:stateId/cities` | 🔓 | Cacheable. |
| GET | `/geocoding/reverse` | 🔐 | Proxies GeocodingService; never forwards user PII, only coordinates. |
| GET | `/geocoding/forward` | 🔐 | Proxies GeocodingService for address→coordinates during registration/profile edit. |
| GET | `/admin/users` | 👑 | Filters same as donor search + email/mobile search, paginated. |
| GET | `/admin/users/:id` | 👑 | Returns `AdminUserDto` (includes email/mobile/status/audit-relevant fields, never passwordHash). |
| PATCH | `/admin/users/:id` | 👑 | Full profile edit; audited. |
| PATCH | `/admin/users/:id/status` | 👑 | Activate/deactivate; audited; triggers notification+email. |
| DELETE | `/admin/users/:id` | 👑 | Soft delete (`deletedAt`); audited. |
| GET | `/admin/dashboard` | 👑 | Global aggregates + chart datasets. |
| GET | `/admin/reports` | 👑 | Paginated, filter by status. |
| GET | `/admin/reports/:id` | 👑 | |
| PATCH | `/admin/reports/:id` | 👑 | Status/comment update; audited; may notify reported user per policy. |
| CRUD | `/admin/master/blood-groups` etc. | 👑 | Standard CRUD, `DELETE` blocked (409) if referenced by any user — see §11. |
| GET | `/health` | 🔓 | Liveness. |
| GET | `/health/ready` | 🔓 | Readiness — checks DB + Redis connectivity. |

### 4.1 Example contract detail — `POST /auth/login`

**Request**
```json
{ "identifier": "user@example.com", "password": "Str0ng!Pass" }
```
**Validation:** `identifier` required, string, 3–254 chars. `password` required, string, 1–128 chars (do not enforce policy on *login*, only on register/reset — a policy change shouldn't lock out existing users).

**Success 200**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "expiresIn": 900,
    "user": { "id": "...", "firstName": "...", "lastName": "...", "role": "USER" }
  },
  "message": "Login successful"
}
```
Refresh token is set as an `HttpOnly; Secure; SameSite=Strict` cookie, not in the JSON body (see §5).

**Errors:** `401 AUTH_INVALID_CREDENTIALS`, `403 AUTH_ACCOUNT_DISABLED`, `429 AUTH_RATE_LIMITED`.

### 4.2 Example contract detail — `GET /donors`

**Query params:** `country`, `state`, `city`, `area`, `pinCode`, `bloodGroupId`, `active` (default `true`), `lat`, `lng`, `radiusKm` (enum: 5/10/25/50/100/`any`), `page`, `pageSize` (max 100), `sortBy` (`distance`|`recent`|`name`), `search`.

**Validation:** `lat`/`lng` must be provided together; `radiusKm` requires `lat`+`lng`; UUID params validated as UUID; `pageSize` clamped server-side rather than rejected outright (defensive default, not a hard error, to keep the UI resilient).

**Response (anonymous):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "displayName": "So***h J.",
        "bloodGroup": "O+",
        "country": "India",
        "state": "Maharashtra",
        "city": "Mumbai",
        "area": "Andheri East",
        "approxDistanceKm": 3.2,
        "active": true
      }
    ],
    "page": 1, "pageSize": 20, "total": 57, "totalPages": 3
  },
  "message": "Request completed successfully"
}
```

**Response (authenticated)** adds `mobile`, `email`, `fullName`, `pinCode`, `receivedThanksCount`, exact-enough coordinates for map display **only when the requester is authenticated** — governed centrally by `DonorVisibilityPolicy` (see §8 threat model, IDOR/PII section).

---

## 5. JWT / Authentication Flow

### 5.1 Token strategy

- **Access token:** JWT, HS256 (or RS256 if multiple services will verify it independently — start with HS256 for the monolith, documented as swappable), 15 minute expiry (`JWT_ACCESS_EXPIRES_IN`), returned in the JSON response body, held in memory in Angular (a signal/service field, **not** localStorage — see rationale below).
- **Refresh token:** opaque, cryptographically random 256-bit value, **not a JWT** (JWTs are unnecessary and larger for a token whose only job is "look up a DB row"). Sent as `HttpOnly; Secure; SameSite=Strict` cookie, scoped to path `/api/v1/auth`. 7–30 day expiry (`JWT_REFRESH_EXPIRES_IN`). The server stores only `SHA-256(token)` in `refresh_tokens.token_hash`.

**Why HttpOnly cookie for refresh, memory for access:** localStorage is readable by any script on the page, so a single XSS vulnerability yields full account takeover if the refresh token lives there. An HttpOnly cookie is inaccessible to JavaScript, which contains an XSS blast radius to "use the app as the logged-in user for 15 minutes" rather than "steal a token that lasts a month." Because the refresh flow uses a cookie, `/auth/refresh` and `/auth/logout` need CSRF protection (double-submit cookie or `SameSite=Strict` + custom header check) — see §9.

### 5.2 Login sequence

```
Angular                         NestJS                          Postgres/Redis
   │  POST /auth/login              │
   ├────────────────────────────────►
   │                                 │  lookup by email OR mobile
   │                                 ├──────────────────────────────►
   │                                 │  argon2.verify(hash, password)
   │                                 │  check active, not deleted
   │                                 │  check login-attempt rate limit (Redis)
   │                                 │  issue access JWT (15m)
   │                                 │  generate refresh token, store hash + familyId
   │                                 │  write LoginHistory + SecurityEvent(LOGIN_SUCCESS)
   │  200 { accessToken, user }      │
   │  Set-Cookie: refresh_token      │
   ◄────────────────────────────────┤
   │  store accessToken in memory    │
   │  route by role → /dashboard     │
   │             or /admin/dashboard │
```

### 5.3 Access-token expiry / refresh sequence

```
Angular AuthInterceptor                     NestJS
   │  API request with expired access token     │
   ├─────────────────────────────────────────────►
   │  401 AUTH_TOKEN_EXPIRED                     │
   ◄─────────────────────────────────────────────┤
   │  (interceptor) if not already refreshing:   │
   │    POST /auth/refresh  (cookie sent auto)   │
   ├─────────────────────────────────────────────►
   │            validate cookie token hash vs DB │
   │            check not expired/revoked         │
   │            ROTATE: revoke old, issue new     │
   │              refresh token (same familyId)   │
   │            issue new access token            │
   │  200 { accessToken }  + new Set-Cookie        │
   ◄─────────────────────────────────────────────┤
   │  update in-memory access token               │
   │  retry original request(s)                  │
```

- The interceptor uses a **single shared in-flight refresh Observable** (e.g. via a `BehaviorSubject`/`shareReplay`) so N concurrent 401s trigger exactly one `/auth/refresh` call; all queued requests wait on it and retry once it resolves.
- If refresh fails (expired/revoked/reuse-detected), the interceptor clears in-memory state and hard-redirects to `/login`.

### 5.4 Refresh-token rotation & reuse detection

Each refresh token belongs to a `familyId` established at login. On every successful refresh:
1. The presented token's hash is looked up. If not found or `revokedAt` is set → **this is reuse of an already-rotated (or already-revoked) token** → revoke **the entire family** (all tokens sharing `familyId`), log `SecurityEvent.REFRESH_TOKEN_REUSE_DETECTED`, respond `401`, force full re-login. This is the standard defense against a stolen-then-replayed refresh token racing the legitimate client.
2. Otherwise: mark the presented token `revokedAt = now()`, set `replacedByTokenHash`, insert a new row in the same family, return the new token.

### 5.5 Logout

`POST /auth/logout` revokes the current refresh token's family, clears the cookie, and the client discards the in-memory access token. "Logout everywhere" (future extension) = revoke all families for `userId`.

### 5.6 Authorization (RBAC) enforcement

- `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('ADMIN')` decorator on every admin controller/route. `JwtAuthGuard` runs first (authentication), `RolesGuard` second (authorization) — a missing/invalid token always yields `401` before any `403` role check, so role membership of unauthenticated callers is never revealed.
- **Every** state-changing or PII-bearing endpoint is guarded server-side regardless of what the Angular route guards do; Angular guards are UX-only, per requirement §5.
- Ownership checks (IDOR protection) are explicit in services, e.g. `PATCH /notifications/:id/read` loads the notification and checks `notification.userId === req.user.id` before mutating, independent of the role guard.

---

## 6. Password Recovery Flow

```
 [Login page] → "Forgot Password?"
        │
        ▼
 [/forgot-password]  User enters email → POST /auth/forgot-password
        │
        ▼
 Backend:
   - look up user by email (case-insensitive)
   - regardless of found/not found/inactive/deleted:
        └─ ALWAYS return 200 generic message (no enumeration)
   - IF found and active:
        1. invalidate (usedAt=now, or delete) all prior unused
           PasswordResetToken rows for this user
        2. generate 256-bit random token (crypto.randomBytes)
        3. store only SHA-256(token) + expiresAt (now + PASSWORD_RESET_EXPIRES_IN)
        4. enqueue "send password reset email" job (BullMQ) — never block
           the HTTP response on SMTP
        5. record SecurityEvent.PASSWORD_RESET_REQUESTED
   - Rate limit: per-email (e.g. 3/hour) AND per-IP (e.g. 10/hour) via Redis,
     evaluated BEFORE the enumeration-safe branch so limits don't leak
     existence either (limit key is the raw submitted email/IP, not
     "user found")
        │
        ▼
 Email worker: EmailService.sendPasswordReset(user, rawToken)
   → builds link: `${FRONTEND_URL}/reset-password?token=<rawToken>`
        │
        ▼
 [/reset-password?token=...]  User enters New Password + Confirm
        │  client-side: password-strength meter, match check
        ▼
 POST /auth/reset-password { token, newPassword, confirmPassword }
        │
        ▼
 Backend:
   - hash presented token, look up PasswordResetToken by tokenHash
   - validate: exists, not usedAt, not expired
       → else 400 with a specific code the frontend maps to
         "expired" / "invalid" / "already used" messaging + a
         "Request a new reset link" CTA
   - validate newPassword against PASSWORD_* policy
   - TRANSACTION:
       a. update user.passwordHash = argon2.hash(newPassword)
       b. mark this token usedAt = now()
       c. revoke ALL refresh_tokens for this user (force logout everywhere)
       d. record SecurityEvent.PASSWORD_RESET_COMPLETED
       e. enqueue "password changed" notification + email
   - 200 generic success
        │
        ▼
 Frontend: "Password changed" → redirect to /login
```

Configurable via `PASSWORD_RESET_EXPIRES_IN` (default 30 minutes, per requirement's 15–30 min recommendation — 30 chosen as default to reduce support load from users who don't check email immediately, while staying inside the requested range).

---

## 7. Location & Mapping Architecture

```
                         ┌───────────────────────────────────────────┐
                         │              Angular                      │
                         │  MapLocationPickerComponent (Leaflet)      │
                         │                                             │
                         │  Option 1: navigator.geolocation.getCurrentPosition()
                         │  Option 2: click/drag marker on Leaflet map │
                         │  Option 3: Country/State/City/Area/Pin →    │
                         │            "Find on map" button             │
                         └───────────────┬─────────────────────────────┘
                                         │ (Option 3 only)
                                         │ GET /api/v1/geocoding/forward?address=...
                                         ▼
                         ┌───────────────────────────────────────────┐
                         │              NestJS GeocodingModule         │
                         │  GeocodingService (interface)                │
                         │    forwardGeocode(query): {lat,lng}[]        │
                         │    reverseGeocode(lat,lng): address          │
                         │                                               │
                         │  Impl selected by GEOCODING_PROVIDER env:     │
                         │    - NominatimGeocodingService                │
                         │      (self-hosted OR public, per config)      │
                         │    - CommercialGeocodingService (future)      │
                         └───────────────┬───────────────────────────────┘
                                         │ HTTPS, server-to-server
                                         │ query = address text ONLY
                                         │ (never name/email/mobile/userId)
                                         ▼
                         ┌───────────────────────────────────────────┐
                         │   GEOCODING_BASE_URL  (configured provider) │
                         └───────────────────────────────────────────┘

 On confirm (any option) → Angular sends {latitude, longitude} to
 POST /auth/register or PATCH /users/me → stored on `users` table →
 Postgres trigger derives `location geography(Point,4326)` (see §3).

 Map TILE rendering is entirely client-side Leaflet → MAP_TILE_URL,
 never proxied through the API (tiles are non-sensitive, cacheable by
 the browser/CDN directly). Only geocoding (which could carry address
 text) is proxied server-side, and only coordinates are ever sent back
 to the client for map centering — the geocoding proxy strips/never
 accepts user identity fields.
```

### 7.1 Why proxy geocoding through the backend at all

Two reasons: (1) it lets the provider be swapped (`GEOCODING_PROVIDER`) without touching Angular; (2) it lets the backend attach its own rate limiting / caching / audit rather than trusting the browser to behave, and guarantees no user PII (beyond the address text itself, which the user is intentionally geocoding) reaches a third party — e.g. the proxy is careful to send only `"221B Baker Street, London"`-style query text, never the user's name, email, or internal ID as part of the request.

### 7.2 Distance search (server-side, PostGIS)

Conceptual query executed by `DonorsRepository` via `$queryRaw` (parameterized, illustrative — not final SQL):

```
SELECT id, first_name, last_name, ...,
       ST_Distance(location, ST_MakePoint($lng,$lat)::geography) / 1000 AS distance_km
FROM users
WHERE deleted_at IS NULL
  AND ($active IS NULL OR active = $active)
  AND ($bloodGroupId IS NULL OR blood_group_id = $bloodGroupId)
  AND ($radiusKm IS NULL OR ST_DWithin(location, ST_MakePoint($lng,$lat)::geography, $radiusKm * 1000))
ORDER BY distance_km ASC
LIMIT $pageSize OFFSET $offset;
```

`ST_DWithin` is used (not a bounding box in app code) because it uses the GIST spatial index efficiently and is geographically accurate on a sphere/spheroid, unlike naive Euclidean lat/lng math. Country/state/city/area/pinCode filters combine with the spatial filter via plain `AND`s — per requirement §26, distance is independent of the administrative filters, so both filter sets are optional and orthogonal.

### 7.3 Production map provider posture

- Default `.env.example` ships with the public OSM tile server and public Nominatim, clearly commented `# DEV/DEMO ONLY — see docs/map-architecture.md before production`.
- `docs/map-architecture.md` (Phase 2 deliverable) documents the migration path: self-host `tileserver-gl`/`osm2pgsql`-based tiles, or contract an OSM-derived commercial provider (e.g. providers built on OSM data), and self-host or license Nominatim (or swap `GeocodingService` implementation) — all via env vars only, zero application code changes.
- OSM attribution is rendered by the shared `MapLocationPickerComponent`/`DonorMapComponent` via `MAP_ATTRIBUTION`, always visible on every Leaflet instance, not optional/removable by config.

---

## 8. Angular Route Architecture

```
/ (PublicLayout)
├── ""                       → HomeComponent
├── "about"                  → AboutComponent
├── "contact"                → ContactComponent
├── "blood-information"      → BloodInformationComponent
├── "search"                 → PublicDonorSearchComponent   (uses DonorSearchFilterComponent + DonorTableComponent in "public" mode)
├── "login"                  → LoginComponent               [guardedFromAuth: redirect away if already logged in]
├── "register"                → RegisterComponent            [guardedFromAuth]
├── "forgot-password"        → ForgotPasswordComponent       [guardedFromAuth]
└── "reset-password"         → ResetPasswordComponent        [guardedFromAuth]

/ (UserLayout)  [canActivate: AuthGuard]
├── "dashboard"       → lazy DashboardComponent
├── "donors"          → lazy DonorSearchComponent (authenticated mode)
├── "appreciations"   → lazy AppreciationsComponent
├── "profile"         → lazy ProfileComponent
└── "notifications"   → lazy NotificationsComponent

/admin (AdminLayout)  [canActivate: AuthGuard, RoleGuard(['ADMIN'])]
├── "dashboard"                       → lazy AdminDashboardComponent
├── "profile"                         → lazy AdminProfileComponent
├── "users"                           → lazy AdminUsersComponent
├── "reports"                         → lazy AdminReportsComponent
└── "master-data"
    ├── "blood-groups"    → lazy MasterBloodGroupsComponent
    ├── "country-codes"   → lazy MasterCountryCodesComponent
    ├── "countries"       → lazy MasterCountriesComponent
    ├── "states"          → lazy MasterStatesComponent
    └── "cities"          → lazy MasterCitiesComponent

"**"  → NotFoundComponent
```

- Every feature branch is its own lazy-loaded route (`loadChildren`/`loadComponent`), so anonymous visitors never download admin or dashboard bundles.
- `AuthGuard`: checks in-memory auth state (populated from `/auth/me` on app bootstrap if a refresh cookie exists); redirects to `/login` with a `returnUrl` query param if absent.
- `RoleGuard`: factory guard parameterized by allowed roles, used as `RoleGuard(['ADMIN'])`; redirects non-admins to `/dashboard` with a toast, since a raw 403 page is a worse UX for a misrouted authenticated user.
- `guardedFromAuth` (reverse guard) prevents a logged-in user from seeing `/login`/`/register` again — redirects by role.
- Route-level guards are explicitly documented as **UX convenience only**; every one of these is backed by the equivalent server-side guard per §5.6.

---

## 9. Security Threat Model

| Threat | Mitigation |
|---|---|
| **Account enumeration** (login, register, forgot-password) | Forgot-password always returns identical generic 200. Register returns a specific `USER_EMAIL_EXISTS`/`USER_MOBILE_EXISTS` error (unavoidable UX trade-off for registration, but rate-limited + optionally CAPTCHA-gated to slow bulk enumeration). Login returns one generic `AUTH_INVALID_CREDENTIALS` for both "no such user" and "wrong password." |
| **Brute-force login** | Redis-backed rate limit per identifier and per IP, with progressive backoff; `LoginHistory`/`SecurityEvent` feed future account-lock policy; response times kept constant-ish (argon2 verify runs even on unknown identifier against a dummy hash, to avoid timing side-channel revealing "user doesn't exist"). |
| **Token theft (XSS)** | Access token in memory only (never localStorage); refresh token HttpOnly/Secure/SameSite cookie; CSP headers via Helmet; Angular's built-in DomSanitizer relied on, no `innerHTML` binding of user content without sanitization. |
| **Refresh-token reuse** | Rotation + family revocation on reuse detection, per §5.4. |
| **Password-reset abuse** | Single-use, short-lived, hashed-at-rest tokens; prior tokens invalidated on new request; per-email and per-IP rate limits; generic responses. |
| **XSS** | Angular's default contextual output encoding; CSP via Helmet; no `bypassSecurityTrust*` on user-controlled data; DOMPurify if any rich text is ever introduced (e.g. report descriptions rendered in admin panel — treat as plain text always). |
| **CSRF** | Cookie-based refresh token + `SameSite=Strict` as primary defense; additionally require a custom header (e.g. `X-Requested-With`) on `/auth/refresh`/`/auth/logout` that simple cross-site form posts cannot set, as defense-in-depth. Access-token-bearing requests (Authorization header) are inherently CSRF-immune since a cross-site form can't set that header. |
| **IDOR** | Every resource-scoped mutation (`notifications/:id`, `users/me`, admin routes) checks ownership/role in the service layer, not just existence; admin routes additionally require `RolesGuard`. |
| **PII leakage** | Tiered DTOs (`PublicDonorDto`/`AuthenticatedDonorDto`/`AdminUserDto`) built by explicit mappers; Prisma entities never returned directly from controllers; `passwordHash` excluded even from admin DTOs by construction (mapper never reads that field). |
| **Location/coordinate privacy** | Anonymous responses carry only city/area/approx distance, never lat/lng; authenticated responses carry data per `DonorVisibilityPolicy` (extensible later into user-configurable `showExactLocation`/`showMobile`/`showEmail` flags, see §11); geocoding proxy never forwards user identity. |
| **Report abuse** (spam/weaponized reporting) | Rate limit per reporting user; duplicate-report-suppression window; admin triage workflow (`OPEN → UNDER_REVIEW → RESOLVED/REJECTED`) so a single report can't unilaterally harm a donor's status. |
| **Admin privilege escalation** | Role is never client-settable (register always forces `USER`; role change, if ever exposed, is a distinct admin-only, heavily audited endpoint not present in v1 scope); every admin route double-guarded (`JwtAuthGuard` + `RolesGuard`) and every mutation audited. |
| **SQL injection** | Prisma parameterizes standard queries; the only raw SQL (PostGIS distance queries) uses `$queryRaw` tagged templates with parameter binding, never string interpolation — enforced via code review checklist and a lint rule banning `$queryRawUnsafe` outside the one reviewed geo-repository. |
| **Mass data scraping of donor search** | Pagination hard-capped (`pageSize` max 100), `/donors/map` marker count capped, per-IP rate limiting on search endpoints, no "export all" endpoint. |
| **Sensitive data in logs** | Pino redaction paths configured for `password`, `passwordHash`, `authorization`, `refreshToken`/cookie header, `token` fields at the logger-config level (not per call site), so no server code path can accidentally log a secret. |
| **Weak passwords** | Configurable `PASSWORD_*` policy enforced server-side (authoritative) and mirrored client-side for UX; argon2id hashing with tuned memory/time cost. |
| **Denial of service via expensive search** | Distance search requires the GIST index (query planner forced via `EXPLAIN`-verified index usage in integration tests); request size limits (Helmet + body-parser limits); global rate limiting at the gateway layer. |

---

## 10. Implementation Roadmap

Matches requirement §80, restated with explicit "runnable at every step" checkpoints:

1. **Phase 1 — Architecture (this document).** Reviewed and approved before any code.
2. **Phase 2 — Foundation.** Monorepo scaffold (`apps/web`, `apps/api`, `packages/shared-types`), Docker Compose (postgres+postgis, redis, api, web), Prisma init against the schema in §3 minus data, base NestJS app with Helmet/CORS/ValidationPipe/global exception filter/Pino logging, base Angular app with routing shell and empty layouts, `.env.example`. **Runnable checkpoint:** `docker compose up` serves an empty-but-live app + `/health` returns 200.
3. **Phase 3 — Master data.** Seed scripts + master CRUD (public read endpoints first, admin CRUD after auth exists in Phase 4 — sequenced so master data is usable by registration before admin-editing is needed). **Checkpoint:** country→state→city cascading dropdowns work against real seeded data.
4. **Phase 4 — Authentication.** Register, login, refresh rotation, logout, RBAC guards, forgot/reset password, security events. **Checkpoint:** full auth lifecycle testable via Swagger + a bare login page.
5. **Phase 5 — Profile & location.** Profile CRUD, MapLocationPickerComponent (all three location-entry options), GeocodingService abstraction + Nominatim impl. **Checkpoint:** a user can register/edit profile with a real map-picked location.
6. **Phase 6 — Donor search.** Filters, dependent-filter reuse of the Phase-5 location component, PostGIS distance queries, pagination/sorting, donor table + single/all map views with clustering. **Checkpoint:** end-to-end search from the public welcome page and from `/donors`.
7. **Phase 7 — Appreciations.** Give Thanks flow, received/given lists, notification fan-out. **Checkpoint:** thanking a donor produces a real notification.
8. **Phase 8 — Reports.** Report dialog, report APIs, admin notification, audit entries.
9. **Phase 9 — Admin.** Dashboard aggregates/charts, user management, master-data admin CRUD, reports triage.
10. **Phase 10 — Hardening.** Unit/integration/E2E test suites, security pass against §9's table, DB query/index verification, structured logging/monitoring endpoints, production Docker Compose profile (multi-stage builds, non-root containers, resource limits).

Each phase ends with the app in a demoable, runnable state — no phase leaves half-wired features exposed in the UI.

---

## 11. Open Ambiguities & Proposed Defaults

The brief is thorough but leaves a few points genuinely ambiguous. Rather than silently pick one behavior, here are the defaults this architecture assumes — flag any of these to override before Phase 2 begins:

1. **Email/mobile change verification UX.** Default: changing email or mobile in Profile does **not** overwrite the live field until the new value is verified via `EmailVerificationToken`/OTP; the pending value is held separately (`pendingEmail`/`pendingMobile` — not yet in the §3 schema, would be added as nullable columns when Phase 5 is scoped) so the account never silently loses a working contact channel mid-verification.
2. **Duplicate-appreciation policy.** Default: a sender may appreciate the same receiver at most once per rolling 24 hours; enforced in the service layer against `appreciations` (indexed for the lookup), returning `409 APPRECIATION_DUPLICATE` rather than a hard lifetime cap, since repeat genuine gratitude over time is legitimate.
3. **Whether reported users are notified.** Default: the reported user is **not** notified that a report was filed (to prevent retaliation/harassment of the reporter), but **is** notified if the report resolution results in an account status change. Admins see full report details always.
4. **Configurable per-user privacy flags (`showExactLocation`/`showMobile`/`showEmail`).** Requirement §18 says "consider adding later." Default: not in the v1 schema/API (keeps Phase 1–9 scope bounded) but the DTO-mapper architecture (§4, §9) is exactly the seam where this would slot in later — the mapper would read three new boolean columns on `User` and branch — so this is a additive, non-breaking Phase 11 candidate, not a redesign.
5. **HS256 vs RS256 for access tokens.** Default HS256 (simpler single-service secret management) with the JWT module isolated behind `AuthTokenService` so switching to RS256 later (e.g. if a separate service needs to verify tokens without the shared secret) is a config/service change, not an architectural one.
6. **Role model as enum vs table.** Requirement §20 lists a `roles` table. Default: given exactly two fixed roles (`USER`/`ADMIN`) with no plan for dynamic role creation, a Postgres/Prisma **enum** (`Role`) is used instead of a join table — it gets the same DB-level integrity (invalid values rejected) with less join overhead on every authorization check, and RBAC logic stays simpler. If the roadmap later needs dynamic/custom roles, this is a deliberate, isolated migration (enum → table + `user_roles` join), not a widespread rewrite, because all authorization logic already goes through the single `RolesGuard`/`@Roles()` seam.
