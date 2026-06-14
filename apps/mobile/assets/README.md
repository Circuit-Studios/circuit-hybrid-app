# Circuit brand assets

**Source of truth:** `circuit-logo.svg`

All in-app branding (`CircuitLogo`) renders the SVG directly.

These PNG files are **generated exports** for native tooling (Expo `app.json`, iOS App Icon, splash screen). Do not edit them by hand — regenerate after changing the SVG:

```bash
npm run generate:brand
```

Then rebuild the native app if home-screen icon or splash changed.
