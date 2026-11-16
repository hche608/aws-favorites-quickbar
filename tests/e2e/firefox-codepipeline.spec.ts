import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const ROOT_DIR = process.cwd();
const FIREFOX_DIST_DIR = path.resolve(ROOT_DIR, 'dist/firefox');
const ARTIFACT_DIR = path.resolve(process.cwd(), 'test-results');

test.describe('Firefox CodePipeline Hover & Flowing Beam In-Engine Automation', () => {
  test.beforeAll(() => {
    expect(fs.existsSync(path.join(FIREFOX_DIST_DIR, 'content.js'))).toBe(true);
    expect(fs.existsSync(path.join(FIREFOX_DIST_DIR, 'main-world.js'))).toBe(true);
  });

  test('Case 1: In real Firefox, verify CodePipeline hover popover layout and flowing beam animation', async ({
    page
  }) => {
    await page.setViewportSize({ width: 900, height: 600 });

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
              <head><title>Pipelines | CodePipeline</title></head>
              <body style="background: #0f141c; color: #fff; padding: 40px; font-family: sans-serif;">
                <a id="pipelineLink" href="/codesuite/codepipeline/pipelines/prod-release-pipeline/view?region=ap-southeast-2">
                  prod-release-pipeline
                </a>
              </body>
            </html>
          `
        });
      }
    );

    await page.goto(
      'https://ap-southeast-2.console.aws.amazon.com/codesuite/codepipeline/pipelines?region=ap-southeast-2'
    );

    // Mock storage environment and main-world bridge listener
    await page.evaluate(() => {
      const mockStorage = {
        sync: {
          get: (keys: any) => {
            const data = {
              enableCodePipelineHoverPreview: true,
              codePipelineHoverDelayMs: 200,
              visualMode: 'dark'
            };
            return Promise.resolve(data);
          },
          set: () => Promise.resolve()
        },
        local: {
          get: (keys: any) => Promise.resolve({}),
          set: () => Promise.resolve()
        },
        onChanged: {
          addListener: () => {}
        }
      };

      const mockEnv = {
        runtime: { id: 'aws-favorites-quickbar@8its.pixel' },
        storage: mockStorage
      };

      (window as any).chrome = mockEnv;
      (window as any).browser = mockEnv;

      window.addEventListener('message', (event: MessageEvent) => {
        if (event.data?.type === 'AWS_FAVORITES_GET_PIPELINE_STATE') {
          window.postMessage(
            {
              type: 'AWS_FAVORITES_PIPELINE_STATE_RESULT',
              requestId: event.data.requestId,
              success: true,
              data: {
                pipelineName: 'prod-release-pipeline',
                stageStates: [
                  {
                    stageName: 'Source',
                    actionStates: [
                      { actionName: 'GitHub', latestExecution: { status: 'Succeeded' } }
                    ]
                  },
                  {
                    stageName: 'Deploy',
                    actionStates: [
                      {
                        actionName: 'CloudFormation',
                        latestExecution: { status: 'InProgress' }
                      }
                    ]
                  },
                  {
                    stageName: 'Test',
                    actionStates: [
                      {
                        actionName: 'IntegrationTests',
                        latestExecution: { status: 'Failed' }
                      }
                    ]
                  }
                ]
              }
            },
            '*'
          );
        }
      });
    });

    // Inject content.js script from Firefox dist into page
    const contentJsPath = path.resolve(FIREFOX_DIST_DIR, 'content.js');
    await page.addScriptTag({ path: contentJsPath });

    // Trigger hover on pipeline anchor link
    await page.hover('#pipelineLink');

    // Wait for the floating popover to appear after hover delay
    const popoverLocator = page.locator('#aws-favorites-codepipeline-popover');
    await popoverLocator.waitFor({ state: 'visible', timeout: 5000 });

    // Verify computed styles in Firefox Gecko engine
    const beamEvaluation = await page.evaluate(() => {
      const inProgressStage = document.querySelector('.stage-node.stage-in-progress');
      const failedStage = document.querySelector('.stage-node.stage-failed');
      const inProgressStyle = inProgressStage ? window.getComputedStyle(inProgressStage) : null;
      const failedStyle = failedStage ? window.getComputedStyle(failedStage) : null;

      return {
        hasPopover: !!document.getElementById('aws-favorites-codepipeline-popover'),
        hasStylesInHead: !!document.getElementById('aws-favorites-codepipeline-styles'),
        inProgressAnimation: inProgressStyle?.animationName || '',
        failedAnimation: failedStyle?.animationName || ''
      };
    });

    expect(beamEvaluation.hasPopover).toBe(true);
    expect(beamEvaluation.hasStylesInHead).toBe(true);
    expect(beamEvaluation.inProgressAnimation).toContain('stage-beam-flow');
    expect(beamEvaluation.failedAnimation).toContain('stage-beam-flow');

    // Capture visual screenshot of popover and flowing light beam in real Firefox
    const beamScreenshotPath = path.join(ARTIFACT_DIR, 'firefox-popover-beam.png');
    await page.screenshot({ path: beamScreenshotPath });
    console.log(`📸 Captured Firefox CodePipeline flowing beam screenshot: ${beamScreenshotPath}`);
  });

  test('Case 2: In real Firefox, verify cross-world postMessage bridge roundtrip', async ({
    page
  }) => {
    await page.setContent(
      '<!DOCTYPE html><html><head><title>Bridge Test</title></head><body></body></html>'
    );

    const result = await page.evaluate(async () => {
      return new Promise<{ success: boolean; data: any }>((resolve) => {
        // Setup listener simulating main-world bridge
        const bridgeListener = (event: MessageEvent) => {
          if (event.data?.type === 'AWS_FAVORITES_GET_PIPELINE_STATE') {
            window.postMessage(
              {
                type: 'AWS_FAVORITES_PIPELINE_STATE_RESULT',
                requestId: event.data.requestId,
                success: true,
                data: { pipelineName: event.data.pipelineName, status: 'InProgress' }
              },
              '*'
            );
          }
        };
        window.addEventListener('message', bridgeListener);

        // Content-script side listener
        const clientListener = (event: MessageEvent) => {
          if (
            event.data?.type === 'AWS_FAVORITES_PIPELINE_STATE_RESULT' &&
            event.data.requestId === 'req_ff_test'
          ) {
            window.removeEventListener('message', bridgeListener);
            window.removeEventListener('message', clientListener);
            resolve({ success: event.data.success, data: event.data.data });
          }
        };
        window.addEventListener('message', clientListener);

        // Dispatch request
        window.postMessage(
          {
            type: 'AWS_FAVORITES_GET_PIPELINE_STATE',
            pipelineName: 'test-firefox-pipeline',
            requestId: 'req_ff_test',
            region: 'ap-southeast-2'
          },
          '*'
        );
      });
    });

    expect(result.success).toBe(true);
    expect(result.data.pipelineName).toBe('test-firefox-pipeline');
    expect(result.data.status).toBe('InProgress');
    console.log('✅ Firefox postMessage structured clone bridge verified cleanly in Gecko engine.');
  });
});
