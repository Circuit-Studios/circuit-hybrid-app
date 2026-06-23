# Circuit brand assets

**Source of truth:** `circuit-logo.svg`

All in-app branding (`CircuitLogo`) renders the SVG directly.

Raster exports for native tooling (Expo `app.json`, iOS App Icon, splash screen) are generated from the same SVG:

```bash
npm run generate:brand
```

Then rebuild the native app if home-screen icon or splash changed.

`circuit-logo.png` is optional reference artwork only — do not import it in the app.
