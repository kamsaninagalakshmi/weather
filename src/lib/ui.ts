import type { Severity } from '@/types';

export const severityColors: Record<Severity, { bg: string; text: string; ring: string; dot: string; solid: string }> = {
  normal: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500', solid: 'bg-emerald-500' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', dot: 'bg-amber-500', solid: 'bg-amber-500' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200', dot: 'bg-orange-500', solid: 'bg-orange-500' },
  critical: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200', dot: 'bg-red-500', solid: 'bg-red-500' },
};

export const severityOrder: Record<Severity, number> = { critical: 0, high: 1, warning: 2, normal: 3 };

export function timeAgo(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

export function trendPct(history: number[]): number | null {
  if (history.length < 2) return null;
  const a = history[history.length - 1];
  const b = history[history.length - 2];
  if (b === 0) return null;
  return ((a - b) / b) * 100;
}
