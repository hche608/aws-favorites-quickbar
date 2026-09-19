#!/bin/bash
set -e

echo "Building for Firefox..."

# Bundle with esbuild in production mode (reuse bundled files from Chrome build or create them)
if [ ! -f "dist/content.js" ] || [ ! -f "dist/popup.js" ]; then
  NODE_ENV=production npx tsx scripts/bundle.ts
fi

# Create Firefox dist directory
mkdir -p dist/firefox

# Copy bundled files and source maps
cp dist/content.js dist/firefox/
cp dist/popup.js dist/firefox/
[ -f "dist/content.js.map" ] && cp dist/content.js.map dist/firefox/
[ -f "dist/popup.js.map" ] && cp dist/popup.js.map dist/firefox/

# Copy static assets with Firefox manifest
cp manifest.firefox.json dist/firefox/manifest.json
cp popup.html dist/firefox/
cp popup.css dist/firefox/

# Copy only required icons (exclude icon_full.png)
mkdir -p dist/firefox/icons
cp icons/icon16.png dist/firefox/icons/
cp icons/icon48.png dist/firefox/icons/
cp icons/icon128.png dist/firefox/icons/

# Copy only the minified polyfill directly (no nested folders)
if [ -f "node_modules/webextension-polyfill/dist/browser-polyfill.min.js" ]; then
  cp node_modules/webextension-polyfill/dist/browser-polyfill.min.js dist/firefox/
fi

# Create zip with maximum compression
cd dist/firefox
zip -9 -r ../../aws-favorites-quickbar-firefox.zip .
cd ../..

echo "Firefox build complete: aws-favorites-quickbar-firefox.zip"
