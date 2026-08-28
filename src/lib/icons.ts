import type { WeatherParam } from '@/types';
import {
  Thermometer, Droplets, Gauge, CloudRain, Wind, Compass,
  type LucideIcon,
} from 'lucide-react';

export const PARAM_ICONS: Record<string, LucideIcon> = {
  Thermometer,
  Droplets,
  Gauge,
  CloudRain,
  Wind,
  Compass,
};

export function paramIcon(name: string): LucideIcon {
  return PARAM_ICONS[name] ?? Thermometer;
}

export function paramIconByKey(key: WeatherParam): LucideIcon {
  const map: Record<WeatherParam, LucideIcon> = {
    temperature: Thermometer,
    humidity: Droplets,
    pressure: Gauge,
    rainfall: CloudRain,
    windSpeed: Wind,
    windDirection: Compass,
  };
  return map[key];
}
