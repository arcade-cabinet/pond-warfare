import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, resolve } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import {
  baselineAuditDir,
  defaultCurrentAuditDir,
  defaultDiffAuditDir,
  expectedCaptures,
  maxDiffPixelsByCapture,
  repoRoot,
} from './browser-audit-config.js';

function resolveDir(input, fallback) {
  if (!input) {
    return fallback;
  }
  return resolve(repoRoot, input);
}

function assertSafeDeleteDir(targetPath) {
  const allowedRoot = resolve(repoRoot, 'tests', 'browser', 'screenshots');
  const normalizedTarget = resolve(targetPath);
  const relativeToAllowedRoot = relative(allowedRoot, normalizedTarget);
  if (
    normalizedTarget === allowedRoot ||
    (!relativeToAllowedRoot.startsWith('..') && !relativeToAllowedRoot.startsWith('/') && relativeToAllowedRoot !== '')
  ) {
    return;
  }
  throw new Error(`Refusing to delete unsafe diff directory: ${normalizedTarget}`);
}

function parseNumberEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null) {
    return fallback;
  }
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    console.error(`Invalid ${name}: expected numeric value, received "${raw}"`);
    process.exit(1);
  }
  return parsed;
}

const currentAuditDir = resolveDir(process.env.BROWSER_AUDIT_CURRENT_DIR, defaultCurrentAuditDir);
const diffAuditDir = resolveDir(process.env.BROWSER_AUDIT_DIFF_DIR, defaultDiffAuditDir);
const pixelmatchThreshold = parseNumberEnv('BROWSER_AUDIT_PIXELMATCH_THRESHOLD', 0.1);
const maxDiffPixelsOverride =
  process.env.BROWSER_AUDIT_MAX_DIFF_PIXELS == null
    ? null
    : parseNumberEnv('BROWSER_AUDIT_MAX_DIFF_PIXELS', 0);

assertSafeDeleteDir(diffAuditDir);
rmSync(diffAuditDir, { recursive: true, force: true });
mkdirSync(diffAuditDir, { recursive: true });

const failures = [];

for (const fileName of expectedCaptures) {
  const baselinePath = join(baselineAuditDir, fileName);
  const currentPath = join(currentAuditDir, fileName);
  const diffPath = join(diffAuditDir, fileName);
  const maxDiffPixels =
    maxDiffPixelsOverride == null
      ? (maxDiffPixelsByCapture[fileName] ?? 0)
      : Number(maxDiffPixelsOverride);

  if (!existsSync(baselinePath)) {
    failures.push(`${fileName}: missing baseline image at ${baselinePath}`);
    continue;
  }

  if (!existsSync(currentPath)) {
    failures.push(`${fileName}: missing current image at ${currentPath}`);
    continue;
  }

  let baselinePng;
  let currentPng;
  try {
    baselinePng = PNG.sync.read(readFileSync(baselinePath));
    currentPng = PNG.sync.read(readFileSync(currentPath));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${fileName}: failed to read PNG images - ${message}`);
    continue;
  }

  if (baselinePng.width !== currentPng.width || baselinePng.height !== currentPng.height) {
    failures.push(
      `${fileName}: dimension mismatch baseline ${baselinePng.width}x${baselinePng.height} vs current ${currentPng.width}x${currentPng.height}`,
    );
    continue;
  }

  const diffPng = new PNG({ width: baselinePng.width, height: baselinePng.height });
  const diffPixels = pixelmatch(
    baselinePng.data,
    currentPng.data,
    diffPng.data,
    baselinePng.width,
    baselinePng.height,
    { threshold: pixelmatchThreshold },
  );

  if (diffPixels > maxDiffPixels) {
    writeFileSync(diffPath, PNG.sync.write(diffPng));
    failures.push(
      `${fileName}: ${diffPixels} differing pixels (allowed ${maxDiffPixels}); diff written to ${diffPath}`,
    );
  }
}

const summaryPath = join(diffAuditDir, 'SUMMARY.md');
const summaryLines = [
  '# Browser Audit Visual Regression Summary',
  '',
  `- Baseline directory: \`${baselineAuditDir}\``,
  `- Current directory: \`${currentAuditDir}\``,
  `- Diff directory: \`${diffAuditDir}\``,
  `- Pixel threshold: \`${pixelmatchThreshold}\``,
  `- Allowed differing pixels per image: per-capture budget${
    maxDiffPixelsOverride == null ? '' : ` (env override: \`${maxDiffPixelsOverride}\`)`
  }`,
  '',
];

summaryLines.push('## Per-Capture Budgets', '');
for (const fileName of expectedCaptures) {
  summaryLines.push(`- ${fileName}: \`${maxDiffPixelsByCapture[fileName] ?? 0}\``);
}
summaryLines.push('');

if (failures.length === 0) {
  summaryLines.push('- Result: `PASS`');
} else {
  summaryLines.push('- Result: `FAIL`', '', '## Failures', '', ...failures.map((line) => `- ${line}`));
}

writeFileSync(summaryPath, `${summaryLines.join('\n')}\n`, 'utf8');

if (failures.length > 0) {
  console.error('Browser audit visual regression failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

const currentStats = expectedCaptures
  .filter((fileName) => existsSync(join(currentAuditDir, fileName)))
  .map((fileName) => {
    const currentPath = join(currentAuditDir, fileName);
    return `${fileName}: ${statSync(currentPath).size} bytes`;
  });

console.log('Browser audit visual regression passed.');
for (const line of currentStats) {
  console.log(`- ${line}`);
}
