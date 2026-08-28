import React, { useState, useEffect } from 'react';
import { useApp } from '@/store';
import { Login } from '@/pages/Login';
import { AppShell } from '@/components/AppShell';
import { Dashboard } from '@/pages/Dashboard';
import { WeatherStations } from '@/pages/WeatherStations';
import { LiveMonitoring } from '@/pages/LiveMonitoring';
import { AnomalyDetection } from '@/pages/AnomalyDetection';
import { Alerts } from '@/pages/Alerts';
import { HistoricalAnalysis } from '@/pages/HistoricalAnalysis';
import { AiInsights } from '@/pages/AiInsights';
import { Reports } from '@/pages/Reports';
import { Settings } from '@/pages/Settings';
// Sensor health is surfaced within the Weather Stations page.

export type Page =
  | 'dashboard'
  | 'stations'
  | 'live'
  | 'anomaly'
  | 'alerts'
  | 'historical'
  | 'insights'
  | 'reports'
  | 'settings';

export default function App() {
  const { authenticated } = useApp();
  const [page, setPage] = useState<Page>('dashboard');

  if (!authenticated) return <Login />;

  return (
    <AppShell page={page} onNavigate={setPage}>
      {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
      {page === 'stations' && <WeatherStations />}
      {page === 'live' && <LiveMonitoring />}
      {page === 'anomaly' && <AnomalyDetection />}
      {page === 'alerts' && <Alerts />}
      {page === 'historical' && <HistoricalAnalysis />}
      {page === 'insights' && <AiInsights />}
      {page === 'reports' && <Reports />}
      {page === 'settings' && <Settings />}
    </AppShell>
  );
}
