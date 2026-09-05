import { PrismaClient } from '@prisma/client';

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

  // Countries
  const india = await prisma.country.upsert({
    where: { isoCode2: 'IN' },
    update: { name: 'India', active: true },
    create: { name: 'India', isoCode2: 'IN', active: true },
  });
  const usa = await prisma.country.upsert({
    where: { isoCode2: 'US' },
    update: { name: 'United States', active: true },
    create: { name: 'United States', isoCode2: 'US', active: true },
  });
  console.log('  Countries seeded');

  // Country Codes
  await prisma.countryCode.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      countryId: india.id,
      dialCode: '+91',
      label: 'India (+91)',
      active: true,
    },
  }).catch(async () => {
    const existing = await prisma.countryCode.findFirst({ where: { dialCode: '+91' } });
    if (!existing) {
      await prisma.countryCode.create({
        data: { countryId: india.id, dialCode: '+91', label: 'India (+91)' },
      });
    }
  });
  await prisma.countryCode.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      countryId: usa.id,
      dialCode: '+1',
      label: 'United States (+1)',
      active: true,
    },
  }).catch(async () => {
    const existing = await prisma.countryCode.findFirst({ where: { dialCode: '+1' } });
    if (!existing) {
      await prisma.countryCode.create({
        data: { countryId: usa.id, dialCode: '+1', label: 'United States (+1)' },
      });
    }
  });
  console.log('  CountryCodes seeded');

  // States — India
  const maharashtra = await prisma.state.upsert({
    where: { countryId_name: { countryId: india.id, name: 'Maharashtra' } },
    update: {},
    create: { countryId: india.id, name: 'Maharashtra', active: true },
  });
  const karnataka = await prisma.state.upsert({
    where: { countryId_name: { countryId: india.id, name: 'Karnataka' } },
    update: {},
    create: { countryId: india.id, name: 'Karnataka', active: true },
  });
  const delhi = await prisma.state.upsert({
    where: { countryId_name: { countryId: india.id, name: 'Delhi' } },
    update: {},
    create: { countryId: india.id, name: 'Delhi', active: true },
  });
  // US states
  await prisma.state.upsert({
    where: { countryId_name: { countryId: usa.id, name: 'California' } },
    update: {},
    create: { countryId: usa.id, name: 'California', active: true },
  });
  console.log('  States seeded');

  // Cities
  await prisma.city.upsert({
    where: { stateId_name: { stateId: maharashtra.id, name: 'Mumbai' } },
    update: {},
    create: { stateId: maharashtra.id, name: 'Mumbai', active: true },
  });
  await prisma.city.upsert({
    where: { stateId_name: { stateId: maharashtra.id, name: 'Pune' } },
    update: {},
    create: { stateId: maharashtra.id, name: 'Pune', active: true },
  });
  await prisma.city.upsert({
    where: { stateId_name: { stateId: karnataka.id, name: 'Bengaluru' } },
    update: {},
    create: { stateId: karnataka.id, name: 'Bengaluru', active: true },
  });
  await prisma.city.upsert({
    where: { stateId_name: { stateId: delhi.id, name: 'New Delhi' } },
    update: {},
    create: { stateId: delhi.id, name: 'New Delhi', active: true },
  });
  console.log('  Cities seeded');

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
  // Password policy min 12, so 14 chars with upper/lower/number/special
  try {
    // argon2 lives in apps/api/node_modules; seed.ts sits at the repo root, so
    // a bare import may not resolve — fall back to requiring it via apps/api.
    let argon2: any;
    try {
      // @ts-ignore
      argon2 = await import('argon2');
    } catch {
      const { createRequire } = await import('module');
      const { join } = await import('path');
      const requireFromApi = createRequire(join(__dirname, '..', 'apps', 'api', 'package.json'));
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
