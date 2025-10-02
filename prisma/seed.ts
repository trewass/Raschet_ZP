import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.setting.upsert({
    where: { key: 'LOADERS_FIXED' },
    update: { value: '4000' },
    create: { key: 'LOADERS_FIXED', value: '4000' },
  });
  await prisma.setting.upsert({
    where: { key: 'INSTALLERS_PERCENT' },
    update: { value: '0.10' },
    create: { key: 'INSTALLERS_PERCENT', value: '0.10' },
  });
  await prisma.setting.upsert({
    where: { key: 'ROUNDING' },
    update: { value: 'half-up-to-integer' },
    create: { key: 'ROUNDING', value: 'half-up-to-integer' },
  });

  const managers = [
    {
      name: 'Меркунов Александр',
      salePct: 0.01,
      installPct: 0.01,
      aliases: ['Саша', 'Александр'],
    },
    {
      name: 'Арепьева Анастасия',
      salePct: 0.01,
      installPct: 0.02,
      aliases: ['Анастасия', 'Настя'],
    },
  ];

  for (const manager of managers) {
    const created = await prisma.manager.upsert({
      where: { name: manager.name },
      update: { salePct: manager.salePct, installPct: manager.installPct, enabled: true },
      create: {
        name: manager.name,
        salePct: manager.salePct,
        installPct: manager.installPct,
        enabled: true,
      },
    });

    for (const alias of manager.aliases) {
      await prisma.managerAlias.upsert({
        where: { alias },
        update: { managerId: created.id },
        create: {
          alias,
          managerId: created.id,
        },
      });
    }
  }

  const salaries = [
    { name: 'Крылов Виталий', amount: 75000 },
    { name: 'Пяткин Дмитрий', amount: 120000 },
    { name: 'Руцкая Елена', amount: 60000 },
    { name: 'Влад (дизайнер)', amount: 40000 },
  ];

  for (const salary of salaries) {
    await prisma.salary.upsert({
      where: { name: salary.name },
      update: { amount: salary.amount, enabled: true },
      create: {
        name: salary.name,
        amount: salary.amount,
        enabled: true,
      },
    });
  }

  const crewMembers = [
    'Горобцов А.С.',
    'Климов Д.Е.',
    'Буряк А.',
    'Притыка В.А.',
    'Глушко Д.В.',
    'Томенко М.А.',
  ];

  const memberMap = new Map<string, number>();
  for (const member of crewMembers) {
    const created = await prisma.crewMember.upsert({
      where: { name: member },
      update: {},
      create: { name: member },
    });
    memberMap.set(member, created.id);
  }

  const crews = [
    {
      name: 'Бригада 1',
      members: [
        { name: 'Горобцов А.С.', share: 0.5 },
        { name: 'Климов Д.Е.', share: 0.5 },
      ],
    },
    {
      name: 'Бригада 2',
      members: [
        { name: 'Буряк А.', share: 0.5 },
        { name: 'Притыка В.А.', share: 0.5 },
      ],
    },
  ];

  for (const crew of crews) {
    const created = await prisma.crew.upsert({
      where: { name: crew.name },
      update: {},
      create: { name: crew.name },
    });

    await prisma.crewAssignment.deleteMany({ where: { crewId: created.id } });

    for (const member of crew.members) {
      const memberId = memberMap.get(member.name);
      if (!memberId) continue;
      await prisma.crewAssignment.create({
        data: {
          crewId: created.id,
          memberId,
          share: member.share,
        },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
