import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    alias: {
      '@': path.resolve(import.meta.dirname || process.cwd(), './src')
    },
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    testTimeout: 5000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts', '**/node_modules/**', '**/dist/**'],
      thresholds: {
        lines: 65,
        branches: 60,
        functions: 68,
        statements: 65
      }
    }
  }
});
