import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Radio, MapPin, Activity, Bell, BarChart3,
  Sparkles, FileText, Settings as SettingsIcon, Search, CloudSun,
  Menu, X, LogOut, ChevronDown,
} from 'lucide-react';
import { useApp } from '@/store';
import type { Page } from '@/App';
import { timeAgo, severityColors } from '@/lib/ui';

const NAV: Array<{ id: Page; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'stations', label: 'Weather Stations', icon: MapPin },
  { id: 'live', label: 'Live Monitoring', icon: Radio },
  { id: 'anomaly', label: 'Anomaly Detection', icon: Activity },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'historical', label: 'Historical Analysis', icon: BarChart3 },
  { id: 'insights', label: 'AI Insights', icon: Sparkles },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export function AppShell({
  page,
  onNavigate,
  children,
}: {
  page: Page;
  onNavigate: (p: Page) => void;
  children: React.ReactNode;
}) {
  const { alerts, logout } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const unread = alerts.filter((a) => !a.acknowledged && !a.resolved).length;

  const go = (p: Page) => {
    onNavigate(p);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-navy-900 text-slate-200 flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b border-navy-800/60">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 grid place-items-center shadow-lg">
            <CloudSun className="h-6 w-6 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-white tracking-tight">AWS Anomaly</div>
            <div className="text-[10px] uppercase tracking-widest text-blue-300">AI Detection</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:bg-navy-800/70 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.id === 'alerts' && unread > 0 && (
                  <span className="ml-auto rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] text-center">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-navy-800/60">
          <div className="rounded-xl bg-navy-800/60 px-3.5 py-3">
            <div className="flex items-center gap-2 text-[11px] text-amber-300 font-semibold mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              DEMO DATA
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Simulated weather data &amp; in-browser ML model — not real government data.
            </p>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top nav */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-20">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search stations, anomalies, sensors…"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 text-sm text-slate-700 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
          </div>
          <div className="flex-1 md:hidden" />
          <div className="hidden sm:block text-right text-xs text-slate-500 leading-tight">
            <div className="font-semibold text-slate-700">
              {now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <div className="tabular-nums">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
          </div>
          <div className="relative">
            <button
              onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); }}
              className="relative p-2 rounded-xl hover:bg-slate-100 transition"
            >
              <Bell className="h-5 w-5 text-slate-600" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto card p-2 z-50 animate-fade-in">
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center justify-between">
                  <span>Notifications</span>
                  <button className="text-blue-600 hover:underline" onClick={() => setNotifOpen(false)}>Close</button>
                </div>
                {alerts.length === 0 && (
                  <div className="px-3 py-6 text-center text-sm text-slate-400">No alerts yet</div>
                )}
                {alerts.slice(0, 8).map((a) => {
                  const c = severityColors[a.severity];
                  return (
                    <button
                      key={a.id}
                      onClick={() => { onNavigate('alerts'); setNotifOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                        <span className={`text-xs font-semibold ${c.text}`}>{a.title}</span>
                        <span className="ml-auto text-[10px] text-slate-400">{timeAgo(a.timestamp)}</span>
                      </div>
                      <div className="text-xs text-slate-600 leading-snug">{a.stationName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{a.message}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-navy-700 to-blue-700 grid place-items-center text-white text-sm font-semibold">
                OP
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 card p-2 z-50 animate-fade-in">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="text-sm font-semibold text-slate-800">Operator</div>
                  <div className="text-xs text-slate-500">operator@aws-demo.gov</div>
                </div>
                <button
                  onClick={() => { onNavigate('settings'); setProfileOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  <SettingsIcon className="h-4 w-4" /> Settings
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
