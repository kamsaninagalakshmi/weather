import { useState, useMemo } from 'react';
import {
  AlertTriangle, Zap, Loader2, CheckCircle2, X, Activity, Cpu, Target, Lightbulb, Wrench,
} from 'lucide-react';
import { useApp } from '@/store';
import { SectionHeader, SeverityBadge, DemoBadge, AiBadge } from '@/components/ui';
import { severityColors, fmtDateTime, timeAgo } from '@/lib/ui';
import { PARAMS, PARAM_MAP, STATIONS } from '@/data/stations';
import { paramIconByKey } from '@/lib/icons';
import { ANOMALY_SCENARIOS } from '@/data/generator';
import type { AnomalyRecord, WeatherParam } from '@/types';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ReferenceArea, ScatterChart, Scatter, ReferenceLine, ComposedChart,
} from 'recharts';

export function AnomalyDetection() {
  const { anomalies, stations, simulateAnomaly, stationStatus, history } = useApp();
  const [selectedStation, setSelectedStation] = useState(stations[0]?.id ?? '');
  const [selectedParam, setSelectedParam] = useState<WeatherParam>('temperature');
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [simulating, setSimulating] = useState(false);
  const [pipeline, setPipeline] = useState<AnomalyRecord | null>(null);
  const [flash, setFlash] = useState(false);

  const runSimulation = () => {
    setSimulating(true);
    setPipeline(null);
    setTimeout(() => {
      const rec = simulateAnomaly(selectedStation, scenarioIdx);
      setPipeline(rec);
      setSimulating(false);
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
    }, 1100);
  };

  // Build graph data for selected station + param, combining history + anomaly points
  const graphData = useMemo(() => {
    const hist = history[selectedStation] ?? [];
    const meta = PARAM_MAP[selectedParam];
    const pts = hist.map((r) => ({
      t: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ts: r.timestamp,
      value: r[selectedParam] as number,
      isAnomaly: false,
    }));
    // overlay anomalies for this station+param
    const anoms = anomalies.filter((a) => a.stationId === selectedStation && a.parameter === selectedParam);
    for (const a of anoms) {
      pts.push({ t: fmtDateTime(a.timestamp), ts: a.timestamp, value: a.value, isAnomaly: true });
    }
    return { pts, meta };
  }, [history, selectedStation, selectedParam, anomalies]);

  const anomalyPoints = graphData.pts.filter((p) => p.isAnomaly);
  const [clicked, setClicked] = useState<typeof anomalyPoints[number] | null>(null);

  return (
    <div className={`space-y-6 transition ${flash ? 'ring-2 ring-red-300 rounded-2xl' : ''}`}>
      <SectionHeader
        title="AI Anomaly Detection"
        subtitle="Isolation Forest model scores every sensor reading in real time. Trigger a simulated anomaly to see the full pipeline."
        actions={
          <>
            <DemoBadge />
            <span className="badge bg-blue-50 text-blue-700 ring-1 ring-blue-200">
              <Cpu className="h-3.5 w-3.5" /> Isolation Forest · 80 trees
            </span>
          </>
        }
      />

      {/* Simulate Anomaly control panel */}
      <div className="card p-5 border-blue-200/60">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-9 w-9 rounded-xl bg-red-50 text-red-600 grid place-items-center">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-navy-900">Simulate Anomaly Pipeline</h2>
            <p className="text-xs text-slate-500">Generate an abnormal reading → run ML model → calculate score → update dashboard → create alert → AI explanation.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Target Station</label>
            <select className="input" value={selectedStation} onChange={(e) => setSelectedStation(e.target.value)}>
              {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Anomaly Scenario</label>
            <select className="input" value={scenarioIdx} onChange={(e) => setScenarioIdx(Number(e.target.value))}>
              {ANOMALY_SCENARIOS.map((sc, i) => <option key={i} value={i}>{sc.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={runSimulation} disabled={simulating} className="btn-danger w-full">
              {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              {simulating ? 'Running ML model…' : 'Simulate Anomaly'}
            </button>
          </div>
        </div>

        {/* Pipeline steps visualization */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
          {['Generate reading', 'ML inference', 'Score & severity', 'Alert & map', 'AI explanation'].map((step, i) => (
            <div key={i} className={`rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 ${
              simulating ? 'bg-blue-50 text-blue-700' : pipeline ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'
            }`}>
              <span className={`h-4 w-4 rounded-full grid place-items-center text-[9px] font-bold ${
                simulating ? 'bg-blue-500 text-white' : pipeline ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'
              }`}>{i + 1}</span>
              {step}
            </div>
          ))}
        </div>
      </div>

      {/* Latest detection result */}
      {pipeline && (
        <div className="card p-6 border-red-200 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🚨</span>
            <h2 className="text-lg font-bold text-red-600">ANOMALY DETECTED</h2>
            <SeverityBadge severity={pipeline.severity} size="md" />
            <button onClick={() => setPipeline(null)} className="ml-auto p-1.5 rounded-lg hover:bg-slate-100"><X className="h-4 w-4 text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Station" value={pipeline.stationName} />
            <Field label="Parameter" value={pipeline.parameterLabel} />
            <Field label="Current Reading" value={`${pipeline.value}${pipeline.unit}`} highlight />
            <Field label="Expected Range" value={`${pipeline.expectedMin}–${pipeline.expectedMax}${pipeline.unit}`} />
            <Field label="Anomaly Confidence" value={`${pipeline.confidence}%`} highlight />
            <Field label="Severity" value={pipeline.severity.toUpperCase()} />
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase mb-1.5"><Lightbulb className="h-4 w-4" /> Possible Cause</div>
              <p className="text-sm text-slate-700">{pipeline.possibleCause}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase mb-1.5"><Wrench className="h-4 w-4" /> Recommended Action</div>
              <p className="text-sm text-slate-700">{pipeline.recommendedAction}</p>
            </div>
          </div>
        </div>
      )}

      {/* Detection graph */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-navy-900">Anomaly Detection Graph</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <select className="input py-1.5 text-sm w-auto" value={selectedStation} onChange={(e) => setSelectedStation(e.target.value)}>
              {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className="input py-1.5 text-sm w-auto" value={selectedParam} onChange={(e) => setSelectedParam(e.target.value as WeatherParam)}>
              {PARAMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={graphData.pts} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} unit={graphData.meta.unit} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                formatter={(v: any) => [`${Number(v).toFixed(graphData.meta.decimals)} ${graphData.meta.unit}`, graphData.meta.label]}
              />
              <ReferenceArea y1={graphData.meta.normalMin} y2={graphData.meta.normalMax} fill="#10b981" fillOpacity={0.08} />
              <ReferenceLine y={graphData.meta.normalMin} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.5} />
              <ReferenceLine y={graphData.meta.normalMax} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Line type="monotone" dataKey="value" name={graphData.meta.label} stroke="#2563eb" strokeWidth={2} dot={false} connectNulls />
              <Scatter dataKey="value" data={anomalyPoints} fill="#ef4444" shape="star" name="Anomalies" onClick={(d: any) => setClicked(d)} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-emerald-400/30" /> Expected range</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-blue-600" /> Normal readings</span>
          <span className="flex items-center gap-1.5"><span className="text-red-500">★</span> Anomaly points (click for details)</span>
        </div>
      </div>

      {/* Clicked anomaly detail */}
      {clicked && (
        <AnomalyPointDetail ts={clicked.ts} stationId={selectedStation} param={selectedParam} value={clicked.value} onClose={() => setClicked(null)} />
      )}

      {/* Anomaly history table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-navy-900">Anomaly History</h2>
          <span className="text-xs text-slate-400">{anomalies.length} events</span>
        </div>
        {anomalies.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-400">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-300" />
            No anomalies detected yet. Run a simulation above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                  <th className="pb-2 font-semibold">Time</th>
                  <th className="pb-2 font-semibold">Station</th>
                  <th className="pb-2 font-semibold">Parameter</th>
                  <th className="pb-2 font-semibold text-right">Reading</th>
                  <th className="pb-2 font-semibold text-right">Expected</th>
                  <th className="pb-2 font-semibold text-right">Score</th>
                  <th className="pb-2 font-semibold text-right">Confidence</th>
                  <th className="pb-2 font-semibold">Severity</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.slice(0, 15).map((a) => {
                  const c = severityColors[a.severity];
                  return (
                    <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="py-2.5 text-xs text-slate-500">{fmtDateTime(a.timestamp)}</td>
                      <td className="py-2.5 font-medium text-slate-800">{a.stationName}</td>
                      <td className="py-2.5 text-slate-600">{a.parameterLabel}</td>
                      <td className="py-2.5 text-right tabular-nums font-semibold text-slate-800">{a.value}{a.unit}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-500">{a.expectedMin}–{a.expectedMax}{a.unit}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-600">{a.anomalyScore.toFixed(3)}</td>
                      <td className="py-2.5 text-right tabular-nums font-semibold text-navy-900">{a.confidence}%</td>
                      <td className="py-2.5"><span className={`badge ${c.bg} ${c.text}`}><span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />{a.severity}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3.5">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`text-sm mt-1 ${highlight ? 'font-bold text-red-600' : 'font-semibold text-slate-800'}`}>{value}</div>
    </div>
  );
}

function AnomalyPointDetail({
  ts, stationId, param, value, onClose,
}: { ts: number; stationId: string; param: WeatherParam; value: number; onClose: () => void }) {
  const { anomalies } = useApp();
  const a = anomalies.find((x) => x.stationId === stationId && x.parameter === param && Math.abs(x.timestamp - ts) < 5000 && x.value === value);
  const meta = PARAM_MAP[param];
  const Icon = paramIconByKey(param);
  if (!a) {
    return (
      <div className="card p-5 animate-fade-in">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-navy-900">Anomaly Point Detail</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Field label="Timestamp" value={fmtDateTime(ts)} />
          <Field label="Station" value={STATIONS.find((s) => s.id === stationId)?.name ?? stationId} />
          <Field label="Parameter" value={meta.label} />
          <Field label="Actual Value" value={`${value}${meta.unit}`} highlight />
        </div>
      </div>
    );
  }
  const c = severityColors[a.severity];
  return (
    <div className={`card p-5 border ${c.ring} ring-1 animate-fade-in`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`h-9 w-9 rounded-xl grid place-items-center ${c.bg} ${c.text}`}><Icon className="h-5 w-5" /></div>
          <h3 className="font-semibold text-navy-900">Anomaly Point Detail</h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="h-4 w-4 text-slate-400" /></button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Timestamp" value={fmtDateTime(a.timestamp)} />
        <Field label="Station" value={a.stationName} />
        <Field label="Parameter" value={a.parameterLabel} />
        <Field label="Actual Value" value={`${a.value}${a.unit}`} highlight />
        <Field label="Expected Value" value={`${a.expectedMin}–${a.expectedMax}${a.unit}`} />
        <Field label="Anomaly Score" value={a.anomalyScore.toFixed(3)} />
        <Field label="Severity" value={a.severity.toUpperCase()} />
        <Field label="Confidence" value={`${a.confidence}%`} />
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase mb-1"><Lightbulb className="h-4 w-4" /> Possible Cause</div>
          <p className="text-sm text-slate-700">{a.possibleCause}</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase mb-1"><Wrench className="h-4 w-4" /> Recommended Action</div>
          <p className="text-sm text-slate-700">{a.recommendedAction}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <AiBadge />
        <span className="text-xs text-slate-400">Detected {timeAgo(a.timestamp)}</span>
      </div>
    </div>
  );
}

// keep imports referenced
void Activity; void Target; void LineChart; void ScatterChart; void ReferenceLine;
