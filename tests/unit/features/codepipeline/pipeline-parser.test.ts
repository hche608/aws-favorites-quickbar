import { describe, it, expect } from 'vitest';
import {
  formatTimeAgo,
  selectPrimaryAction,
  parsePipelineStateResponse
} from '../../../../src/features/codepipeline/pipeline-parser';
import type {
  StageState,
  RawPipelineStateResponse
} from '../../../../src/features/codepipeline/types';

describe('pipeline-parser', () => {
  describe('formatTimeAgo', () => {
    it('returns empty string for null, undefined, or empty values', () => {
      expect(formatTimeAgo(null)).toBe('');
      expect(formatTimeAgo(undefined)).toBe('');
      expect(formatTimeAgo('')).toBe('');
    });

    it('correctly formats Date objects', () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      expect(formatTimeAgo(tenMinutesAgo)).toBe('10m');
    });

    it('correctly formats numeric epoch seconds (AWS JSON API format)', () => {
      const fiveSecondsAgo = (Date.now() - 5 * 1000) / 1000;
      expect(formatTimeAgo(fiveSecondsAgo)).toBe('5s');

      const twoHoursAgo = (Date.now() - 2 * 3600 * 1000) / 1000;
      expect(formatTimeAgo(twoHoursAgo)).toBe('2h');
    });

    it('correctly formats numeric epoch milliseconds', () => {
      const thirtySecondsAgo = Date.now() - 30 * 1000;
      expect(formatTimeAgo(thirtySecondsAgo)).toBe('30s');
    });

    it('correctly formats numeric string timestamps', () => {
      const epochSeconds = String(Math.floor((Date.now() - 120 * 1000) / 1000));
      expect(formatTimeAgo(epochSeconds)).toBe('2m');
    });

    it('correctly formats ISO date strings', () => {
      const isoString = new Date(Date.now() - 3600 * 1000).toISOString();
      expect(formatTimeAgo(isoString)).toBe('1h');
    });

    it('returns empty string for unparseable input', () => {
      expect(formatTimeAgo('invalid-date')).toBe('');
    });
  });

  describe('selectPrimaryAction', () => {
    it('handles empty action states', () => {
      const stage: StageState = {
        stageName: 'Empty',
        actionStates: []
      };
      const result = selectPrimaryAction(stage);
      expect(result.primaryAction.actionName).toBe('No Actions');
      expect(result.primaryAction.status).toBe('Unknown');
      expect(result.completedActions).toBe(0);
    });

    it('prioritizes failed actions', () => {
      const stage: StageState = {
        stageName: 'Build',
        actionStates: [
          {
            actionName: 'Step1',
            latestExecution: { status: 'Succeeded' }
          },
          {
            actionName: 'Step2',
            latestExecution: { status: 'Failed' }
          }
        ]
      };
      const result = selectPrimaryAction(stage);
      expect(result.primaryAction.actionName).toBe('Step2');
      expect(result.primaryAction.status).toBe('Failed');
      expect(result.completedActions).toBe(1);
    });

    it('prioritizes in-progress actions when no failed actions', () => {
      const stage: StageState = {
        stageName: 'Deploy',
        actionStates: [
          {
            actionName: 'PreDeploy',
            latestExecution: { status: 'Succeeded' }
          },
          {
            actionName: 'DeployEC2',
            latestExecution: { status: 'InProgress' }
          }
        ]
      };
      const result = selectPrimaryAction(stage);
      expect(result.primaryAction.actionName).toBe('DeployEC2');
      expect(result.primaryAction.status).toBe('InProgress');
    });
  });

  describe('parsePipelineStateResponse', () => {
    it('parses raw response into PipelineExecutionSummary', () => {
      const raw: RawPipelineStateResponse = {
        pipelineName: 'test-pipeline',
        stageStates: [
          {
            stageName: 'Source',
            actionStates: [
              {
                actionName: 'GitHub',
                latestExecution: {
                  status: 'Succeeded',
                  lastStatusChange: Date.now() / 1000
                }
              }
            ],
            latestExecution: {
              pipelineExecutionId: 'exec-12345',
              status: 'Succeeded'
            }
          }
        ]
      };
      const summary = parsePipelineStateResponse(raw);
      expect(summary.pipelineName).toBe('test-pipeline');
      expect(summary.status).toBe('Succeeded');
      expect(summary.executionId).toBe('exec-12345');
      expect(summary.stages).toHaveLength(1);
      expect(summary.stages[0].stageName).toBe('Source');
      expect(summary.stages[0].primaryAction.actionName).toBe('GitHub');
    });
  });
});
