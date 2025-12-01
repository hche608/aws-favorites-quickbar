#!/bin/bash
set -e

echo "Building for Firefox..."

# Bundle with esbuild (reuse bundled files from Chrome build or create them)
if [ ! -f "dist/content.js" ] || [ ! -f "dist/popup.js" ]; then
  npx tsx scripts/bundle.ts
fi

# Create Firefox dist directory
mkdir -p dist/firefox

# Copy bundled files
cp dist/content.js dist/firefox/
cp dist/content.js.map dist/firefox/
cp dist/popup.js dist/firefox/
cp dist/popup.js.map dist/firefox/

# Copy static assets with Firefox manifest
cp manifest.firefox.json dist/firefox/manifest.json
cp popup.html dist/firefox/
cp popup.css dist/firefox/
cp -r icons dist/firefox/

# Copy webextension-polyfill
mkdir -p dist/firefox/node_modules/webextension-polyfill/dist
cp node_modules/webextension-polyfill/dist/browser-polyfill.min.js dist/firefox/node_modules/webextension-polyfill/dist/ 2>/dev/null || echo "Warning: webextension-polyfill not found"

# Create zip
cd dist/firefox
zip -r ../../aws-favorites-quickbar-firefox.zip .
cd ../..

echo "Firefox build complete: aws-favorites-quickbar-firefox.zip"
