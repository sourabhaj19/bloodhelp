# BloodHelp — Database Documentation
## Tables, Columns & Relations

> Source of truth: `prisma/schema.prisma` · DB: **MySQL 8** · 19 tables + 5 enums
> Conventions: UUID string PKs · `snake_case` column maps · soft-delete on `users` (`deletedAt`) · `created_at/updated_at` timestamps

---

## 1. Entity-Relationship Overview

```
countries 1───* states 1───* cities
    │ 1                     │
    *                       │ (users reference all three + blood group + dial code)
    │                 ┌─────┴──────────────────────────────┐
country_codes         │                                    │
    │                 ▼                                    │
    └────► users 1───* refresh_tokens                     │
             │────* password_reset_tokens                  │
             │────* email_verification_tokens              │
             │────* mobile_verification_otps               │
             │────* notifications                          │
             │────* login_history                          │
             │────* security_events                        │
             │────* user_location_history                 │
             │────* appreciations (sender AND receiver)    │
             │────* user_reports (reporter AND reported)   │
             │────* audit_logs (as actor)                  │
                                                          │
blood_groups 1───* users                                  │
report_reasons 1───* user_reports ◄───────────────────────┘
email_templates (standalone, unique notification_type mapping)
```

Delete behaviors: master data referenced by users = `Restrict` (cannot delete while in use);
user-owned rows (tokens, notifications, appreciations, reports, location history) = `Cascade`;
audit/forensic rows (`audit_logs`, `security_events`, `login_history`) = `SetNull` (history survives user deletion).

---

## 2. Enums

| Enum | Values |
|---|---|
| `Role` | `USER`, `ADMIN` |
| `ReportStatus` | `OPEN`, `UNDER_REVIEW`, `RESOLVED`, `REJECTED` |
| `NotificationType` | `APPRECIATION_RECEIVED`, `REPORT_CREATED`, `REPORT_STATUS_CHANGED`, `ACCOUNT_ACTIVATED`, `ACCOUNT_DEACTIVATED`, `PASSWORD_CHANGED`, `SECURITY_EVENT`, `ADMIN_ANNOUNCEMENT` |
| `SecurityEventType` | `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET_COMPLETED`, `PASSWORD_CHANGED`, `REFRESH_TOKEN_REUSE_DETECTED`, `ACCOUNT_LOCKED`, `EMAIL_CHANGED`, `MOBILE_CHANGED` |
| `AuditAction` | `CREATE`, `UPDATE`, `DELETE`, `ACTIVATE`, `DEACTIVATE`, `SOFT_DELETE`, `STATUS_CHANGE`, `ROLE_CHANGE` |

---

## 3. Master Data (6 tables)

### 3.1 `blood_groups` ← `BloodGroup`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `code` | VARCHAR unique | `"A+"`, `"O-"`… |
| `label` | VARCHAR | display name |
| `active` | BOOLEAN default true | soft toggle |
| `created_at` / `updated_at` | DATETIME | |
Relations: `1───* users` (Restrict — in-use group cannot be deleted).

### 3.2 `countries` ← `Country`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | VARCHAR unique | |
| `iso_code2` | VARCHAR unique | `"IN"`, `"US"` |
| `active`, `created_at`, `updated_at` | | |
Relations: `1───* states`, `1───* country_codes`, `1───* users`.

### 3.3 `states` ← `State`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `country_id` | VARCHAR(36) FK → `countries.id` | `Restrict`, indexed; unique together with `name` |
| `name` | VARCHAR(100) | |
| `active`, `created_at`, `updated_at` | | |
Relations: `*───1 country`, `1───* cities`, `1───* users`.

### 3.4 `cities` ← `City`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `state_id` | VARCHAR(36) FK → `states.id` | `Restrict`, indexed; unique together with `name` |
| `name` | VARCHAR(100) | |
| `active`, `created_at`, `updated_at` | | |
Relations: `*───1 state`, `1───* users`.

