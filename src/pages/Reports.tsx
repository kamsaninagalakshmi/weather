import { useMemo } from 'react';
import { useApp } from '@/store';
import { SectionHeader, DemoBadge } from '@/components/ui';
import { PARAM_MAP, STATIONS } from '@/data/stations';
import { FileText, Download, BarChart3, AlertOctagon, MapPin, Activity, Percent, HeartPulse, FileDown } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

export function Reports() {
  const { anomalies, alerts, stations, sensorHealth } = useApp();

  const stats = useMemo(() => {
    const total = anomalies.length;
    const critical = anomalies.filter((a) => a.severity === 'critical').length;
    const byStation: Record<string, number> = {};
    const byParam: Record<string, number> = {};
    for (const a of anomalies) {
      byStation[a.stationId] = (byStation[a.stationId] ?? 0) + 1;
      byParam[a.parameter] = (byParam[a.parameter] ?? 0) + 1;
    }
    const mostAffectedStation = Object.entries(byStation).sort((a, b) => b[1] - a[1])[0];
    const mostAffectedSensor = Object.entries(byParam).sort((a, b) => b[1] - a[1])[0];
    const avgConfidence = total ? Math.round(anomalies.reduce((acc, a) => acc + a.confidence, 0) / total) : 0;
    // sensor failure risk: average health across stations per param
    const riskByParam: Record<string, number> = {};
    for (const p of Object.keys(PARAM_MAP)) {
      const vals = stations.map((s) => (sensorHealth[s.id] as any)?.[p] ?? 100);
      riskByParam[p] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    }
    const lowestHealthParam = Object.entries(riskByParam).sort((a, b) => a[1] - b[1])[0];
    return { total, critical, mostAffectedStation, mostAffectedSensor, avgConfidence, byStation, byParam, riskByParam, lowestHealthParam };
  }, [anomalies, stations, sensorHealth]);

  const stationData = stations.map((s) => ({ name: s.name.split(' ')[0], anomalies: stats.byStation[s.id] ?? 0 }));
  const paramData = Object.keys(PARAM_MAP).map((k) => ({ name: PARAM_MAP[k as keyof typeof PARAM_MAP].label, count: stats.byParam[k] ?? 0 }));
  const severityData = [
    { name: 'Critical', value: anomalies.filter((a) => a.severity === 'critical').length, color: '#ef4444' },
    { name: 'High', value: anomalies.filter((a) => a.severity === 'high').length, color: '#f97316' },
    { name: 'Warning', value: anomalies.filter((a) => a.severity === 'warning').length, color: '#f59e0b' },
  ].filter((d) => d.value > 0);

  const downloadReport = () => {
    const lines = [
      'AWS Anomaly Detection Platform — Report',
      'Generated: ' + new Date().toLocaleString(),
      'NOTE: Demo data — not real government weather data.',
      '',
      `Total anomalies: ${stats.total}`,
      `Critical anomalies: ${stats.critical}`,
      `Most affected station: ${stats.mostAffectedStation ? STATIONS.find((s) => s.id === stats.mostAffectedStation![0])?.name : 'N/A'}`,
      `Most affected sensor: ${stats.mostAffectedSensor ? PARAM_MAP[stats.mostAffectedSensor[0] as keyof typeof PARAM_MAP].label : 'N/A'}`,
      `Average anomaly confidence: ${stats.avgConfidence}%`,
      `Lowest sensor health: ${stats.lowestHealthParam ? PARAM_MAP[stats.lowestHealthParam[0] as keyof typeof PARAM_MAP].label + ' (' + stats.lowestHealthParam[1] + '%)' : 'N/A'}`,
      '',
      'Anomalies by station:',
      ...stations.map((s) => `  ${s.name}: ${stats.byStation[s.id] ?? 0}`),
      '',
      'Anomalies by parameter:',
      ...Object.keys(PARAM_MAP).map((k) => `  ${PARAM_MAP[k as keyof typeof PARAM_MAP].label}: ${stats.byParam[k] ?? 0}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aws-anomaly-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Reports"
        subtitle="Aggregated anomaly statistics and sensor risk assessment."
        actions={
          <>
            <DemoBadge />
            <button onClick={downloadReport} className="btn-accent"><Download className="h-4 w-4" /> Download Report</button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Activity} label="Total Anomalies" value={stats.total} color="bg-blue-50 text-blue-600" />
        <StatCard icon={AlertOctagon} label="Critical Anomalies" value={stats.critical} color="bg-red-50 text-red-600" />
        <StatCard icon={MapPin} label="Most Affected Station" value={stats.mostAffectedStation ? STATIONS.find((s) => s.id === stats.mostAffectedStation[0])?.name ?? '—' : '—'} color="bg-navy-50 text-navy-700" small />
        <StatCard icon={BarChart3} label="Most Affected Sensor" value={stats.mostAffectedSensor ? PARAM_MAP[stats.mostAffectedSensor[0] as keyof typeof PARAM_MAP].label : '—'} color="bg-orange-50 text-orange-600" small />
        <StatCard icon={Percent} label="Avg Anomaly Confidence" value={`${stats.avgConfidence}%`} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={HeartPulse} label="Lowest Sensor Health" value={stats.lowestHealthParam ? `${PARAM_MAP[stats.lowestHealthParam[0] as keyof typeof PARAM_MAP].label} (${stats.lowestHealthParam[1]}%)` : '—'} color="bg-amber-50 text-amber-600" small />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-navy-900 mb-3">Anomalies by Station</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stationData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="anomalies" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-navy-900 mb-3">Anomalies by Severity</h3>
          <div className="h-64">
            {severityData.length === 0 ? (
              <div className="h-full grid place-items-center text-sm text-slate-400">No anomalies yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                    {severityData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-navy-900 mb-3">Anomalies by Sensor Parameter</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={paramData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="count" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5 flex items-center gap-3">
        <FileText className="h-8 w-8 text-blue-500" />
        <div className="flex-1">
          <div className="font-semibold text-navy-900">Full anomaly log</div>
          <div className="text-xs text-slate-500">Export all {anomalies.length} anomaly records with timestamps, scores, and recommended actions.</div>
        </div>
        <button onClick={downloadReport} className="btn-ghost"><FileDown className="h-4 w-4" /> Export .txt</button>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, small }: { icon: typeof FileText; label: string; value: React.ReactNode; color: string; small?: boolean }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${color}`}><Icon className="h-5 w-5" /></div>
      <div className="min-w-0">
        <div className={`font-bold text-navy-900 truncate ${small ? 'text-sm' : 'text-2xl tabular-nums'}`}>{value}</div>
        <div className="text-xs text-slate-500 truncate">{label}</div>
      </div>
    </div>
  );
}
