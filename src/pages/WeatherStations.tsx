import { useState, useMemo } from 'react';
import { useApp } from '@/store';
import { SectionHeader, SeverityBadge, StatusDot, DemoBadge } from '@/components/ui';
import { severityColors, timeAgo, fmtDateTime } from '@/lib/ui';
import { PARAMS } from '@/data/stations';
import { paramIconByKey } from '@/lib/icons';
import { Activity, X, MapPin, Radio, Calendar } from 'lucide-react';
import type { Station } from '@/types';

export function WeatherStations() {
  const { stations, current, stationStatus, anomalies, sensorHealth } = useApp();
  const [selected, setSelected] = useState<Station | null>(null);

  // Project lat/lng into a viewBox. Use bounding box of stations + padding.
  const { width, height, project } = useMemo(() => {
    const lats = stations.map((s) => s.lat);
    const lngs = stations.map((s) => s.lng);
    const minLat = Math.min(...lats) - 0.2;
    const maxLat = Math.max(...lats) + 0.2;
    const minLng = Math.min(...lngs) - 0.2;
    const maxLng = Math.max(...lngs) + 0.2;
    const w = 800;
    const h = 500;
    const project = (lat: number, lng: number): [number, number] => {
      const x = ((lng - minLng) / (maxLng - minLng)) * w;
      const y = h - ((lat - minLat) / (maxLat - minLat)) * h;
      return [x, y];
    };
    return { width: w, height: h, project };
  }, [stations]);

  const statusColor = (st: 'normal' | 'warning' | 'anomaly') =>
    st === 'anomaly' ? '#ef4444' : st === 'warning' ? '#f59e0b' : '#10b981';

  const stationAnomaly = (id: string) => anomalies.find((a) => a.stationId === id && !a.resolved);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Weather Stations"
        subtitle="Interactive map of Automatic Weather Stations. Green = normal, yellow = warning, red = anomaly."
        actions={<DemoBadge />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 card p-2 overflow-hidden">
          <div className="relative w-full" style={{ aspectRatio: '8 / 5' }}>
            <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
              <defs>
                <radialGradient id="bg-grad" cx="50%" cy="40%" r="70%">
                  <stop offset="0%" stopColor="#dbeafe" />
                  <stop offset="100%" stopColor="#eef6ff" />
                </radialGradient>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#cfe3f7" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width={width} height={height} fill="url(#bg-grad)" />
              <rect width={width} height={height} fill="url(#grid)" />

              {/* decorative region shape */}
              <path
                d={`M 60,${height - 60} Q ${width * 0.3},${height * 0.7} ${width * 0.45},${height * 0.5} T ${width - 80},${60} L ${width - 40},${height - 40} Z`}
                fill="#bfdbfe"
                fillOpacity={0.25}
                stroke="#93c5fd"
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
              <text x={width / 2} y={36} textAnchor="middle" className="fill-navy-700" style={{ fontSize: 18, fontWeight: 700 }}>
                Andhra Pradesh — AWS Network
              </text>

              {/* connection lines */}
              {stations.map((s, i) => {
                if (i === 0) return null;
                const [x1, y1] = project(stations[i - 1].lat, stations[i - 1].lng);
                const [x2, y2] = project(s.lat, s.lng);
                return <line key={`l-${s.id}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#93c5fd" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />;
              })}

              {/* station markers */}
              {stations.map((s) => {
                const [x, y] = project(s.lat, s.lng);
                const st = stationStatus[s.id] ?? 'normal';
                const color = statusColor(st);
                const r = st === 'anomaly' ? 11 : 9;
                return (
                  <g key={s.id} className="cursor-pointer" onClick={() => setSelected(s)}>
                    {st !== 'normal' && (
                      <circle cx={x} cy={y} r={r + 6} fill={color} opacity={0.25}>
                        <animate attributeName="r" values={`${r + 4};${r + 14};${r + 4}`} dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.35;0;0.35" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle cx={x} cy={y} r={r + 3} fill="white" stroke={color} strokeWidth={2} opacity={0.9} />
                    <circle cx={x} cy={y} r={r} fill={color} stroke="white" strokeWidth={2} />
                    <text x={x} y={y - r - 8} textAnchor="middle" className="fill-navy-800" style={{ fontSize: 12, fontWeight: 600 }}>
                      {s.name}
                    </text>
                  </g>
                );
              })}
            </svg>
            {/* Legend */}
            <div className="absolute bottom-3 left-3 card px-3 py-2 flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Normal</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Warning</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Anomaly</span>
            </div>
          </div>
        </div>

        {/* Station list */}
        <div className="card p-4">
          <h2 className="font-semibold text-navy-900 mb-3">All Stations</h2>
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {stations.map((s) => {
              const st = stationStatus[s.id] ?? 'normal';
              const r = current[s.id];
              const anom = stationAnomaly(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className="w-full text-left rounded-xl border border-slate-100 p-3 hover:border-blue-300 hover:bg-blue-50/40 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusDot status={st} />
                      <span className="text-sm font-semibold text-slate-800">{s.name}</span>
                    </div>
                    <SeverityBadge severity={st === 'anomaly' ? 'critical' : st === 'warning' ? 'warning' : 'normal'} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.region}</span>
                    {r && <span className="flex items-center gap-1"><Radio className="h-3 w-3" /> {r.temperature.toFixed(1)}°C</span>}
                    {anom && <span className="flex items-center gap-1 text-red-600"><Activity className="h-3 w-3" /> {anom.parameterLabel}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sensor health table */}
      <div className="card p-5">
        <h2 className="font-semibold text-navy-900 mb-4">Sensor Health Overview</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <th className="pb-2 font-semibold">Station</th>
                {PARAMS.map((p) => (
                  <th key={p.key} className="pb-2 font-semibold text-center">{p.label}</th>
                ))}
                <th className="pb-2 font-semibold text-center">Overall</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((s) => {
                const h = sensorHealth[s.id];
                const vals = h ? [h.temperature, h.humidity, h.pressure, h.rainfall, h.windSpeed] : [];
                const overall = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
                return (
                  <tr key={s.id} className="border-b border-slate-50">
                    <td className="py-2.5 font-medium text-slate-800">{s.name}</td>
                    {PARAMS.map((p) => {
                      const v = h ? (h as any)[p.key] as number : 0;
                      const c = v >= 80 ? 'text-emerald-600' : v >= 50 ? 'text-amber-600' : 'text-red-600';
                      return (
                        <td key={p.key} className="py-2.5 text-center">
                          <span className={`font-semibold tabular-nums ${c}`}>{v}%</span>
                        </td>
                      );
                    })}
                    <td className="py-2.5 text-center">
                      <span className={`font-bold tabular-nums ${overall >= 80 ? 'text-emerald-600' : overall >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{overall}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <StationDrawer
          station={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function StationDrawer({ station, onClose }: { station: Station; onClose: () => void }) {
  const { current, stationStatus, anomalies, sensorHealth } = useApp();
  const reading = current[station.id];
  const st = stationStatus[station.id] ?? 'normal';
  const anom = anomalies.find((a) => a.stationId === station.id && !a.resolved);
  const health = sensorHealth[station.id];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl animate-fade-in">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-navy-900 text-lg">{station.name}</h3>
            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <MapPin className="h-3 w-3" /> {station.region} · {station.lat.toFixed(4)}, {station.lng.toFixed(4)}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X className="h-5 w-5 text-slate-500" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3">
            <SeverityBadge severity={st === 'anomaly' ? 'critical' : st === 'warning' ? 'warning' : 'normal'} size="md" />
            <span className="text-xs text-slate-400">Installed {new Date(station.installedAt).toLocaleDateString()}</span>
          </div>

          {anom && (
            <div className={`rounded-xl ${severityColors[anom.severity].bg} border ${severityColors[anom.severity].ring} ring-1 p-4`}>
              <div className="flex items-center gap-2 mb-1">
                <Activity className={`h-4 w-4 ${severityColors[anom.severity].text}`} />
                <span className={`text-xs font-bold uppercase ${severityColors[anom.severity].text}`}>Active Anomaly — {anom.parameterLabel}</span>
              </div>
              <div className="text-sm text-slate-700">Value <span className="font-bold">{anom.value}{anom.unit}</span> · expected {anom.expectedMin}–{anom.expectedMax}{anom.unit}</div>
              <div className="text-xs text-slate-500 mt-1">Confidence {anom.confidence}% · {fmtDateTime(anom.timestamp)}</div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Current Readings</h4>
            <div className="grid grid-cols-2 gap-3">
              {PARAMS.map((p) => {
                const Icon = paramIconByKey(p.key);
                const val = reading ? (reading[p.key] as number) : null;
                return (
                  <div key={p.key} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Icon className="h-4 w-4" />
                      <span className="text-xs">{p.label}</span>
                    </div>
                    <div className="text-lg font-bold text-navy-900 mt-1 tabular-nums">
                      {val !== null ? val.toFixed(p.decimals) : '—'}<span className="text-xs text-slate-400 ml-1">{p.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {reading && <div className="text-xs text-slate-400 mt-2">Last update {timeAgo(reading.timestamp)}</div>}
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Station Health</h4>
            <div className="space-y-2">
              {PARAMS.map((p) => {
                const v = health ? (health as any)[p.key] as number : 0;
                const c = v >= 80 ? 'bg-emerald-500' : v >= 50 ? 'bg-amber-500' : 'bg-red-500';
                return (
                  <div key={p.key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600">{p.label}</span>
                      <span className="font-semibold text-slate-700">{v}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full ${c}`} style={{ width: `${v}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Last calibration: {new Date(Date.now() - 86400000 * 14).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
