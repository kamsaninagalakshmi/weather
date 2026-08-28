import type { ParamMeta, Station, WeatherParam } from '@/types';

export const PARAMS: ParamMeta[] = [
  { key: 'temperature', label: 'Temperature', unit: '°C', icon: 'Thermometer', normalMin: 24, normalMax: 38, typical: 30, decimals: 1 },
  { key: 'humidity', label: 'Humidity', unit: '%', icon: 'Droplets', normalMin: 40, normalMax: 90, typical: 68, decimals: 0 },
  { key: 'pressure', label: 'Pressure', unit: 'hPa', icon: 'Gauge', normalMin: 990, normalMax: 1025, typical: 1008, decimals: 0 },
  { key: 'rainfall', label: 'Rainfall', unit: 'mm', icon: 'CloudRain', normalMin: 0, normalMax: 35, typical: 4, decimals: 1 },
  { key: 'windSpeed', label: 'Wind Speed', unit: 'km/h', icon: 'Wind', normalMin: 0, normalMax: 45, typical: 18, decimals: 1 },
  { key: 'windDirection', label: 'Wind Direction', unit: '°', icon: 'Compass', normalMin: 0, normalMax: 360, typical: 180, decimals: 0 },
];

export const PARAM_MAP: Record<WeatherParam, ParamMeta> = PARAMS.reduce((acc, p) => {
  acc[p.key] = p;
  return acc;
}, {} as Record<WeatherParam, ParamMeta>);

export const STATIONS: Station[] = [
  { id: 'guntur-01', name: 'Guntur AWS-01', region: 'Guntur', lat: 16.3067, lng: 80.4365, status: 'normal', active: true, installedAt: '2021-03-12' },
  { id: 'vijayawada-02', name: 'Vijayawada AWS-02', region: 'Vijayawada', lat: 16.5062, lng: 80.6480, status: 'normal', active: true, installedAt: '2020-11-04' },
  { id: 'nellore-03', name: 'Nellore AWS-03', region: 'Nellore', lat: 14.4426, lng: 79.9865, status: 'normal', active: true, installedAt: '2022-06-21' },
  { id: 'amaravati-04', name: 'Amaravati AWS-04', region: 'Amaravati', lat: 16.5148, lng: 80.5203, status: 'normal', active: true, installedAt: '2023-01-15' },
  { id: 'ongole-05', name: 'Ongole AWS-05', region: 'Ongole', lat: 15.5042, lng: 80.0465, status: 'normal', active: true, installedAt: '2019-09-30' },
];

export const STATION_MAP: Record<string, Station> = STATIONS.reduce((acc, s) => {
  acc[s.id] = s;
  return acc;
}, {} as Record<string, Station>);
