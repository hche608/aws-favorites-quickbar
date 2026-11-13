import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isCodePipelinePage,
  parsePipelineFromLink,
  initCodePipelineHover,
  cleanupCodePipelineHover
} from '../../../../src/features/codepipeline/hover-detector';
import * as pipelineService from '../../../../src/features/codepipeline/pipeline-service';
vi.mock('../../../../src/browser-api', () => {
  const mockStorage = {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined)
    },
    sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined)
    }
  };
  return { storage: mockStorage };
});

import { storage } from '../../../../src/browser-api';

describe('CodePipeline hover-detector', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    cleanupCodePipelineHover();
    (storage.sync.get as any).mockResolvedValue({});
    (storage.sync.set as any).mockResolvedValue(undefined);
    document.body.innerHTML = '';
    delete (window as any).location;
    window.location = new URL(
      'https://ap-southeast-2.console.aws.amazon.com/codesuite/codepipeline/pipelines?region=ap-southeast-2'
    ) as any;
  });

  afterEach(() => {
    cleanupCodePipelineHover();
    vi.useRealTimers();
  });

  describe('isCodePipelinePage', () => {
    it('returns true on valid CodePipeline console list URL', () => {
      expect(isCodePipelinePage()).toBe(true);
    });

    it('returns false on non-CodePipeline pages', () => {
      window.location = new URL('https://ap-southeast-2.console.aws.amazon.com/ec2/v2/home') as any;
      expect(isCodePipelinePage()).toBe(false);
    });
  });

  describe('parsePipelineFromLink', () => {
    it('extracts pipelineName and region from valid CodePipeline anchor', () => {
      const anchor = document.createElement('a');
      anchor.href =
        '/codesuite/codepipeline/pipelines/adms-sandbox-v2-lcdb-data-import-pipeline/view?region=ap-southeast-2';
      anchor.setAttribute(
        'href',
        '/codesuite/codepipeline/pipelines/adms-sandbox-v2-lcdb-data-import-pipeline/view?region=ap-southeast-2'
      );

      const parsed = parsePipelineFromLink(anchor);
      expect(parsed).not.toBeNull();
      expect(parsed?.pipelineName).toBe('adms-sandbox-v2-lcdb-data-import-pipeline');
      expect(parsed?.region).toBe('ap-southeast-2');
    });

    it('extracts pipelineName from link without /view suffix', () => {
      const anchor = document.createElement('a');
      anchor.href = '/codesuite/codepipeline/pipelines/my-standalone-pipeline?region=us-east-1';
      anchor.setAttribute(
        'href',
        '/codesuite/codepipeline/pipelines/my-standalone-pipeline?region=us-east-1'
      );

      const parsed = parsePipelineFromLink(anchor);
      expect(parsed).not.toBeNull();
      expect(parsed?.pipelineName).toBe('my-standalone-pipeline');
      expect(parsed?.region).toBe('us-east-1');
    });

    it('returns null for reserved console path keywords like new or pipelines', () => {
      const anchor = document.createElement('a');
      anchor.href = '/codesuite/codepipeline/pipelines/new';
      anchor.setAttribute('href', '/codesuite/codepipeline/pipelines/new');
      expect(parsePipelineFromLink(anchor)).toBeNull();
    });

    it('returns null for non-matching links', () => {
      const anchor = document.createElement('a');
      anchor.href = '/settings';
      expect(parsePipelineFromLink(anchor)).toBeNull();
    });
  });

  describe('3000ms hover delay lifecycle', () => {
    it('does not trigger popover if mouse leaves before 3000ms', async () => {
      vi.useFakeTimers();

      const fetchSpy = vi.spyOn(pipelineService, 'fetchPipelineExecutionState').mockResolvedValue({
        pipelineName: 'test-pipeline',
        status: 'Succeeded',
        stages: []
      });

      await initCodePipelineHover();

      const anchor = document.createElement('a');
      anchor.setAttribute(
        'href',
        '/codesuite/codepipeline/pipelines/test-pipeline/view?region=ap-southeast-2'
      );
      document.body.appendChild(anchor);

      // Simulate mouseover
      anchor.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      // Fast-forward 500ms (before 1000ms threshold)
      vi.advanceTimersByTime(500);
      expect(fetchSpy).not.toHaveBeenCalled();

      // Simulate mouseout
      anchor.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));

      // Advance past 3000ms
      vi.advanceTimersByTime(1000);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(document.getElementById('aws-favorites-codepipeline-popover')).toBeNull();
    });

    it('triggers popover when hovering for 3000ms and cleans up on mouseout', async () => {
      vi.useFakeTimers();

      const fetchSpy = vi.spyOn(pipelineService, 'fetchPipelineExecutionState').mockResolvedValue({
        pipelineName: 'test-pipeline',
        status: 'Succeeded',
        stages: [
          {
            stageName: 'Source',
            status: 'Succeeded',
            totalActions: 1,
            completedActions: 1,
            primaryAction: { actionName: 'Github', status: 'Succeeded' }
          }
        ]
      });

      await initCodePipelineHover();

      const anchor = document.createElement('a');
      anchor.setAttribute(
        'href',
        '/codesuite/codepipeline/pipelines/test-pipeline/view?region=ap-southeast-2'
      );
      document.body.appendChild(anchor);

      // Simulate mouseover
      anchor.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      // Advance 3000ms
      await vi.advanceTimersByTimeAsync(3000);
      await Promise.resolve();
      await Promise.resolve();

      expect(fetchSpy).toHaveBeenCalledWith('test-pipeline', 'ap-southeast-2');
      const popover = document.getElementById('aws-favorites-codepipeline-popover');
      expect(popover).not.toBeNull();
      expect(popover?.textContent).toContain('test-pipeline');
      expect(popover?.textContent).toContain('Source');

      // Now simulate mouseout
      anchor.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      vi.advanceTimersByTime(500);

      expect(document.getElementById('aws-favorites-codepipeline-popover')).toBeNull();
    });
  });

  describe('Settings toggle integration', () => {
    it('does not attach hover listeners if enableCodePipelineHoverPreview is false', async () => {
      vi.useFakeTimers();

      vi.spyOn(storage.sync, 'get').mockResolvedValue({
        enableCodePipelineHoverPreview: false
      } as any);

      const fetchSpy = vi.spyOn(pipelineService, 'fetchPipelineExecutionState');

      await initCodePipelineHover();

      const anchor = document.createElement('a');
      anchor.setAttribute(
        'href',
        '/codesuite/codepipeline/pipelines/test-pipeline/view?region=ap-southeast-2'
      );
      document.body.appendChild(anchor);

      anchor.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      vi.advanceTimersByTime(3500);

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('Dismissal events', () => {
    it('dismisses popover when Escape key is pressed', async () => {
      vi.useFakeTimers();
      vi.spyOn(pipelineService, 'fetchPipelineExecutionState').mockResolvedValue({
        pipelineName: 'esc-pipeline',
        status: 'Succeeded',
        stages: []
      });

      await initCodePipelineHover();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '/codesuite/codepipeline/pipelines/esc-pipeline/view');
      document.body.appendChild(anchor);

      anchor.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(3000);
      expect(document.getElementById('aws-favorites-codepipeline-popover')).not.toBeNull();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      vi.advanceTimersByTime(200);
      expect(document.getElementById('aws-favorites-codepipeline-popover')).toBeNull();
    });

    it('dismisses popover when window is scrolled outside popover', async () => {
      vi.useFakeTimers();
      vi.spyOn(pipelineService, 'fetchPipelineExecutionState').mockResolvedValue({
        pipelineName: 'scroll-pipeline',
        status: 'Succeeded',
        stages: []
      });

      await initCodePipelineHover();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '/codesuite/codepipeline/pipelines/scroll-pipeline/view');
      document.body.appendChild(anchor);

      anchor.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(3000);
      expect(document.getElementById('aws-favorites-codepipeline-popover')).not.toBeNull();

      window.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(200);
      expect(document.getElementById('aws-favorites-codepipeline-popover')).toBeNull();
    });

    it('dismisses popover when clicking outside the popover', async () => {
      vi.useFakeTimers();
      vi.spyOn(pipelineService, 'fetchPipelineExecutionState').mockResolvedValue({
        pipelineName: 'click-pipeline',
        status: 'Succeeded',
        stages: []
      });

      await initCodePipelineHover();
      const anchor = document.createElement('a');
      anchor.setAttribute('href', '/codesuite/codepipeline/pipelines/click-pipeline/view');
      document.body.appendChild(anchor);

      anchor.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(3000);
      expect(document.getElementById('aws-favorites-codepipeline-popover')).not.toBeNull();

      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      vi.advanceTimersByTime(200);
      expect(document.getElementById('aws-favorites-codepipeline-popover')).toBeNull();
    });
  });
});
