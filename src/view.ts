import type { DailyWeather, Forecast, Location, PageModel } from './types.js';
const templates = import.meta.glob('./templates/*.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
function template(name: string, values: Record<string, string | number> = {}): string {
  const source = templates[`./templates/${name}.html`];
  if (!source) throw new Error(`Missing template: ${name}`);
  return source.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (!Object.hasOwn(values, key)) throw new Error(`Missing template value: ${name}.${key}`);
    return String(values[key]);
  });
}

export const escape = (value: unknown): string =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      (
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        }) as Record<string, string>
      )[char],
  );
const round = (value: number | null) =>
  value !== null && Number.isFinite(value) ? Math.round(value) : '—';
const dayName = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en', {
    weekday: 'short',
    timeZone: 'UTC',
  });
const longDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
// Open-Meteo WMO codes: https://open-meteo.com/en/docs#weathervariables
type IconKind = 'sun' | 'partly' | 'cloud' | 'rain' | 'snow' | 'storm';

interface WeatherCondition {
  codes: number[];
  label: string;
  icon: IconKind;
}

// Explicit groups preserve gaps in the provider's code list.
const weatherConditions: WeatherCondition[] = [
  { codes: [0], label: 'Clear sky', icon: 'sun' },
  { codes: [1, 2], label: 'Partly cloudy', icon: 'partly' },
  { codes: [3], label: 'Overcast', icon: 'cloud' },
  { codes: [45, 48], label: 'Foggy', icon: 'cloud' },
  {
    codes: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67],
    label: 'Rainy',
    icon: 'rain',
  },
  { codes: [71, 73, 75, 77], label: 'Snowy', icon: 'snow' },
  { codes: [80, 81, 82], label: 'Rain showers', icon: 'rain' },
  { codes: [85, 86], label: 'Snow showers', icon: 'snow' },
  { codes: [95, 96, 99], label: 'Thunderstorms', icon: 'storm' },
];

function condition(code: number | null): [string, IconKind] {
  const match = weatherConditions.find(
    (group) => code !== null && group.codes.includes(code),
  );
  return match ? [match.label, match.icon] : ['Unknown conditions', 'cloud'];
}

function icon(kind: IconKind, extra = '') {
  const sun = template('icon-sun');
  const cloud = template('icon-cloud');
  let body = cloud;
  let marks = '';
  switch (kind) {
    case 'sun':
      body = sun;
      break;
    case 'partly':
      body = template('partly-cloudy', { sun, cloud });
      break;
    case 'rain':
      marks = template('icon-rain');
      break;
    case 'snow':
      marks = template('icon-snow');
      break;
    case 'storm':
      marks = template('icon-storm');
      break;
  }
  return template('icon', { className: extra, body, marks });
}
function dayView(day: DailyWeather, index: number) {
  const [description, iconKind] = condition(day.weatherCode);
  const isToday = index === 0;
  return template('day', {
    className: isToday ? 'today' : '',
    day: isToday ? 'Today' : escape(dayName(day.date)),
    date: escape(day.date.slice(5).replace('-', '/')),
    icon: icon(iconKind),
    condition: description,
    high: round(day.maxC),
    low: round(day.minC),
    rain: round(day.rainProbabilityPercent),
  });
}

function adviceView(forecast: Forecast) {
  const suggestions = forecast.advice?.suggestions || [];
  return template('advice', {
    suggestions: suggestions
      .map((suggestion) =>
        template('suggestion', { suggestion: escape(suggestion) }),
      )
      .join(''),
  });
}

function forecastView(model: PageModel) {
  const forecast = model.forecast;
  if (!forecast) throw new Error('Cannot render a page without a forecast.');
  const current = forecast.current;
  const today = forecast.daily[0];
  const [description, kind] = condition(current.weatherCode);
  return template('forecast', {
    title: escape(model.title),
    subtitle: escape(model.subtitle),
    date: escape(longDate(today.date)),
    timezone: escape(forecast.timezone.replaceAll('_', ' ')),
    temperature: round(current.temperatureC),
    condition: description,
    feelsLike: round(current.feelsLikeC),
    high: round(today.maxC),
    low: round(today.minC),
    icon: icon(kind, 'hero-icon'),
    updated: escape(current.time.slice(11, 16)),
    advice: adviceView(forecast),
    wind: round(current.windSpeedKmh),
    rain: round(today.rainProbabilityPercent),
    days: forecast.daily.map(dayView).join(''),
  });
}
function locationView(location: Location) {
  const query = new URLSearchParams({
    lat: String(location.latitude),
    lon: String(location.longitude),
    name: location.name,
  });
  return template('location', {
    query: escape(query),
    name: escape(location.name),
    region: escape(
      [location.region, location.country].filter(Boolean).join(', '),
    ),
  });
}

function contentView(model: PageModel) {
  if (model.error) return template('error', { message: escape(model.error) });
  if (model.locations !== null) {
    return template('search-results', {
      query: escape(model.q),
      locations: model.locations.length
        ? model.locations.map(locationView).join('')
        : template('no-locations'),
    });
  }
  return forecastView(model);
}

export const render = contentView;
