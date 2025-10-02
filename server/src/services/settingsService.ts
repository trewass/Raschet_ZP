import { prisma } from '../prisma';
import { invalidateManagerCache } from './managerMatcher';

export async function getSettings() {
  const [settings, managers, salaries, crewMembers, crews] = await Promise.all([
    prisma.setting.findMany(),
    prisma.manager.findMany({
      include: { aliases: true },
      orderBy: { name: 'asc' },
    }),
    prisma.salary.findMany({ orderBy: { name: 'asc' } }),
    prisma.crewMember.findMany({ orderBy: { name: 'asc' } }),
    prisma.crew.findMany({
      include: {
        assignments: {
          include: {
            member: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  const constants = {
    loadersFixed: Number(settings.find((s) => s.key === 'LOADERS_FIXED')?.value ?? '4000'),
    installersPercent: Number(settings.find((s) => s.key === 'INSTALLERS_PERCENT')?.value ?? '0.1'),
    rounding: settings.find((s) => s.key === 'ROUNDING')?.value ?? 'half-up-to-integer',
  } as const;

  return {
    constants,
    managers: managers.map((manager) => ({
      id: manager.id,
      name: manager.name,
      salePct: manager.salePct,
      installPct: manager.installPct,
      enabled: manager.enabled,
      aliases: manager.aliases.map((alias) => alias.alias),
    })),
    salaries,
    crewMembers,
    crews: crews.map((crew) => ({
      id: crew.id,
      name: crew.name,
      members: crew.assignments
        .map((assignment) => ({
          memberId: assignment.memberId,
          name: assignment.member.name,
          share: assignment.share,
        })),
    })),
  };
}

export async function updateConstants(constants: {
  loadersFixed: number;
  installersPercent: number;
  rounding: string;
}) {
  await Promise.all([
    prisma.setting.upsert({
      where: { key: 'LOADERS_FIXED' },
      update: { value: String(constants.loadersFixed) },
      create: { key: 'LOADERS_FIXED', value: String(constants.loadersFixed) },
    }),
    prisma.setting.upsert({
      where: { key: 'INSTALLERS_PERCENT' },
      update: { value: String(constants.installersPercent) },
      create: { key: 'INSTALLERS_PERCENT', value: String(constants.installersPercent) },
    }),
    prisma.setting.upsert({
      where: { key: 'ROUNDING' },
      update: { value: constants.rounding },
      create: { key: 'ROUNDING', value: constants.rounding },
    }),
  ]);
}

export async function replaceManagers(entries: {
  id?: number;
  name: string;
  salePct: number;
  installPct: number;
  enabled: boolean;
  aliases: string[];
}[]) {
  const existing = await prisma.manager.findMany();
  const existingIds = new Set(existing.map((m) => m.id));
  const incomingIds = new Set(entries.filter((m) => m.id).map((m) => m.id!));

  const toDelete = Array.from(existingIds).filter((id) => !incomingIds.has(id));
  await prisma.managerAlias.deleteMany({ where: { managerId: { in: toDelete } } });
  await prisma.manager.deleteMany({ where: { id: { in: toDelete } } });

  for (const entry of entries) {
    const manager = await prisma.manager.upsert({
      where: entry.id ? { id: entry.id } : { name: entry.name },
      update: {
        name: entry.name,
        salePct: entry.salePct,
        installPct: entry.installPct,
        enabled: entry.enabled,
      },
      create: {
        name: entry.name,
        salePct: entry.salePct,
        installPct: entry.installPct,
        enabled: entry.enabled,
      },
    });

    await prisma.managerAlias.deleteMany({ where: { managerId: manager.id } });
    for (const alias of entry.aliases) {
      if (!alias.trim()) continue;
      await prisma.managerAlias.create({
        data: {
          alias: alias.trim(),
          managerId: manager.id,
        },
      });
    }
  }

  invalidateManagerCache();
}

export async function replaceSalaries(entries: {
  id?: number;
  name: string;
  amount: number;
  enabled: boolean;
}[]) {
  const existing = await prisma.salary.findMany();
  const existingIds = new Set(existing.map((s) => s.id));
  const incomingIds = new Set(entries.filter((s) => s.id).map((s) => s.id!));
  const toDelete = Array.from(existingIds).filter((id) => !incomingIds.has(id));
  await prisma.salary.deleteMany({ where: { id: { in: toDelete } } });

  for (const entry of entries) {
    await prisma.salary.upsert({
      where: entry.id ? { id: entry.id } : { name: entry.name },
      update: {
        name: entry.name,
        amount: entry.amount,
        enabled: entry.enabled,
      },
      create: {
        name: entry.name,
        amount: entry.amount,
        enabled: entry.enabled,
      },
    });
  }
}

export async function replaceCrewMembers(members: { id?: number; name: string }[]) {
  const existing = await prisma.crewMember.findMany();
  const existingIds = new Set(existing.map((m) => m.id));
  const incomingIds = new Set(members.filter((m) => m.id).map((m) => m.id!));
  const toDelete = Array.from(existingIds).filter((id) => !incomingIds.has(id));

  await prisma.crewAssignment.deleteMany({ where: { memberId: { in: toDelete } } });
  await prisma.crewMember.deleteMany({ where: { id: { in: toDelete } } });

  for (const member of members) {
    await prisma.crewMember.upsert({
      where: member.id ? { id: member.id } : { name: member.name },
      update: { name: member.name },
      create: { name: member.name },
    });
  }
}

export async function replaceCrews(
  crews: {
    id?: number;
    name: string;
    members: { memberId: number; share: number }[];
  }[]
) {
  const existing = await prisma.crew.findMany();
  const existingIds = new Set(existing.map((crew) => crew.id));
  const incomingIds = new Set(crews.filter((crew) => crew.id).map((crew) => crew.id!));
  const toDelete = Array.from(existingIds).filter((id) => !incomingIds.has(id));

  await prisma.crewAssignment.deleteMany({ where: { crewId: { in: toDelete } } });
  await prisma.crew.deleteMany({ where: { id: { in: toDelete } } });

  for (const crew of crews) {
    const saved = await prisma.crew.upsert({
      where: crew.id ? { id: crew.id } : { name: crew.name },
      update: { name: crew.name },
      create: { name: crew.name },
    });

    await prisma.crewAssignment.deleteMany({ where: { crewId: saved.id } });
    if (crew.members.length !== 2) {
      continue;
    }
    for (const member of crew.members) {
      await prisma.crewAssignment.create({
        data: {
          crewId: saved.id,
          memberId: member.memberId,
          share: member.share,
        },
      });
    }
  }
}
