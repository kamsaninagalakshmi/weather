/*
# Create AWS Anomaly Detection database schema

Creates the full persistence layer for the AI-powered Automatic Weather Station
anomaly detection platform. This is a single-tenant demo application — the
"login" is a demo gate, not real auth — so all tables use anon+authenticated
CRUD policies (the data is intentionally shared/public for the demo).

## 1. New Tables

- `weather_stations` — the 5 Automatic Weather Stations with location, region,
  installed date, and a derived operational status (normal/warning/anomaly).
  Seeded with the five Andhra Pradesh stations used throughout the app.
- `sensor_readings` — time-series of raw sensor values per station
  (temperature, humidity, pressure, rainfall, wind speed, wind direction).
  Each reading stores its timestamp and all six sensor values in one row.
- `anomalies` — records produced by the Isolation Forest model when a reading
  is flagged anomalous: station, parameter, actual value, expected range,
  anomaly score, confidence %, severity, possible cause, recommended action,
  and acknowledged/resolved operator flags.
- `alerts` — operator-facing alert notifications derived from anomalies,
  with severity, message, confidence, and acknowledge/resolve workflow.
- `sensor_health` — per-station, per-sensor health percentages used by the
  Sensor Health diagnostics view.
- `ai_insights` — natural-language AI explanations for detected anomalies,
  including contributing factors (text[]) and recommended actions.
- `users` — demo operator profile (email, display name, region). Not auth —
  the app uses a demo gate. Kept simple for the hackathon.

## 2. Columns

### weather_stations
- id (text, primary key) — e.g. "guntur-01"
- name (text) — display name
- region (text) — city/region
- lat (numeric) — latitude
- lng (numeric) — longitude
- status (text) — 'normal' | 'warning' | 'anomaly'
- active (boolean) — online status
- installed_at (date)
- created_at (timestamptz)

### sensor_readings
- id (bigint identity, primary key)
- station_id (text, FK -> weather_stations.id)
- recorded_at (timestamptz) — when the reading was taken
- temperature, humidity, pressure, rainfall, wind_speed, wind_direction (double precision)
- is_anomaly (boolean, default false) — quick filter flag
- created_at (timestamptz)

### anomalies
- id (uuid, primary key)
- station_id (text, FK -> weather_stations.id)
- station_name (text) — denormalized for convenience
- parameter (text) — e.g. 'temperature'
- parameter_label (text)
- value (double precision)
- unit (text)
- expected_min, expected_max, expected_mid (double precision)
- anomaly_score (double precision) — 0..1
- confidence (integer) — 0..100
- severity (text) — 'normal' | 'warning' | 'high' | 'critical'
- possible_cause (text)
- recommended_action (text)
- acknowledged, resolved (boolean)
- detected_at (timestamptz)
- created_at (timestamptz)

### alerts
- id (uuid, primary key)
- station_id (text, FK -> weather_stations.id)
- station_name (text)
- severity (text)
- title (text)
- message (text)
- confidence (integer)
- acknowledged, resolved (boolean)
- created_at (timestamptz)

### sensor_health
- id (bigint identity, primary key)
- station_id (text, FK -> weather_stations.id)
- temperature, humidity, pressure, rainfall, wind_speed (integer, 0..100 health %)
- updated_at (timestamptz)

### ai_insights
- id (uuid, primary key)
- station_id (text, FK -> weather_stations.id)
- station_name (text)
- parameter (text)
- parameter_label (text)
- explanation (text)
- anomaly_probability (integer)
- contributing_factors (text[])
- recommended_action (text)
- created_at (timestamptz)

### users
- id (uuid, primary key)
- email (text, unique)
- display_name (text)
- region (text)
- created_at (timestamptz)

## 3. Indexes
- sensor_readings(station_id, recorded_at desc) — latest reading per station
- anomalies(station_id, detected_at desc) — station anomaly history
- anomalies(severity) — filter by severity
- alerts(severity, created_at desc) — alert panel ordering
- ai_insights(station_id, created_at desc)

## 4. Security
- RLS enabled on ALL tables.
- Single-tenant demo: every policy is TO anon, authenticated with USING/WITH
  CHECK (true) because the data is intentionally public/shared (the app has no
  real sign-in; the login is a demo gate).
- This is documented per-policy and is the correct pattern for this app.

## 5. Seed Data
- 5 weather_stations rows (Guntur, Vijayawada, Nellore, Amaravati, Ongole).
- 1 demo user (operator@aws-demo.gov).

## 6. Notes
- Sensor readings use bigint identity PK (high-volume time series).
- Anomalies/alerts/insights use uuid PKs (lower volume, client-generated IDs
  are replaced by database defaults so the client does not need to supply them).
- Foreign keys cascade on station deletion to keep data consistent.
*/

