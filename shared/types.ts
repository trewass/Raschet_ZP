export type DealStatus = 'Продажа' | 'Смонтировано';

export interface CalculationSettings {
  loadersFixed: number;
  installersPercent: number;
  rounding: 'half-up-to-integer';
}

export interface ManagerDefinition {
  id: number;
  name: string;
  salePct: number;
  installPct: number;
}

export interface SalaryDefinition {
  id: number;
  name: string;
  amount: number;
  enabled: boolean;
}

export interface CrewMemberShare {
  memberId: number;
  name: string;
  share: number;
}

export interface CrewDefinition {
  id: number;
  name: string;
  members: CrewMemberShare[];
}

export interface DealCalculationInput {
  id: number;
  name: string;
  budget: number;
  status: DealStatus;
  payoutPercent: number;
  countertop: number;
  delivery: number;
  managerId: number | null;
  managerName: string | null;
  createdAt: string | null;
  closedAt: string | null;
  crewId: number | null;
}

export interface PayrollPeriod {
  month: number;
  year: number;
}

export interface CalculationRequest {
  deals: DealCalculationInput[];
  crews: CrewDefinition[];
  managers: ManagerDefinition[];
  settings: CalculationSettings;
  salaries: SalaryDefinition[];
  period: PayrollPeriod;
}

export interface CrewPayout {
  memberId: number;
  name: string;
  amount: number;
}

export interface DealPayoutDetails {
  deal: DealCalculationInput;
  base: number;
  crewFund: number;
  crewPayouts: CrewPayout[];
  managerSale: number;
  managerInstall: number;
  managerTotal: number;
}

export type SummaryCategory = 'Сборщик' | 'Менеджер' | 'Оклад';

export interface SummaryBreakdownItem {
  dealId?: number;
  dealName?: string;
  amount: number;
  note?: string;
}

export interface SummaryEntry {
  person: string;
  category: SummaryCategory;
  amount: number;
  breakdown: SummaryBreakdownItem[];
}

export interface CalculationResult {
  deals: DealPayoutDetails[];
  summary: SummaryEntry[];
  totals: {
    crewFund: number;
    managers: number;
    salaries: number;
    grandTotal: number;
  };
}
