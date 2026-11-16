/**
 * Data contracts and type definitions for CodePipeline hover status preview.
 */

export type PipelineStatus = 'Succeeded' | 'InProgress' | 'Failed' | 'Stopped' | 'Unknown';

export interface ActionExecutionDetail {
  actionExecutionId?: string;
  status: PipelineStatus;
  summary?: string;
  lastStatusChange?: string | Date | number;
  externalExecutionId?: string;
  externalExecutionUrl?: string;
}

export interface ActionState {
  actionName: string;
  latestExecution?: ActionExecutionDetail;
  entityUrl?: string;
  revisionUrl?: string;
}

export interface StageState {
  stageName: string;
  inboundTransitionState?: {
    enabled: boolean;
  };
  actionStates: ActionState[];
  latestExecution?: {
    pipelineExecutionId?: string;
    status: PipelineStatus;
  };
}

export interface RawPipelineStateResponse {
  pipelineName: string;
  pipelineVersion?: number;
  stageStates: StageState[];
  created?: string | number | Date;
  updated?: string | number | Date;
}

export interface FormattedActionSummary {
  actionName: string;
  status: PipelineStatus;
  durationText?: string;
}

export interface FormattedStageSummary {
  stageName: string;
  status: PipelineStatus;
  primaryAction: FormattedActionSummary;
  totalActions: number;
  completedActions: number;
  progressSummaryText?: string; // e.g. "[1/2 completed: LintCheck]"
}

export interface PipelineExecutionSummary {
  pipelineName: string;
  status: PipelineStatus;
  executionId?: string;
  startTimeText?: string;
  stages: FormattedStageSummary[];
  raw?: RawPipelineStateResponse;
}
