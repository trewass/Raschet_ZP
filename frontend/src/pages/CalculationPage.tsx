import { useEffect, useMemo, useState } from 'react';
import {
  calculatePayouts,
  fetchDeals,
} from '../api/client';
import { useAppState } from '../state/AppStateContext';
import { CalculationDealInput, CalculationResult, DealRecord } from '../types';

const STORAGE_KEY = 'raschet-zp-calculation-state';

interface DealAdjustment {
  countertop: number;
  delivery: number;
  payoutPercent: number;
  status: 'Продажа' | 'Смонтировано';
  crewId: number | null;
  managerId: number | null;
  managerName: string | null;
}

interface StoredState {
  selectedDealIds: number[];
  adjustments: Record<number, DealAdjustment>;
  period: { month: number; year: number };
  salaryOverrides: { id: number; enabled: boolean }[];
}

const defaultPeriod = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};

function loadStoredState(): StoredState | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    return JSON.parse(value) as StoredState;
  } catch (error) {
    console.error('Failed to parse stored state', error);
    return null;
  }
}

function saveState(state: StoredState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export default function CalculationPage() {
  const {
    settings,
    setCalculationResult,
    calculationResult,
    salaryOverrides,
    setSalaryOverrides,
    setLastPeriod,
  } = useAppState();
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [selectedDealIds, setSelectedDealIds] = useState<number[]>([]);
  const [adjustments, setAdjustments] = useState<Record<number, DealAdjustment>>({});
  const [period, setPeriod] = useState(defaultPeriod);
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [mode, setMode] = useState<'sale' | 'install'>('sale');
  const [search, setSearch] = useState('');
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadStoredState();
    if (stored) {
      setSelectedDealIds(stored.selectedDealIds);
      setAdjustments(stored.adjustments);
      setPeriod(stored.period);
      setSalaryOverrides(stored.salaryOverrides ?? []);
    }
  }, [setSalaryOverrides]);

  useEffect(() => {
    saveState({ selectedDealIds, adjustments, period, salaryOverrides });
  }, [selectedDealIds, adjustments, period, salaryOverrides]);

  const refreshDeals = async () => {
    setLoadingDeals(true);
    try {
      const loaded = await fetchDeals({ year: yearFilter, mode, search });
      setDeals(loaded);
    } catch (error) {
      console.error(error);
      setMessage('Не удалось загрузить сделки');
    } finally {
      setLoadingDeals(false);
    }
  };

  useEffect(() => {
    if (settings) {
      void refreshDeals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, yearFilter, mode, search]);

  useEffect(() => {
    if (!settings) return;
    setAdjustments((prev) => {
      const next = { ...prev };
      for (const id of selectedDealIds) {
        if (!next[id]) {
          const deal = deals.find((item) => item.id === id);
          next[id] = {
            countertop: 0,
            delivery: 0,
            payoutPercent: 100,
            status: deal?.status ?? 'Продажа',
            crewId: null,
            managerId: deal?.managerId ?? null,
            managerName: deal?.managerName ?? null,
          };
        }
      }
      return next;
    });
  }, [selectedDealIds, deals, settings]);

  const selectedDeals = useMemo(() => {
    return deals.filter((deal) => selectedDealIds.includes(deal.id));
  }, [deals, selectedDealIds]);

  const constants = settings?.constants;
  const crews = settings?.crews ?? [];
  const managers = settings?.managers ?? [];

  const computedRows = selectedDeals.map((deal) => {
    const adjustment = adjustments[deal.id];
    const loaders = constants?.loadersFixed ?? 0;
    const installersPercent = constants?.installersPercent ?? 0;
    const countertop = adjustment?.countertop ?? 0;
    const delivery = adjustment?.delivery ?? 0;
    const payoutPercent = adjustment?.payoutPercent ?? 100;
    const base = Math.max(0, deal.budget - countertop - delivery - loaders);
    const crewFund = Math.round(base * installersPercent * (payoutPercent / 100));
    return {
      deal,
      adjustment,
      base,
      crewFund,
    };
  });

  const totals = computedRows.reduce(
    (acc, row) => {
      acc.base += row.base;
      acc.crewFund += row.crewFund;
      return acc;
    },
    { base: 0, crewFund: 0 }
  );

  const handleToggleDeal = (dealId: number, checked: boolean) => {
    setSelectedDealIds((prev) =>
      checked ? [...new Set([...prev, dealId])] : prev.filter((id) => id !== dealId)
    );
  };

  const handleSelectAll = () => {
    setSelectedDealIds(deals.map((deal) => deal.id));
  };

  const handleClearAll = () => {
    setSelectedDealIds([]);
  };

  const getDefaultAdjustment = (dealId: number): DealAdjustment => {
    const deal = deals.find((item) => item.id === dealId);
    return {
      countertop: 0,
      delivery: 0,
      payoutPercent: 100,
      status: deal?.status ?? 'Продажа',
      crewId: null,
      managerId: deal?.managerId ?? null,
      managerName: deal?.managerName ?? null,
    };
  };

  const handleAdjustmentChange = (dealId: number, patch: Partial<DealAdjustment>) => {
    setAdjustments((prev) => ({
      ...prev,
      [dealId]: {
        ...(prev[dealId] ?? getDefaultAdjustment(dealId)),
        ...patch,
      },
    }));
  };

  const managerOptions = managers.filter((manager) => manager.enabled);

  const buildCalculationPayload = (): CalculationDealInput[] => {
    return selectedDeals.map((deal) => {
      const adj = adjustments[deal.id];
      return {
        id: deal.id,
        name: deal.name,
        budget: deal.budget,
        countertop: adj?.countertop ?? 0,
        delivery: adj?.delivery ?? 0,
        payoutPercent: adj?.payoutPercent ?? 100,
        status: adj?.status ?? deal.status,
        managerId: adj?.managerId ?? null,
        managerName: adj?.managerName ?? deal.managerName ?? null,
        createdAt: deal.createdAt,
        closedAt: deal.closedAt,
        crewId: adj?.crewId ?? null,
      };
    });
  };

  const handleCalculate = async () => {
    if (!settings) return;
    if (selectedDealIds.length === 0) {
      setMessage('Выберите хотя бы одну сделку для расчёта');
      return;
    }
    try {
      const result = await calculatePayouts({
        period,
        deals: buildCalculationPayload(),
        salaryOverrides,
      });
      setCalculationResult(result);
      setLastPeriod(period);
      setMessage('Расчёт выполнен');
    } catch (error) {
      console.error(error);
      setMessage('Не удалось выполнить расчёт');
    }
  };

  const handleSalaryToggle = (salaryId: number, enabled: boolean) => {
    setSalaryOverrides((prev) => {
      const map = new Map(prev.map((entry) => [entry.id, entry.enabled] as const));
      map.set(salaryId, enabled);
      return Array.from(map.entries()).map(([id, value]) => ({ id, enabled: value }));
    });
  };

  return (
    <div className="card">
      <h1 className="section-title">Объекты и расчёт</h1>
      <div className="flex" style={{ flexWrap: 'wrap', gap: 16 }}>
        <label>
          Год
          <input
            type="number"
            value={yearFilter}
            onChange={(event) => setYearFilter(Number(event.target.value))}
          />
        </label>
        <label>
          Режим
          <select value={mode} onChange={(event) => setMode(event.target.value as 'sale' | 'install')}>
            <option value="sale">По дате продажи</option>
            <option value="install">По дате монтажа</option>
          </select>
        </label>
        <label>
          Поиск по названию
          <input value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <label>
          Период выплат месяц
          <input
            type="number"
            min={1}
            max={12}
            value={period.month}
            onChange={(event) =>
              setPeriod((prev) => ({ ...prev, month: Number(event.target.value) }))
            }
          />
        </label>
        <label>
          Период выплат год
          <input
            type="number"
            value={period.year}
            onChange={(event) => setPeriod((prev) => ({ ...prev, year: Number(event.target.value) }))}
          />
        </label>
        <button className="button secondary" onClick={refreshDeals} disabled={loadingDeals}>
          Обновить список
        </button>
      </div>

      {message && <p>{message}</p>}

      <section style={{ marginTop: 24 }}>
        <div className="flex-between">
          <h2>Выберите объекты</h2>
          <div className="actions">
            <button className="button secondary" onClick={handleSelectAll}>
              Выбрать все
            </button>
            <button className="button secondary" onClick={handleClearAll}>
              Снять все
            </button>
          </div>
        </div>
        <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
          {deals.map((deal) => (
            <label key={deal.id} style={{ display: 'block', marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={selectedDealIds.includes(deal.id)}
                onChange={(event) => handleToggleDeal(deal.id, event.target.checked)}
              />
              <span style={{ marginLeft: 8 }}>
                {deal.name} — {formatCurrency(deal.budget)} ₽
              </span>
            </label>
          ))}
        </div>
      </section>

      {selectedDeals.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Название сделки</th>
                <th>Бюджет (₽)</th>
                <th>Столешница (₽)</th>
                <th>Доставка (₽)</th>
                <th>Нагрузчики (₽)</th>
                <th>База для сборщиков (₽)</th>
                <th>% выплаты</th>
                <th>Фонд сборщиков к выдаче (₽)</th>
                <th>Статус монтажа</th>
                <th>Бригада</th>
                <th>Менеджер</th>
              </tr>
            </thead>
            <tbody>
              {computedRows.map(({ deal, adjustment, base, crewFund }) => (
                <tr key={deal.id}>
                  <td>{deal.name}</td>
                  <td>{formatCurrency(deal.budget)}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={adjustment?.countertop ?? 0}
                      onChange={(event) =>
                        handleAdjustmentChange(deal.id, {
                          countertop: Number(event.target.value),
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={adjustment?.delivery ?? 0}
                      onChange={(event) =>
                        handleAdjustmentChange(deal.id, { delivery: Number(event.target.value) })
                      }
                    />
                  </td>
                  <td>{formatCurrency(constants?.loadersFixed ?? 0)}</td>
                  <td>
                    {formatCurrency(base)}
                    {base === 0 && <div className="status-warning">База отрицательная → 0</div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={adjustment?.payoutPercent ?? 100}
                        onChange={(event) =>
                          handleAdjustmentChange(deal.id, {
                            payoutPercent: Number(event.target.value),
                          })
                        }
                      />
                      {[30, 50, 70, 100].map((percent) => (
                        <button
                          key={percent}
                          className="button secondary"
                          style={{ padding: '4px 8px' }}
                          onClick={() => handleAdjustmentChange(deal.id, { payoutPercent: percent })}
                          type="button"
                        >
                          {percent}%
                        </button>
                      ))}
                    </div>
                  </td>
                  <td>
                    {formatCurrency(crewFund)}
                    {!adjustment?.crewId && (
                      <div className="status-warning">Выберите бригаду</div>
                    )}
                  </td>
                  <td>
                    <select
                      value={adjustment?.status ?? deal.status}
                      onChange={(event) =>
                        handleAdjustmentChange(deal.id, {
                          status: event.target.value as 'Продажа' | 'Смонтировано',
                        })
                      }
                    >
                      <option value="Продажа">Продажа</option>
                      <option value="Смонтировано">Смонтировано</option>
                    </select>
                    {(adjustment?.status ?? deal.status) === 'Продажа' && (
                      <div className="status-warning">Премия за монтаж пока не начисляется</div>
                    )}
                  </td>
                  <td>
                    <select
                      value={adjustment?.crewId ?? ''}
                      onChange={(event) =>
                        handleAdjustmentChange(deal.id, {
                          crewId: event.target.value ? Number(event.target.value) : null,
                        })
                      }
                    >
                      <option value="">— нет —</option>
                      {crews.map((crew) => (
                        <option key={crew.id} value={crew.id}>
                          {crew.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={adjustment?.managerId ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        const manager = managerOptions.find((item) => item.id === Number(value));
                        handleAdjustmentChange(deal.id, {
                          managerId: value ? Number(value) : null,
                          managerName: manager?.name ?? null,
                        });
                      }}
                    >
                      <option value="">— не выбран —</option>
                      {managerOptions.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.name}
                        </option>
                      ))}
                    </select>
                    {!adjustment?.managerId && (
                      <div className="status-warning">Менеджер не выбран</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {selectedDeals.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h2>Итого по выбранным объектам</h2>
          <p>База: {formatCurrency(totals.base)} ₽</p>
          <p>Фонд сборщиков: {formatCurrency(totals.crewFund)} ₽</p>
          <div style={{ marginTop: 16 }}>
            <h3>Оклады в расчёте</h3>
            {settings?.salaries.map((salary) => {
              const override = salaryOverrides.find((entry) => entry.id === salary.id);
              const enabled = override?.enabled ?? salary.enabled;
              return (
                <label key={salary.id} style={{ display: 'block', marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => handleSalaryToggle(salary.id, event.target.checked)}
                  />
                  <span style={{ marginLeft: 8 }}>
                    {salary.name} — {formatCurrency(salary.amount)} ₽
                  </span>
                </label>
              );
            })}
          </div>
          <button className="button" style={{ marginTop: 16 }} onClick={handleCalculate}>
            Рассчитать выплаты
          </button>
        </section>
      )}

      {calculationResult && <CalculationSummary result={calculationResult} />}
    </div>
  );
}

function CalculationSummary({ result }: { result: CalculationResult }) {
  return (
    <section style={{ marginTop: 32 }}>
      <h2>Результаты последнего расчёта</h2>
      <p>Фонд сборщиков: {formatCurrency(result.totals.crewFund)} ₽</p>
      <p>Менеджеры: {formatCurrency(result.totals.managers)} ₽</p>
      <p>Оклады: {formatCurrency(result.totals.salaries)} ₽</p>
      <h3>Общий итог: {formatCurrency(result.totals.grandTotal)} ₽</h3>
    </section>
  );
}

function formatCurrency(value: number) {
  return value.toLocaleString('ru-RU');
}
