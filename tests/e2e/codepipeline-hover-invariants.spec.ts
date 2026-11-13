import { test, expect } from './fixtures';

test.describe('CodePipeline Hover Preview Invariants (Offline In-Browser E2E)', () => {
  test('Invariant: Popover appears on hover without overflow and closes on Escape', async ({
    context,
    extensionId
  }) => {
    // Configure extension settings via popup page
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.evaluate(async () => {
      await chrome.storage.sync.set({
        enableCodePipelineHoverPreview: true,
        codePipelineHoverDelayMs: 500 // Fast 0.5s delay for E2E
      });
    });
    await popupPage.close();

    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    // Mock console AWS CodePipeline page offline via page.route
    await page.route(
      'https://ap-southeast-2.console.aws.amazon.com/codesuite/codepipeline/pipelines*',
      (route) => {
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html>
              <head>
                <title>Pipelines | CodePipeline</title>
                <style>
                  body { font-family: sans-serif; background: #0f141c; color: #fff; padding: 40px; }
                  table { width: 100%; border-collapse: collapse; }
                  td { padding: 12px; border-bottom: 1px solid #333; }
                  a { color: #59bfff; text-decoration: none; font-size: 14px; }
                </style>
              </head>
              <body>
                <h1>Pipelines</h1>
                <table>
                  <tr>
                    <td>
                      <a id="pipelineLink" href="/codesuite/codepipeline/pipelines/adms-prod-data-pipeline/view?region=ap-southeast-2">
                        adms-prod-data-pipeline
                      </a>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
          `
        });
      }
    );

    // Pre-seed credentials before page scripts run
    await page.addInitScript(() => {
      sessionStorage.setItem(
        '__AWS_QUICKBAR_CREDS__',
        JSON.stringify({
          AccessKeyId: 'ASIAEXAMPLEMOCK',
          SecretAccessKey: 'mockSecretKey1234567890abcdef',
          SessionToken: 'mockSessionToken12345'
        })
      );
    });

    // Mock CodePipeline SigV4 API calls offline via page.route
    await page.route('https://codepipeline.ap-southeast-2.amazonaws.com/*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/x-amz-json-1.1',
        body: JSON.stringify({
          pipelineName: 'adms-prod-data-pipeline',
          stageStates: [
            {
              stageName: 'Source',
              actionStates: [{ actionName: 'Github', latestExecution: { status: 'Succeeded' } }],
              latestExecution: { status: 'Succeeded', pipelineExecutionId: 'exec-12345' }
            },
            {
              stageName: 'Deploy',
              actionStates: [
                { actionName: 'CfnDeploy', latestExecution: { status: 'InProgress' } }
              ],
              latestExecution: { status: 'InProgress', pipelineExecutionId: 'exec-12345' }
            }
          ]
        })
      });
    });

    await page.goto(
      'https://ap-southeast-2.console.aws.amazon.com/codesuite/codepipeline/pipelines?region=ap-southeast-2'
    );

    const pipelineLink = page.locator('#pipelineLink');
    await expect(pipelineLink).toBeVisible();

    // Hover over pipeline link
    await pipelineLink.hover();

    // Wait for the configured 500ms hover delay + render animation
    const popover = page.locator('#aws-favorites-codepipeline-popover');
    await expect(popover).toBeVisible({ timeout: 3000 });

    // Invariant 1: Popover bounds must remain strictly inside browser viewport
    const popoverRect = await popover.boundingBox();
    expect(popoverRect).not.toBeNull();
    if (popoverRect) {
      expect(popoverRect.x).toBeGreaterThanOrEqual(0);
      expect(popoverRect.y).toBeGreaterThanOrEqual(0);
      expect(popoverRect.x + popoverRect.width).toBeLessThanOrEqual(1280);
      expect(popoverRect.y + popoverRect.height).toBeLessThanOrEqual(800);
    }

    // Invariant 2: Active stage has stage-in-progress flowing beam class and is not clipped
    const inProgressStage = popover.locator('.stage-node.stage-in-progress');
    await expect(inProgressStage).toBeVisible();
    await expect(inProgressStage).toContainText('Deploy');
    await expect(inProgressStage).toContainText('CfnDeploy');

    // Invariant 3: Escape key dismisses the popover
    await page.keyboard.press('Escape');
    await expect(popover).toBeHidden({ timeout: 1500 });

    await page.close();
  });
});
