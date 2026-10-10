# Implementation notes

## Why two versions?

The [original project](https://gitlab.com/nyan-lin-tun/aws-serverless-weather) demonstrates AWS services written in TypeScript, Python, Go, and Java. This version makes the weather experience available as a static demo, without keeping AWS resources running.

The tradeoff is deliberate: the browser calls Open-Meteo directly and computes advice locally. There is no private service boundary, server rendering, or public `/api/*` endpoint. JavaScript and access to Open-Meteo are required.

## Behavior comparison

Compared against the local original checkout at commit `2999631`.

| Behavior | TypeScript demo |
| --- | --- |
| Default city | New York, same coordinates |
| City search | 2–100 characters, six results, region/country labels |
| Selected location | Name and coordinates in the URL; coordinates below the heading |
| Forecast | Current conditions, feels-like, wind, rain probability, seven days; °C and km/h |
| Advice | Same text, ordering, and strict thresholds as the Java implementation |
| Incomplete weather response | Error view |
| Invalid advice inputs | Forecast remains visible with the original unavailable message |
| Invalid coordinates | Error view rather than a New York fallback |
| Device location | Same permission messages, timeout, and four-decimal coordinates |
| Design | Original templates and CSS, with small narrow-screen spacing fixes |

The browser uses a 15-second request timeout rather than reproducing several backend timeouts. Navigation updates content without a full reload. Requests are aborted when superseded; a revision counter also rejects late responses and location callbacks. Neither behavior depends on scheduling delays.

## Advice rules

Temperature below 0°C: coat, hat, and gloves. Below 10°C: warm jacket. Below 18°C: light layer. At or above 28°C: water and shade.

Wind above 40 km/h adds sheltered-route advice. Rain probability above 60% adds an umbrella recommendation, or a waterproof jacket when wind is also above 40 km/h. If no rule applies, the original comfortable-conditions message is shown.

## Where to make changes

- `src/api.ts`: requests, response validation, location selection.
- `src/advice.ts`: pure advice rules ported from Java.
- `src/main.ts`: browser navigation and device location.
- `src/view.ts`, `src/templates/`, `src/style.css`: presentation.

Untrusted text is escaped before HTML interpolation. Provider dates are formatted without shifting them into the visitor’s timezone. Device coordinates are sent to Open-Meteo and included in the selected-location URL.

## Verification

`npm run lint`, `npm test`, and `npm run build` run in GitHub Actions. Advice tests use expected outputs from the original Java tests, including boundary values and wind/rain combinations. Other tests cover search limits, query parameters, missing data, invalid locations, and HTML escaping. Network calls are mocked.

Before demonstrating: check a live New York forecast, search and select another city, use browser back/forward, and check denied location permission and a narrow viewport. Live weather values may differ between visits because the provider updates its forecasts.

## Cost

Use a public GitHub repository and the provided `github.io` address for free hosting. No custom domain, API key, AWS account, or paid service is required. Open-Meteo’s free endpoint is for non-commercial use and has rate limits and no uptime guarantee; see its [pricing and terms](https://open-meteo.com/en/pricing).
