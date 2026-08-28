import type { SensorReading } from '@/types';
import { PARAM_MAP, STATIONS } from './stations';

// Seeded PRNG for reproducible demo data
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20240825);

function gauss(mean: number, sd: number): number {
  const u1 = rand() || 0.0001;
  const u2 = rand();
  return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Generate a single normal reading with diurnal variation around station baseline
export function generateNormalReading(stationId: string, t: number): SensorReading {
  const hour = (t / 3.6e6) % 24;
  // diurnal temperature curve
  const tempOffset = Math.sin(((hour - 6) / 24) * 2 * Math.PI) * 4;
  const base = stationBaseline(stationId);
  return {
    timestamp: t,
    temperature: round(base.temperature + tempOffset + gauss(0, 1.2), 1),
    humidity: round(clamp(base.humidity - tempOffset * 1.5 + gauss(0, 4), 35, 95), 0),
    pressure: round(base.pressure + gauss(0, 2.5), 0),
    rainfall: Math.max(0, round(gauss(0, 1.5) > 1 ? gauss(3, 4) : 0, 1)),
    windSpeed: round(Math.max(0, base.windSpeed + gauss(0, 4)), 1),
    windDirection: round((base.windDirection + gauss(0, 25) + 360) % 360, 0),
  };
}

export function round(v: number, d: number): number {
  const f = Math.pow(10, d);
  return Math.round(v * f) / f;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function stationBaseline(stationId: string) {
  const idx = STATIONS.findIndex((s) => s.id === stationId);
  const seed = idx + 1;
  return {
    temperature: 28 + seed * 0.6,
    humidity: 62 + seed * 2,
    pressure: 1006 - seed,
    windSpeed: 16 + seed,
    windDirection: (90 + seed * 40) % 360,
  };
}

// Generate history for a station over `hours` at `intervalMin` cadence
export function generateHistory(stationId: string, hours: number, intervalMin = 15): SensorReading[] {
  const out: SensorReading[] = [];
  const now = Date.now();
  const step = intervalMin * 60 * 1000;
  const n = Math.floor((hours * 3.6e6) / step);
  for (let i = n; i >= 0; i--) {
    out.push(generateNormalReading(stationId, now - i * step));
  }
  return out;
}

// Inject one anomalous reading into a history sequence at the last position
export function injectAnomaly(
  stationId: string,
  parameter: keyof SensorReading,
  value: number,
  t: number
): SensorReading {
  const base = generateNormalReading(stationId, t);
  return { ...base, [parameter]: value, timestamp: t };
}

export const ANOMALY_SCENARIOS: Array<{
  parameter: keyof SensorReading;
  label: string;
  value: (base: SensorReading) => number;
  cause: string;
  action: string;
}> = [
  {
    parameter: 'temperature',
    label: 'Temperature spike 30°C → 85°C',
    value: () => 85.2,
    cause: 'Sensor malfunction or external heat source near the enclosure',
    action: 'Inspect temperature sensor and verify with nearby stations.',
  },
  {
    parameter: 'humidity',
    label: 'Humidity drops to 5%',
    value: () => 5,
    cause: 'Humidity sensor failure or desiccant contamination',
    action: 'Recalibrate humidity sensor; check cable connections.',
  },
  {
    parameter: 'pressure',
    label: 'Pressure abnormally low 870 hPa',
    value: () => 870,
    cause: 'Pressure transducer drift or enclosure seal leak',
    action: 'Re-zero the barometer and run a diagnostic cycle.',
  },
  {
    parameter: 'windSpeed',
    label: 'Wind speed 150 km/h spike',
    value: () => 150,
    cause: 'Anemometer bearing seizure producing false high pulses',
    action: 'Inspect anemometer bearings; replace if worn.',
  },
  {
    parameter: 'rainfall',
    label: 'Rainfall impossible spike 480 mm',
    value: () => 480,
    cause: 'Tipping-bucket relay stuck open or debris in the funnel',
    action: 'Clear the funnel and verify the bucket mechanism.',
  },
];

export function paramLabel(p: keyof SensorReading): string {
  return (PARAM_MAP as Record<string, { label: string }>)[String(p)]?.label ?? String(p);
}

export function paramUnit(p: keyof SensorReading): string {
  return (PARAM_MAP as Record<string, { unit: string }>)[String(p)]?.unit ?? '';
}
