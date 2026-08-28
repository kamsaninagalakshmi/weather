import { useState } from 'react';
import { Bell, CheckCircle2, X, AlertOctagon } from 'lucide-react';
import { useApp } from '@/store';
import { SectionHeader, SeverityBadge, DemoBadge } from '@/components/ui';
import { severityColors, timeAgo, fmtDateTime, severityOrder } from '@/lib/ui';
import type { Severity } from '@/types';

const FILTERS: Array<{ id: 'all' | Severity | 'unresolved'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unresolved', label: 'Unresolved' },
  { id: 'critical', label: 'Critical' },
  { id: 'high', label: 'High' },
  { id: 'warning', label: 'Warning' },
];

export function Alerts() {
  const { alerts, acknowledgeAlert, resolveAlert } = useApp();
  const [filter, setFilter] = useState<'all' | Severity | 'unresolved'>('all');

  const filtered = alerts
    .filter((a) => {
      if (filter === 'all') return true;
      if (filter === 'unresolved') return !a.resolved;
      return a.severity === filter;
    })
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || b.timestamp - a.timestamp);

  const counts = {
    critical: alerts.filter((a) => a.severity === 'critical' && !a.resolved).length,
    high: alerts.filter((a) => a.severity === 'high' && !a.resolved).length,
    warning: alerts.filter((a) => a.severity === 'warning' && !a.resolved).length,
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Alerts"
        subtitle="Real-time anomaly alerts with severity, confidence, and operator actions."
        actions={<DemoBadge />}
      />

      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Critical" value={counts.critical} color="bg-red-50 text-red-600" icon={AlertOctagon} />
        <SummaryCard label="High" value={counts.high} color="bg-orange-50 text-orange-600" icon={Bell} />
        <SummaryCard label="Warning" value={counts.warning} color="bg-amber-50 text-amber-600" icon={Bell} />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f.id ? 'bg-navy-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-400" />
          <h3 className="font-semibold text-navy-900">No alerts in this view</h3>
          <p className="text-sm text-slate-500 mt-1">System is operating normally. Run “Simulate Anomaly” to generate alerts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const c = severityColors[a.severity];
            return (
              <div key={a.id} className={`card p-4 ${a.resolved ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${c.bg} ${c.text}`}>
                    <AlertOctagon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-bold ${c.text}`}>{a.title}</span>
                      <SeverityBadge severity={a.severity} />
                      {a.acknowledged && <span className="badge bg-slate-100 text-slate-500">Acknowledged</span>}
                      {a.resolved && <span className="badge bg-emerald-50 text-emerald-600">Resolved</span>}
                      <span className="ml-auto text-xs text-slate-400">{timeAgo(a.timestamp)}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 mt-1">{a.stationName}</div>
                    <div className="text-sm text-slate-600 mt-0.5">{a.message}</div>
                    <div className="text-xs text-slate-500 mt-1">Confidence: <span className="font-semibold">{a.confidence}%</span> · {fmtDateTime(a.timestamp)}</div>
                  </div>
                </div>
                {!a.resolved && (
                  <div className="flex items-center gap-2 mt-3 ml-13">
                    <button onClick={() => acknowledgeAlert(a.id)} className="btn-ghost py-1.5 px-3 text-xs" disabled={a.acknowledged}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> {a.acknowledged ? 'Acknowledged' : 'Acknowledge'}
                    </button>
                    <button onClick={() => resolveAlert(a.id)} className="btn-accent py-1.5 px-3 text-xs">
                      <X className="h-3.5 w-3.5" /> Resolve
                    </button>
                    <span className="ml-auto text-xs text-slate-400">View Details</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: typeof Bell }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl grid place-items-center ${color}`}><Icon className="h-5 w-5" /></div>
      <div>
        <div className="text-2xl font-bold text-navy-900 tabular-nums">{value}</div>
        <div className="text-xs text-slate-500">{label} alerts active</div>
      </div>
    </div>
  );
}
