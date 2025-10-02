import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { parseCsvBuffer } from '../services/csvService';
import {
  createImportSession,
  deleteImportSession,
  getImportSession,
} from '../services/importSessionStore';
import { prisma } from '../prisma';
import { matchManager } from '../services/managerMatcher';
import { DateTime } from 'luxon';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/preview', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Файл не найден' });
      return;
    }
    const parsed = parseCsvBuffer(req.file.buffer);
    const session = createImportSession(parsed);
    res.json({
      sessionId: session.id,
      headers: session.headers,
      delimiter: session.delimiter,
      preview: session.rows.slice(0, 50),
      totalRows: session.rows.length,
    });
  } catch (error) {
    next(error);
  }
});

const commitSchema = z.object({
  sessionId: z.string(),
  mapping: z.object({
    id: z.string().optional(),
    name: z.string(),
    budget: z.string(),
    manager: z.string().optional(),
    createdAt: z.string().optional(),
    closedAt: z.string().optional(),
  }),
});

function parseBudget(raw: string): number {
  const cleaned = raw.replace(/[\s₽]/g, '').replace(',', '.');
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.round(value);
}

function parseRuDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const formats = ['dd.MM.yyyy HH:mm:ss', 'dd.MM.yyyy'];
  for (const format of formats) {
    const dt = DateTime.fromFormat(trimmed, format, { zone: 'UTC' });
    if (dt.isValid) {
      return dt.toJSDate();
    }
  }
  const iso = DateTime.fromISO(trimmed);
  if (iso.isValid) {
    return iso.toJSDate();
  }
  return null;
}

router.post('/commit', async (req, res, next) => {
  try {
    const body = commitSchema.parse(req.body);
    const session = getImportSession(body.sessionId);
    if (!session) {
      res.status(400).json({ message: 'Сессия импорта не найдена или устарела' });
      return;
    }

    const rows = session.rows;
    const results = [] as { name: string; amoId: string | null }[];

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const getValue = (column?: string) => (column ? row[column] ?? '' : '');
        const name = getValue(body.mapping.name);
        const budgetRaw = getValue(body.mapping.budget);
        if (!name || !budgetRaw) {
          continue;
        }
        const amoIdRaw = body.mapping.id ? getValue(body.mapping.id) : '';
        const amoId = amoIdRaw ? amoIdRaw : null;
        const managerRaw = body.mapping.manager ? getValue(body.mapping.manager) : '';
        const managerMatch = await matchManager(managerRaw);
        const createdDate = parseRuDate(getValue(body.mapping.createdAt));
        const closedDate = parseRuDate(getValue(body.mapping.closedAt));

        const data = {
          amoId,
          name,
          budget: parseBudget(budgetRaw),
          managerName: managerMatch?.name ?? (managerRaw || null),
          managerId: managerMatch?.id ?? null,
          createdAt: createdDate,
          closedAt: closedDate,
          responsibleRaw: managerRaw || null,
        };

        if (data.amoId) {
          const existing = await tx.deal.findUnique({ where: { amoId: data.amoId } });
          if (existing) {
            await tx.deal.update({
              where: { id: existing.id },
              data,
            });
          } else {
            await tx.deal.create({ data });
          }
        } else {
          const existing = await tx.deal.findFirst({
            where: {
              name: data.name,
              createdAt: data.createdAt ?? undefined,
            },
          });
          if (existing) {
            await tx.deal.update({
              where: { id: existing.id },
              data,
            });
          } else {
            await tx.deal.create({ data });
          }
        }
        results.push({ name: data.name, amoId: data.amoId });
      }
    });

    deleteImportSession(body.sessionId);

    res.json({ imported: results.length });
  } catch (error) {
    next(error);
  }
});

export default router;
