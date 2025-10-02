import axios from 'axios';
import {
  CalculationDealInput,
  CalculationPeriod,
  CalculationResult,
  DealRecord,
  ImportPreviewResponse,
  ManagerSetting,
  SalarySetting,
  SettingsResponse,
} from '../types';

const api = axios.create({
  baseURL: '/api',
});

export async function fetchSettings(): Promise<SettingsResponse> {
  const { data } = await api.get<SettingsResponse>('/settings');
  return data;
}

export async function saveConstants(constants: SettingsResponse['constants']) {
  const { data } = await api.put<SettingsResponse>('/settings/constants', constants);
  return data;
}

export async function saveManagers(managers: ManagerSetting[]) {
  const { data } = await api.put<SettingsResponse>('/settings/managers', managers);
  return data;
}

export async function saveSalaries(salaries: SalarySetting[]) {
  const { data } = await api.put<SettingsResponse>('/settings/salaries', salaries);
  return data;
}

export async function saveCrewMembers(
  crewMembers: { id?: number; name: string }[]
) {
  const { data } = await api.put<SettingsResponse>('/settings/crew-members', crewMembers);
  return data;
}

export async function saveCrews(
  crews: { id?: number; name: string; members: { memberId: number; share: number }[] }[]
) {
  const { data } = await api.put<SettingsResponse>('/settings/crews', crews);
  return data;
}

export async function previewImport(file: File): Promise<ImportPreviewResponse> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<ImportPreviewResponse>('/import/preview', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function commitImport(payload: {
  sessionId: string;
  mapping: {
    id?: string;
    name: string;
    budget: string;
    manager?: string;
    createdAt?: string;
    closedAt?: string;
  };
}) {
  const { data } = await api.post('/import/commit', payload);
  return data as { imported: number };
}

export async function fetchDeals(params: {
  year?: number;
  mode?: 'sale' | 'install';
  search?: string;
} = {}): Promise<DealRecord[]> {
  const { data } = await api.get<DealRecord[]>('/deals', { params });
  return data;
}

export async function calculatePayouts(payload: {
  period: CalculationPeriod;
  deals: CalculationDealInput[];
  salaryOverrides?: { id: number; enabled: boolean }[];
}): Promise<CalculationResult> {
  const { data } = await api.post<CalculationResult>('/payouts/calculate', payload);
  return data;
}
