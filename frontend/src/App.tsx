import { NavLink, Route, Routes } from 'react-router-dom';
import ImportPage from './pages/ImportPage';
import SettingsPage from './pages/SettingsPage';
import CalculationPage from './pages/CalculationPage';
import SummaryPage from './pages/SummaryPage';
import { AppStateProvider } from './state/AppStateContext';

function Navigation() {
  return (
    <nav className="no-print">
      <NavLink to="/import" className={({ isActive }) => (isActive ? 'active' : '')}>
        Импорт CSV
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
        Настройки
      </NavLink>
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
        Объекты и расчёт
      </NavLink>
      <NavLink to="/summary" className={({ isActive }) => (isActive ? 'active' : '')}>
        Ведомость выплат
      </NavLink>
    </nav>
  );
}

function AppLayout() {
  return (
    <div className="app-shell">
      <Navigation />
      <Routes>
        <Route path="/import" element={<ImportPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/summary" element={<SummaryPage />} />
        <Route path="/" element={<CalculationPage />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <AppLayout />
    </AppStateProvider>
  );
}
