import { useState } from 'react';
import { useApp } from '@/store';
import { SectionHeader, DemoBadge, AiBadge } from '@/components/ui';
import { CloudSun, Bell, Shield, Gauge, Info, Save, Cpu } from 'lucide-react';

export function Settings() {
  const { logout } = useApp();
  const [threshold, setThreshold] = useState(0.6);
  const [notifyCritical, setNotifyCritical] = useState(true);
  const [notifyWarning, setNotifyWarning] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" subtitle="System configuration, detection thresholds, and notifications." actions={<DemoBadge />} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ML settings */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 grid place-items-center"><Cpu className="h-5 w-5" /></div>
            <h2 className="font-semibold text-navy-900">ML Model Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Anomaly detection threshold</label>
              <div className="flex items-center gap-3">
                <input type="range" min={0.5} max={0.9} step={0.05} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="flex-1 accent-blue-600" />
                <span className="text-sm font-bold text-navy-900 tabular-nums w-12 text-right">{threshold.toFixed(2)}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Higher = only severe anomalies flagged. Lower = more sensitive.</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between"><span>Algorithm</span><span className="font-semibold">Isolation Forest</span></div>
              <div className="flex justify-between"><span>Trees</span><span className="font-semibold">80</span></div>
              <div className="flex justify-between"><span>Sample size</span><span className="font-semibold">64</span></div>
              <div className="flex justify-between"><span>Features</span><span className="font-semibold">6 sensors</span></div>
              <div className="flex justify-between"><span>Runtime</span><span className="font-semibold">In-browser</span></div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 grid place-items-center"><Bell className="h-5 w-5" /></div>
            <h2 className="font-semibold text-navy-900">Notifications</h2>
          </div>
          <div className="space-y-3">
            <Toggle label="Critical alerts" desc="Instant notification for critical anomalies" checked={notifyCritical} onChange={setNotifyCritical} />
            <Toggle label="Warning alerts" desc="Notification for warning-level anomalies" checked={notifyWarning} onChange={setNotifyWarning} />
            <Toggle label="Auto-refresh readings" desc="Update live data every 8 seconds" checked={autoRefresh} onChange={setAutoRefresh} />
          </div>
        </div>

        {/* Profile */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-navy-50 text-navy-700 grid place-items-center"><Shield className="h-5 w-5" /></div>
            <h2 className="font-semibold text-navy-900">Profile</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Display name</label>
              <input className="input" defaultValue="Operator" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
              <input className="input" defaultValue="operator@aws-demo.gov" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Region</label>
              <select className="input"><option>Andhra Pradesh</option><option>Telangana</option><option>Tamil Nadu</option></select>
            </div>
          </div>
        </div>

        {/* System info */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center"><Info className="h-5 w-5" /></div>
            <h2 className="font-semibold text-navy-900">System Information</h2>
          </div>
          <div className="space-y-2 text-sm">
            <Row label="Platform" value="AWS Anomaly Detection v1.0" />
            <Row label="Mode" value="Demo (simulated data)" />
            <Row label="ML runtime" value="Client-side Isolation Forest" />
            <Row label="Stations monitored" value="5 AWS installations" />
            <Row label="Data disclaimer" value="Not real government data" />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <AiBadge />
            <CloudSun className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-slate-400">Built for hackathon demonstration</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} className="btn-primary"><Save className="h-4 w-4" /> Save settings</button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Settings saved.</span>}
        <button onClick={logout} className="btn-ghost ml-auto">Sign out</button>
      </div>

      {/* Gauge placeholder referenced */}
      <span className="hidden"><Gauge className="h-4 w-4" /></span>
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer rounded-xl border border-slate-100 p-3 hover:bg-slate-50/60 transition">
      <div>
        <div className="text-sm font-medium text-slate-800">{label}</div>
        <div className="text-xs text-slate-500">{desc}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
