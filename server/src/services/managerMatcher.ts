import { prisma } from '../prisma';

export interface ManagerMatch {
  id: number;
  name: string;
  salePct: number;
  installPct: number;
}

let cache: Map<string, ManagerMatch> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 1000 * 60;

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

async function buildCache() {
  const managers = await prisma.manager.findMany({ include: { aliases: true } });
  cache = new Map();
  for (const manager of managers) {
    const base: ManagerMatch = {
      id: manager.id,
      name: manager.name,
      salePct: manager.salePct,
      installPct: manager.installPct,
    };
    cache.set(normalizeKey(manager.name), base);
    for (const alias of manager.aliases) {
      cache.set(normalizeKey(alias.alias), base);
    }
  }
  cacheTimestamp = Date.now();
}

export async function matchManager(name: string | undefined | null) {
  if (!name) return null;
  if (!cache || Date.now() - cacheTimestamp > CACHE_TTL) {
    await buildCache();
  }
  return cache?.get(normalizeKey(name)) ?? null;
}

export function invalidateManagerCache() {
  cache = null;
}
