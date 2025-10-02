import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchSettings } from '../api/client';
import { CalculationResult, SettingsResponse } from '../types';

type AppState = {
  settings: SettingsResponse | null;
  loadingSettings: boolean;
  refreshSettings: () => Promise<void>;
  setSettings: (settings: SettingsResponse) => void;
  calculationResult: CalculationResult | null;
  setCalculationResult: (result: CalculationResult | null) => void;
  salaryOverrides: { id: number; enabled: boolean }[];
  setSalaryOverrides: React.Dispatch<
    React.SetStateAction<{ id: number; enabled: boolean }[]>
  >;
  lastPeriod: { month: number; year: number } | null;
  setLastPeriod: React.Dispatch<
    React.SetStateAction<{ month: number; year: number } | null>
  >;
};

const AppStateContext = createContext<AppState | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [salaryOverrides, setSalaryOverrides] = useState<{
    id: number;
    enabled: boolean;
  }[]>([]);
  const [lastPeriod, setLastPeriod] = useState<{ month: number; year: number } | null>(null);

  const refreshSettings = async () => {
    setLoadingSettings(true);
    try {
      const data = await fetchSettings();
      setSettings(data);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    void refreshSettings();
  }, []);

  return (
    <AppStateContext.Provider
      value={{
        settings,
        loadingSettings,
        refreshSettings,
        setSettings,
        calculationResult,
        setCalculationResult,
        salaryOverrides,
        setSalaryOverrides,
        lastPeriod,
        setLastPeriod,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}
