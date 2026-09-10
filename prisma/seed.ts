// NOTE: no tsconfig in the repo includes prisma/, so editors typecheck this
// file without @types/node. The ambient declarations below keep it clean
// without that package (ts-node runs with --transpile-only, no typecheck).
// At runtime Node provides the real values; these are compile-time only.
declare const require: (id: string) => any;
declare const __dirname: string;
declare const process: { env: Record<string, string | undefined>; exit(code: number): never };

import { PrismaClient } from '@prisma/client';
import { INDIAN_CITIES, INDIAN_STATES, INDIA_COUNTRY, INDIA_COUNTRY_CODE } from './data/india';

const path = require('path') as {
  join(...parts: string[]): string;
  resolve(...parts: string[]): string;
};
const fs = require('fs') as { existsSync(p: string): boolean };
const { createRequire } = require('module') as {
  createRequire(path: string): (pkg: string) => any;
};

// ts-node does not auto-load .env (unlike `prisma migrate`), and this file
// lives in <root>/prisma while .env lives in <root> — so load it explicitly.
// dotenv is resolved via apps/api (same pattern as the argon2 fallback below).
if (!process.env.DATABASE_URL) {
  try {
    const requireFromApi = createRequire(path.join(__dirname, '..', 'apps', 'api', 'package.json'));
    const dotenv = requireFromApi('dotenv') as { config(opts: { path: string }): void };
    const envPath = path.resolve(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
  } catch {
    // dotenv unavailable — rely on DATABASE_URL already being in the environment.
  }
}

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding master data...');

  // Blood Groups
  const bloodGroups = [
    { code: 'A+', label: 'A Positive' },
    { code: 'A-', label: 'A Negative' },
    { code: 'B+', label: 'B Positive' },
    { code: 'B-', label: 'B Negative' },
    { code: 'AB+', label: 'AB Positive' },
    { code: 'AB-', label: 'AB Negative' },
    { code: 'O+', label: 'O Positive' },
    { code: 'O-', label: 'O Negative' },
  ];
  for (const bg of bloodGroups) {
    await prisma.bloodGroup.upsert({
      where: { code: bg.code },
      update: { label: bg.label, active: true },
      create: bg,
    });
  }
  console.log('  BloodGroups seeded');

  // ── Country: India only ──────────────────────────────────────
  const india = await prisma.country.upsert({
    where: { isoCode2: INDIA_COUNTRY.isoCode2 },
    update: { name: INDIA_COUNTRY.name, active: true },
    create: { name: INDIA_COUNTRY.name, isoCode2: INDIA_COUNTRY.isoCode2, active: true },
  });
  // Deactivate any legacy non-India countries (e.g. US from earlier seeds)
  // instead of deleting — FKs (states/users) use Restrict.
  await prisma.country.updateMany({
    where: { id: { not: india.id } },
    data: { active: false },
  });
  console.log('  Country seeded: India (IN)');

  // ── Country Code: +91 only ───────────────────────────────────
  const existingCc = await prisma.countryCode.findFirst({
    where: { dialCode: INDIA_COUNTRY_CODE.dialCode },
  });
  if (existingCc) {
    await prisma.countryCode.update({
      where: { id: existingCc.id },
      data: {
        countryId: india.id,
        label: INDIA_COUNTRY_CODE.label,
        active: true,
      },
    });
  } else {
    await prisma.countryCode.create({
      data: {
        countryId: india.id,
        dialCode: INDIA_COUNTRY_CODE.dialCode,
        label: INDIA_COUNTRY_CODE.label,
        active: true,
      },
    });
  }
  // Deactivate any other dial codes from earlier seeds.
  await prisma.countryCode.updateMany({
    where: { dialCode: { not: INDIA_COUNTRY_CODE.dialCode } },
    data: { active: false },
  });
  console.log('  CountryCode seeded: India (+91)');

  // ── States: 28 States + 8 UTs ────────────────────────────────
  const stateIdByName = new Map<string, string>();
  for (const name of INDIAN_STATES) {
    const state = await prisma.state.upsert({
      where: { countryId_name: { countryId: india.id, name } },
      update: { active: true },
      create: { countryId: india.id, name, active: true },
    });
    stateIdByName.set(name, state.id);
  }
  // Deactivate stale states no longer in the master list (rename-safe:
  // keeps rows + FKs, just hides from dropdowns which filter active=true).
  await prisma.state.updateMany({
    where: { countryId: india.id, name: { notIn: INDIAN_STATES } },
    data: { active: false },
  });
  console.log(`  States seeded: ${stateIdByName.size}`);

  // ── Cities (per state) ───────────────────────────────────────
  let cityCount = 0;
  for (const [stateName, cities] of Object.entries(INDIAN_CITIES)) {
    const stateId = stateIdByName.get(stateName);
    if (!stateId) {
      console.warn(`  ! State "${stateName}" not found, skipping its cities`);
      continue;
    }
    for (const name of cities) {
      await prisma.city.upsert({
        where: { stateId_name: { stateId, name } },
        update: { active: true },
        create: { stateId, name, active: true },
      });
      cityCount++;
    }
    // Deactivate stale cities for this state (same rename-safe approach).
    await prisma.city.updateMany({
      where: { stateId, name: { notIn: cities } },
      data: { active: false },
    });
  }
  console.log(`  Cities seeded: ${cityCount}`);

  // Report Reasons
  const reasons = [
    { code: 'FAKE_PROFILE', label: 'Fake or misleading profile' },
    { code: 'INAPPROPRIATE', label: 'Inappropriate behaviour' },
    { code: 'SPAM', label: 'Spam' },
    { code: 'HARASSMENT', label: 'Harassment' },
    { code: 'OTHER', label: 'Other' },
  ];
  for (const r of reasons) {
    await prisma.reportReason.upsert({
      where: { code: r.code },
      update: { label: r.label },
      create: r,
    });
  }
  console.log('  ReportReasons seeded');

  // Email templates — variables use {{name}} placeholders; admin can edit
  // subject/bodies and re-map notificationType in the admin UI afterwards.
  const emailTemplates = [
    {
      code: 'WELCOME',
      name: 'Welcome new donor',
      notificationType: 'WELCOME',
      subject: 'Welcome to BloodHelp, {{firstName}}!',
      htmlBody: '<p>Hi {{firstName}},</p><p>Thanks for joining <strong>BloodHelp</strong> — every donation can save up to three lives.</p><p><a href="{{appUrl}}/search">Find donation requests near you</a>.</p><p>— The BloodHelp team</p>',
      textBody: 'Hi {{firstName}},\n\nThanks for joining BloodHelp — every donation can save up to three lives.\n\nFind requests near you: {{appUrl}}/search\n\n— The BloodHelp team',
    },
    {
      code: 'EMAIL_VERIFICATION',
      name: 'Verify your email',
      notificationType: 'EMAIL_VERIFICATION',
      subject: 'Verify your BloodHelp email, {{firstName}}',
      htmlBody: '<p>Hi {{firstName}},</p><p>Welcome to <strong>BloodHelp</strong>! Please verify your email address by clicking below (valid for 24 hours):</p><p><a href="{{verifyLink}}">Verify my email</a></p><p>If you did not create this account, you can ignore this email.</p>',
      textBody: 'Hi {{firstName}},\n\nWelcome to BloodHelp! Verify your email (valid 24 hours): {{verifyLink}}\n\nIf you did not create this account, ignore this email.',
    },
    {
      code: 'PASSWORD_RESET',
      name: 'Password reset link',
      notificationType: 'PASSWORD_RESET',
      subject: 'Reset your BloodHelp password',
      htmlBody: '<p>Hi {{firstName}},</p><p>We received a password reset request for your account. Click below (valid for 30 minutes):</p><p><a href="{{resetLink}}">Reset my password</a></p><p>If you did not ask for this, you can ignore this email.</p>',
      textBody: 'Hi {{firstName}},\n\nReset your password (valid 30 minutes): {{resetLink}}\n\nIf you did not ask for this, ignore this email.',
    },
    {
      code: 'PASSWORD_CHANGED',
      name: 'Password changed notice',
      notificationType: 'PASSWORD_CHANGED',
      subject: 'Your BloodHelp password was changed',
      htmlBody: '<p>Hi {{firstName}},</p><p>Your password was just changed. All other devices were logged out.</p><p>If this was not you, reset your password immediately via <a href="{{appUrl}}/forgot-password">forgot password</a> and contact support.</p>',
      textBody: 'Hi {{firstName}},\n\nYour password was just changed. All other devices were logged out.\n\nIf this was not you, reset it immediately: {{appUrl}}/forgot-password',
    },
    {
      code: 'REPORT_CREATED_ADMIN',
      name: 'New report filed (to admins)',
      notificationType: 'REPORT_CREATED',
      subject: 'New user report needs review',
      htmlBody: '<p>A new report was filed against <strong>{{reportedName}}</strong> ({{reportedEmail}}).</p><p>Reason: {{reasonLabel}}</p><p>Review it in the <a href="{{appUrl}}/admin/reports?reportId={{reportId}}">admin triage board</a>.</p>',
      textBody: 'A new report was filed against {{reportedName}} ({{reportedEmail}}).\nReason: {{reasonLabel}}\nReview: {{appUrl}}/admin/reports?reportId={{reportId}}',
    },
    {
      code: 'REPORT_STATUS_CHANGED',
      name: 'Report status update (to reporter)',
      notificationType: 'REPORT_STATUS_CHANGED',
      subject: 'Update on your BloodHelp report',
      htmlBody: '<p>Hi {{firstName}},</p><p>Your report against <strong>{{reportedName}}</strong> is now <strong>{{statusLabel}}</strong>.</p><p><a href="{{appUrl}}/reports?reportId={{reportId}}">View your report</a></p>',
      textBody: 'Hi {{firstName}},\n\nYour report against {{reportedName}} is now {{statusLabel}}.\nView: {{appUrl}}/reports?reportId={{reportId}}',
    },
    {
      code: 'APPRECIATION_RECEIVED',
      name: 'You received thanks',
      notificationType: 'APPRECIATION_RECEIVED',
      subject: '{{senderName}} thanked you on BloodHelp',
      htmlBody: '<p>Hi {{firstName}},</p><p><strong>{{senderName}}</strong> thanked you: “{{message}}”.</p><p><a href="{{appUrl}}/appreciations">See your appreciations</a></p>',
      textBody: 'Hi {{firstName}},\n\n{{senderName}} thanked you: "{{message}}".\nSee: {{appUrl}}/appreciations',
    },
    {
      code: 'CONTACT_TO_SUPPORT',
      name: 'Contact form (to support)',
      notificationType: 'CONTACT_MESSAGE',
      subject: '[BloodHelp contact] {{subject}} — {{name}}',
      htmlBody: '<p>New contact message from <strong>{{name}}</strong> ({{email}}).</p><p>Subject: {{subject}}</p><p>{{message}}</p>',
      textBody: 'New contact message from {{name}} ({{email}}).\nSubject: {{subject}}\n\n{{message}}',
    },
    {
      code: 'CONTACT_CONFIRMATION',
      name: 'Contact confirmation (to sender)',
      notificationType: 'CONTACT_CONFIRMATION',
      subject: 'We received your message — BloodHelp',
      htmlBody: '<p>Hi {{name}},</p><p>Thanks for reaching out about “{{subject}}”. We usually reply within 2 working days.</p><p>— The BloodHelp team</p>',
      textBody: 'Hi {{name}},\n\nThanks for reaching out about "{{subject}}". We usually reply within 2 working days.\n\n— The BloodHelp team',
    },
  ];
  for (const t of emailTemplates) {
    await prisma.emailTemplate.upsert({
      where: { code: t.code },
      // Never overwrite admin customizations on re-seed — only fill new rows
      update: {},
      create: t,
    });
  }
  console.log('  EmailTemplates seeded');

  // Admin user (for Phase 4 / Phase 9 demo) — credentials: admin@bloodhelp.local / Admin!12345678
  // Password policy: min 8 with uppercase + special, so 14 chars is safe
  try {
    // argon2 lives in apps/api/node_modules; seed.ts sits at the repo root, so
    // a bare import may not resolve — fall back to requiring it via apps/api.
    let argon2: any;
    try {
      argon2 = require('argon2');
    } catch {
      const requireFromApi = createRequire(path.join(__dirname, '..', 'apps', 'api', 'package.json'));
      argon2 = requireFromApi('argon2');
    }
    const adminHash = await (argon2 as any).hash('Admin!12345678', { type: (argon2 as any).argon2id });
    const oPos = await prisma.bloodGroup.findFirst({ where: { code: 'O+' } });
    const ccIndia = await prisma.countryCode.findFirst({ where: { dialCode: '+91' } });
    const mumbai = await prisma.city.findFirst({ where: { name: 'Mumbai' } });
    const mah = await prisma.state.findFirst({ where: { name: 'Maharashtra' } });
    const ind = await prisma.country.findFirst({ where: { isoCode2: 'IN' } });
    if (oPos && ccIndia && mumbai && mah && ind) {
      await prisma.user.upsert({
        where: { email: 'admin@bloodhelp.local' },
        update: { role: 'ADMIN', active: true, deletedAt: null },
        create: {
          firstName: 'Admin',
          lastName: 'BloodHelp',
          dateOfBirth: new Date('1990-01-01'),
          email: 'admin@bloodhelp.local',
          emailVerified: true,
          countryCodeId: ccIndia.id,
          mobile: '+919000000001',
          mobileVerified: true,
          passwordHash: adminHash,
          bloodGroupId: oPos.id,
          countryId: ind.id,
          stateId: mah.id,
          cityId: mumbai.id,
          area: 'Admin Area',
          pinCode: '400001',
          latitude: 19.0760,
          longitude: 72.8777,
          active: true,
          role: 'ADMIN',
        },
      });
      console.log('  Admin user seeded (admin@bloodhelp.local / Admin!12345678)');
    }
  } catch (e) {
    console.warn('  Admin seed skipped', e);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
