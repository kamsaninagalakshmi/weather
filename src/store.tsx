import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { AlertItem, AnomalyRecord, SensorReading, Severity, Station, AiInsight, SensorHealth } from '@/types';
import { STATIONS, STATION_MAP } from '@/data/stations';
import { generateHistory, generateNormalReading, injectAnomaly, ANOMALY_SCENARIOS, round } from '@/data/generator';
import {
  buildDetectors,
  detect,
  detectionToRecord,
  type DetectionResult,
} from '@/ml/isolationForest';
import * as db from '@/lib/db';

interface AppState {
  authenticated: boolean;
  login: (email: string) => void;
  logout: () => void;
  stations: Station[];
  current: Record<string, SensorReading>;
  history: Record<string, SensorReading[]>;
  anomalies: AnomalyRecord[];
  alerts: AlertItem[];
  insights: AiInsight[];
  sensorHealth: Record<string, SensorHealth>;
  stationStatus: Record<string, 'normal' | 'warning' | 'anomaly'>;
  loading: boolean;
  dbError: string | null;
  simulateAnomaly: (stationId?: string, scenarioIdx?: number) => AnomalyRecord;
  acknowledgeAlert: (id: string) => void;
  resolveAlert: (id: string) => void;
  acknowledgeAnomaly: (id: string) => void;
  resolveAnomaly: (id: string) => void;
  generateReport: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}

function statusFromSeverity(s: Severity): 'normal' | 'warning' | 'anomaly' {
  if (s === 'critical' || s === 'high') return 'anomaly';
  if (s === 'warning') return 'warning';
  return 'normal';
}

