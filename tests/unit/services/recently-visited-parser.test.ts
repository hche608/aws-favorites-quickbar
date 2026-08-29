/**
 * Unit tests for recently-visited-parser.ts
 * Tests parsing of Recently Visited widget from AWS Console
 */

import { setupDOM, teardownDOM } from '../../helpers/dom-helpers';
import { mockMutationObserver } from '../../helpers/mocks';
import {
  waitForRecentlyVisitedWidget,
  parseRecentlyVisited
} from '../../../src/services/recently-visited-parser';

describe('recently-visited-parser', () => {
  let originalMutationObserver: typeof MutationObserver;

  beforeEach(() => {
    teardownDOM();
    // Save original MutationObserver
    originalMutationObserver = global.MutationObserver;
  });

  afterEach(() => {
    teardownDOM();
    // Restore original MutationObserver
    global.MutationObserver = originalMutationObserver;
  });

  describe('waitForRecentlyVisitedWidget', () => {
    it('should resolve immediately when widget is already loaded', async () => {
      const html = `
        <div data-widget-type="recently-visited">
          <div aria-label="Recently visited">
            <div class="listItem-abc">Item 1</div>
            <div class="listItem-def">Item 2</div>
            <div class="listItem-ghi">Item 3</div>
          </div>
        </div>
      `;
      setupDOM(html);

      const result = await waitForRecentlyVisitedWidget(1000);
      expect(result).toBe(true);
    });

    it('should wait for widget to appear via MutationObserver', async () => {
      setupDOM('<div id="container"></div>');

      // Create a mock MutationObserver that we can trigger
      const MockObserver = mockMutationObserver();
      global.MutationObserver = MockObserver as any;

      // Start waiting
      const promise = waitForRecentlyVisitedWidget(2000);

      // Simulate widget appearing after a delay
      setTimeout(() => {
        const container = document.getElementById('container');
        if (container) {
          container.innerHTML = `
            <div data-widget-type="recently-visited">
              <div aria-label="Recently visited">
                <div class="listItem-abc">Item 1</div>
                <div class="listItem-def">Item 2</div>
                <div class="listItem-ghi">Item 3</div>
              </div>
            </div>
          `;
        }

        // Trigger the observer
        MockObserver.trigger([{ type: 'childList' }]);
      }, 100);

      const result = await promise;
      expect(result).toBe(true);
    });

    it('should timeout and return false when widget does not appear', async () => {
      setupDOM('<div></div>');

      const result = await waitForRecentlyVisitedWidget(500);
      expect(result).toBe(false);
    }, 1000);

    it('should return true if widget appears with fewer than 3 items before timeout', async () => {
      setupDOM('<div></div>');

      const MockObserver = mockMutationObserver();
      global.MutationObserver = MockObserver as any;

      const promise = waitForRecentlyVisitedWidget(1000);

      setTimeout(() => {
        document.body.innerHTML = `
          <div data-widget-type="recently-visited">
            <div aria-label="Recently visited">
              <div class="listItem-abc">Item 1</div>
            </div>
          </div>
        `;
        MockObserver.trigger([{ type: 'childList' }]);
      }, 100);

      const result = await promise;
      expect(result).toBe(true);
    }, 2000);
  });

  describe('parseRecentlyVisited', () => {
    it('should return empty array when widget is not present', async () => {
      setupDOM('<div></div>');

      const services = await parseRecentlyVisited();
      expect(services).toEqual([]);
    });

    it('should parse services from widget with aria-label container', async () => {
      const html = `
        <div data-widget-type="recently-visited">
          <div aria-label="Recently visited">
            <div class="listItem-abc">
              <a href="https://s3.console.aws.amazon.com/s3/home">
                <img src="https://a0.awsstatic.com/s3/icon.png" />
                S3
              </a>
            </div>
            <div class="listItem-def">
              <a href="https://ec2.console.aws.amazon.com/ec2/home">
                <img src="https://a0.awsstatic.com/ec2/icon.png" />
                EC2
              </a>
            </div>
          </div>
        </div>
      `;
      setupDOM(html);

      const services = await parseRecentlyVisited();

      expect(services.length).toBe(2);
      expect(services[0].id).toBe('s3');
      expect(services[0].name).toBe('S3');
      expect(services[1].id).toBe('ec2');
      expect(services[1].name).toBe('EC2');
    });

    it('should parse services from widget with polite region', async () => {
      const html = `
        <div data-widget-type="recently-visited">
          <div data-testid="polite">
            <div aria-label="Recently visited">
              <div class="listItem-abc">
                <a href="https://lambda.console.aws.amazon.com/lambda/home">
                  <img src="https://a0.awsstatic.com/lambda/icon.png" />
                  Lambda
                </a>
              </div>
            </div>
          </div>
        </div>
      `;
      setupDOM(html);

      const services = await parseRecentlyVisited();

      expect(services.length).toBe(1);
      expect(services[0].id).toBe('lambda');
      expect(services[0].name).toBe('Lambda');
    });

    it('should correctly distinguish CodeBuild and CodePipeline under codesuite umbrella path', async () => {
      const html = `
        <div data-widget-type="recently-visited">
          <div aria-label="Recently visited">
            <div class="wrapper-0-1-36">
              <img alt="CodeBuild" src="https://a.b.cdn.console.awsstatic.com/icon/codebuild.svg" height="24" width="24">
              <div class="linkWrapper-0-1-37">
                <a id="link-self:r9g:" data-testid="recently-visited-link-codebuild" href="/codesuite/codebuild/home?region=ap-southeast-2">
                  <span>CodeBuild</span>
                </a>
              </div>
            </div>
            <div class="wrapper-0-1-36">
              <img alt="CodePipeline" src="https://a.b.cdn.console.awsstatic.com/icon/codepipeline.svg" height="24" width="24">
              <div class="linkWrapper-0-1-37">
                <a id="link-self:r9h:" data-testid="recently-visited-link-codepipeline" href="/codesuite/codepipeline/home?region=ap-southeast-2">
                  <span>CodePipeline</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      `;
      setupDOM(html);

      const services = await parseRecentlyVisited();

      expect(services.length).toBe(2);
      expect(services[0].id).toBe('codebuild');
      expect(services[0].name).toBe('CodeBuild');
      expect(services[0].iconUrl).toBe('https://a.b.cdn.console.awsstatic.com/icon/codebuild.svg');
      expect(services[0].consoleUrl).toContain('/codesuite/codebuild/home?region=ap-southeast-2');

      expect(services[1].id).toBe('codepipeline');
      expect(services[1].name).toBe('CodePipeline');
      expect(services[1].iconUrl).toBe(
        'https://a.b.cdn.console.awsstatic.com/icon/codepipeline.svg'
      );
      expect(services[1].consoleUrl).toContain(
        '/codesuite/codepipeline/home?region=ap-southeast-2'
      );
    });

    it('should parse CloudWatch with real console href and DOM structure', async () => {
      const html = `
        <div data-widget-type="recently-visited">
          <div aria-label="Recently visited">
            <div class="wrapper-0-1-36">
              <img alt="CloudWatch" src="https://a.b.cdn.console.awsstatic.com/icon/cloudwatch.svg" height="24" width="24">
              <div class="linkWrapper-0-1-37">
                <a id="link-self:r9a:" data-testid="recently-visited-link-cw" href="/cloudwatch/home?region=ap-southeast-2">
                  <span>CloudWatch</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      `;
      setupDOM(html);

      const services = await parseRecentlyVisited();

      expect(services.length).toBe(1);
      expect(services[0].id).toBe('cloudwatch');
      expect(services[0].name).toBe('CloudWatch');
      expect(services[0].iconUrl).toBe('https://a.b.cdn.console.awsstatic.com/icon/cloudwatch.svg');
    });
  });
});
