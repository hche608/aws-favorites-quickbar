#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist', 'firefox');
const ROOT_DIR = path.join(__dirname, '..');

// Files and directories to copy
const FILES_TO_COPY = [
  'popup.html',
  'popup.css'
];

const DIRS_TO_COPY = [
  'src',
  'icons',
  'node_modules/webextension-polyfill/dist'
];

// Clean and create dist directory
function cleanAndCreateDist() {
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Copy file
function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

// Copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

// Merge manifests
function mergeManifests() {
  const baseManifest = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, 'manifest.json'), 'utf8')
  );
  
  const firefoxManifest = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, 'manifest.firefox.json'), 'utf8')
  );
  
  // Firefox manifest already contains all fields, use it directly
  const mergedManifest = firefoxManifest;
  
  const manifestPath = path.join(DIST_DIR, 'manifest.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(mergedManifest, null, 2),
    'utf8'
  );
  
  console.log('✓ Created Firefox manifest with browser_specific_settings');
}

// Main build function
function buildFirefox() {
  console.log('Building Firefox extension...');
  
  cleanAndCreateDist();
  
  // Copy files
  FILES_TO_COPY.forEach(file => {
    const src = path.join(ROOT_DIR, file);
    const dest = path.join(DIST_DIR, file);
    if (fs.existsSync(src)) {
      copyFile(src, dest);
      console.log(`✓ Copied ${file}`);
    } else {
      console.warn(`⚠ Warning: ${file} not found`);
    }
  });
  
  // Copy directories
  DIRS_TO_COPY.forEach(dir => {
    const src = path.join(ROOT_DIR, dir);
    const dest = path.join(DIST_DIR, dir);
    if (fs.existsSync(src)) {
      copyDir(src, dest);
      console.log(`✓ Copied ${dir}/`);
    } else {
      console.warn(`⚠ Warning: ${dir} not found`);
    }
  });
  
  // Merge and create Firefox manifest
  mergeManifests();
  
  console.log(`\n✓ Firefox build complete: ${DIST_DIR}`);
}

buildFirefox();
