import express from 'express';
import { z } from 'zod';
import {
  getSettings,
  replaceCrewMembers,
  replaceCrews,
  replaceManagers,
  replaceSalaries,
  updateConstants,
} from '../services/settingsService';

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

const constantsSchema = z.object({
  loadersFixed: z.number().nonnegative(),
  installersPercent: z.number().min(0).max(1),
  rounding: z.string(),
});

router.put('/constants', async (req, res, next) => {
  try {
    const payload = constantsSchema.parse(req.body);
    await updateConstants(payload);
    res.json(await getSettings());
  } catch (error) {
    next(error);
  }
});

const managerSchema = z.array(
  z.object({
    id: z.number().optional(),
    name: z.string().min(1),
    salePct: z.number().min(0),
    installPct: z.number().min(0),
    enabled: z.boolean().default(true),
    aliases: z.array(z.string()),
  })
);

router.put('/managers', async (req, res, next) => {
  try {
    const payload = managerSchema.parse(req.body);
    await replaceManagers(payload);
    res.json(await getSettings());
  } catch (error) {
    next(error);
  }
});

const salarySchema = z.array(
  z.object({
    id: z.number().optional(),
    name: z.string().min(1),
    amount: z.number().min(0),
    enabled: z.boolean(),
  })
);

router.put('/salaries', async (req, res, next) => {
  try {
    const payload = salarySchema.parse(req.body);
    await replaceSalaries(payload);
    res.json(await getSettings());
  } catch (error) {
    next(error);
  }
});

const crewMembersSchema = z.array(
  z.object({
    id: z.number().optional(),
    name: z.string().min(1),
  })
);

router.put('/crew-members', async (req, res, next) => {
  try {
    const payload = crewMembersSchema.parse(req.body);
    await replaceCrewMembers(payload);
    res.json(await getSettings());
  } catch (error) {
    next(error);
  }
});

const crewsSchema = z.array(
  z.object({
    id: z.number().optional(),
    name: z.string().min(1),
    members: z
      .array(
        z.object({
          memberId: z.number(),
          share: z.number(),
        })
      )
      .length(2),
  })
);

router.put('/crews', async (req, res, next) => {
  try {
    const payload = crewsSchema.parse(req.body);
    await replaceCrews(payload);
    res.json(await getSettings());
  } catch (error) {
    next(error);
  }
});

export default router;
