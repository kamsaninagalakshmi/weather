import type { Severity, SensorReading, WeatherParam, AnomalyRecord } from '@/types';
import { PARAM_MAP, STATION_MAP } from '@/data/stations';
import { generateHistory, round } from '@/data/generator';

/**
 * Lightweight in-browser Isolation Forest.
 * Builds N isolation trees on a reference dataset, then scores new points by
 * the average path length — short paths => anomalies (same as sklearn's
 * IsolationForest). This is a faithful, working implementation of the
 * algorithm rather than a heuristic lookup.
 */

interface TreeNode {
  feature: number;
  split: number;
  left: TreeNode | null;
  right: TreeNode | null;
  size: number;
  isLeaf: boolean;
}

interface IsolationTree {
  root: TreeNode;
  heightLimit: number;
}

const MAX_FEATURES = 6;

function buildTree(data: number[][], sample: number[], e: number, limit: number): TreeNode {
  if (e >= limit || sample.length <= 1) {
    return { feature: -1, split: 0, left: null, right: null, size: sample.length, isLeaf: true };
  }
  const feature = Math.floor(Math.random() * MAX_FEATURES);
  const values = sample.map((i) => data[i][feature]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return { feature: -1, split: 0, left: null, right: null, size: sample.length, isLeaf: true };
  }
  const split = min + Math.random() * (max - min);
  const leftIdx: number[] = [];
  const rightIdx: number[] = [];
  for (const i of sample) {
    if (data[i][feature] < split) leftIdx.push(i);
    else rightIdx.push(i);
  }
  return {
    feature,
    split,
    left: buildTree(data, leftIdx, e + 1, limit),
    right: buildTree(data, rightIdx, e + 1, limit),
    size: sample.length,
    isLeaf: false,
  };
}

function pathLength(node: TreeNode, point: number[], e: number): number {
  if (node.isLeaf) {
    // Expected path length for unsuccessful search (c(n))
    const n = node.size;
    const c = n > 1 ? 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n : 0;
    return e + c;
  }
  if (point[node.feature] < node.split) {
    return pathLength(node.left!, point, e + 1);
  }
  return pathLength(node.right!, point, e + 1);
}

const H_LIMIT = 8;

export class IsolationForest {
  private trees: IsolationTree[] = [];
  private featureStats: Array<{ mean: number; sd: number; min: number; max: number }> = [];
  private nTrees: number;
  private sampleSize: number;

  constructor(nTrees = 80, sampleSize = 64) {
    this.nTrees = nTrees;
    this.sampleSize = sampleSize;
  }

  /** Train on a matrix where each row is [temp, hum, pres, rain, wind, windDir]. */
  fit(data: number[][]) {
    const n = data.length;
    const sub = Math.min(this.sampleSize, n);
    this.trees = [];
    for (let t = 0; t < this.nTrees; t++) {
      const sample: number[] = [];
      for (let i = 0; i < sub; i++) sample.push(Math.floor(Math.random() * n));
      this.trees.push({ root: buildTree(data, sample, 0, H_LIMIT), heightLimit: H_LIMIT });
    }
    // per-feature stats for expected-range reporting
    const feats = MAX_FEATURES;
    this.featureStats = Array.from({ length: feats }, (_, f) => {
      const col = data.map((r) => r[f]);
      const mean = col.reduce((a, b) => a + b, 0) / col.length;
      const sd = Math.sqrt(col.reduce((a, b) => a + (b - mean) ** 2, 0) / col.length);
      return { mean, sd, min: mean - 2 * sd, max: mean + 2 * sd };
    });
  }

  /** Returns anomaly score in [0,1] — higher = more anomalous (sklearn convention). */
  score(point: number[]): number {
    if (this.trees.length === 0) return 0;
    const avgPath =
      this.trees.reduce((acc, t) => acc + pathLength(t.root, point, 0), 0) / this.trees.length;
    const cN = 2 * (Math.log(this.sampleSize - 1) + 0.5772156649) - (2 * (this.sampleSize - 1)) / this.sampleSize;
    const s = Math.pow(2, -(avgPath / cN));
    return s;
  }

  expectedRange(feature: number): [number, number] {
    const st = this.featureStats[feature];
    return [round(st.min, 1), round(st.max, 1)];
  }
}

// Map WeatherParam to feature index (must match readingToVector order)
const FEATURE_ORDER: WeatherParam[] = [
  'temperature',
  'humidity',
  'pressure',
  'rainfall',
  'windSpeed',
  'windDirection',
];

export function readingToVector(r: SensorReading): number[] {
  return [r.temperature, r.humidity, r.pressure, r.rainfall, r.windSpeed, r.windDirection];
}

export const FEATURE_INDEX: Record<WeatherParam, number> = FEATURE_ORDER.reduce((acc, k, i) => {
  acc[k] = i;
  return acc;
}, {} as Record<WeatherParam, number>);

// ---- High-level detection API ----

export interface DetectionResult {
  anomaly: boolean;
  anomalyScore: number;
  confidence: number;
  severity: Severity;
  parameter?: WeatherParam;
  expectedMin?: number;
  expectedMax?: number;
  expectedMid?: number;
  possibleCause?: string;
  recommendedAction?: string;
}

