import { supabase } from '@/lib/supabase';
import type { AlertItem, AnomalyRecord, AiInsight, Station, SensorReading, SensorHealth, Severity, WeatherParam } from '@/types';

// ---- Row shape types (snake_case from DB) ----
interface AnomalyRow {
  id: string;
  station_id: string;
  station_name: string;
  parameter: WeatherParam;
  parameter_label: string;
  value: number;
  unit: string;
  expected_min: number;
  expected_max: number;
  expected_mid: number;
  anomaly_score: number;
  confidence: number;
  severity: Severity;
  possible_cause: string;
  recommended_action: string;
  acknowledged: boolean;
  resolved: boolean;
  detected_at: string;
}

interface AlertRow {
  id: string;
  station_id: string;
  station_name: string;
  severity: Severity;
  title: string;
  message: string;
  confidence: number;
  acknowledged: boolean;
  resolved: boolean;
  created_at: string;
}

interface InsightRow {
  id: string;
  station_id: string;
  station_name: string;
  parameter: WeatherParam;
  parameter_label: string;
  explanation: string;
  anomaly_probability: number;
  contributing_factors: string[];
  recommended_action: string;
  created_at: string;
}

interface StationRow {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  status: 'normal' | 'warning' | 'anomaly';
  active: boolean;
  installed_at: string;
}

interface SensorHealthRow {
  station_id: string;
  temperature: number;
  humidity: number;
  pressure: number;
  rainfall: number;
  wind_speed: number;
}

interface ReadingRow {
  id: number;
  station_id: string;
  recorded_at: string;
  temperature: number;
  humidity: number;
  pressure: number;
  rainfall: number;
  wind_speed: number;
  wind_direction: number;
  is_anomaly: boolean;
}

const toMs = (s: string) => new Date(s).getTime();

// ---- Mappers (DB row -> app type) ----
export function rowToAnomaly(r: AnomalyRow): AnomalyRecord {
  return {
    id: r.id,
    stationId: r.station_id,
    stationName: r.station_name,
    parameter: r.parameter,
    parameterLabel: r.parameter_label,
    value: r.value,
    unit: r.unit,
    expectedMin: r.expected_min,
    expectedMax: r.expected_max,
    expectedMid: r.expected_mid,
    anomalyScore: r.anomaly_score,
    confidence: r.confidence,
    severity: r.severity,
    possibleCause: r.possible_cause,
    recommendedAction: r.recommended_action,
    acknowledged: r.acknowledged,
    resolved: r.resolved,
    timestamp: toMs(r.detected_at),
  };
}

export function rowToAlert(r: AlertRow): AlertItem {
  return {
    id: r.id,
    stationId: r.station_id,
    stationName: r.station_name,
    severity: r.severity,
    title: r.title,
    message: r.message,
    confidence: r.confidence,
    acknowledged: r.acknowledged,
    resolved: r.resolved,
    timestamp: toMs(r.created_at),
  };
}

export function rowToInsight(r: InsightRow): AiInsight {
  return {
    id: r.id,
    stationId: r.station_id,
    stationName: r.station_name,
    parameter: r.parameter,
    parameterLabel: r.parameter_label,
    explanation: r.explanation,
    anomalyProbability: r.anomaly_probability,
    contributingFactors: r.contributing_factors ?? [],
    recommendedAction: r.recommended_action,
    timestamp: toMs(r.created_at),
  };
}

export function rowToStation(r: StationRow): Station {
  return {
    id: r.id,
    name: r.name,
    region: r.region,
    lat: Number(r.lat),
    lng: Number(r.lng),
    status: r.status,
    active: r.active,
    installedAt: r.installed_at,
  };
}

export function rowToReading(r: ReadingRow): SensorReading {
  return {
    timestamp: toMs(r.recorded_at),
    temperature: r.temperature,
    humidity: r.humidity,
    pressure: r.pressure,
    rainfall: r.rainfall,
    windSpeed: r.wind_speed,
    windDirection: r.wind_direction,
  };
}

export function rowToSensorHealth(r: SensorHealthRow): SensorHealth {
  return {
    stationId: r.station_id,
    temperature: r.temperature,
    humidity: r.humidity,
    pressure: r.pressure,
    rainfall: r.rainfall,
    windSpeed: r.wind_speed,
  };
}

// ---- DB access functions ----

export async function fetchStations(): Promise<Station[]> {
  const { data, error } = await supabase
    .from('weather_stations')
    .select('id,name,region,lat,lng,status,active,installed_at')
    .order('name');
  if (error) throw error;
  return (data as StationRow[]).map(rowToStation);
}

