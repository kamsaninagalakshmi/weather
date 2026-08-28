import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { Severity } from '@/types';
import { severityColors } from '@/lib/ui';

export function KpiCard({
  label,
  value,
  icon: Icon,
  tint,
  trend,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tint: string;
  trend?: number;
  sub?: string;
}) {
  return (
    <div className="card card-hover p-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className={`h-11 w-11 rounded-xl grid place-items-center ${tint}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold text-navy-900 tabular-nums leading-none">{value}</div>
        <div className="text-sm text-slate-500 mt-1.5">{label}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export function SeverityBadge({ severity, size = 'sm' }: { severity: Severity; size?: 'sm' | 'md' }) {
  const c = severityColors[severity];
  const label = severity === 'normal' ? 'Normal' : severity.charAt(0).toUpperCase() + severity.slice(1);
  return (
    <span className={`badge ${c.bg} ${c.text} ${size === 'md' ? 'px-3 py-1.5 text-sm' : ''}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {label}
    </span>
  );
}

export function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-navy-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function StatusDot({ status }: { status: 'normal' | 'warning' | 'anomaly' }) {
  const map = {
    normal: 'bg-emerald-500',
    warning: 'bg-amber-500',
    anomaly: 'bg-red-500',
  };
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {status !== 'normal' && (
        <span className={`absolute inline-flex h-full w-full rounded-full ${map[status]} opacity-60 animate-pulse-ring`} />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${map[status]}`} />
    </span>
  );
}

export function DemoBadge({ label = 'DEMO DATA' }: { label?: string }) {
  return (
    <span className="badge bg-amber-50 text-amber-700 ring-1 ring-amber-200">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      {label}
    </span>
  );
}

export function AiBadge() {
  return (
    <span className="badge bg-blue-50 text-blue-700 ring-1 ring-blue-200">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
      AI Assessment
    </span>
  );
}
