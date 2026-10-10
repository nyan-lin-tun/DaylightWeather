# Daylight Weather

A standalone demo of [aws-serverless-weather](https://gitlab.com/nyan-lin-tun/aws-serverless-weather), built with TypeScript and Vite for GitHub Pages. Forecasts come directly from Open-Meteo, and weather advice is generated in the browser. No AWS setup is required.

**Live demo:** [nyanlintun.me/DaylightWeather](http://nyanlintun.me/DaylightWeather/)

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

## About the demo

This version ports the original app’s city search, forecasts, validation, and clothing/rain advice to TypeScript. The UI uses the same templates and styling. See [implementation notes](docs/implementation.md) for the comparison and test coverage.

Hosting uses GitHub Pages; requests go directly to Open-Meteo. A public repository can use GitHub Pages on GitHub Free. Open-Meteo’s free API allows non-commercial use within its [usage limits](https://open-meteo.com/en/pricing).

## Data and license

Weather: [Open-Meteo](https://open-meteo.com/), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). City data: GeoNames via Open-Meteo. Check the provider's usage terms before commercial deployment.

API documentation: [Forecast](https://open-meteo.com/en/docs) · [Geocoding](https://open-meteo.com/en/docs/geocoding-api)

Code: [MIT](LICENSE).
