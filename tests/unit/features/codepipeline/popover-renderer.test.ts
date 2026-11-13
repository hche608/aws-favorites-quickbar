import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  renderPipelinePopover,
  renderLoadingPopover,
  removePipelinePopover,
  isDarkMode
} from '../../../../src/features/codepipeline/popover-renderer';
import type { PipelineExecutionSummary } from '../../../../src/features/codepipeline/types';

describe('CodePipeline popover-renderer', () => {
  let targetElement: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    targetElement = document.createElement('div');
    targetElement.getBoundingClientRect = () =>
      ({
        left: 100,
        top: 200,
        bottom: 230,
        right: 300,
        width: 200,
        height: 30
      }) as DOMRect;
    document.body.appendChild(targetElement);
  });

  afterEach(() => {
    removePipelinePopover();
    document.body.className = '';
  });

  describe('isDarkMode', () => {
    it('detects dark mode when awsui-dark-mode class is present', () => {
      document.body.classList.add('awsui-dark-mode');
      expect(isDarkMode()).toBe(true);
    });

    it('returns false when no dark mode markers are present', () => {
      expect(isDarkMode()).toBe(false);
    });
  });

  describe('renderLoadingPopover', () => {
    it('renders loading popover with pipeline name and loading badge', () => {
      const popover = renderLoadingPopover(targetElement, 'my-loading-pipeline');
      expect(popover).not.toBeNull();
      expect(popover.id).toBe('aws-favorites-codepipeline-popover');
      expect(popover.textContent).toContain('my-loading-pipeline');
      expect(popover.textContent).toContain('Loading...');
    });
  });

  describe('renderPipelinePopover (Option B layout)', () => {
    it('renders full Option B layout with stages, primary actions and progress summary', () => {
      const summary: PipelineExecutionSummary = {
        pipelineName: 'adms-sandbox-v2-lcdb-data-import-pipeline',
        status: 'InProgress',
        executionId: '96047272-8bf3-48e2',
        stages: [
          {
            stageName: 'Source',
            status: 'Succeeded',
            totalActions: 1,
            completedActions: 1,
            primaryAction: {
              actionName: 'Github',
              status: 'Succeeded',
              durationText: '42s'
            }
          },
          {
            stageName: 'Test',
            status: 'InProgress',
            totalActions: 2,
            completedActions: 1,
            progressSummaryText: '[1/2 completed: Lint]',
            primaryAction: {
              actionName: 'UnitTests',
              status: 'InProgress',
              durationText: '2m'
            }
          },
          {
            stageName: 'Deploy',
            status: 'Unknown',
            totalActions: 1,
            completedActions: 0,
            primaryAction: {
              actionName: 'CfnDeploy',
              status: 'Unknown'
            }
          }
        ]
      };

      const popover = renderPipelinePopover(targetElement, summary);
      expect(popover.textContent).toContain('adms-sandbox-v2-lcdb-data-import-pipeline');
      expect(popover.textContent).toContain('InProgress');
      expect(popover.textContent).toContain('96047272');

      // Stages
      expect(popover.textContent).toContain('Source');
      expect(popover.textContent).toContain('Github');
      expect(popover.textContent).toContain('42s');

      expect(popover.textContent).toContain('Test');
      expect(popover.textContent).toContain('UnitTests');
      expect(popover.textContent).toContain('2m');
      expect(popover.textContent).toContain('[1/2 completed: Lint]');

      expect(popover.textContent).toContain('Deploy');
      expect(popover.textContent).toContain('CfnDeploy');

      // Flow arrows present
      expect(popover.querySelectorAll('.flow-arrow').length).toBe(2);
    });

    it('positions the popover above if near bottom of viewport', () => {
      const bottomTarget = document.createElement('div');
      // Near bottom of 800px window
      bottomTarget.getBoundingClientRect = () =>
        ({
          left: 100,
          top: 750,
          bottom: 780,
          right: 300,
          width: 200,
          height: 30
        }) as DOMRect;

      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

      const summary: PipelineExecutionSummary = {
        pipelineName: 'bottom-pipeline',
        status: 'Succeeded',
        stages: []
      };

      const popover = renderPipelinePopover(bottomTarget, summary);
      // Top should be flipped above 750px
      const topPx = parseInt(popover.style.top, 10);
      expect(topPx).toBeLessThan(750);
    });
  });

  describe('removePipelinePopover', () => {
    it('removes popover from DOM', () => {
      vi.useFakeTimers();
      renderLoadingPopover(targetElement, 'to-remove');
      expect(document.getElementById('aws-favorites-codepipeline-popover')).not.toBeNull();

      removePipelinePopover();
      vi.advanceTimersByTime(200);
      expect(document.getElementById('aws-favorites-codepipeline-popover')).toBeNull();
      vi.useRealTimers();
    });
  });
});
