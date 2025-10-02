import { DateTime } from 'luxon';
import {
  CalculationRequest,
  CalculationResult,
  CalculationSettings,
  CrewDefinition,
  DealPayoutDetails,
  PayrollPeriod,
  SummaryEntry,
  SummaryBreakdownItem,
  SummaryCategory,
} from './types';

function roundCurrency(value: number, mode: CalculationSettings['rounding']): number {
  if (mode !== 'half-up-to-integer') {
    return Math.round(value);
  }
  const isNegative = value < 0;
  const absolute = Math.abs(value);
  const floored = Math.floor(absolute);
  const fractional = absolute - floored;
  let rounded: number;
  if (fractional > 0.5) {
    rounded = floored + 1;
  } else if (fractional < 0.5) {
    rounded = floored;
  } else {
    rounded = floored + 1;
  }
  return isNegative ? -rounded : rounded;
}

function matchCrew(crewId: number | null, crews: CrewDefinition[]): CrewDefinition | null {
  if (crewId == null) {
    return null;
  }
  return crews.find((crew) => crew.id === crewId) ?? null;
}

function isSalePayoutInPeriod(createdAt: string | null, period: PayrollPeriod): boolean {
  if (!createdAt) return false;
  const date = DateTime.fromISO(createdAt);
  if (!date.isValid) return false;
  const due = date.plus({ months: 1 });
  return due.month === period.month && due.year === period.year;
}

function resolveInstallDate(status: string, createdAt: string | null, closedAt: string | null): DateTime | null {
  if (status !== 'Смонтировано') return null;
  if (closedAt) {
    const closeDate = DateTime.fromISO(closedAt);
    if (closeDate.isValid) return closeDate;
  }
  if (createdAt) {
    const created = DateTime.fromISO(createdAt);
    if (created.isValid) return created;
  }
  return null;
}

function isInstallPayoutInPeriod(status: string, createdAt: string | null, closedAt: string | null, period: PayrollPeriod): boolean {
  const date = resolveInstallDate(status, createdAt, closedAt);
  if (!date) return false;
  return date.month === period.month && date.year === period.year;
}

function ensureTwoMembers(crew: CrewDefinition | null): CrewDefinition | null {
  if (!crew) return null;
  if (crew.members.length !== 2) {
    return null;
  }
  return crew;
}

export function calculatePayouts(request: CalculationRequest): CalculationResult {
  const { settings, deals, crews, managers, salaries, period } = request;
  const managerMap = new Map(managers.map((manager) => [manager.id, manager]));

  const dealResults: DealPayoutDetails[] = [];
  let totalCrewFund = 0;
  let totalManagers = 0;

  const summaryMap = new Map<string, SummaryEntry>();

  const upsertSummary = (
    person: string,
    category: SummaryCategory,
    amount: number,
    breakdown: SummaryBreakdownItem
  ) => {
    if (amount === 0) return;
    const key = `${person}|${category}`;
    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        person,
        category,
        amount: 0,
        breakdown: [],
      });
    }
    const entry = summaryMap.get(key)!;
    entry.amount = roundCurrency(entry.amount + amount, settings.rounding);
    entry.breakdown.push(breakdown);
  };

  for (const deal of deals) {
    const crew = ensureTwoMembers(matchCrew(deal.crewId, crews));
    const base = Math.max(
      0,
      deal.budget - deal.countertop - deal.delivery - settings.loadersFixed
    );
    const rawCrewFund =
      base * settings.installersPercent * (deal.payoutPercent / 100);
    const crewFund = crew
      ? roundCurrency(rawCrewFund, settings.rounding)
      : 0;

    const crewPayouts: { memberId: number; name: string; amount: number }[] = [];
    if (crew && crewFund > 0) {
      let accumulated = 0;
      crew.members.forEach((member, index) => {
        const isLast = index === crew.members.length - 1;
        let amount = roundCurrency(crewFund * member.share, settings.rounding);
        if (isLast) {
          amount = crewFund - accumulated;
        }
        accumulated += amount;
        crewPayouts.push({
          memberId: member.memberId,
          name: member.name,
          amount,
        });
        upsertSummary(member.name, 'Сборщик', amount, {
          dealId: deal.id,
          dealName: deal.name,
          amount,
          note: `Бригада ${crew.name}`,
        });
      });
    }

    const manager = deal.managerId ? managerMap.get(deal.managerId) : null;
    let managerSale = 0;
    let managerInstall = 0;
    if (manager) {
      if (isSalePayoutInPeriod(deal.createdAt, period)) {
        managerSale = roundCurrency(deal.budget * manager.salePct, settings.rounding);
      }
      if (isInstallPayoutInPeriod(deal.status, deal.createdAt, deal.closedAt, period)) {
        managerInstall = roundCurrency(
          deal.budget * manager.installPct,
          settings.rounding
        );
      }
      const managerTotal = managerSale + managerInstall;
      if (managerTotal !== 0) {
        upsertSummary(manager.name, 'Менеджер', managerTotal, {
          dealId: deal.id,
          dealName: deal.name,
          amount: managerTotal,
          note: [
            managerSale ? `Продажа ${managerSale.toLocaleString('ru-RU')}` : null,
            managerInstall
              ? `Монтаж ${managerInstall.toLocaleString('ru-RU')}`
              : null,
          ]
            .filter(Boolean)
            .join(', '),
        });
      }
    }

    totalCrewFund += crewFund;
    totalManagers += managerSale + managerInstall;

    dealResults.push({
      deal,
      base,
      crewFund,
      crewPayouts,
      managerSale,
      managerInstall,
      managerTotal: managerSale + managerInstall,
    });
  }

  let totalSalaries = 0;
  for (const salary of salaries) {
    if (!salary.enabled) continue;
    const amount = roundCurrency(salary.amount, settings.rounding);
    totalSalaries += amount;
    upsertSummary(salary.name, 'Оклад', amount, {
      amount,
      note: 'Фиксированный оклад',
    });
  }

  const summary = Array.from(summaryMap.values()).sort((a, b) =>
    a.person.localeCompare(b.person, 'ru')
  );

  const result: CalculationResult = {
    deals: dealResults,
    summary,
    totals: {
      crewFund: roundCurrency(totalCrewFund, settings.rounding),
      managers: roundCurrency(totalManagers, settings.rounding),
      salaries: roundCurrency(totalSalaries, settings.rounding),
      grandTotal: roundCurrency(
        totalCrewFund + totalManagers + totalSalaries,
        settings.rounding
      ),
    },
  };

  return result;
}

export { roundCurrency };
