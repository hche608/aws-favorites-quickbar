#!/usr/bin/env node

import * as esbuild from 'esbuild';
import * as path from 'path';

async function bundle(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';

  const buildOptions: esbuild.BuildOptions = {
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    minify: isProduction,
    sourcemap: true,
    treeShaking: true,
    external: []
  };

  try {
    // Bundle content script
    await esbuild.build({
      ...buildOptions,
      entryPoints: ['src/content.ts'],
      outfile: 'dist/content.js'
    });

    // Bundle popup script
    await esbuild.build({
      ...buildOptions,
      entryPoints: ['src/popup.ts'],
      outfile: 'dist/popup.js'
    });

    // Bundle main-world bridge script
    await esbuild.build({
      ...buildOptions,
      entryPoints: ['src/features/codepipeline/main-world.ts'],
      outfile: 'dist/main-world.js'
    });

    console.log(`✓ Bundling complete (${isProduction ? 'production' : 'development'} mode)`);
  } catch (error) {
    console.error('Bundling failed:', error);
    process.exit(1);
  }
}

bundle();
