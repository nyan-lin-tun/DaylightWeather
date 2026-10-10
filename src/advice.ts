import type { Forecast } from "./types";

/** Port of weather-advice/src/weather/Advice.java, including strict boundaries. */
export function advice(forecast: Forecast): string[] | null {
  const { temperatureC: temperature, windSpeedKmh: wind } = forecast.current;
  const rain = forecast.daily[0].rainProbabilityPercent;
  if (
    temperature === null ||
    wind === null ||
    rain === null ||
    !Number.isFinite(temperature) ||
    !Number.isFinite(wind) ||
    !Number.isFinite(rain) ||
    temperature < -100 ||
    temperature > 70 ||
    wind < 0 ||
    wind > 500 ||
    rain < 0 ||
    rain > 100
  )
    return null;

  const tips: string[] = [];
  if (temperature < 0) tips.push("Wrap up with a warm coat, hat, and gloves.");
  else if (temperature < 10) tips.push("Wear a warm jacket.");
  else if (temperature < 18)
    tips.push("Bring a light layer for cooler moments.");
  else if (temperature >= 28)
    tips.push("Carry water and take breaks in the shade.");

  const strongWind = wind > 40;
  if (strongWind) tips.push("Expect strong winds; choose a sheltered route.");
  if (rain > 60)
    tips.push(
      strongWind
        ? "Bring a waterproof jacket rather than an umbrella."
        : "Bring an umbrella or waterproof jacket.",
    );
  if (!tips.length)
    tips.push("Comfortable conditions for spending time outside.");
  return tips;
}
