import type { Forecast } from './types';
/** Pure, ordered rules. Values remain in Celsius and km/h throughout the app. */
export function advice(forecast: Forecast): string[] {
  const { temperatureC: temperature, windSpeedKmh: wind, weatherCode: code } = forecast.current;
  const rain = forecast.daily[0].rainProbabilityPercent;
  const tips: string[] = [];
  if (code !== null && [95, 96, 99].includes(code)) tips.push('Thunderstorms are possible. Plan indoor alternatives.');
  if (temperature !== null) tips.push(temperature <= 5 ? 'Wrap up warm; a coat and layers will help.' : temperature >= 28 ? 'Keep water handy and take breaks in the shade.' : 'Light layers will help you adjust through the day.');
  if (rain !== null && rain >= 40) tips.push('Bring an umbrella or a waterproof layer.');
  if (wind !== null && wind >= 30) tips.push('Expect a breeze; choose a wind-resistant outer layer.');
  if (!tips.length) tips.push('Some weather details are unavailable. Check local conditions before heading out.');
  return tips;
}
