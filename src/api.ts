import type { Forecast, Location } from './types';
export const NEW_YORK: Location = { name: 'New York', region: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006 };
type RecordValue = Record<string, unknown>;
function object(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Weather service returned an invalid response.');
  return value as RecordValue;
}
const number = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
const text = (value: unknown): string => typeof value === 'string' ? value : '';
export function parseForecast(value: unknown): Forecast {
  const data = object(value), current = object(data.current), daily = object(data.daily);
  if (!Array.isArray(daily.time) || !daily.time.length || !text(current.time) || !text(data.timezone)) throw new Error('Weather service returned an incomplete forecast.');
  const field = (key: string, i: number) => number(Array.isArray(daily[key]) ? daily[key][i] : null);
  const days = daily.time.map((date, i) => {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid forecast date.');
    return { date, minC: field('temperature_2m_min', i), maxC: field('temperature_2m_max', i), rainProbabilityPercent: field('precipitation_probability_max', i), weatherCode: field('weather_code', i) };
  });
  return { timezone: text(data.timezone), current: { time: text(current.time), temperatureC: number(current.temperature_2m), feelsLikeC: number(current.apparent_temperature), windSpeedKmh: number(current.wind_speed_10m), weatherCode: number(current.weather_code) }, daily: days as Forecast['daily'] };
}
async function request(url: URL, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
  if (!response.ok) throw new Error(response.status === 429 ? 'The weather service is busy. Please try again shortly.' : 'Could not load weather. Please try again.');
  return response.json();
}
export async function forecast(location: Location, signal: AbortSignal): Promise<Forecast> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude), current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m', daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max', timezone: 'auto', forecast_days: '7', temperature_unit: 'celsius', wind_speed_unit: 'kmh' }).toString();
  return parseForecast(await request(url, signal));
}
export async function search(query: string, signal: AbortSignal): Promise<Location[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.search = new URLSearchParams({ name: query, count: '8', language: 'en', format: 'json' }).toString();
  const data = object(await request(url, signal));
  if (data.results === undefined) return [];
  if (!Array.isArray(data.results)) throw new Error('Invalid city search response.');
  return data.results.map(object).filter(row => number(row.latitude) !== null && number(row.longitude) !== null && text(row.name)).map(row => ({ name: text(row.name), region: text(row.admin1), country: text(row.country), latitude: row.latitude as number, longitude: row.longitude as number }));
}
export function locationFromQuery(params: URLSearchParams): Location {
  const lat = params.get('lat'), lon = params.get('lon');
  const latitude = Number(lat), longitude = Number(lon);
  if (!lat?.trim() || !lon?.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return NEW_YORK;
  return { latitude, longitude, name: params.get('name')?.slice(0, 100) || 'Selected location' };
}
