#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist', 'chrome');
const ROOT_DIR = path.join(__dirname, '..');

// Files and directories to copy
const FILES_TO_COPY = [
  'manifest.json',
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

// Main build function
function buildChrome() {
  console.log('Building Chrome extension...');
  
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
  
  console.log(`\n✓ Chrome build complete: ${DIST_DIR}`);
}

buildChrome();
