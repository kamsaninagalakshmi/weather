import { useApp } from '@/store';
import { SectionHeader, AiBadge, DemoBadge, SeverityBadge } from '@/components/ui';
import { severityColors, fmtDateTime, timeAgo } from '@/lib/ui';
import { paramIconByKey } from '@/lib/icons';
import { Sparkles, Target, Wrench, Lightbulb, Info } from 'lucide-react';

export function AiInsights() {
  const { insights, anomalies } = useApp();

  return (
    <div className="space-y-6">
      <SectionHeader
        title="AI Insights"
        subtitle="Natural-language explanations of detected anomalies, generated from the ML model's analysis."
        actions={
          <>
            <DemoBadge />
            <AiBadge />
          </>
        }
      />

      {/* Disclaimer banner */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-700">
          <span className="font-semibold text-blue-700">AI-generated assessment.</span> These explanations are produced from the anomaly detection model and historical patterns. They are not certain facts and should be verified by an operator before action.
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="card p-12 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-3 text-blue-300" />
          <h3 className="font-semibold text-navy-900">No AI insights yet</h3>
          <p className="text-sm text-slate-500 mt-1">Insights are generated automatically when anomalies are detected. Run “Simulate Anomaly” to see one.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((ins) => {
            const c = severityColors[anomalies.find((a) => a.stationId === ins.stationId && a.parameter === ins.parameter && Math.abs(a.timestamp - ins.timestamp) < 5000)?.severity ?? 'warning'];
            const Icon = paramIconByKey(ins.parameter);
            return (
              <div key={ins.id} className="card p-5">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${c.bg} ${c.text}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{ins.stationName}</span>
                      <SeverityBadge severity={anomalies.find((a) => a.stationId === ins.stationId && a.parameter === ins.parameter && Math.abs(a.timestamp - ins.timestamp) < 5000)?.severity ?? 'warning'} />
                      <AiBadge />
                      <span className="ml-auto text-xs text-slate-400">{timeAgo(ins.timestamp)}</span>
                    </div>
                    <p className="text-sm text-slate-700 mt-2 leading-relaxed">{ins.explanation}</p>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3.5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase mb-1.5"><Target className="h-4 w-4" /> Anomaly Probability</div>
                        <div className="text-2xl font-bold text-navy-900 tabular-nums">{ins.anomalyProbability}%</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3.5 md:col-span-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase mb-1.5"><Lightbulb className="h-4 w-4" /> Contributing Factors</div>
                        <ul className="text-xs text-slate-600 space-y-1 mt-1">
                          {ins.contributingFactors.map((f, i) => <li key={i} className="flex items-start gap-1.5"><span className="text-blue-500 mt-0.5">•</span> {f}</li>)}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-blue-50 p-3.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase mb-1"><Wrench className="h-4 w-4" /> Recommended Action</div>
                      <p className="text-sm text-slate-700">{ins.recommendedAction}</p>
                    </div>
                    <div className="mt-2 text-xs text-slate-400">Generated {fmtDateTime(ins.timestamp)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