export async function fetchAnomalies(limit = 200): Promise<AnomalyRecord[]> {
  const { data, error } = await supabase
    .from('anomalies')
    .select('id,station_id,station_name,parameter,parameter_label,value,unit,expected_min,expected_max,expected_mid,anomaly_score,confidence,severity,possible_cause,recommended_action,acknowledged,resolved,detected_at')
    .order('detected_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as AnomalyRow[]).map(rowToAnomaly);
}

export async function fetchAlerts(limit = 100): Promise<AlertItem[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select('id,station_id,station_name,severity,title,message,confidence,acknowledged,resolved,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as AlertRow[]).map(rowToAlert);
}

export async function fetchInsights(limit = 50): Promise<AiInsight[]> {
  const { data, error } = await supabase
    .from('ai_insights')
    .select('id,station_id,station_name,parameter,parameter_label,explanation,anomaly_probability,contributing_factors,recommended_action,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as InsightRow[]).map(rowToInsight);
}

export async function fetchSensorHealth(): Promise<Record<string, SensorHealth>> {
  const { data, error } = await supabase
    .from('sensor_health')
    .select('station_id,temperature,humidity,pressure,rainfall,wind_speed');
  if (error) throw error;
  const map: Record<string, SensorHealth> = {};
  for (const r of data as SensorHealthRow[]) map[r.station_id] = rowToSensorHealth(r);
  return map;
}

export async function insertAnomaly(rec: AnomalyRecord): Promise<AnomalyRecord> {
  const { data, error } = await supabase
    .from('anomalies')
    .insert({
      station_id: rec.stationId,
      station_name: rec.stationName,
      parameter: rec.parameter,
      parameter_label: rec.parameterLabel,
      value: rec.value,
      unit: rec.unit,
      expected_min: rec.expectedMin,
      expected_max: rec.expectedMax,
      expected_mid: rec.expectedMid,
      anomaly_score: rec.anomalyScore,
      confidence: rec.confidence,
      severity: rec.severity,
      possible_cause: rec.possibleCause,
      recommended_action: rec.recommendedAction,
      acknowledged: false,
      resolved: false,
      detected_at: new Date(rec.timestamp).toISOString(),
    })
    .select('id,station_id,station_name,parameter,parameter_label,value,unit,expected_min,expected_max,expected_mid,anomaly_score,confidence,severity,possible_cause,recommended_action,acknowledged,resolved,detected_at')
    .single();
  if (error) throw error;
  return rowToAnomaly(data as AnomalyRow);
}

export async function insertAlert(alert: AlertItem): Promise<AlertItem> {
  const { data, error } = await supabase
    .from('alerts')
    .insert({
      station_id: alert.stationId,
      station_name: alert.stationName,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      confidence: alert.confidence,
      acknowledged: false,
      resolved: false,
      created_at: new Date(alert.timestamp).toISOString(),
    })
    .select('id,station_id,station_name,severity,title,message,confidence,acknowledged,resolved,created_at')
    .single();
  if (error) throw error;
  return rowToAlert(data as AlertRow);
}

export async function insertInsight(insight: AiInsight): Promise<AiInsight> {
  const { data, error } = await supabase
    .from('ai_insights')
    .insert({
      station_id: insight.stationId,
      station_name: insight.stationName,
      parameter: insight.parameter,
      parameter_label: insight.parameterLabel,
      explanation: insight.explanation,
      anomaly_probability: insight.anomalyProbability,
      contributing_factors: insight.contributingFactors,
      recommended_action: insight.recommendedAction,
    })
    .select('id,station_id,station_name,parameter,parameter_label,explanation,anomaly_probability,contributing_factors,recommended_action,created_at')
    .single();
  if (error) throw error;
  return rowToInsight(data as InsightRow);
}

export async function insertReading(stationId: string, reading: SensorReading, isAnomaly: boolean): Promise<void> {
  const { error } = await supabase.from('sensor_readings').insert({
    station_id: stationId,
    recorded_at: new Date(reading.timestamp).toISOString(),
    temperature: reading.temperature,
    humidity: reading.humidity,
    pressure: reading.pressure,
    rainfall: reading.rainfall,
    wind_speed: reading.windSpeed,
    wind_direction: reading.windDirection,
    is_anomaly: isAnomaly,
  });
  if (error) throw error;
}

export async function fetchReadings(stationId: string, limit = 200): Promise<SensorReading[]> {
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('id,station_id,recorded_at,temperature,humidity,pressure,rainfall,wind_speed,wind_direction,is_anomaly')
    .eq('station_id', stationId)
    .order('recorded_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data as ReadingRow[]).map(rowToReading);
}

export async function updateAlertFlags(id: string, acknowledged: boolean, resolved: boolean): Promise<void> {
  const { error } = await supabase
    .from('alerts')
    .update({ acknowledged, resolved })
    .eq('id', id);
  if (error) throw error;
}

export async function updateAnomalyFlags(id: string, acknowledged: boolean, resolved: boolean): Promise<void> {
  const { error } = await supabase
    .from('anomalies')
    .update({ acknowledged, resolved })
    .eq('id', id);
  if (error) throw error;
}

export async function updateStationStatus(stationId: string, status: 'normal' | 'warning' | 'anomaly'): Promise<void> {
  const { error } = await supabase
    .from('weather_stations')
    .update({ status })
    .eq('id', stationId);
  if (error) throw error;
}

export async function upsertSensorHealth(health: SensorHealth): Promise<void> {
  const { error } = await supabase
    .from('sensor_health')
    .upsert(
      {
        station_id: health.stationId,
        temperature: health.temperature,
        humidity: health.humidity,
        pressure: health.pressure,
        rainfall: health.rainfall,
        wind_speed: health.windSpeed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'station_id' }
    );
  if (error) throw error;
}
