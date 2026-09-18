import { chromium } from '@playwright/test';
import path from 'path';

/**
 * Interactive login helper for AWS Console E2E testing.
 * Keeps browser open without test timeouts until human login + Passkey/MFA is completed.
 */
async function main() {
  const pathToExtension = path.resolve(process.cwd(), 'dist/chrome');
  const userDataDir = path.resolve(process.cwd(), '.e2e-profile/chrome');

  console.log('🚀 Launching real Chrome for AWS login...');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });

  const page = context.pages()[0] || (await context.newPage());
  console.log('🌐 Navigating to https://console.aws.amazon.com/ ...');
  await page.goto('https://console.aws.amazon.com/');

  console.log('\n=============================================================');
  console.log('👉 Please complete your password & Passkey / Security Key MFA.');
  console.log('⏳ This helper will automatically detect when you reach /home.');
  console.log('=============================================================\n');

  while (!page.isClosed()) {
    try {
      const url = page.url();
      if (
        url.includes('console.aws.amazon.com') &&
        (url.includes('/home') || url.includes('region=')) &&
        !url.includes('/signin') &&
        !url.includes('/auth')
      ) {
        console.log('🎉 Login detected successfully!');
        console.log(`📍 Current URL: ${url}`);

        // Check for Rule 3 prerequisite: At least 1 native pinned service for CSS extraction
        console.log('🔍 Checking for native pinned service prerequisite (Rule 3)...');
        await page.waitForTimeout(3000);
        const hasNativePin = await page.evaluate(() => {
          const quickbar = document.querySelector(
            'ol[data-rbd-droppable-id*="favorites"], ol[class*="favorites"], [data-testid="favorites-bar-list"]'
          );
          return quickbar && quickbar.querySelectorAll('li:not([data-source])').length > 0;
        });

        if (!hasNativePin) {
          console.log('\n⚠️  【重要：测试环境准备】');
          console.log('👉 当前 AWS 控制台顶栏尚未 Pin 任何原生服务！');
          console.log(
            '👉 插件规范（Rule 3）要求必须至少 Pin 1 个原生服务（如 S3 或 Console Home）以动态提取 CSS 样式。'
          );
          console.log('👉 请在当前打开的浏览器窗口中，在顶栏搜索并 Pin 任意 1 个服务。');
          console.log('⏳ 正在等待检测原生 Pin...\n');

          // Wait until user pins a service or closes browser
          while (!page.isClosed()) {
            const pinnedNow = await page.evaluate(() => {
              const qb = document.querySelector(
                'ol[data-rbd-droppable-id*="favorites"], ol[class*="favorites"], [data-testid="favorites-bar-list"]'
              );
              return qb && qb.querySelectorAll('li:not([data-source])').length > 0;
            });
            if (pinnedNow) {
              console.log('🎉 检测到原生 Pin 已成功添加！测试环境准备就绪！');
              break;
            }
            await new Promise((res) => setTimeout(res, 2000));
          }
        } else {
          console.log('✅ 检测到已存在原生 Pin 服务，CSS 样式模板提取准备就绪！');
        }

        console.log('💾 Session saved to .e2e-profile/chrome');
        break;
      }
    } catch {
      // Ignore transient errors while navigating
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  console.log('\nClosing browser in 3 seconds...');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await context.close();
  console.log('✅ Test environment is ready! You can now run "npm run test:e2e".');
}

main().catch(console.error);
