import { useState } from 'react';
import { CloudSun, Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck, Activity, MapPin } from 'lucide-react';
import { useApp } from '@/store';

export function Login() {
  const { login } = useApp();
  const [email, setEmail] = useState('operator@aws-demo.gov');
  const [password, setPassword] = useState('demo1234');
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!email || !password) {
      setErr('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      login(email);
    }, 700);
  };

  const demoLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      login('operator@aws-demo.gov');
    }, 500);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-navy-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-blue-900" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 grid place-items-center shadow-xl">
              <CloudSun className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold leading-tight">AWS Anomaly Detection</div>
              <div className="text-xs text-blue-300 uppercase tracking-widest">Intelligent Monitoring Platform</div>
            </div>
          </div>
          <div className="space-y-6 max-w-md">
            <h1 className="text-4xl font-bold leading-tight">
              AI-Powered monitoring for Automatic Weather Stations
            </h1>
            <p className="text-slate-300 leading-relaxed">
              Detect faulty sensor readings in real time using an Isolation Forest model. Track anomalies across stations, get instant alerts, and act on AI-generated insights.
            </p>
            <div className="grid grid-cols-1 gap-3 pt-2">
              <Feature icon={Activity} title="Real-time anomaly detection" desc="Isolation Forest scores every reading live" />
              <Feature icon={MapPin} title="Multi-station monitoring" desc="Interactive map of all AWS installations" />
              <Feature icon={ShieldCheck} title="Operator-grade alerts" desc="Severity, confidence &amp; recommended actions" />
            </div>
          </div>
          <div className="text-xs text-slate-400">
            Demo platform — simulated data &amp; in-browser ML model. Not real government weather data.
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 grid place-items-center shadow-lg">
              <CloudSun className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-base font-bold text-navy-900">AWS Anomaly Detection</div>
              <div className="text-[10px] text-blue-600 uppercase tracking-widest">AI Monitoring Platform</div>
            </div>
          </div>
          <div className="card p-7">
            <h2 className="text-2xl font-bold text-navy-900">Welcome back</h2>
            <p className="text-sm text-slate-500 mt-1">Sign in to access the monitoring dashboard.</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email or username</label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                  />
                  Remember me
                </label>
                <button type="button" className="text-sm text-blue-600 hover:underline font-medium">Forgot password?</button>
              </div>
              {err && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</div>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">OR</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <button onClick={demoLogin} disabled={loading} className="btn-ghost w-full">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Continue with demo access
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-4 leading-relaxed">
              Hackathon demo — credentials are pre-filled. Use the demo access button for instant entry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: typeof Activity; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 p-3.5">
      <div className="h-9 w-9 rounded-lg bg-blue-500/20 grid place-items-center shrink-0">
        <Icon className="h-5 w-5 text-blue-300" />
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-slate-400">{desc}</div>
      </div>
    </div>
  );
}
