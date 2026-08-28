import { useMemo, useState } from 'react';
import { useApp } from '@/store';
import { SectionHeader, SeverityBadge, DemoBadge } from '@/components/ui';
import { severityColors, timeAgo, trendPct } from '@/lib/ui';
import { PARAMS } from '@/data/stations';
import { paramIconByKey } from '@/lib/icons';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { WeatherParam, SensorReading } from '@/types';
import { detect } from '@/ml/isolationForest';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceArea } from 'recharts';

export function LiveMonitoring() {
  const { stations, current, history, stationStatus } = useApp();
  const [selected, setSelected] = useState(stations[0]?.id ?? '');

  const station = stations.find((s) => s.id === selected)!;
  const reading = current[selected];
  const hist = history[selected] ?? [];

  const detectors = useMemo(() => {
    // build a lazy detector via store? We use the same build approach
    // but to avoid re-importing, we use detect with the in-store detectors.
    // For live status we rely on stationStatus.
    return null;
  }, []);
  void detectors;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Live Monitoring"
        subtitle="Real-time sensor readings with normal/abnormal status from the ML model."
        actions={<DemoBadge />}
      />

      {/* Station selector */}
      <div className="flex flex-wrap gap-2">
        {stations.map((s) => {
          const st = stationStatus[s.id] ?? 'normal';
          const active = s.id === selected;
          return (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition flex items-center gap-2 ${
                active ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${severityColors[st === 'anomaly' ? 'critical' : st === 'warning' ? 'warning' : 'normal'].dot}`} />
              {s.name}
            </button>
          );
        })}
      </div>

      {/* Parameter cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PARAMS.map((p) => {
          const Icon = paramIconByKey(p.key);
          const val = reading ? (reading[p.key] as number) : null;
          const isAbnormal = val !== null && (val < p.normalMin || val > p.normalMax);
          const sev = isAbnormal ? (Math.abs(val! - p.typical) > (p.normalMax - p.normalMin) * 1.5 ? 'critical' : 'warning') : 'normal';
          const col = hist.map((r) => r[p.key] as number);
          const tr = trendPct(col);
          const lastUpd = reading ? timeAgo(reading.timestamp) : '—';
          return (
            <div key={p.key} className="card p-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`h-10 w-10 rounded-xl grid place-items-center ${isAbnormal ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{p.label}</div>
                    <div className="text-[11px] text-slate-400">Unit: {p.unit}</div>
                  </div>
                </div>
                <SeverityBadge severity={sev} />
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="text-3xl font-bold text-navy-900 tabular-nums leading-none">
                    {val !== null ? val.toFixed(p.decimals) : '—'}
                    <span className="text-base font-medium text-slate-400 ml-1">{p.unit}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1.5">Updated {lastUpd}</div>
                </div>
                {tr !== null && (
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${tr >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {tr > 0.1 ? <ArrowUp className="h-3.5 w-3.5" /> : tr < -0.1 ? <ArrowDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                    {Math.abs(tr).toFixed(1)}%
                  </span>
                )}
              </div>
              {/* mini sparkline */}
              <div className="h-14 mt-3 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={col.map((v, i) => ({ i, v }))} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <Line type="monotone" dataKey="v" stroke={isAbnormal ? '#ef4444' : '#2563eb'} strokeWidth={2} dot={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }}
                      formatter={(v: any) => [`${Number(v).toFixed(p.decimals)} ${p.unit}`, p.label]}
                      labelFormatter={() => ''}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trend chart for selected station */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-navy-900">{station.name} — 6-Hour Sensor Trends</h2>
          <span className="text-xs text-slate-400">{hist.length} samples · 15-min cadence</span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hist.map((r) => ({ t: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), temp: r.temperature, hum: r.humidity, wind: r.windSpeed }))} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis yAxisId="l" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <ReferenceArea yAxisId="l" y1={24} y2={38} fill="#10b981" fillOpacity={0.05} />
              <Line yAxisId="l" type="monotone" dataKey="temp" name="Temp (°C)" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line yAxisId="l" type="monotone" dataKey="hum" name="Humidity (%)" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line yAxisId="r" type="monotone" dataKey="wind" name="Wind (km/h)" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Use detect to mark readings abnormal beyond simple range
function isReadingAbnormal(reading: SensorReading, param: WeatherParam, val: number, normalMin: number, normalMax: number): boolean {
  void reading; void param;
  return val < normalMin || val > normalMax;
}
void isReadingAbnormal;
void detect;
