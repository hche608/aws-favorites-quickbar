import type {
  PipelineExecutionSummary,
  RawPipelineStateResponse,
  StageState,
  FormattedStageSummary,
  FormattedActionSummary,
  PipelineStatus
} from './types';

/**
 * Formats a timestamp into a friendly time or elapsed duration string.
 * Supports string (ISO/numeric), Date, or numeric epoch timestamp (seconds or ms).
 */
export function formatTimeAgo(dateInput?: string | Date | number | null): string {
  if (dateInput === null || dateInput === undefined || dateInput === '') return '';

  let targetDate: Date;
  if (dateInput instanceof Date) {
    targetDate = dateInput;
  } else if (typeof dateInput === 'number') {
    // If epoch seconds (e.g. < 1e11), convert to milliseconds
    const ms = dateInput < 1e11 ? dateInput * 1000 : dateInput;
    targetDate = new Date(ms);
  } else if (typeof dateInput === 'string') {
    const numeric = Number(dateInput);
    if (!isNaN(numeric) && /^\d+(\.\d+)?$/.test(dateInput.trim())) {
      const ms = numeric < 1e11 ? numeric * 1000 : numeric;
      targetDate = new Date(ms);
    } else {
      targetDate = new Date(dateInput);
    }
  } else {
    return '';
  }

  if (isNaN(targetDate.getTime())) return '';

  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - targetDate.getTime()) / 1000));

  if (diffSec < 60) {
    return `${diffSec}s`;
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

/**
 * Selects the primary action to highlight in a stage (Option B layout).
 * Prioritizes Failed > InProgress > Succeeded/Pending.
 */
export function selectPrimaryAction(stage: StageState): {
  primaryAction: FormattedActionSummary;
  completedActions: number;
  completedNames: string[];
} {
  const actions = stage.actionStates || [];
  if (actions.length === 0) {
    return {
      primaryAction: {
        actionName: 'No Actions',
        status: 'Unknown'
      },
      completedActions: 0,
      completedNames: []
    };
  }

  const failedAction = actions.find((a) => a.latestExecution?.status === 'Failed');
  const inProgressAction = actions.find((a) => a.latestExecution?.status === 'InProgress');
  const completed = actions.filter((a) => a.latestExecution?.status === 'Succeeded');
  const completedNames = completed.map((a) => a.actionName);

  const chosen = failedAction || inProgressAction || actions[actions.length - 1] || actions[0];

  const status: PipelineStatus = chosen.latestExecution?.status || 'Unknown';
  const durationText = chosen.latestExecution?.lastStatusChange
    ? formatTimeAgo(chosen.latestExecution.lastStatusChange)
    : undefined;

  return {
    primaryAction: {
      actionName: chosen.actionName,
      status,
      durationText
    },
    completedActions: completed.length,
    completedNames
  };
}

/**
 * Parses raw GetPipelineState response into normalized Option B presentation model.
 */
export function parsePipelineStateResponse(
  raw: RawPipelineStateResponse
): PipelineExecutionSummary {
  const stages: FormattedStageSummary[] = (raw.stageStates || []).map((stage) => {
    const totalActions = (stage.actionStates || []).length;
    const { primaryAction, completedActions, completedNames } = selectPrimaryAction(stage);

    let progressSummaryText: string | undefined;
    if (totalActions > 1) {
      if (completedActions > 0) {
        progressSummaryText = `[${completedActions}/${totalActions} completed: ${completedNames.join(', ')}]`;
      } else {
        progressSummaryText = `[0/${totalActions} in progress]`;
      }
    }

    const stageStatus: PipelineStatus =
      stage.latestExecution?.status || primaryAction.status || 'Unknown';

    return {
      stageName: stage.stageName,
      status: stageStatus,
      primaryAction,
      totalActions,
      completedActions,
      progressSummaryText
    };
  });

  // Calculate overall pipeline execution status
  let overallStatus: PipelineStatus = 'Unknown';
  if (stages.some((s) => s.status === 'Failed')) {
    overallStatus = 'Failed';
  } else if (stages.some((s) => s.status === 'InProgress')) {
    overallStatus = 'InProgress';
  } else if (stages.length > 0 && stages.every((s) => s.status === 'Succeeded')) {
    overallStatus = 'Succeeded';
  }

  // Find overall execution ID from the latest stage execution
  const rawStage = raw.stageStates?.[stages.length - 1];
  const executionId = rawStage?.latestExecution?.pipelineExecutionId;

  return {
    pipelineName: raw.pipelineName,
    status: overallStatus,
    executionId,
    stages,
    raw
  };
}
