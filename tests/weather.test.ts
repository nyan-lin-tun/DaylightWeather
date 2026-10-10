import { describe, expect, it, vi, afterEach } from "vitest";
import { advice } from "../src/advice";
import {
  parseForecast,
  locationFromQuery,
  NEW_YORK,
  search,
  forecast,
} from "../src/api";
import { render } from "../src/view";
const fixture = () => ({
  timezone: "America/New_York",
  current: {
    time: "2026-10-10T12:00",
    temperature_2m: 4,
    apparent_temperature: 1,
    wind_speed_10m: 31,
    weather_code: 95,
    is_day: 1,
  },
  daily: {
    time: ["2026-10-10"],
    temperature_2m_min: [1],
    temperature_2m_max: [10],
    precipitation_probability_max: [70],
    weather_code: [95],
  },
});
afterEach(() => vi.unstubAllGlobals());
describe("forecast boundary", () => {
  it("maps provider units and rejects missing current measurements", () => {
    const data = fixture();
    const result = parseForecast(data);
    expect(result.current.temperatureC).toBe(4);
    expect(() =>
      parseForecast({
        ...data,
        current: { ...data.current, temperature_2m: null },
      }),
    ).toThrow();
    expect(result.daily[0].rainProbabilityPercent).toBe(70);
  });
  it("rejects empty and malformed payloads", () => {
    expect(() => parseForecast({})).toThrow();
    expect(() =>
      parseForecast({ ...fixture(), daily: { time: [] } }),
    ).toThrow();
  });
  it("defaults absent coordinates to New York and rejects invalid coordinates", () => {
    expect(locationFromQuery(new URLSearchParams())).toEqual(NEW_YORK);
    for (const query of [
      "lat=91&lon=0",
      "lat=x&lon=1",
      "lat=&lon=0",
      "lat=1",
      "lon=1",
    ])
      expect(() => locationFromQuery(new URLSearchParams(query))).toThrow(
        "valid location",
      );
    expect(locationFromQuery(new URLSearchParams("lat=0&lon=0")).latitude).toBe(
      0,
    );
  });
  it("requests seven days in local time directly from Open-Meteo", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => fixture() });
    vi.stubGlobal("fetch", fetcher);
    await forecast(NEW_YORK, new AbortController().signal);
    const url = fetcher.mock.calls[0][0] as URL;
    expect(url.hostname).toBe("api.open-meteo.com");
    expect(url.searchParams.get("forecast_days")).toBe("7");
    expect(url.searchParams.get("timezone")).toBe("auto");
  });
  it("handles no search results and provider rate limits", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );
    expect(await search("unknown", new AbortController().signal)).toEqual([]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429 }),
    );
    await expect(search("Paris", new AbortController().signal)).rejects.toThrow(
      "temporarily unavailable",
    );
  });
});
describe("browser advice and presentation", () => {
  // Expected outputs are ported from the original Java AdviceTest cases.
  it.each([
    [-1, "Wrap up with a warm coat, hat, and gloves."],
    [0, "Wear a warm jacket."],
    [9.9, "Wear a warm jacket."],
    [10, "Bring a light layer for cooler moments."],
    [17.9, "Bring a light layer for cooler moments."],
    [18, "Comfortable conditions for spending time outside."],
    [27.9, "Comfortable conditions for spending time outside."],
    [28, "Carry water and take breaks in the shade."],
  ])(
    "matches the original temperature rule at %s°C",
    (temperature, expected) => {
      const data = parseForecast(fixture());
      data.current.temperatureC = temperature as number;
      data.current.windSpeedKmh = 0;
      data.daily[0].rainProbabilityPercent = 0;
      expect(advice(data)).toEqual([expected]);
    },
  );
  it.each([
    [
      8,
      85,
      30,
      ["Wear a warm jacket.", "Bring an umbrella or waterproof jacket."],
    ],
    [
      20,
      90,
      60,
      [
        "Expect strong winds; choose a sheltered route.",
        "Bring a waterproof jacket rather than an umbrella.",
      ],
    ],
    [20, 60, 40, ["Comfortable conditions for spending time outside."]],
    [20, 60.1, 0, ["Bring an umbrella or waterproof jacket."]],
    [20, 0, 40.1, ["Expect strong winds; choose a sheltered route."]],
  ])(
    "matches original advice for %s°C, %s%% rain, %s km/h",
    (temperature, rain, wind, expected) => {
      const data = parseForecast(fixture());
      data.current.temperatureC = temperature;
      data.current.windSpeedKmh = wind;
      data.daily[0].rainProbabilityPercent = rain;
      expect(advice(data)).toEqual(expected);
    },
  );
  it.each([null, NaN, Infinity, -101, 71])(
    "marks invalid advice input %s unavailable without losing the forecast",
    (temperature) => {
      const data = parseForecast(fixture());
      data.current.temperatureC = temperature;
      expect(advice(data)).toBeNull();
      data.adviceUnavailable = true;
      const html = render({
        q: "",
        title: "NYC",
        subtitle: "",
        forecast: data,
        error: null,
        locations: null,
      });
      expect(html).toContain("Daily suggestions are temporarily unavailable");
      expect(html).toContain("The week ahead");
    },
  );
  it("escapes untrusted location names and keeps project-relative links", () => {
    const html = render({
      q: "<script>",
      title: "",
      subtitle: "",
      forecast: null,
      error: null,
      locations: [{ ...NEW_YORK, name: "<img onerror=alert(1)>" }],
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
    expect(html).toContain('href="./?');
  });
  it("renders missing measurements as dashes and unknown WMO codes honestly", () => {
    const data = parseForecast(fixture());
    data.current.temperatureC = null;
    data.current.weatherCode = 100;
    const html = render({
      q: "",
      title: "NYC",
      subtitle: "",
      forecast: data,
      error: null,
      locations: null,
    });
    expect(html).toContain("Unknown conditions");
    expect(html).toContain("—");
  });
});

describe("original search and provider behavior", () => {
  it.each(["a", "x".repeat(101)])(
    "rejects invalid search length without a request",
    async (query) => {
      const fetcher = vi.fn();
      vi.stubGlobal("fetch", fetcher);
      await expect(search(query, new AbortController().signal)).rejects.toThrow(
        "between 2 and 100",
      );
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("requests six city choices and preserves region labels", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              name: "Paris",
              latitude: 48.85,
              longitude: 2.35,
              admin1: "Île-de-France",
              country: "France",
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetcher);
    expect(
      (await search(" Paris ", new AbortController().signal))[0].region,
    ).toBe("Île-de-France");
    expect((fetcher.mock.calls[0][0] as URL).searchParams.get("count")).toBe(
      "6",
    );
  });
  it("rejects provider errors and incomplete daily arrays", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ error: true }) }),
    );
    await expect(
      search("Paris", new AbortController().signal),
    ).rejects.toThrow();
    const data = fixture();
    data.daily.temperature_2m_min = [];
    expect(() => parseForecast(data)).toThrow();
  });
});
