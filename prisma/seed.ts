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