### 3.5 `country_codes` ← `CountryCode`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `country_id` | VARCHAR(36) nullable FK → `countries.id` | `SetNull` |
| `dialCode` | VARCHAR(10) | `"+91"` |
| `label` | VARCHAR(50) | `"India (+91)"` |
| `active`, `created_at`, `updated_at` | | |
Relations: `*───1 country (nullable)`, `1───* users`.

### 3.6 `report_reasons` ← `ReportReason`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `code` | VARCHAR(50) unique | stable key |
| `label` | VARCHAR(200) | shown in report dialog |
| `active`, `created_at`, `updated_at` | | |
Relations: `1───* user_reports` (Restrict).

### 3.7 `email_templates` ← `EmailTemplate` (standalone)
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `code` | VARCHAR(50) unique | e.g. `PASSWORD_RESET`, `WELCOME` |
| `name` | VARCHAR(100) | admin display name |
| `subject` | VARCHAR(255) | `{{placeholders}}` |
| `htmlBody` | TEXT | `{{placeholders}}`, HTML-escaped render |
| `textBody` | TEXT nullable | |
| `notification_type` | VARCHAR(50) nullable unique | maps 1 template ↔ 1 `NotificationType`; null = reusable |
| `active`, `created_at`, `updated_at` | | |
Relations: none (referenced by code from `EmailTemplateService`).

---

## 4. Core — `users`

### 4.1 `users` ← `User` (heart of the schema)
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `first_name` / `last_name` | VARCHAR(100) | |
| `date_of_birth` | DATE | 18–65 enforced in app |
| `email` | VARCHAR(255) unique | stored lowercase |
| `email_verified` | BOOLEAN default false | |
| `country_code_id` | VARCHAR(36) FK → `country_codes` | Restrict |
| `mobile` | VARCHAR(20) unique | E.164, e.g. `+919876543210` |
| `mobile_verified` | BOOLEAN default false | |
| `password_hash` | VARCHAR(255) | argon2, never returned by API |
| `blood_group_id` | VARCHAR(36) FK → `blood_groups` | Restrict |
| `country_id` / `state_id` / `city_id` | VARCHAR(36) FKs | Restrict |
| `area` | VARCHAR(255) | |
| `pin_code` | VARCHAR(20) | indexed |
| `latitude` / `longitude` | DECIMAL(9,6) | indexed pair; Haversine search |
| `active` | BOOLEAN default true | deactivation flag |
| `role` | `Role` default `USER` | |
| `created_at` / `updated_at` / `deleted_at` | DATETIME | `deletedAt` = soft delete |
Relations out: `*───1` each to blood group, country, state, city, country code.
Relations in (`1───*`): `refresh_tokens`, `password_reset_tokens`, `email_verification_tokens`, `mobile_verification_otps`, `notifications`, `login_history`, `security_events`, `user_location_history`, `appreciations` (×2: sent/received), `user_reports` (×2: filed/against), `audit_logs` (as actor).
Indexes: `active`, `bloodGroupId`, `countryId`, `stateId`, `cityId`, `pinCode`, `createdAt`, `(active, bloodGroupId)`, `(countryId, stateId, cityId)`, `(latitude, longitude)`.

---

## 5. Auth / Tokens (4 tables, all `*───1 users`, Cascade)

### 5.1 `refresh_tokens` ← `RefreshToken`
| Column | Notes |
|---|---|
| `id` UUID PK; `user_id` FK | owner |
| `token_hash` unique | SHA-256 of opaque 256-bit token (raw never stored) |
| `family_id` indexed | rotation chain; reuse ⇒ whole family revoked |
| `expires_at` / `revoked_at` / `replaced_by_token_hash` / `last_used_at` | rotation bookkeeping |
| `created_at`, `ip_address`, `user_agent` | forensics |

### 5.2 `password_reset_tokens` ← `PasswordResetToken`
Single-use short-lived tokens: `token_hash` unique, `expires_at`, `used_at`, `created_at`, `ip_address`. Old unused rows invalidated on each new request; used + all sessions revoked on reset.

### 5.3 `email_verification_tokens` ← `EmailVerificationToken`
`token_hash` unique, `expires_at`, `used_at`; `new_email` set when verifying an email *change* (adopted after proof, clash-checked).

