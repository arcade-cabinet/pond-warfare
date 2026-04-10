import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const androidAppDir = path.join(rootDir, 'android', 'app');
const buildGradlePath = path.join(androidAppDir, 'build.gradle');

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function computeVersionCode(version) {
  const parts = String(version || '1.0.0')
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts[0] * 10000 + parts[1] * 100 + parts[2];
}

function syncBuildGradle(version, versionCode) {
  let buildGradle = readFileSync(buildGradlePath, 'utf8');
  buildGradle = buildGradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  buildGradle = buildGradle.replace(/versionName\s+"[^"]+"/, `versionName "${version}"`);

  if (!buildGradle.includes('buildConfig true')) {
    if (buildGradle.includes('buildFeatures {')) {
      buildGradle = buildGradle.replace(
        'buildFeatures {',
        'buildFeatures {\n        buildConfig true',
      );
    } else {
      buildGradle = buildGradle.replace(
        /compileSdk\s*=\s*[^\n]+\n/,
        (match) => `${match}    buildFeatures {\n        buildConfig true\n    }\n`,
      );
    }
  }

  writeFileSync(buildGradlePath, buildGradle);
}

function writeJavaFile(relativePath, contents) {
  const filePath = path.join(androidAppDir, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${contents.trim()}\n`);
}

function syncAndroidTests() {
  rmSync(
    path.join(androidAppDir, 'src', 'androidTest', 'java', 'com', 'getcapacitor', 'myapp', 'ExampleInstrumentedTest.java'),
    { force: true },
  );
  rmSync(
    path.join(androidAppDir, 'src', 'test', 'java', 'com', 'getcapacitor', 'myapp', 'ExampleUnitTest.java'),
    { force: true },
  );

  writeJavaFile(
    path.join('src', 'androidTest', 'java', 'com', 'arcadecabinet', 'pondwarfare', 'AppContextInstrumentedTest.java'),
    `
package com.arcadecabinet.pondwarfare;

import static org.junit.Assert.assertEquals;

import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class AppContextInstrumentedTest {

    @Test
    public void usesPondWarfarePackageName() throws Exception {
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("com.arcadecabinet.pondwarfare", appContext.getPackageName());
    }
}
`,
  );

  writeJavaFile(
    path.join('src', 'test', 'java', 'com', 'arcadecabinet', 'pondwarfare', 'VersionMetadataUnitTest.java'),
    `
package com.arcadecabinet.pondwarfare;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class VersionMetadataUnitTest {

    @Test
    public void buildConfigUsesSemanticVersioningScheme() throws Exception {
        String[] versionParts = BuildConfig.VERSION_NAME.split("\\\\.");
        int major = Integer.parseInt(versionParts[0]);
        int minor = versionParts.length > 1 ? Integer.parseInt(versionParts[1]) : 0;
        int patch = versionParts.length > 2 ? Integer.parseInt(versionParts[2]) : 0;
        int expectedVersionCode = major * 10000 + minor * 100 + patch;

        assertEquals("com.arcadecabinet.pondwarfare", BuildConfig.APPLICATION_ID);
        assertEquals(expectedVersionCode, BuildConfig.VERSION_CODE);
    }
}
`,
  );
}

if (!readFileSync(packageJsonPath, 'utf8')) {
  throw new Error(`Missing package.json at ${packageJsonPath}`);
}

if (!readFileSync(buildGradlePath, 'utf8')) {
  throw new Error(`Missing Android build.gradle at ${buildGradlePath}`);
}

const { version } = readJson(packageJsonPath);
const versionCode = computeVersionCode(version);

syncBuildGradle(version, versionCode);
syncAndroidTests();

console.log(`Synced Android shell to version ${version} (${versionCode}).`);
