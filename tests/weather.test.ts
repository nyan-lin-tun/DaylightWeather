import { describe, expect, it, vi, afterEach } from 'vitest';
import { advice } from '../src/advice';
import { parseForecast, locationFromQuery, NEW_YORK, search, forecast } from '../src/api';
import { render } from '../src/view';
const fixture = () => ({ timezone: 'America/New_York', current: { time: '2026-10-10T12:00', temperature_2m: 4, apparent_temperature: 1, wind_speed_10m: 31, weather_code: 95 }, daily: { time: ['2026-10-10'], temperature_2m_min: [1], temperature_2m_max: [10], precipitation_probability_max: [70], weather_code: [95] } });
afterEach(() => vi.unstubAllGlobals());
describe('forecast boundary', () => {
  it('maps provider units and missing values without turning null into zero', () => {
    const data = fixture(); const result = parseForecast(data);
    expect(result.current.temperatureC).toBe(4);
    expect(parseForecast({ ...data, current: { ...data.current, temperature_2m: null } }).current.temperatureC).toBeNull();
    expect(result.daily[0].rainProbabilityPercent).toBe(70);
  });
  it('rejects empty and malformed payloads', () => {
    expect(() => parseForecast({})).toThrow();
    expect(() => parseForecast({ ...fixture(), daily: { time: [] } })).toThrow();
  });
  it('defaults invalid coordinates to New York, but accepts zero', () => {
    for (const query of ['', 'lat=91&lon=0', 'lat=x&lon=1', 'lat=&lon=0']) expect(locationFromQuery(new URLSearchParams(query))).toEqual(NEW_YORK);
    expect(locationFromQuery(new URLSearchParams('lat=0&lon=0')).latitude).toBe(0);
  });
  it('requests seven days in local time directly from Open-Meteo', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => fixture() }); vi.stubGlobal('fetch', fetcher);
    await forecast(NEW_YORK, new AbortController().signal);
    const url = fetcher.mock.calls[0][0] as URL;
    expect(url.hostname).toBe('api.open-meteo.com');
    expect(url.searchParams.get('forecast_days')).toBe('7');
    expect(url.searchParams.get('timezone')).toBe('auto');
  });
  it('handles no search results and provider rate limits', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    expect(await search('unknown', new AbortController().signal)).toEqual([]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    await expect(search('Paris', new AbortController().signal)).rejects.toThrow('busy');
  });
});
describe('browser advice and presentation', () => {
  it('prioritizes storms and includes cold, rain and wind advice', () => {
    const tips = advice(parseForecast(fixture()));
    expect(tips[0]).toContain('Thunderstorms'); expect(tips.join(' ')).toContain('coat'); expect(tips).toHaveLength(4);
  });
  it('handles heat and wholly missing inputs', () => {
    const data = parseForecast(fixture()); data.current.temperatureC = 30;
    expect(advice(data).join(' ')).toContain('water');
    data.current = { time: '', temperatureC: null, feelsLikeC: null, windSpeedKmh: null, weatherCode: null };
    data.daily[0].rainProbabilityPercent = null;
    expect(advice(data)[0]).toContain('unavailable');
  });
  it('escapes untrusted location names and keeps project-relative links', () => {
    const html = render({ q: '<script>', title: '', subtitle: '', forecast: null, error: null, locations: [{ ...NEW_YORK, name: '<img onerror=alert(1)>' }] });
    expect(html).not.toContain('<img'); expect(html).toContain('&lt;img'); expect(html).toContain('href="./?');
  });
  it('renders missing measurements as dashes and unknown WMO codes honestly', () => {
    const data = parseForecast(fixture()); data.current.temperatureC = null; data.current.weatherCode = 97;
    const html = render({ q: '', title: 'NYC', subtitle: '', forecast: data, error: null, locations: null });
    expect(html).toContain('Unknown conditions'); expect(html).toContain('—');
  });
});
