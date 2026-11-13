import type { PipelineExecutionSummary, PipelineStatus } from './types';
import { POPOVER_ID, getPopoverStyles } from './popover-styles';

/**
 * Checks whether the current page environment is in Dark Mode.
 */
export function isDarkMode(): boolean {
  if (typeof document === 'undefined') return false;
  return (
    document.body.classList.contains('awsui-dark-mode') ||
    document.documentElement.classList.contains('awsui-dark-mode') ||
    document.body.getAttribute('data-theme') === 'dark' ||
    document.documentElement.getAttribute('data-theme') === 'dark'
  );
}

/**
 * Resolves a status badge color and icon for top-level or action status.
 */
function getStatusDetails(status: PipelineStatus): { color: string; bg: string; icon: string } {
  switch (status) {
    case 'Succeeded':
      return { color: '#037f0c', bg: '#ecf7ed', icon: '✓' };
    case 'InProgress':
      return { color: '#0972d3', bg: '#f1f8fe', icon: '🔄' };
    case 'Failed':
      return { color: '#d13212', bg: '#fdf2f2', icon: '✕' };
    case 'Stopped':
      return { color: '#545b64', bg: '#f2f3f3', icon: '⏹' };
    default:
      return { color: '#545b64', bg: '#f2f3f3', icon: '⏳' };
  }
}

/**
 * Positions the popover relative to the target element's bounding rect.
 */
function positionPopover(popover: HTMLElement, targetRect: DOMRect): void {
  const margin = 8;
  const popoverWidth = popover.offsetWidth || 560;
  const popoverHeight = popover.offsetHeight || 120;

  let left = targetRect.left;
  if (left + popoverWidth > window.innerWidth - 16) {
    left = window.innerWidth - popoverWidth - 16;
  }
  if (left < 16) {
    left = 16;
  }

  let top = targetRect.bottom + margin;
  if (top + popoverHeight > window.innerHeight - 16) {
    top = targetRect.top - popoverHeight - margin;
  }
  if (top < 16) {
    top = 16;
  }

  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(top)}px`;
}

/**
 * Removes any active CodePipeline hover popover from DOM.
 */
export function removePipelinePopover(immediate = false): void {
  const existing = document.getElementById(POPOVER_ID);
  if (existing) {
    if (immediate) {
      existing.remove();
    } else {
      existing.classList.remove('popover-visible');
      setTimeout(() => {
        existing.remove();
      }, 150);
    }
  }
}

/**
 * Renders a loading state popover while fetching pipeline status.
 */
export function renderLoadingPopover(
  targetElement: HTMLElement,
  pipelineName: string
): HTMLElement {
  removePipelinePopover(true);

  const dark = isDarkMode();
  const popover = document.createElement('div');
  popover.id = POPOVER_ID;

  const styleEl = document.createElement('style');
  styleEl.textContent = getPopoverStyles(dark);
  popover.appendChild(styleEl);

  const content = document.createElement('div');
  content.innerHTML = `
    <div class="popover-header">
      <div class="popover-title-row">
        <span>🚀</span>
        <span>${pipelineName}</span>
      </div>
      <div class="popover-badge" style="background:#f1f8fe;color:#0972d3;">
        <span>🔄</span> 加载中...
      </div>
    </div>
    <div class="popover-loading">
      <span>正在查询最新执行状态...</span>
    </div>
  `;
  popover.appendChild(content);

  document.body.appendChild(popover);
  positionPopover(popover, targetElement.getBoundingClientRect());
  requestAnimationFrame(() => popover.classList.add('popover-visible'));

  return popover;
}

/**
 * Renders an error card popover when fetching pipeline execution state fails.
 */
export function renderErrorPopover(
  targetElement: HTMLElement,
  pipelineName: string,
  errorMessage: string
): HTMLElement {
  removePipelinePopover(true);

  const dark = isDarkMode();
  const popover = document.createElement('div');
  popover.id = POPOVER_ID;

  const styleEl = document.createElement('style');
  styleEl.textContent = getPopoverStyles(dark);
  popover.appendChild(styleEl);

  const content = document.createElement('div');
  content.innerHTML = `
    <div class="popover-header">
      <div class="popover-title-row">
        <span>🚀</span>
        <span>${pipelineName}</span>
      </div>
      <div class="popover-badge" style="background:#fdf2f2;color:#d13212;">
        <span>✕</span> 查询失败
      </div>
    </div>
    <div style="font-size:12px;color:#d13212;padding:6px 0;word-break:break-all;">
      ${errorMessage}
    </div>
  `;
  popover.appendChild(content);

  document.body.appendChild(popover);
  positionPopover(popover, targetElement.getBoundingClientRect());
  requestAnimationFrame(() => popover.classList.add('popover-visible'));

  return popover;
}

/**
 * Renders Option B layout for pipeline execution state.
 */
export function renderPipelinePopover(
  targetElement: HTMLElement,
  summary: PipelineExecutionSummary
): HTMLElement {
  removePipelinePopover(true);

  const dark = isDarkMode();
  const popover = document.createElement('div');
  popover.id = POPOVER_ID;

  const styleEl = document.createElement('style');
  styleEl.textContent = getPopoverStyles(dark);
  popover.appendChild(styleEl);

  const overall = getStatusDetails(summary.status);
  const executionText = summary.executionId ? `执行: ${summary.executionId.slice(0, 8)}...` : '';

  const flowHtml = summary.stages
    .map((stage, idx) => {
      const action = stage.primaryAction;
      const actionDetails = getStatusDetails(action.status);
      const isLast = idx === summary.stages.length - 1;

      return `
        <div class="stage-node">
          <div class="stage-title">${stage.stageName}</div>
          <div class="stage-action-row">
            <span style="color:${actionDetails.color};">${actionDetails.icon}</span>
            <span class="action-name" title="${action.actionName}">${action.actionName}</span>
            ${action.durationText ? `<span class="stage-duration">${action.durationText}</span>` : ''}
          </div>
          ${
            stage.progressSummaryText
              ? `<div class="stage-progress-summary" title="${stage.progressSummaryText}">${stage.progressSummaryText}</div>`
              : `<div class="stage-progress-summary" style="opacity:0;">-</div>`
          }
        </div>
        ${!isLast ? '<div class="flow-arrow">──▶</div>' : ''}
      `;
    })
    .join('');

  const container = document.createElement('div');
  container.innerHTML = `
    <div class="popover-header">
      <div class="popover-title-row">
        <span>🚀</span>
        <span>${summary.pipelineName}</span>
      </div>
      <div class="popover-badge" style="background:${overall.bg};color:${overall.color};">
        <span>${overall.icon}</span>
        <span>${summary.status}</span>
      </div>
    </div>
    <div class="popover-meta">
      ${executionText ? `<span>${executionText}</span>` : ''}
      <span>阶段数: ${summary.stages.length}</span>
    </div>
    <div class="popover-flow" style="margin-top:8px;">
      ${flowHtml || '<div style="color:#545b64;font-size:12px;">暂无阶段信息</div>'}
    </div>
  `;
  popover.appendChild(container);

  document.body.appendChild(popover);
  positionPopover(popover, targetElement.getBoundingClientRect());
  requestAnimationFrame(() => popover.classList.add('popover-visible'));

  return popover;
}
