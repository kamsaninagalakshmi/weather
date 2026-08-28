export type Severity = 'normal' | 'warning' | 'high' | 'critical';

export type WeatherParam =
  | 'temperature'
  | 'humidity'
  | 'pressure'
  | 'rainfall'
  | 'windSpeed'
  | 'windDirection';

export interface ParamMeta {
  key: WeatherParam;
  label: string;
  unit: string;
  icon: string;
  normalMin: number;
  normalMax: number;
  typical: number;
  decimals: number;
}

export interface Station {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  status: 'normal' | 'warning' | 'anomaly';
  active: boolean;
  installedAt: string;
}

export interface SensorReading {
  timestamp: number;
  temperature: number;
  humidity: number;
  pressure: number;
  rainfall: number;
  windSpeed: number;
  windDirection: number;
}

export interface AnomalyRecord {
  id: string;
  stationId: string;
  stationName: string;
  parameter: WeatherParam;
  parameterLabel: string;
  value: number;
  unit: string;
  expectedMin: number;
  expectedMax: number;
  expectedMid: number;
  anomalyScore: number; // 0..1, higher = more anomalous
  confidence: number; // 0..100
  severity: Severity;
  possibleCause: string;
  recommendedAction: string;
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
}

export interface AlertItem {
  id: string;
  stationId: string;
  stationName: string;
  severity: Severity;
  title: string;
  message: string;
  confidence: number;
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
}

export interface SensorHealth {
  stationId: string;
  temperature: number;
  humidity: number;
  pressure: number;
  rainfall: number;
  windSpeed: number;
}

export interface AiInsight {
  id: string;
  stationId: string;
  stationName: string;
  parameter: WeatherParam;
  parameterLabel: string;
  explanation: string;
  anomalyProbability: number;
  contributingFactors: string[];
  recommendedAction: string;
  timestamp: number;
}
