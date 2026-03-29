#!/bin/bash
# Setup Android project with customizations
# Run after: npx cap add android

set -e

MANIFEST="android/app/src/main/AndroidManifest.xml"

if [ ! -f "$MANIFEST" ]; then
  echo "Error: $MANIFEST not found. Run 'npx cap add android' first."
  exit 1
fi

# Lock screen orientation to landscape
if ! grep -q 'screenOrientation' "$MANIFEST"; then
  sed -i '' 's/android:launchMode="singleTask"/android:launchMode="singleTask"\n            android:screenOrientation="landscape"/' "$MANIFEST"
  echo "✓ Added landscape orientation lock"
fi

# Add audio permission
if ! grep -q 'MODIFY_AUDIO_SETTINGS' "$MANIFEST"; then
  sed -i '' 's|<uses-permission android:name="android.permission.INTERNET" />|<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />|' "$MANIFEST"
  echo "✓ Added MODIFY_AUDIO_SETTINGS permission"
fi

echo "✓ Android project configured"
