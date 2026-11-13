import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parsePipelineStateResponse,
  selectPrimaryAction,
  formatTimeAgo,
  getConsoleCsrfToken,
  resolveCurrentRegion,
  fetchPipelineExecutionState,
  clearPipelineCache
} from '../../../../src/features/codepipeline/pipeline-service';
import type {
  RawPipelineStateResponse,
  StageState
} from '../../../../src/features/codepipeline/types';

describe('CodePipeline pipeline-service', () => {
  beforeEach(() => {
    clearPipelineCache();
    vi.restoreAllMocks();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    clearPipelineCache();
  });

  describe('formatTimeAgo', () => {
    it('returns empty string for null or invalid inputs', () => {
      expect(formatTimeAgo(null)).toBe('');
      expect(formatTimeAgo(undefined)).toBe('');
      expect(formatTimeAgo('not-a-date')).toBe('');
    });

    it('formats seconds ago accurately', () => {
      const now = Date.now();
      const thirtySecAgo = new Date(now - 30 * 1000);
      expect(formatTimeAgo(thirtySecAgo)).toBe('30s');
    });

    it('formats minutes ago accurately', () => {
      const now = Date.now();
      const fiveMinAgo = new Date(now - 5 * 60 * 1000);
      expect(formatTimeAgo(fiveMinAgo)).toBe('5m');
    });

    it('formats hours ago accurately', () => {
      const now = Date.now();
      const twoHoursAgo = new Date(now - 2 * 3600 * 1000);
      expect(formatTimeAgo(twoHoursAgo)).toBe('2h');
    });
  });

  describe('selectPrimaryAction', () => {
    it('returns default placeholder when stage has no actions', () => {
      const stage: StageState = {
        stageName: 'EmptyStage',
        actionStates: []
      };
      const result = selectPrimaryAction(stage);
      expect(result.primaryAction.actionName).toBe('No Actions');
      expect(result.primaryAction.status).toBe('Unknown');
      expect(result.completedActions).toBe(0);
    });

    it('prioritizes Failed action over InProgress or Succeeded actions', () => {
      const stage: StageState = {
        stageName: 'BuildStage',
        actionStates: [
          {
            actionName: 'StepA',
            latestExecution: { status: 'Succeeded' }
          },
          {
            actionName: 'StepB',
            latestExecution: { status: 'Failed' }
          },
          {
            actionName: 'StepC',
            latestExecution: { status: 'InProgress' }
          }
        ]
      };
      const result = selectPrimaryAction(stage);
      expect(result.primaryAction.actionName).toBe('StepB');
      expect(result.primaryAction.status).toBe('Failed');
      expect(result.completedActions).toBe(1);
      expect(result.completedNames).toEqual(['StepA']);
    });

    it('prioritizes InProgress action when there are no failed actions', () => {
      const stage: StageState = {
        stageName: 'TestStage',
        actionStates: [
          {
            actionName: 'Lint',
            latestExecution: { status: 'Succeeded' }
          },
          {
            actionName: 'UnitTests',
            latestExecution: { status: 'InProgress' }
          }
        ]
      };
      const result = selectPrimaryAction(stage);
      expect(result.primaryAction.actionName).toBe('UnitTests');
      expect(result.primaryAction.status).toBe('InProgress');
      expect(result.completedActions).toBe(1);
      expect(result.completedNames).toEqual(['Lint']);
    });

    it('selects the last completed action when all actions succeeded', () => {
      const stage: StageState = {
        stageName: 'DeployStage',
        actionStates: [
          {
            actionName: 'PreDeploy',
            latestExecution: { status: 'Succeeded' }
          },
          {
            actionName: 'MainDeploy',
            latestExecution: { status: 'Succeeded' }
          }
        ]
      };
      const result = selectPrimaryAction(stage);
      expect(result.primaryAction.actionName).toBe('MainDeploy');
      expect(result.primaryAction.status).toBe('Succeeded');
      expect(result.completedActions).toBe(2);
    });
  });

  describe('parsePipelineStateResponse', () => {
    it('parses real AWS CodePipeline structure into normalized summary', () => {
      const raw: RawPipelineStateResponse = {
        pipelineName: 'adms-sandbox-v2-lcdb-data-import-pipeline',
        pipelineVersion: 4,
        stageStates: [
          {
            stageName: 'Source',
            actionStates: [
              {
                actionName: 'Github',
                latestExecution: {
                  actionExecutionId: 'd7b0341f',
                  status: 'Succeeded'
                }
              }
            ],
            latestExecution: {
              pipelineExecutionId: 'exec-12345',
              status: 'Succeeded'
            }
          },
          {
            stageName: 'STARTUP_EC2',
            actionStates: [
              {
                actionName: 'Startup-admslcdb01si',
                latestExecution: {
                  actionExecutionId: 'bdb750ce',
                  status: 'Succeeded'
                }
              }
            ],
            latestExecution: {
              pipelineExecutionId: 'exec-12345',
              status: 'Succeeded'
            }
          },
          {
            stageName: 'RESTORE_LCDB',
            actionStates: [
              {
                actionName: 'Restore-admslcdb01si',
                latestExecution: {
                  actionExecutionId: 'd7fd39bc',
                  status: 'InProgress'
                }
              }
            ],
            latestExecution: {
              pipelineExecutionId: 'exec-12345',
              status: 'InProgress'
            }
          }
        ]
      };

      const summary = parsePipelineStateResponse(raw);
      expect(summary.pipelineName).toBe('adms-sandbox-v2-lcdb-data-import-pipeline');
      expect(summary.status).toBe('InProgress');
      expect(summary.executionId).toBe('exec-12345');
      expect(summary.stages).toHaveLength(3);

      expect(summary.stages[0].stageName).toBe('Source');
      expect(summary.stages[0].primaryAction.actionName).toBe('Github');
      expect(summary.stages[0].status).toBe('Succeeded');

      expect(summary.stages[2].stageName).toBe('RESTORE_LCDB');
      expect(summary.stages[2].primaryAction.actionName).toBe('Restore-admslcdb01si');
      expect(summary.stages[2].status).toBe('InProgress');
    });

    it('generates multi-action progress summary text', () => {
      const raw: RawPipelineStateResponse = {
        pipelineName: 'multi-action-pipeline',
        stageStates: [
          {
            stageName: 'Test',
            actionStates: [
              {
                actionName: 'Lint',
                latestExecution: { status: 'Succeeded' }
              },
              {
                actionName: 'E2E',
                latestExecution: { status: 'InProgress' }
              }
            ]
          }
        ]
      };

      const summary = parsePipelineStateResponse(raw);
      expect(summary.stages[0].progressSummaryText).toBe('[1/2 完成: Lint]');
    });
  });

  describe('CSRF token and Region resolution', () => {
    it('extracts CSRF token from meta tag if present', () => {
      const meta = document.createElement('meta');
      meta.name = 'awsc-csrf-token';
      meta.content = 'test-csrf-token-123';
      document.head.appendChild(meta);

      expect(getConsoleCsrfToken()).toBe('test-csrf-token-123');
    });

    it('extracts CSRF token from cookie as fallback', () => {
      document.cookie = 'awsc-csrf-token=cookie-csrf-456; other=123';
      expect(getConsoleCsrfToken()).toBe('cookie-csrf-456');
    });

    it('resolves region from search parameter', () => {
      delete (window as any).location;
      window.location = new URL(
        'https://console.aws.amazon.com/codesuite/codepipeline?region=us-west-2'
      ) as any;

      expect(resolveCurrentRegion()).toBe('us-west-2');
    });
  });

  describe('fetchPipelineExecutionState with 15s caching', () => {
    it('caches response and avoids second network call within 15 seconds', async () => {
      const mockRaw: RawPipelineStateResponse = {
        pipelineName: 'cached-pipeline',
        stageStates: [
          {
            stageName: 'Source',
            actionStates: [{ actionName: 'Git', latestExecution: { status: 'Succeeded' } }]
          }
        ]
      };

      let dispatchCount = 0;
      const bridgeHandler = (e: Event) => {
        dispatchCount++;
        const customEvent = e as CustomEvent;
        window.dispatchEvent(
          new CustomEvent('AWS_FAVORITES_PIPELINE_STATE_RESULT', {
            detail: {
              requestId: customEvent.detail?.requestId,
              success: true,
              data: mockRaw
            }
          })
        );
      };
      window.addEventListener('AWS_FAVORITES_GET_PIPELINE_STATE', bridgeHandler as EventListener);

      const firstCall = await fetchPipelineExecutionState('cached-pipeline', 'ap-southeast-2');
      expect(firstCall.pipelineName).toBe('cached-pipeline');
      expect(dispatchCount).toBe(1);

      // Second call immediately after should hit cache
      const secondCall = await fetchPipelineExecutionState('cached-pipeline', 'ap-southeast-2');
      expect(secondCall.pipelineName).toBe('cached-pipeline');
      expect(dispatchCount).toBe(1); // No new network/bridge call

      window.removeEventListener(
        'AWS_FAVORITES_GET_PIPELINE_STATE',
        bridgeHandler as EventListener
      );
    });
  });
});
