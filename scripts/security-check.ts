#!/usr/bin/env node

/**
 * Comprehensive security and static analysis check script
 */

import { execSync } from 'child_process';

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: CheckResult[] = [];

function runCheck(name: string, command: string): CheckResult {
  const startTime = Date.now();
  console.log(`\n🔍 Running: ${name}...`);

  try {
    execSync(command, { stdio: 'inherit' });
    const duration = Date.now() - startTime;
    console.log(`✅ ${name} passed (${duration}ms)`);
    return { name, passed: true, message: 'Passed', duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ ${name} failed (${duration}ms)`);
    return { name, passed: false, message: 'Failed', duration };
  }
}

async function main() {
  console.log('🛡️  AWS Favorites Quickbar - Security & Static Analysis Check\n');
  console.log('='.repeat(70));

  // 1. TypeScript Type Check
  results.push(runCheck('TypeScript Type Check', 'npm run type-check'));

  // 2. ESLint
  results.push(runCheck('ESLint', 'npm run lint'));

  // 3. Prettier Format Check
  results.push(runCheck('Prettier Format Check', 'npm run format:check'));

  // 4. npm audit
  results.push(runCheck('npm audit (Security Vulnerabilities)', 'npm audit'));

  // 5. Circular Dependencies
  results.push(
    runCheck('Circular Dependencies Check', 'npx madge --circular --extensions ts src/')
  );

  // 6. Tests
  results.push(runCheck('Unit & Integration Tests', 'npm test'));

  // Print Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 Summary\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  results.forEach((result) => {
    const icon = result.passed ? '✅' : '❌';
    const duration = `${(result.duration / 1000).toFixed(2)}s`;
    console.log(`${icon} ${result.name.padEnd(40)} ${duration.padStart(8)}`);
  });

  console.log('\n' + '='.repeat(70));
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log(`Duration: ${(totalDuration / 1000).toFixed(2)}s`);

  if (failed > 0) {
    console.log('\n❌ Some checks failed. Please fix the issues above.');
    process.exit(1);
  } else {
    console.log('\n✅ All checks passed! Your code is secure and well-formatted.');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Error running security checks:', error);
  process.exit(1);
});
