#!/bin/bash
set -e

echo "Building for Chrome..."

# Bundle with esbuild in production mode
NODE_ENV=production npx tsx scripts/bundle.ts

# Create Chrome dist directory
mkdir -p dist/chrome

# Copy bundled files (no source maps in production)
cp dist/content.js dist/chrome/
cp dist/popup.js dist/chrome/

# Copy static assets
cp manifest.json dist/chrome/
cp popup.html dist/chrome/
cp popup.css dist/chrome/

# Copy only required icons (exclude icon_full.png)
mkdir -p dist/chrome/icons
cp icons/icon16.png dist/chrome/icons/
cp icons/icon48.png dist/chrome/icons/
cp icons/icon128.png dist/chrome/icons/

# Copy only the minified polyfill directly (no nested folders)
if [ -f "node_modules/webextension-polyfill/dist/browser-polyfill.min.js" ]; then
  cp node_modules/webextension-polyfill/dist/browser-polyfill.min.js dist/chrome/
fi

# Create zip with maximum compression
cd dist/chrome
zip -9 -r ../../aws-favorites-quickbar-chrome.zip .
cd ../..

echo "Chrome build complete: aws-favorites-quickbar-chrome.zip"
