import { useState, useMemo } from 'react';
import { useApp } from '@/store';
import { SectionHeader, DemoBadge } from '@/components/ui';
import { STATIONS, PARAM_MAP } from '@/data/stations';
import type { WeatherParam } from '@/types';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceArea, BarChart, Bar,
} from 'recharts';
import { Calendar } from 'lucide-react';

const RANGES = [
  { id: 'today', label: 'Today', hours: 6 },
  { id: '7d', label: 'Last 7 days', hours: 168 },
  { id: '30d', label: 'Last 30 days', hours: 720 },
] as const;

export function HistoricalAnalysis() {
  const { history, anomalies } = useApp();
  const [stationId, setStationId] = useState(STATIONS[0].id);
  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('7d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const hist = useMemo(() => {
    const all = history[stationId] ?? [];
    const now = Date.now();
    let cutoff = 0;
    if (range === 'today') cutoff = now - 6 * 3.6e6;
    else if (range === '7d') cutoff = now - 7 * 864e5;
    else cutoff = now - 30 * 864e5;
    if (from) cutoff = Math.max(cutoff, new Date(from).getTime());
    let end = now;
    if (to) end = new Date(to).getTime();
    return all.filter((r) => r.timestamp >= cutoff && r.timestamp <= end);
  }, [history, stationId, range, from, to]);

  const stationAnoms = anomalies.filter((a) => a.stationId === stationId);
  const rangeHours = RANGES.find((r) => r.id === range)?.hours ?? 168;

  const series = (param: WeatherParam) =>
    hist.map((r) => ({
      t: new Date(r.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      v: r[param] as number,
    }));

  return (
    <div className="space-y-6">
      <SectionHeader title="Historical Analysis" subtitle="Trends and anomaly counts across stations and sensors over time." actions={<DemoBadge />} />

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Station</label>
          <select className="input py-2 w-auto" value={stationId} onChange={(e) => setStationId(e.target.value)}>
            {STATIONS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${range === r.id ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="h-4 w-4" /> Custom:
          <input type="date" className="input py-1.5 text-xs w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span>to</span>
          <input type="date" className="input py-1.5 text-xs w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {/* Trend charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(['temperature', 'humidity', 'pressure', 'windSpeed'] as WeatherParam[]).map((p) => {
          const meta = PARAM_MAP[p];
          const data = series(p);
          return (
            <div key={p} className="card p-5">
              <h3 className="font-semibold text-navy-900 mb-3">{meta.label} Trend</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={50} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} unit={meta.unit} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v: any) => [`${Number(v).toFixed(meta.decimals)} ${meta.unit}`, meta.label]} />
                    <ReferenceArea y1={meta.normalMin} y2={meta.normalMax} fill="#10b981" fillOpacity={0.07} />
                    <Line type="monotone" dataKey="v" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {/* Anomaly count by parameter */}
      <div className="card p-5">
        <h3 className="font-semibold text-navy-900 mb-3">Anomalies by Parameter — {STATIONS.find((s) => s.id === stationId)?.name}</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={Object.keys(PARAM_MAP).map((k) => ({ name: PARAM_MAP[k as WeatherParam].label, count: stationAnoms.filter((a) => a.parameter === k).length }))}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4 text-sm text-slate-500 flex items-center justify-between">
        <span>Showing {hist.length} samples over the last {rangeHours >= 24 ? `${Math.round(rangeHours / 24)} day(s)` : `${rangeHours}h`}</span>
        <span className="font-semibold text-navy-900">{stationAnoms.length} anomalies recorded for this station</span>
      </div>
    </div>
  );
}
