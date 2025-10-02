import express from 'express';
import { z } from 'zod';
import { getSettings } from '../services/settingsService';
import { calculatePayouts } from '../../shared/calculations';
import { CalculationRequest } from '../../shared/types';

const router = express.Router();

const dealSchema = z.object({
  id: z.number(),
  name: z.string(),
  budget: z.number(),
  countertop: z.number().min(0),
  delivery: z.number().min(0),
  payoutPercent: z.number().min(0).max(100),
  status: z.union([z.literal('Продажа'), z.literal('Смонтировано')]),
  managerId: z.number().nullable(),
  managerName: z.string().nullable(),
  createdAt: z.string().nullable(),
  closedAt: z.string().nullable(),
  crewId: z.number().nullable(),
});

const requestSchema = z.object({
  period: z.object({
    month: z.number().min(1).max(12),
    year: z.number().min(2000),
  }),
  deals: z.array(dealSchema),
  salaryOverrides: z
    .array(
      z.object({
        id: z.number(),
        enabled: z.boolean(),
      })
    )
    .optional(),
});

router.post('/calculate', async (req, res, next) => {
  try {
    const payload = requestSchema.parse(req.body);
    const settings = await getSettings();

    const salaryOverrideMap = new Map<number, boolean>();
    payload.salaryOverrides?.forEach((entry) => {
      salaryOverrideMap.set(entry.id, entry.enabled);
    });

    const request: CalculationRequest = {
      period: payload.period,
      deals: payload.deals.map((deal) => ({
        ...deal,
      })),
      settings: {
        loadersFixed: settings.constants.loadersFixed,
        installersPercent: settings.constants.installersPercent,
        rounding: settings.constants.rounding as 'half-up-to-integer',
      },
      managers: settings.managers
        .filter((manager) => manager.enabled)
        .map((manager) => ({
          id: manager.id,
          name: manager.name,
          salePct: manager.salePct,
          installPct: manager.installPct,
        })),
      crews: settings.crews,
      salaries: settings.salaries.map((salary) => ({
        id: salary.id,
        name: salary.name,
        amount: salary.amount,
        enabled:
          salaryOverrideMap.get(salary.id) ?? salary.enabled,
      })),
    };

    const result = calculatePayouts(request);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
