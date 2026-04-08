/**
 * Generate production icon assets from checked-in SVG masters.
 *
 * Outputs:
 * - public/icon-192.png
 * - public/icon-512.png
 * - public/apple-touch-icon.png
 * - android launcher PNGs in android/app/src/main/res/mipmap-*
 * - android adaptive foreground PNGs in android/app/src/main/res/mipmap-*
 *
 * Requires either `rsvg-convert` (preferred), macOS `sips`, or ImageMagick (`magick`).
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const publicDir = resolve(root, 'public');
const androidResDir = resolve(root, 'android', 'app', 'src', 'main', 'res');

const fullIconSvg = resolve(publicDir, 'icon-source.svg');
const foregroundSvg = resolve(publicDir, 'icon-foreground.svg');

const webOutputs = [
  { size: 192, out: resolve(publicDir, 'icon-192.png') },
  { size: 512, out: resolve(publicDir, 'icon-512.png') },
  { size: 180, out: resolve(publicDir, 'apple-touch-icon.png') },
];

const launcherSizes = [
  ['mipmap-mdpi', 48],
  ['mipmap-hdpi', 72],
  ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144],
  ['mipmap-xxxhdpi', 192],
];

const foregroundSizes = [
  ['mipmap-mdpi', 108],
  ['mipmap-hdpi', 162],
  ['mipmap-xhdpi', 216],
  ['mipmap-xxhdpi', 324],
  ['mipmap-xxxhdpi', 432],
];

function hasCommand(cmd) {
  return spawnSync('bash', ['-lc', `command -v ${cmd}`], { stdio: 'ignore' }).status === 0;
}

function ensureFile(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing icon source: ${path}`);
  }
}

function ensureParent(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function rasterizeWithRsvg(input, size, output) {
  execFileSync(
    'rsvg-convert',
    ['-w', String(size), '-h', String(size), '-o', output, input],
    { stdio: 'inherit' },
  );
}

function rasterizeWithMagick(input, size, output) {
  execFileSync(
    'magick',
    [
      '-background',
      'none',
      input,
      '-resize',
      `${size}x${size}`,
      '-define',
      'png:compression-level=9',
      output,
    ],
    { stdio: 'inherit' },
  );
}

function rasterizeWithSips(input, size, output) {
  execFileSync(
    'sips',
    ['-s', 'format', 'png', '-z', String(size), String(size), input, '--out', output],
    { stdio: 'inherit' },
  );
}

function rasterize(input, size, output) {
  ensureParent(output);
  if (hasCommand('rsvg-convert')) {
    rasterizeWithRsvg(input, size, output);
    return;
  }
  if (hasCommand('sips')) {
    rasterizeWithSips(input, size, output);
    return;
  }
  if (hasCommand('magick')) {
    rasterizeWithMagick(input, size, output);
    return;
  }
  throw new Error('Icon generation requires `rsvg-convert`, macOS `sips`, or ImageMagick (`magick`).');
}

function writeAndroidBackgroundColor() {
  const colorXml = resolve(androidResDir, 'values', 'ic_launcher_background.xml');
  writeFileSync(
    colorXml,
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#10251F</color>\n</resources>\n`,
  );
}

ensureFile(fullIconSvg);
ensureFile(foregroundSvg);

for (const { size, out } of webOutputs) {
  rasterize(fullIconSvg, size, out);
  console.log(`wrote ${out}`);
}

for (const [dir, size] of launcherSizes) {
  rasterize(fullIconSvg, size, resolve(androidResDir, dir, 'ic_launcher.png'));
  rasterize(fullIconSvg, size, resolve(androidResDir, dir, 'ic_launcher_round.png'));
}

for (const [dir, size] of foregroundSizes) {
  rasterize(foregroundSvg, size, resolve(androidResDir, dir, 'ic_launcher_foreground.png'));
}

writeAndroidBackgroundColor();

console.log('Icon generation complete.');
