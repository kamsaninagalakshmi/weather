import { useMemo } from 'react';
import {
  Satellite, Activity, AlertTriangle, BellRing, HeartPulse,
  Radio, ArrowRight, MapPin,
} from 'lucide-react';
import { useApp } from '@/store';
import type { Page } from '@/App';
import { KpiCard, SectionHeader, SeverityBadge, StatusDot, DemoBadge, AiBadge } from '@/components/ui';
import { severityColors, timeAgo, fmtTime } from '@/lib/ui';
import { PARAM_MAP } from '@/data/stations';
import { paramIconByKey } from '@/lib/icons';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceArea, CartesianGrid, Legend,
} from 'recharts';
import type { WeatherParam } from '@/types';

export function Dashboard({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { stations, current, anomalies, alerts, stationStatus, simulateAnomaly } = useApp();

  const activeStations = stations.filter((s) => s.active).length;
  const anomaliesCount = anomalies.filter((a) => !a.resolved).length;
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical' && !a.resolved).length;
  const sensorsAtRisk = useMemo(() => {
    // count station/param combos with an unresolved anomaly
    const set = new Set<string>();
    for (const a of anomalies) if (!a.resolved) set.add(`${a.stationId}:${a.parameter}`);
    return set.size;
  }, [anomalies]);

  // aggregate latest values across stations for a small sparkline
  const tempTrend = useMemo(() => {
    const series = Object.values(current).map((r, i) => ({ i, temp: r?.temperature ?? 0 }));
    return series;
  }, [current]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Operations Dashboard"
        subtitle="Real-time overview of weather stations, anomalies, and alerts."
        actions={
          <>
            <DemoBadge />
            <button onClick={() => simulateAnomaly()} className="btn-danger">
              <AlertTriangle className="h-4 w-4" /> Simulate Anomaly
            </button>
          </>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Total Weather Stations" value={stations.length} icon={Satellite} tint="bg-blue-50 text-blue-600" sub="Andhra Pradesh region" />
        <KpiCard label="Active Stations" value={activeStations} icon={Radio} tint="bg-emerald-50 text-emerald-600" trend={0} sub="Online & reporting" />
        <KpiCard label="Anomalies Detected" value={anomaliesCount} icon={Activity} tint="bg-orange-50 text-orange-600" trend={anomaliesCount > 0 ? 12 : 0} sub="Unresolved events" />
        <KpiCard label="Critical Alerts" value={criticalAlerts} icon={BellRing} tint="bg-red-50 text-red-600" sub="Require immediate action" />
        <KpiCard label="Sensors at Risk" value={sensorsAtRisk} icon={HeartPulse} tint="bg-amber-50 text-amber-600" sub="Flagged by ML model" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Station status list */}
        <div className="xl:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-navy-900">Station Status</h2>
            <button onClick={() => onNavigate('stations')} className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
              View map <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                  <th className="pb-2 font-semibold">Station</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold text-right">Temp</th>
                  <th className="pb-2 font-semibold text-right">Humidity</th>
                  <th className="pb-2 font-semibold text-right">Wind</th>
                  <th className="pb-2 font-semibold text-right">Last update</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((s) => {
                  const r = current[s.id];
                  const st = stationStatus[s.id] ?? 'normal';
                  return (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <StatusDot status={st} />
                          <span className="font-medium text-slate-800">{s.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <span className={`badge ${severityColors[st === 'anomaly' ? 'critical' : st === 'warning' ? 'warning' : 'normal'].bg} ${severityColors[st === 'anomaly' ? 'critical' : st === 'warning' ? 'warning' : 'normal'].text}`}>
                          {st === 'normal' ? 'Normal' : st === 'warning' ? 'Warning' : 'Anomaly'}
                        </span>
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-slate-700">{r ? `${r.temperature.toFixed(1)}°` : '—'}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-700">{r ? `${r.humidity}%` : '—'}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-700">{r ? `${r.windSpeed.toFixed(0)} km/h` : '—'}</td>
                      <td className="py-2.5 text-right text-xs text-slate-400">{r ? timeAgo(r.timestamp) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live alerts */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-navy-900">Live Alerts</h2>
            <button onClick={() => onNavigate('alerts')} className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
              All alerts <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {alerts.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-400">
              <BellRing className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              No active alerts. System is nominal.
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {alerts.slice(0, 6).map((a) => {
                const c = severityColors[a.severity];
                return (
                  <div key={a.id} className={`rounded-xl ${c.bg} border ${c.ring} ring-1 p-3.5`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                      <span className={`text-xs font-bold uppercase tracking-wide ${c.text}`}>{a.title}</span>
                      <span className="ml-auto text-[10px] text-slate-500">{timeAgo(a.timestamp)}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800">{a.stationName}</div>
                    <div className="text-xs text-slate-600 mt-0.5 leading-snug">{a.message}</div>
                    <div className="text-[11px] text-slate-500 mt-1">Confidence: <span className="font-semibold">{a.confidence}%</span></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent anomalies + temperature trend */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-navy-900">Recent Anomalies (AI Detected)</h2>
            <button onClick={() => onNavigate('anomaly')} className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
              Detection center <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {anomalies.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-400">
              <Activity className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              No anomalies detected yet. Use “Simulate Anomaly” to test the pipeline.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {anomalies.slice(0, 8).map((a) => {
                const Icon = paramIconByKey(a.parameter);
                const c = severityColors[a.severity];
                return (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50/60 transition">
                    <div className={`h-10 w-10 rounded-lg grid place-items-center ${c.bg} ${c.text}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800 truncate">{a.stationName}</span>
                        <SeverityBadge severity={a.severity} />
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {a.parameterLabel}: <span className="font-semibold text-slate-700">{a.value}{a.unit}</span> · expected {a.expectedMin}–{a.expectedMax}{a.unit}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-navy-900">{a.confidence}%</div>
                      <div className="text-[10px] text-slate-400">{fmtTime(a.timestamp)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-navy-900">Temperature Across Stations</h2>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tempTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="i" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} domain={[20, 40]} unit="°" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={(v: any) => [`${Number(v).toFixed(1)} °C`, 'Temperature']}
                  labelFormatter={() => 'Station'}
                />
                <ReferenceArea y1={24} y2={38} fill="#10b981" fillOpacity={0.06} />
                <Line type="monotone" dataKey="temp" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: '#2563eb' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-2">
            <span className="inline-block h-2 w-3 rounded-sm bg-emerald-400/40" /> Expected range 24–38 °C
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickLink icon={MapPin} label="Weather Stations" desc="Interactive map" onClick={() => onNavigate('stations')} />
        <QuickLink icon={Activity} label="Anomaly Detection" desc="ML pipeline & graph" onClick={() => onNavigate('anomaly')} />
        <QuickLink icon={HeartPulse} label="Sensor Health" desc="Per-sensor diagnostics" onClick={() => onNavigate('stations')} />
        <QuickLink icon={Radio} label="Live Monitoring" desc="Real-time readings" onClick={() => onNavigate('live')} />
      </div>
    </div>
  );
}

function QuickLink({ icon: Icon, label, desc, onClick }: { icon: typeof MapPin; label: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card card-hover p-4 text-left flex items-center gap-3 group">
      <div className="h-10 w-10 rounded-xl bg-navy-50 text-navy-700 grid place-items-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm font-semibold text-navy-900">{label}</div>
        <div className="text-xs text-slate-500">{desc}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-300 ml-auto group-hover:text-blue-600 transition" />
    </button>
  );
}

void AiBadge;
void PARAM_MAP;
void Legend;
