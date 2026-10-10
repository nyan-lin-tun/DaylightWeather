import './style.css';
import { forecast, search, locationFromQuery } from './api';
import { advice } from './advice';
import { render } from './view';
import type { PageModel } from './types';
const main = document.querySelector<HTMLElement>('#main-content')!;
const status = document.querySelector<HTMLElement>('#location-status')!;
const input = document.querySelector<HTMLInputElement>('#city')!;
const locate = document.querySelector<HTMLButtonElement>('#locate')!;
let controller = new AbortController();
let revision = 0;
async function load() {
  controller.abort();
  controller = new AbortController();
  const signal = controller.signal;
  const version = ++revision;
  locate.disabled = false;
  const params = new URLSearchParams(location.search);
  const q = params.get('q')?.trim().slice(0, 100) || '';
  input.value = q;
  main.setAttribute('aria-busy', 'true');
  status.textContent = q ? 'Searching cities…' : 'Loading forecast…';
  const model: PageModel = { q, title: '', subtitle: '', forecast: null, locations: null, error: null };
  try {
    if (q) {
      model.locations = q.length >= 2 ? await search(q, signal) : [];
    } else {
      const place = locationFromQuery(params);
      model.title = place.name;
      model.subtitle = [place.region, place.country].filter(Boolean).join(', ') || 'Your local weather outlook';
      model.forecast = await forecast(place, signal);
      model.forecast.advice = { suggestions: advice(model.forecast) };
    }
  } catch (error) {
    if (signal.aborted) return;
    model.error = error instanceof Error ? error.message : 'Unable to load weather. Please try again.';
  }
  // A newer navigation owns the view, even when a superseded request finishes late.
  if (version !== revision) return;
  main.innerHTML = render(model);
  main.removeAttribute('aria-busy');
  status.textContent = model.error ? 'Unable to update weather.' : q ? `${model.locations?.length ?? 0} cities found.` : `Forecast for ${model.title} loaded.`;
  document.title = model.title ? `${model.title} weather · Daylight` : 'Find your forecast · Daylight';
}
function navigate(url: URL) { history.pushState(null, '', url); void load(); }
document.querySelector('form')!.addEventListener('submit', event => {
  event.preventDefault();
  const url = new URL(location.href); url.search = new URLSearchParams({ q: input.value.trim() }).toString(); navigate(url);
});
main.addEventListener('click', event => {
  const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a');
  if (!link || (event as MouseEvent).ctrlKey || (event as MouseEvent).metaKey || (event as MouseEvent).shiftKey || (event as MouseEvent).altKey) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin) return;
  event.preventDefault(); navigate(url);
});
window.addEventListener('popstate', () => void load());
locate.addEventListener('click', () => {
  if (!navigator.geolocation) { status.textContent = 'Location access is unavailable. Search for a city instead.'; return; }
  const version = ++revision;
  controller.abort();
  main.removeAttribute('aria-busy');
  locate.disabled = true;
  status.textContent = 'Finding your location…';
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    if (version !== revision) return;
    const url = new URL(location.href);
    url.search = new URLSearchParams({ lat: String(coords.latitude), lon: String(coords.longitude), name: 'Your location' }).toString();
    navigate(url);
  }, () => {
    if (version !== revision) return;
    locate.disabled = false;
    status.textContent = 'Could not access your location. Search for a city instead.';
  }, { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false });
});
void load();
