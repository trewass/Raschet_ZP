import { Fragment, useState } from 'react';
import * as XLSX from 'xlsx';
import { useAppState } from '../state/AppStateContext';
import { CalculationResult, SummaryEntry } from '../types';

function monthName(month: number) {
  return new Date(2020, month - 1, 1).toLocaleString('ru-RU', { month: 'long' });
}

function formatCurrency(value: number) {
  return value.toLocaleString('ru-RU');
}

export default function SummaryPage() {
  const { calculationResult, lastPeriod } = useAppState();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (!calculationResult) {
    return <div className="card">Сначала выполните расчёт на вкладке «Объекты и расчёт».</div>;
  }

  const toggleRow = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleExportCsv = (result: CalculationResult) => {
    const header = ['Сотрудник', 'Категория', 'Сумма', 'Детализация'];
    const rows = result.summary.map((entry) => [
      entry.person,
      entry.category,
      entry.amount,
      entry.breakdown
        .map((item) => `${item.dealName ?? ''} ${item.amount} ${item.note ?? ''}`.trim())
        .join('; '),
    ]);
    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vedomost.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportXlsx = (result: CalculationResult) => {
    const worksheetData = [
      ['Сотрудник', 'Категория', 'Сумма', 'Детализация'],
      ...result.summary.map((entry) => [
        entry.person,
        entry.category,
        entry.amount,
        entry.breakdown
          .map((item) => `${item.dealName ?? ''} ${item.amount} ${item.note ?? ''}`.trim())
          .join('; '),
      ]),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ведомость');
    XLSX.writeFile(workbook, 'vedomost.xlsx');
  };

  const periodLabel = lastPeriod
    ? `${monthName(lastPeriod.month)} ${lastPeriod.year}`
    : 'Период не указан';

  return (
    <div className="card">
      <div className="flex-between no-print">
        <h1 className="section-title">Ведомость выплат</h1>
        <div className="actions">
          <button className="button secondary" onClick={() => handleExportCsv(calculationResult)}>
            Экспорт CSV
          </button>
          <button className="button secondary" onClick={() => handleExportXlsx(calculationResult)}>
            Экспорт XLSX
          </button>
          <button className="button" onClick={() => window.print()}>
            Печать
          </button>
        </div>
      </div>
      <div className="printable">
        <h2 style={{ textTransform: 'capitalize' }}>Ведомость выплат — {periodLabel}</h2>
        <p>Дата формирования: {new Date().toLocaleDateString('ru-RU')}</p>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Сотрудник</th>
              <th>Категория</th>
              <th>Сумма ₽</th>
            </tr>
          </thead>
          <tbody>
            {calculationResult.summary.map((entry) => {
              const key = `${entry.person}-${entry.category}`;
              const isExpanded = expanded.has(key);
              return (
                <Fragment key={key}>
                  <tr onClick={() => toggleRow(key)} style={{ cursor: 'pointer' }}>
                    <td>{entry.person}</td>
                    <td>{entry.category}</td>
                    <td>{formatCurrency(entry.amount)}</td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={3}>
                        <ul>
                          {entry.breakdown.map((item, index) => (
                            <li key={index}>
                              {item.dealName ? `${item.dealName}: ` : ''}
                              {formatCurrency(item.amount)} ₽ {item.note ?? ''}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        <div style={{ marginTop: 24 }}>
          <h3>Итого</h3>
          <p>Сборщики: {formatCurrency(calculationResult.totals.crewFund)} ₽</p>
          <p>Менеджеры: {formatCurrency(calculationResult.totals.managers)} ₽</p>
          <p>Оклады: {formatCurrency(calculationResult.totals.salaries)} ₽</p>
          <h3>Общий итог: {formatCurrency(calculationResult.totals.grandTotal)} ₽</h3>
        </div>
        <div style={{ marginTop: 48 }}>
          <p>Ответственный за выдачу ____________________________</p>
        </div>
      </div>
    </div>
  );
}