-- weather_stations
CREATE TABLE IF NOT EXISTS weather_stations (
  id text PRIMARY KEY,
  name text NOT NULL,
  region text NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  status text NOT NULL DEFAULT 'normal',
  active boolean NOT NULL DEFAULT true,
  installed_at date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE weather_stations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_stations" ON weather_stations;
CREATE POLICY "anon_select_stations" ON weather_stations FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_stations" ON weather_stations;
CREATE POLICY "anon_insert_stations" ON weather_stations FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_stations" ON weather_stations;
CREATE POLICY "anon_update_stations" ON weather_stations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_stations" ON weather_stations;
CREATE POLICY "anon_delete_stations" ON weather_stations FOR DELETE
  TO anon, authenticated USING (true);

-- sensor_readings
CREATE TABLE IF NOT EXISTS sensor_readings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id text NOT NULL REFERENCES weather_stations(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL,
  temperature double precision NOT NULL,
  humidity double precision NOT NULL,
  pressure double precision NOT NULL,
  rainfall double precision NOT NULL,
  wind_speed double precision NOT NULL,
  wind_direction double precision NOT NULL,
  is_anomaly boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_readings_station_time
  ON sensor_readings (station_id, recorded_at DESC);

ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_readings" ON sensor_readings;
CREATE POLICY "anon_select_readings" ON sensor_readings FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_readings" ON sensor_readings;
CREATE POLICY "anon_insert_readings" ON sensor_readings FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_readings" ON sensor_readings;
CREATE POLICY "anon_update_readings" ON sensor_readings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_readings" ON sensor_readings;
CREATE POLICY "anon_delete_readings" ON sensor_readings FOR DELETE
  TO anon, authenticated USING (true);

-- anomalies
CREATE TABLE IF NOT EXISTS anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id text NOT NULL REFERENCES weather_stations(id) ON DELETE CASCADE,
  station_name text NOT NULL,
  parameter text NOT NULL,
  parameter_label text NOT NULL,
  value double precision NOT NULL,
  unit text NOT NULL,
  expected_min double precision NOT NULL,
  expected_max double precision NOT NULL,
  expected_mid double precision NOT NULL,
  anomaly_score double precision NOT NULL,
  confidence integer NOT NULL,
  severity text NOT NULL,
  possible_cause text NOT NULL,
  recommended_action text NOT NULL,
  acknowledged boolean NOT NULL DEFAULT false,
  resolved boolean NOT NULL DEFAULT false,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_station_time
  ON anomalies (station_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity
  ON anomalies (severity);

ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_anomalies" ON anomalies;
CREATE POLICY "anon_select_anomalies" ON anomalies FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_anomalies" ON anomalies;
CREATE POLICY "anon_insert_anomalies" ON anomalies FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_anomalies" ON anomalies;
CREATE POLICY "anon_update_anomalies" ON anomalies FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_anomalies" ON anomalies;
CREATE POLICY "anon_delete_anomalies" ON anomalies FOR DELETE
  TO anon, authenticated USING (true);

-- alerts
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id text NOT NULL REFERENCES weather_stations(id) ON DELETE CASCADE,
  station_name text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  confidence integer NOT NULL,
  acknowledged boolean NOT NULL DEFAULT false,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_severity_time
  ON alerts (severity, created_at DESC);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_alerts" ON alerts;
CREATE POLICY "anon_select_alerts" ON alerts FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_alerts" ON alerts;
CREATE POLICY "anon_insert_alerts" ON alerts FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_alerts" ON alerts;
CREATE POLICY "anon_update_alerts" ON alerts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_alerts" ON alerts;
CREATE POLICY "anon_delete_alerts" ON alerts FOR DELETE
  TO anon, authenticated USING (true);

-- sensor_health
CREATE TABLE IF NOT EXISTS sensor_health (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id text NOT NULL REFERENCES weather_stations(id) ON DELETE CASCADE,
  temperature integer NOT NULL DEFAULT 100,
  humidity integer NOT NULL DEFAULT 100,
  pressure integer NOT NULL DEFAULT 100,
  rainfall integer NOT NULL DEFAULT 100,
  wind_speed integer NOT NULL DEFAULT 100,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (station_id)
);

ALTER TABLE sensor_health ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_sensor_health" ON sensor_health;
CREATE POLICY "anon_select_sensor_health" ON sensor_health FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sensor_health" ON sensor_health;
CREATE POLICY "anon_insert_sensor_health" ON sensor_health FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sensor_health" ON sensor_health;
CREATE POLICY "anon_update_sensor_health" ON sensor_health FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sensor_health" ON sensor_health;
CREATE POLICY "anon_delete_sensor_health" ON sensor_health FOR DELETE
  TO anon, authenticated USING (true);

-- ai_insights
CREATE TABLE IF NOT EXISTS ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id text NOT NULL REFERENCES weather_stations(id) ON DELETE CASCADE,
  station_name text NOT NULL,
  parameter text NOT NULL,
  parameter_label text NOT NULL,
  explanation text NOT NULL,
  anomaly_probability integer NOT NULL,
  contributing_factors text[] NOT NULL DEFAULT '{}',
  recommended_action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insights_station_time
  ON ai_insights (station_id, created_at DESC);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_insights" ON ai_insights;
CREATE POLICY "anon_select_insights" ON ai_insights FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_insights" ON ai_insights;
CREATE POLICY "anon_insert_insights" ON ai_insights FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_insights" ON ai_insights;
CREATE POLICY "anon_update_insights" ON ai_insights FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_insights" ON ai_insights;
CREATE POLICY "anon_delete_insights" ON ai_insights FOR DELETE
  TO anon, authenticated USING (true);

-- users (demo operator profile — not auth)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  display_name text NOT NULL DEFAULT 'Operator',
  region text NOT NULL DEFAULT 'Andhra Pradesh',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_delete_users" ON users FOR DELETE
  TO anon, authenticated USING (true);

-- Seed weather stations (idempotent via ON CONFLICT)
INSERT INTO weather_stations (id, name, region, lat, lng, status, active, installed_at) VALUES
  ('guntur-01', 'Guntur AWS-01', 'Guntur', 16.3067, 80.4365, 'normal', true, '2021-03-12'),
  ('vijayawada-02', 'Vijayawada AWS-02', 'Vijayawada', 16.5062, 80.6480, 'normal', true, '2020-11-04'),
  ('nellore-03', 'Nellore AWS-03', 'Nellore', 14.4426, 79.9865, 'normal', true, '2022-06-21'),
  ('amaravati-04', 'Amaravati AWS-04', 'Amaravati', 16.5148, 80.5203, 'normal', true, '2023-01-15'),
  ('ongole-05', 'Ongole AWS-05', 'Ongole', 15.5042, 80.0465, 'normal', true, '2019-09-30')
ON CONFLICT (id) DO NOTHING;

-- Seed default sensor_health rows
INSERT INTO sensor_health (station_id, temperature, humidity, pressure, rainfall, wind_speed)
SELECT id, 96, 92, 98, 88, 90 FROM weather_stations
WHERE NOT EXISTS (SELECT 1 FROM sensor_health sh WHERE sh.station_id = weather_stations.id);

-- Seed demo user
INSERT INTO users (email, display_name, region) VALUES
  ('operator@aws-demo.gov', 'Operator', 'Andhra Pradesh')
ON CONFLICT (email) DO NOTHING;
