#!/bin/bash
set -e

echo "Building for Chrome..."

# Bundle with esbuild
npx tsx scripts/bundle.ts

# Create Chrome dist directory
mkdir -p dist/chrome

# Copy bundled files
cp dist/content.js dist/chrome/
cp dist/content.js.map dist/chrome/
cp dist/popup.js dist/chrome/
cp dist/popup.js.map dist/chrome/

# Copy static assets
cp manifest.json dist/chrome/
cp popup.html dist/chrome/
cp popup.css dist/chrome/
cp -r icons dist/chrome/

# Copy webextension-polyfill
mkdir -p dist/chrome/node_modules/webextension-polyfill/dist
cp node_modules/webextension-polyfill/dist/browser-polyfill.min.js dist/chrome/node_modules/webextension-polyfill/dist/ 2>/dev/null || echo "Warning: webextension-polyfill not found"

# Create zip
cd dist/chrome
zip -r ../../aws-favorites-quickbar-chrome.zip .
cd ../..

echo "Chrome build complete: aws-favorites-quickbar-chrome.zip"
