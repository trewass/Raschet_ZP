import express from 'express';
import { prisma } from '../prisma';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const yearParam = req.query.year ? Number(req.query.year) : undefined;
    const mode = req.query.mode === 'install' ? 'install' : 'sale';
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const where: any = {};
    if (yearParam) {
      if (mode === 'sale') {
        where.createdAt = {
          gte: new Date(Date.UTC(yearParam, 0, 1)),
          lt: new Date(Date.UTC(yearParam + 1, 0, 1)),
        };
      } else {
        where.closedAt = {
          gte: new Date(Date.UTC(yearParam, 0, 1)),
          lt: new Date(Date.UTC(yearParam + 1, 0, 1)),
        };
      }
    }
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const deals = await prisma.deal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const payload = deals.map((deal) => ({
      id: deal.id,
      amoId: deal.amoId,
      name: deal.name,
      budget: deal.budget,
      managerName: deal.managerName,
      managerId: deal.managerId,
      createdAt: deal.createdAt,
      closedAt: deal.closedAt,
      status: deal.closedAt ? 'Смонтировано' : 'Продажа',
    }));

    res.json(payload);
  } catch (error) {
    next(error);
  }
});

export default router;
