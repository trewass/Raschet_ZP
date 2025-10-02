import { calculatePayouts } from '../calculations';
import { CalculationRequest } from '../types';

const baseRequest: CalculationRequest = {
  settings: {
    loadersFixed: 4000,
    installersPercent: 0.1,
    rounding: 'half-up-to-integer',
  },
  period: {
    month: 4,
    year: 2024,
  },
  managers: [
    { id: 1, name: 'Меркунов Александр', salePct: 0.01, installPct: 0.01 },
    { id: 2, name: 'Арепьева Анастасия', salePct: 0.01, installPct: 0.02 },
  ],
  crews: [
    {
      id: 1,
      name: 'Бригада 1',
      members: [
        { memberId: 1, name: 'Иванов И.И.', share: 0.5 },
        { memberId: 2, name: 'Петров П.П.', share: 0.5 },
      ],
    },
    {
      id: 2,
      name: 'Бригада 60/40',
      members: [
        { memberId: 3, name: 'Сидоров С.С.', share: 0.6 },
        { memberId: 4, name: 'Кузнецов К.К.', share: 0.4 },
      ],
    },
  ],
  salaries: [
    { id: 1, name: 'Крылов Виталий', amount: 75000, enabled: true },
    { id: 2, name: 'Пяткин Дмитрий', amount: 120000, enabled: true },
    { id: 3, name: 'Руцкая Елена', amount: 60000, enabled: true },
    { id: 4, name: 'Влад (дизайнер)', amount: 40000, enabled: true },
  ],
  deals: [],
};

describe('calculatePayouts', () => {
  it('handles 100% payout for 50/50 brigade', () => {
    const request = {
      ...baseRequest,
      deals: [
        {
          id: 1,
          name: 'Сделка 1',
          budget: 1_000_000,
          countertop: 150_000,
          delivery: 20_000,
          payoutPercent: 100,
          status: 'Смонтировано' as const,
          managerId: 1,
          managerName: 'Меркунов Александр',
          createdAt: '2024-03-10T00:00:00.000Z',
          closedAt: '2024-03-20T00:00:00.000Z',
          crewId: 1,
        },
      ],
    } satisfies CalculationRequest;

    const result = calculatePayouts(request);
    expect(result.deals[0].base).toBe(826000);
    expect(result.deals[0].crewFund).toBe(82600);
    expect(result.deals[0].crewPayouts.map((p) => p.amount)).toEqual([41300, 41300]);
  });

  it('handles 50% payout for 50/50 brigade', () => {
    const request = {
      ...baseRequest,
      deals: [
        {
          id: 2,
          name: 'Сделка 2',
          budget: 1_000_000,
          countertop: 150_000,
          delivery: 20_000,
          payoutPercent: 50,
          status: 'Смонтировано' as const,
          managerId: 1,
          managerName: 'Меркунов Александр',
          createdAt: '2024-03-10T00:00:00.000Z',
          closedAt: '2024-03-20T00:00:00.000Z',
          crewId: 1,
        },
      ],
    } satisfies CalculationRequest;

    const result = calculatePayouts(request);
    expect(result.deals[0].crewFund).toBe(41300);
    expect(result.deals[0].crewPayouts.map((p) => p.amount)).toEqual([20650, 20650]);
  });

  it('handles 60/40 brigade split with partial payout', () => {
    const request = {
      ...baseRequest,
      deals: [
        {
          id: 3,
          name: 'Сделка 3',
          budget: 300_000,
          countertop: 0,
          delivery: 0,
          payoutPercent: 30,
          status: 'Смонтировано' as const,
          managerId: 1,
          managerName: 'Меркунов Александр',
          createdAt: '2024-03-10T00:00:00.000Z',
          closedAt: '2024-03-25T00:00:00.000Z',
          crewId: 2,
        },
      ],
    } satisfies CalculationRequest;

    const result = calculatePayouts(request);
    expect(result.deals[0].base).toBe(296000);
    expect(result.deals[0].crewFund).toBe(8880);
    expect(result.deals[0].crewPayouts.map((p) => p.amount)).toEqual([5328, 3552]);
  });

  it('handles zero base when costs exceed budget', () => {
    const request = {
      ...baseRequest,
      deals: [
        {
          id: 4,
          name: 'Сделка 4',
          budget: 10_000,
          countertop: 8_000,
          delivery: 3_000,
          payoutPercent: 100,
          status: 'Продажа' as const,
          managerId: 1,
          managerName: 'Меркунов Александр',
          createdAt: '2024-03-10T00:00:00.000Z',
          closedAt: null,
          crewId: 1,
        },
      ],
    } satisfies CalculationRequest;

    const result = calculatePayouts(request);
    expect(result.deals[0].base).toBe(0);
    expect(result.deals[0].crewFund).toBe(0);
  });

  it('calculates manager payouts based on rules', () => {
    const request = {
      ...baseRequest,
      period: { month: 4, year: 2024 },
      deals: [
        {
          id: 5,
          name: 'Сделка 5',
          budget: 500_000,
          countertop: 0,
          delivery: 0,
          payoutPercent: 100,
          status: 'Смонтировано' as const,
          managerId: 2,
          managerName: 'Арепьева Анастасия',
          createdAt: '2024-03-01T00:00:00.000Z',
          closedAt: '2024-04-05T00:00:00.000Z',
          crewId: 1,
        },
      ],
    } satisfies CalculationRequest;

    const result = calculatePayouts(request);
    expect(result.deals[0].managerSale).toBe(5000);
    expect(result.deals[0].managerInstall).toBe(10000);
  });

  it('includes enabled salaries including Vlad the designer', () => {
    const result = calculatePayouts(baseRequest);
    const summary = result.summary.filter((entry) => entry.category === 'Оклад');
    expect(summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ person: 'Влад (дизайнер)', amount: 40000 }),
      ])
    );
    expect(result.totals.salaries).toBe(295000);
  });
});
