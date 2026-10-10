# Daylight Weather

A standalone demo of [aws-serverless-weather](https://gitlab.com/nyan-lin-tun/aws-serverless-weather), built with TypeScript and Vite for GitHub Pages. Forecasts come directly from Open-Meteo, and weather advice is generated in the browser. No AWS setup is required.

Starts in New York. Supports city search, device location, and a seven-day forecast. Temperatures are in °C; wind speed is in km/h.

## Development

Requires Node.js 22.14+ and npm. No API keys or environment variables are needed.

```sh
npm ci
npm run dev
```

Other commands:

| Command | Purpose |
| --- | --- |
| `npm run lint` | Check JavaScript and TypeScript with ESLint |
| `npm test` | Run tests with mocked API responses |
| `npm run build` | Typecheck and build to `dist/` |
| `npm run preview` | Serve the production build locally |

## Deployment

In the GitHub repository, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**, then push to `main`.

The [Pages workflow](.github/workflows/pages.yml) runs lint, tests, and the build before deploying. Pull requests run the same checks without deploying. For another default branch, update the branch references in the workflow.

Assets and navigation use relative paths, so the build works under a repository path or a custom domain.

## Source

| File | Responsibility |
| --- | --- |
| `src/api.ts` | Open-Meteo requests, response validation, default location |
| `src/advice.ts` | Weather advice rules |
| `src/main.ts` | Search, navigation, geolocation, request cancellation |
| `src/types.ts` | Shared data types |
| `src/view.ts`, `src/templates/` | HTML rendering and escaping |
| `src/style.css` | Layout and styling |
| `tests/weather.test.ts` | API, advice, and rendering tests |

The design is adapted from the original repository’s `weather-page` app.

Advice thresholds live in `src/advice.ts`: cold at ≤5°C, heat at ≥28°C, rain probability at ≥40%, and wind at ≥30 km/h. Storm advice takes priority. These rules do not include official weather alerts.

Requests time out after 15 seconds. New navigation cancels the previous request; a request revision also prevents late responses or location callbacks from replacing newer results. Missing measurements display as a dash.

Device location requires permission and HTTPS or localhost. Selected coordinates appear in the URL and are sent to Open-Meteo.

Before a release, check city search, back/forward navigation, denied location access, network errors, keyboard navigation, and the mobile layout. Automated tests do not call the live API.

## Data and license

Weather: [Open-Meteo](https://open-meteo.com/), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). City data: GeoNames via Open-Meteo. Check the provider's usage terms before commercial deployment.

API documentation: [Forecast](https://open-meteo.com/en/docs) · [Geocoding](https://open-meteo.com/en/docs/geocoding-api)

Code: [MIT](LICENSE).
