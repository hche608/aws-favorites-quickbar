#!/usr/bin/env node

import * as esbuild from 'esbuild';
import * as path from 'path';

async function bundle(): Promise<void> {
  try {
    // Bundle content script
    await esbuild.build({
      entryPoints: ['src/content.ts'],
      bundle: true,
      outfile: 'dist/content.js',
      format: 'iife',
      platform: 'browser',
      target: 'es2020',
      sourcemap: true,
      external: []
    });

    // Bundle popup script
    await esbuild.build({
      entryPoints: ['src/popup.ts'],
      bundle: true,
      outfile: 'dist/popup.js',
      format: 'iife',
      platform: 'browser',
      target: 'es2020',
      sourcemap: true,
      external: []
    });

    console.log('✓ Bundling complete');
  } catch (error) {
    console.error('Bundling failed:', error);
    process.exit(1);
  }
}

bundle();