### 5.4 `mobile_verification_otps` ← `MobileVerificationOtp`
6-digit OTP flow: `mobile`, `otp_hash` (SHA-256 of `otp:userId:pepper`), `attempts` (max 5), `expires_at` (10 min), `used_at`. Prior unused OTPs invalidated on resend.

---

## 6. Social / Engagement (3 tables)

### 6.1 `appreciations` ← `Appreciation`
| Column | Notes |
|---|---|
| `sender_user_id` FK → users | Cascade; indexed |
| `receiver_user_id` FK → users | Cascade; indexed |
| `message` VARCHAR(500) nullable | |
| `created_at` | composite index `(sender, receiver, created_at)` backs the 24h anti-spam rule |
Self-appreciation blocked in service.

### 6.2 `notifications` ← `Notification`
| Column | Notes |
|---|---|
| `user_id` FK → users | Cascade; indexes `(userId)`, `(isRead)`, `(userId, isRead)` |
| `type` | `NotificationType` |
| `title` VARCHAR(255), `message` VARCHAR(1000) | |
| `reference_type` / `reference_id` | e.g. `REPORT` + report id (deep-linking) |
| `is_read` default false, `created_at` | |

### 6.3 `user_reports` ← `UserReport`
| Column | Notes |
|---|---|
| `reported_by_user_id` FK → users | Cascade; indexed |
| `reported_user_id` FK → users | Cascade; indexed |
| `reason_id` FK → `report_reasons` | Restrict |
| `description` VARCHAR(1000) nullable | |
| `status` | `ReportStatus`, default `OPEN`; indexed |
| `admin_comment` VARCHAR(1000) nullable | visible to reporter + audit |
| `created_at` / `updated_at` | 24h duplicate-suppression query on (reporter, reported, reason, createdAt) |

---

## 7. Audit / Security / Observability (4 tables, `SetNull` — history survives deletion)

### 7.1 `audit_logs` ← `AuditLog`
`actor_user_id` nullable FK (null = system), `action` (`AuditAction`), `entity_type` (`"User"`, `"UserReport"`…), `entity_id`, `old_value`/`new_value` JSON, `ip_address`, `user_agent`, `created_at`. Indexes: `(entityType, entityId)`, `(actorUserId)`, `(createdAt)`.

### 7.2 `security_events` ← `SecurityEvent`
`user_id` nullable FK, `type` (`SecurityEventType`), `metadata` JSON, `ip_address`, `user_agent`, `created_at`. Indexes: `(userId)`, `(type)`, `(createdAt)`.

### 7.3 `login_history` ← `LoginHistory`
Every attempt: `user_id` nullable (null = unknown identifier), `identifier` raw attempted value, `success`, `ip_address`, `user_agent`, `created_at`. Indexes: `(userId)`, `(createdAt)`.

### 7.4 `user_location_history` ← `UserLocationHistory`
`user_id` FK (Cascade, indexed), `latitude`/`longitude` DECIMAL(9,6), `source` (`REGISTER` | `GPS` | `MAP_PICK` | `GEOCODE`), `created_at`. Written on register and location updates.

---

## 8. Quick Reference — "Which table for what?"

| Question | Table(s) |
|---|---|
| Who can log in / be searched? | `users` (`active`, `deletedAt`, `role`) |
| Prove session / logout everywhere? | `refresh_tokens` (`familyId`, `revokedAt`) |
| Forgot-password / verify-email / verify-mobile? | `password_reset_tokens`, `email_verification_tokens`, `mobile_verification_otps` |
| Thanks between donors? | `appreciations` |
| Notify / badge counts? | `notifications` |
| Moderation queue? | `user_reports` + `report_reasons` |
| Who changed what, when, from where? | `audit_logs`, `security_events`, `login_history` |
| Where has a donor been? | `user_location_history` |
| Dropdown data? | `blood_groups`, `countries`, `states`, `cities`, `country_codes` |
| Email copy? | `email_templates` |
