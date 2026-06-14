#!/usr/bin/env node
/**
 * Export raster brand assets from assets/circuit-logo.svg.
 *
 * circuit-logo.svg is the single source of truth for Circuit branding.
 * PNGs below are generated for Expo / iOS / Android (native tooling requires raster).
 *
 * Run: npm run generate:brand
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');
const SVG_PATH = join(ASSETS, 'circuit-logo.svg');
const IOS_ICON = join(
  ROOT,
  'ios/Circuit/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png',
);
const IOS_SPLASH = join(ROOT, 'ios/Circuit/Images.xcassets/SplashScreenLogo.imageset');

const SPLASH_BG = { r: 236, g: 236, b: 236, alpha: 1 }; // #ECECEC
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function squareLogo(size, { background = SPLASH_BG, inset = 0.12 } = {}) {
  const logoSide = Math.round(size * (1 - inset * 2));
  const pad = Math.round((size - logoSide) / 2);
  const svg = await readFile(SVG_PATH);
  return sharp(svg)
    .resize(logoSide, logoSide)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background })
    .png();
}

async function splashScreen(width, height, logoSide) {
  const svg = await readFile(SVG_PATH);
  const logo = await sharp(svg).resize(logoSide, logoSide).png().toBuffer();
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
  const svg = await readFile(SVG_PATH);
  if (!svg.length) {
    throw new Error(`Missing or empty ${SVG_PATH}`);
  }

  await writeSharp(await squareLogo(1024), join(ASSETS, 'icon.png'));
  await writeSharp(await squareLogo(48, { inset: 0.08 }), join(ASSETS, 'favicon.png'));
  await writeSharp(await splashScreen(1284, 2778, 320), join(ASSETS, 'splash.png'));

  // Android adaptive-icon foreground: logo in the center 66% safe zone, transparent padding.
  const adaptiveSide = 672;
  const adaptivePad = Math.round((1024 - adaptiveSide) / 2);
  await sharp(svg)
    .resize(adaptiveSide, adaptiveSide)
    .extend({
      top: adaptivePad,
      bottom: adaptivePad,
      left: adaptivePad,
      right: adaptivePad,
      background: TRANSPARENT,
    })
    .png()
    .toFile(join(ASSETS, 'adaptive-icon.png'));

  try {
    await writeSharp(await squareLogo(1024), IOS_ICON);
    await writeSharp(await squareLogo(200), join(IOS_SPLASH, 'image.png'));
    await writeSharp(await squareLogo(400), join(IOS_SPLASH, 'image@2x.png'));
    await writeSharp(await squareLogo(600), join(IOS_SPLASH, 'image@3x.png'));
  } catch {
    // iOS folder may be absent before prebuild — Expo PNGs are enough for JS workflow.
  }

  console.log('Generated brand PNGs from assets/circuit-logo.svg');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