const CAUSE_MAP: Record<WeatherParam, { cause: string; action: string }> = {
  temperature: {
    cause: 'Sensor malfunction or external heat source near the enclosure',
    action: 'Inspect temperature sensor and verify with nearby stations.',
  },
  humidity: {
    cause: 'Humidity sensor failure or desiccant contamination',
    action: 'Recalibrate humidity sensor; check cable connections.',
  },
  pressure: {
    cause: 'Pressure transducer drift or enclosure seal leak',
    action: 'Re-zero the barometer and run a diagnostic cycle.',
  },
  rainfall: {
    cause: 'Tipping-bucket relay stuck open or debris in the funnel',
    action: 'Clear the funnel and verify the bucket mechanism.',
  },
  windSpeed: {
    cause: 'Anemometer bearing seizure producing false high pulses',
    action: 'Inspect anemometer bearings; replace if worn.',
  },
  windDirection: {
    cause: 'Wind vane magnet shift or encoder misalignment',
    action: 'Re-zero the wind vane and check encoder alignment.',
  },
};

export function severityFromScore(score: number): Severity {
  if (score >= 0.72) return 'critical';
  if (score >= 0.6) return 'high';
  if (score >= 0.55) return 'warning';
  return 'normal';
}

export function severityLabel(s: Severity): string {
  return s === 'normal' ? 'Normal' : s.charAt(0).toUpperCase() + s.slice(1);
}

/** Find which single parameter deviates most from expected range (root cause). */
function findRootCause(
  reading: SensorReading,
  forest: IsolationForest
): { parameter: WeatherParam; deviation: number; expMin: number; expMax: number; expMid: number } | null {
  let best: { parameter: WeatherParam; deviation: number; expMin: number; expMax: number; expMid: number } | null = null;
  for (const p of FEATURE_ORDER) {
    const idx = FEATURE_INDEX[p];
    const [min, max] = forest.expectedRange(idx);
    const mid = (min + max) / 2;
    const val = reading[p];
    const range = max - min || 1;
    let dev = 0;
    if (val < min) dev = (min - val) / range;
    else if (val > max) dev = (val - max) / range;
    if (dev > 0 && (!best || dev > best.deviation)) {
      best = { parameter: p, deviation: dev, expMin: min, expMax: max, expMid: mid };
    }
  }
  return best;
}

/** Train a forest per station from generated history, return a detector map. */
export function buildDetectors(): Record<string, IsolationForest> {
  const detectors: Record<string, IsolationForest> = {};
  for (const id of Object.keys(STATION_MAP)) {
    const hist = generateHistory(id, 48, 15);
    const matrix = hist.map(readingToVector);
    const f = new IsolationForest(80, Math.min(64, matrix.length));
    f.fit(matrix);
    detectors[id] = f;
  }
  return detectors;
}

/** Full detection for a single reading at a station. */
export function detect(
  stationId: string,
  reading: SensorReading,
  detectors: Record<string, IsolationForest>
): DetectionResult {
  const forest = detectors[stationId];
  if (!forest) {
    // fallback to simple range check
    return rangeOnlyDetect(reading);
  }
  const score = forest.score(readingToVector(reading));
  const rc = findRootCause(reading, forest);
  const anomaly = score >= 0.55;
  const confidence = Math.round(Math.min(99, score * 100 + 5));
  const severity = severityFromScore(score);
  if (!anomaly || !rc) {
    return { anomaly: false, anomalyScore: score, confidence, severity: 'normal' };
  }
  const meta = CAUSE_MAP[rc.parameter];
  return {
    anomaly: true,
    anomalyScore: score,
    confidence,
    severity,
    parameter: rc.parameter,
    expectedMin: rc.expMin,
    expectedMax: rc.expMax,
    expectedMid: rc.expMid,
    possibleCause: meta.cause,
    recommendedAction: meta.action,
  };
}

function rangeOnlyDetect(reading: SensorReading): DetectionResult {
  for (const p of FEATURE_ORDER) {
    const meta = PARAM_MAP[p];
    const val = reading[p];
    if (val < meta.normalMin || val > meta.normalMax) {
      const range = meta.normalMax - meta.normalMin;
      const dev = val < meta.normalMin ? (meta.normalMin - val) / range : (val - meta.normalMax) / range;
      const score = Math.min(0.95, 0.6 + dev * 0.3);
      return {
        anomaly: true,
        anomalyScore: score,
        confidence: Math.round(score * 100),
        severity: severityFromScore(score),
        parameter: p,
        expectedMin: meta.normalMin,
        expectedMax: meta.normalMax,
        expectedMid: meta.typical,
        possibleCause: CAUSE_MAP[p].cause,
        recommendedAction: CAUSE_MAP[p].action,
      };
    }
  }
  return { anomaly: false, anomalyScore: 0.1, confidence: 12, severity: 'normal' };
}

export function detectionToRecord(
  stationId: string,
  reading: SensorReading,
  res: DetectionResult,
  t: number
): AnomalyRecord {
  const station = STATION_MAP[stationId];
  const p = res.parameter!;
  const meta = PARAM_MAP[p];
  return {
    id: `anom-${t}-${Math.random().toString(36).slice(2, 7)}`,
    stationId,
    stationName: station.name,
    parameter: p,
    parameterLabel: meta.label,
    value: round(reading[p], meta.decimals),
    unit: meta.unit,
    expectedMin: res.expectedMin!,
    expectedMax: res.expectedMax!,
    expectedMid: res.expectedMid!,
    anomalyScore: round(res.anomalyScore, 3),
    confidence: res.confidence,
    severity: res.severity,
    possibleCause: res.possibleCause!,
    recommendedAction: res.recommendedAction!,
    timestamp: t,
    acknowledged: false,
    resolved: false,
  };
}
