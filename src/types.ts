export interface Location {
  name: string;
  region?: string | null;
  country?: string | null;
  latitude: number;
  longitude: number;
}

export interface CurrentWeather {
  temperatureC: number | null;
  feelsLikeC: number | null;
  windSpeedKmh: number | null;
  weatherCode: number | null;
  time: string;
}

export interface DailyWeather {
  date: string;
  minC: number | null;
  maxC: number | null;
  rainProbabilityPercent: number | null;
  weatherCode: number | null;
}

export interface Forecast {
  timezone: string;
  current: CurrentWeather;
  daily: [DailyWeather, ...DailyWeather[]];
  advice?: { suggestions: string[] } | null;
}

export interface PageModel {
  q: string;
  title: string;
  subtitle: string;
  forecast: Forecast | null;
  locations: Location[] | null;
  error: string | null;
}