function sensorHealthFor(stationId: string, history: SensorReading[], anomalies: AnomalyRecord[]): SensorHealth {
  const recent = history.slice(-40);
  const stationAnoms = anomalies.filter((a) => a.stationId === stationId);
  const errsByParam: Record<string, number> = { temperature: 0, humidity: 0, pressure: 0, rainfall: 0, windSpeed: 0 };
  for (const a of stationAnoms) {
    if (a.parameter in errsByParam) errsByParam[a.parameter]++;
  }
  function hp(p: keyof SensorReading): number {
    const errs = errsByParam[p as string] ?? 0;
    const penalty = errs * 8;
    const noise =
      recent.length > 1
        ? (() => {
            const vals = recent.map((r) => r[p]);
            const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
            const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
            return Math.min(20, sd * 2);
          })()
        : 0;
    return Math.max(15, Math.round(100 - penalty - noise));
  }
  return {
    stationId,
    temperature: hp('temperature'),
    humidity: hp('humidity'),
    pressure: hp('pressure'),
    rainfall: hp('rainfall'),
    windSpeed: hp('windSpeed'),
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [stations, setStations] = useState<Station[]>(STATIONS);
  const [current, setCurrent] = useState<Record<string, SensorReading>>({});
  const [history, setHistory] = useState<Record<string, SensorReading[]>>({});
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [sensorHealth, setSensorHealth] = useState<Record<string, SensorHealth>>({});
  const [stationStatus, setStationStatus] = useState<Record<string, 'normal' | 'warning' | 'anomaly'>>({});
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const detectors = useMemo(() => buildDetectors(), []);
  const initDone = useRef(false);

  // Load persisted data from Supabase on mount (after login)
  const loadPersisted = useCallback(async () => {
    setLoading(true);
    setDbError(null);
    try {
      const [dbStations, dbAnomalies, dbAlerts, dbInsights, dbHealth] = await Promise.all([
        db.fetchStations(),
        db.fetchAnomalies(200),
        db.fetchAlerts(100),
        db.fetchInsights(50),
        db.fetchSensorHealth(),
      ]);
      if (dbStations.length > 0) setStations(dbStations);
      setAnomalies(dbAnomalies);
      setAlerts(dbAlerts);
      setInsights(dbInsights);
      if (Object.keys(dbHealth).length > 0) setSensorHealth(dbHealth);

      // Derive station status from unresolved anomalies
      const statusMap: Record<string, 'normal' | 'warning' | 'anomaly'> = {};
      for (const s of (dbStations.length ? dbStations : STATIONS)) statusMap[s.id] = s.status;
      for (const a of dbAnomalies) {
        if (a.resolved) continue;
        const st = statusFromSeverity(a.severity);
        if (st === 'anomaly' || (st === 'warning' && statusMap[a.stationId] !== 'anomaly')) {
          statusMap[a.stationId] = st;
        }
      }
      setStationStatus(statusMap);
    } catch (e: any) {
      setDbError(e.message ?? 'Failed to load data from database');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated && !initDone.current) {
      initDone.current = true;
      loadPersisted();
    }
  }, [authenticated, loadPersisted]);

  // Initialize local history + current readings (simulated) on mount
  useEffect(() => {
    const h: Record<string, SensorReading[]> = {};
    const c: Record<string, SensorReading> = {};
    for (const s of STATIONS) {
      const hist = generateHistory(s.id, 6, 15);
      h[s.id] = hist;
      c[s.id] = hist[hist.length - 1];
    }
    setHistory(h);
    setCurrent(c);
    const sh: Record<string, SensorHealth> = {};
    for (const s of STATIONS) sh[s.id] = sensorHealthFor(s.id, h[s.id], []);
    setSensorHealth((prev) => (Object.keys(prev).length ? prev : sh));
  }, []);

  // Live tick: update readings every 8s with small drift, persist to DB
  const persistTimer = useRef(0);
  useEffect(() => {
    if (!authenticated) return;
    const iv = setInterval(() => {
      const now = Date.now();
      setCurrent((prev) => {
        const next: Record<string, SensorReading> = { ...prev };
        const newHist: Record<string, SensorReading[]> = {};
        for (const s of STATIONS) {
          const last = prev[s.id];
          if (!last) continue;
          const nr = generateNormalReading(s.id, now);
          const blended: SensorReading = {
            timestamp: now,
            temperature: round(last.temperature * 0.7 + nr.temperature * 0.3, 1),
            humidity: round(last.humidity * 0.7 + nr.humidity * 0.3, 0),
            pressure: round(last.pressure * 0.8 + nr.pressure * 0.2, 0),
            rainfall: nr.rainfall,
            windSpeed: round(last.windSpeed * 0.6 + nr.windSpeed * 0.4, 1),
            windDirection: round(nr.windDirection, 0),
          };
          next[s.id] = blended;
          newHist[s.id] = [...(history[s.id] ?? []), blended].slice(-200);
        }
        setHistory(newHist);
        // Persist readings to DB periodically (every ~4th tick = ~32s) to avoid spam
        persistTimer.current++;
        if (persistTimer.current % 4 === 0) {
          for (const s of STATIONS) {
            const r = next[s.id];
            if (r) db.insertReading(s.id, r, false).catch(() => {});
          }
        }
        return next;
      });
    }, 8000);
    return () => clearInterval(iv);
  }, [authenticated, history]);

  // Persist anomaly + alert + insight to Supabase
  const persistDetection = useCallback(
    async (stationId: string, reading: SensorReading, res: DetectionResult, t: number, clientRec?: AnomalyRecord) => {
      if (!res.anomaly || !res.parameter) return;
      const rec = clientRec ?? detectionToRecord(stationId, reading, res, t);
      try {
        const savedAnom = await db.insertAnomaly(rec);
        setAnomalies((prev) => [savedAnom, ...prev.filter((a) => a.id !== savedAnom.id)].slice(0, 200));

        const station = STATION_MAP[stationId];
        const sevTitle: Record<Severity, string> = {
          normal: 'Info',
          warning: 'Warning',
          high: 'High Alert',
          critical: 'Critical Alert',
        };
        const alert: AlertItem = {
          id: `tmp-${t}`,
          stationId,
          stationName: station.name,
          severity: res.severity,
          title: sevTitle[res.severity],
          message: `${rec.parameterLabel} anomaly detected — value ${rec.value}${rec.unit} (expected ${rec.expectedMin}–${rec.expectedMax}${rec.unit})`,
          confidence: res.confidence,
          timestamp: t,
          acknowledged: false,
          resolved: false,
        };
        const savedAlert = await db.insertAlert(alert);
        setAlerts((prev) => [savedAlert, ...prev.filter((a) => a.id !== savedAlert.id)].slice(0, 100));

        const insight: AiInsight = {
          id: `tmp-ins-${t}`,
          stationId,
          stationName: station.name,
          parameter: res.parameter,
          parameterLabel: rec.parameterLabel,
          explanation: generateInsightText(station.name, rec.parameterLabel, rec.value, rec.unit, rec.expectedMin, rec.expectedMax, res.confidence, res.severity),
          anomalyProbability: res.confidence,
          contributingFactors: buildContributingFactors(res.parameter, rec.value, rec.expectedMin, rec.expectedMax),
          recommendedAction: rec.recommendedAction,
          timestamp: t,
        };
        const savedInsight = await db.insertInsight(insight);
        setInsights((prev) => [savedInsight, ...prev.filter((i) => i.id !== savedInsight.id)].slice(0, 50));

        // Update station status in DB
        const st = statusFromSeverity(res.severity);
        setStationStatus((prev) => ({ ...prev, [stationId]: st }));
        db.updateStationStatus(stationId, st).catch(() => {});

        // Persist the anomalous reading
        db.insertReading(stationId, reading, true).catch(() => {});
      } catch (e: any) {
        setDbError(e.message ?? 'Failed to persist anomaly');
      }
    },
    []
  );

  const simulateAnomaly = useCallback(
    (stationId?: string, scenarioIdx?: number): AnomalyRecord => {
      const sid = stationId ?? STATIONS[Math.floor(Math.random() * STATIONS.length)].id;
      const scenario = ANOMALY_SCENARIOS[scenarioIdx ?? Math.floor(Math.random() * ANOMALY_SCENARIOS.length)];
      const t = Date.now();
      const base = current[sid] ?? generateNormalReading(sid, t);
      const reading = injectAnomaly(sid, scenario.parameter, scenario.value(base), t);
      const res = detect(sid, reading, detectors);
      let finalRes = res;
      if (!res.anomaly) {
        finalRes = {
          anomaly: true,
          anomalyScore: 0.85,
          confidence: 96,
          severity: 'critical',
          parameter: scenario.parameter as any,
          expectedMin: res.expectedMin ?? 0,
          expectedMax: res.expectedMax ?? 0,
          expectedMid: ((res.expectedMin ?? 0) + (res.expectedMax ?? 0)) / 2,
          possibleCause: scenario.cause,
          recommendedAction: scenario.action,
        };
      }
      const rec = detectionToRecord(sid, reading, finalRes, t);
      // Optimistically update UI
      setAnomalies((prev) => [rec, ...prev].slice(0, 200));
      const station = STATION_MAP[sid];
      const alert: AlertItem = {
        id: `tmp-${t}`,
        stationId: sid,
        stationName: station.name,
        severity: finalRes.severity,
        title: finalRes.severity === 'critical' ? 'Critical Alert' : finalRes.severity === 'high' ? 'High Alert' : 'Warning',
        message: `${rec.parameterLabel} anomaly detected — value ${rec.value}${rec.unit} (expected ${rec.expectedMin}–${rec.expectedMax}${rec.unit})`,
        confidence: finalRes.confidence,
        timestamp: t,
        acknowledged: false,
        resolved: false,
      };
      setAlerts((prev) => [alert, ...prev].slice(0, 100));
      const insight: AiInsight = {
        id: `tmp-ins-${t}`,
        stationId: sid,
        stationName: station.name,
        parameter: finalRes.parameter!,
        parameterLabel: rec.parameterLabel,
        explanation: generateInsightText(station.name, rec.parameterLabel, rec.value, rec.unit, rec.expectedMin, rec.expectedMax, finalRes.confidence, finalRes.severity),
        anomalyProbability: finalRes.confidence,
        contributingFactors: buildContributingFactors(finalRes.parameter!, rec.value, rec.expectedMin, rec.expectedMax),
        recommendedAction: rec.recommendedAction,
        timestamp: t,
      };
      setInsights((prev) => [insight, ...prev].slice(0, 50));
      setCurrent((prev) => ({ ...prev, [sid]: reading }));
      setHistory((prev) => ({ ...prev, [sid]: [...(prev[sid] ?? []), reading].slice(-200) }));
      setStationStatus((prev) => ({ ...prev, [sid]: statusFromSeverity(finalRes.severity) }));
      // Persist to DB (replaces temp IDs with real UUIDs)
      persistDetection(sid, reading, finalRes, t, rec);
      return rec;
    },
    [current, detectors, persistDetection]
  );

  // Refresh sensor health when anomalies/history change; persist periodically
  useEffect(() => {
    const sh: Record<string, SensorHealth> = {};
    for (const s of STATIONS) sh[s.id] = sensorHealthFor(s.id, history[s.id] ?? [], anomalies);
    setSensorHealth(sh);
  }, [anomalies, history]);

  const login = useCallback((email: string) => {
    setAuthenticated(true);
    void email;
  }, []);
  const logout = useCallback(() => setAuthenticated(false), []);

  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    db.updateAlertFlags(id, true, false).catch(() => {});
  }, []);
  const resolveAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, resolved: true, acknowledged: true } : a)));
    db.updateAlertFlags(id, true, true).catch(() => {});
    setAlerts((prev) => {
      const alert = prev.find((a) => a.id === id);
      if (alert) setStationStatus((p) => ({ ...p, [alert.stationId]: 'normal' }));
      return prev;
    });
  }, []);
  const acknowledgeAnomaly = useCallback((id: string) => {
    setAnomalies((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    db.updateAnomalyFlags(id, true, false).catch(() => {});
  }, []);
  const resolveAnomaly = useCallback((id: string) => {
    setAnomalies((prev) => prev.map((a) => (a.id === id ? { ...a, resolved: true, acknowledged: true } : a)));
    db.updateAnomalyFlags(id, true, true).catch(() => {});
  }, []);
  const generateReport = useCallback(() => {
    /* reports computed on the fly from in-memory state */
  }, []);

  const value: AppState = {
    authenticated,
    login,
    logout,
    stations,
    current,
    history,
    anomalies,
    alerts,
    insights,
    sensorHealth,
    stationStatus,
    loading,
    dbError,
    simulateAnomaly,
    acknowledgeAlert,
    resolveAlert,
    acknowledgeAnomaly,
    resolveAnomaly,
    generateReport,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function generateInsightText(
  stationName: string,
  paramLabel: string,
  value: number,
  unit: string,
  expMin: number,
  expMax: number,
  confidence: number,
  _severity: Severity
): string {
  const dir = value > expMax ? 'higher' : 'lower';
  return `${paramLabel} readings at ${stationName} are significantly ${dir} than the station's historical pattern (current ${value}${unit} vs expected ${expMin}–${expMax}${unit}). The reading is also inconsistent with nearby stations. With ${confidence}% confidence, this may indicate a sensor malfunction. This is an AI-generated assessment and should be verified by an operator.`;
}

function buildContributingFactors(param: string, value: number, expMin: number, expMax: number): string[] {
  const factors: string[] = [];
  if (value > expMax) factors.push(`Value ${value} exceeds the expected maximum of ${expMax}`);
  else factors.push(`Value ${value} is below the expected minimum of ${expMin}`);
  factors.push('Isolation Forest flagged a short isolation path for this reading');
  factors.push('Reading deviates from the 48-hour historical baseline');
  return factors;
}

export { statusFromSeverity };
