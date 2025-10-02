export interface SettingsResponse {
  constants: {
    loadersFixed: number;
    installersPercent: number;
    rounding: string;
  };
  managers: ManagerSetting[];
  salaries: SalarySetting[];
  crewMembers: CrewMember[];
  crews: CrewSetting[];
}

export interface ManagerSetting {
  id: number;
  name: string;
  salePct: number;
  installPct: number;
  enabled: boolean;
  aliases: string[];
}

export interface SalarySetting {
  id: number;
  name: string;
  amount: number;
  enabled: boolean;
}

export interface CrewMember {
  id: number;
  name: string;
}

export interface CrewSetting {
  id: number;
  name: string;
  members: {
    memberId: number;
    name: string;
    share: number;
  }[];
}

export interface DealRecord {
  id: number;
  amoId: string | null;
  name: string;
  budget: number;
  managerName: string | null;
  managerId: number | null;
  createdAt: string | null;
  closedAt: string | null;
  status: 'Продажа' | 'Смонтировано';
}

export interface ImportPreviewResponse {
  sessionId: string;
  headers: string[];
  delimiter: string;
  preview: Record<string, string>[];
  totalRows: number;
}

export interface CalculationDealInput {
  id: number;
  name: string;
  budget: number;
  countertop: number;
  delivery: number;
  payoutPercent: number;
  status: 'Продажа' | 'Смонтировано';
  managerId: number | null;
  managerName: string | null;
  createdAt: string | null;
  closedAt: string | null;
  crewId: number | null;
}

export interface CalculationPeriod {
  month: number;
  year: number;
}

export interface SummaryBreakdownItem {
  dealId?: number;
  dealName?: string;
  amount: number;
  note?: string;
}

export type SummaryCategory = 'Сборщик' | 'Менеджер' | 'Оклад';

export interface SummaryEntry {
  person: string;
  category: SummaryCategory;
  amount: number;
  breakdown: SummaryBreakdownItem[];
}

export interface DealPayoutDetails {
  deal: CalculationDealInput;
  base: number;
  crewFund: number;
  crewPayouts: {
    memberId: number;
    name: string;
    amount: number;
  }[];
  managerSale: number;
  managerInstall: number;
  managerTotal: number;
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
