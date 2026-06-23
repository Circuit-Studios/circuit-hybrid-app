#!/usr/bin/env node
/**
 * Export raster brand assets from assets/circuit-logo.png.
 *
 * circuit-logo.png is the source of truth for Circuit branding in-app.
 * PNGs below are generated for Expo / iOS / Android (native tooling requires raster).
 *
 * Run: npm run generate:brand
 */

import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');
const PNG_PATH = join(ASSETS, 'circuit-logo.png');
const IOS_ICON = join(
  ROOT,
  'ios/Circuit/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png',
);
const IOS_SPLASH = join(ROOT, 'ios/Circuit/Images.xcassets/SplashScreenLogo.imageset');

const SPLASH_BG = { r: 253, g: 252, b: 248, alpha: 1 }; // #FDFCF8
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function logoRaster(side) {
  return sharp(PNG_PATH).resize(side, side, { fit: 'cover', position: 'centre' }).png().toBuffer();
}

async function squareLogo(size, { background = TRANSPARENT, inset = 0.12 } = {}) {
  const inner = Math.round(size * (1 - inset * 2));
  const logo = await logoRaster(inner);
  const pad = Math.round((size - inner) / 2);
  return sharp(logo)
    .extend({
      top: pad,
      bottom: size - inner - pad,
      left: pad,
      right: size - inner - pad,
      background,
    })
    .png();
}

async function splashScreen(width, height, logoSide) {
  const logo = await logoRaster(logoSide);
  return sharp({
    create: { width, height, channels: 4, background: SPLASH_BG },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png();
}

async function writeSharp(image, path) {
  await mkdir(dirname(path), { recursive: true });
  await image.toFile(path);
}

async function main() {
  const png = await readFile(PNG_PATH);
  if (!png.length) {
    throw new Error(`Missing or empty ${PNG_PATH}`);
  }

  await writeSharp(await squareLogo(1024, { background: SPLASH_BG }), join(ASSETS, 'icon.png'));
  await writeSharp(await squareLogo(48, { inset: 0.08 }), join(ASSETS, 'favicon.png'));
  await writeSharp(await splashScreen(1284, 2778, 320), join(ASSETS, 'splash.png'));

  const adaptiveSide = 1024;
  const logoSide = 672;
  const logo = await logoRaster(logoSide);
  const pad = Math.round((adaptiveSide - logoSide) / 2);
  await sharp(logo)
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: TRANSPARENT,
    })
    .png()
    .toFile(join(ASSETS, 'adaptive-icon.png'));

  try {
    await writeSharp(await squareLogo(1024, { background: SPLASH_BG }), IOS_ICON);
    await writeSharp(
      await squareLogo(200, { background: SPLASH_BG }),
      join(IOS_SPLASH, 'image.png'),
    );
    await writeSharp(
      await squareLogo(400, { background: SPLASH_BG }),
      join(IOS_SPLASH, 'image@2x.png'),
    );
    await writeSharp(
      await squareLogo(600, { background: SPLASH_BG }),
      join(IOS_SPLASH, 'image@3x.png'),
    );
  } catch {
    // iOS folder may be absent before prebuild — Expo PNGs are enough for JS workflow.
  }

  console.log('Generated brand PNGs from assets/circuit-logo.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
