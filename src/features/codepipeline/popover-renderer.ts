import type { PipelineExecutionSummary } from './types';
import { POPOVER_ID, getPopoverStyles } from './popover-styles';
import { isDarkMode, getStatusDetails } from './popover-theme';

export { isDarkMode, getStatusDetails };

/**
 * Positions the popover relative to the target element's bounding rect.
 */
function positionPopover(popover: HTMLElement, targetRect: DOMRect): void {
  const margin = 6;
  const popoverWidth = popover.offsetWidth || 560;
  const popoverHeight = popover.offsetHeight || 130;

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
 * Attaches horizontal wheel scrolling to any scrollable element.
 */
function enableHorizontalWheel(element: HTMLElement): void {
  element.addEventListener(
    'wheel',
    (e: WheelEvent) => {
      if (e.deltaY && !e.deltaX) {
        element.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    },
    { passive: false }
  );
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

  const loadingDetails = getStatusDetails('InProgress', dark);

  const content = document.createElement('div');
  content.innerHTML = `
    <div class=\"popover-header\">
      <div class=\"popover-title-row\">
        <span class=\"popover-service-icon\">
          <svg width=\"14\" height=\"14\" viewBox=\"0 0 16 16\" fill=\"currentColor\"><path d=\"M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3zm2 1v8h8V4H4z\"/></svg>
        </span>
        <span class=\"popover-title-text\">${pipelineName}</span>
      </div>
      <div class=\"popover-badge\" style=\"background:${loadingDetails.bg};color:${loadingDetails.color};border-color:${loadingDetails.border};\">
        <span>${loadingDetails.symbol}</span> Loading...
      </div>
    </div>
    <div class=\"popover-loading\">
      <span>Fetching execution state...</span>
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

  const errorDetails = getStatusDetails('Failed', dark);

  const content = document.createElement('div');
  content.innerHTML = `
    <div class=\"popover-header\">
      <div class=\"popover-title-row\">
        <span class=\"popover-service-icon\">
          <svg width=\"14\" height=\"14\" viewBox=\"0 0 16 16\" fill=\"currentColor\"><path d=\"M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3zm2 1v8h8V4H4z\"/></svg>
        </span>
        <span class=\"popover-title-text\">${pipelineName}</span>
      </div>
      <div class=\"popover-badge\" style=\"background:${errorDetails.bg};color:${errorDetails.color};border-color:${errorDetails.border};\">
        <span>${errorDetails.symbol}</span> Failed
      </div>
    </div>
    <div style=\"font-size:11.5px;color:${errorDetails.color};padding:6px 0;word-break:break-all;\">
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

  const overall = getStatusDetails(summary.status, dark);
  const executionText = summary.executionId
    ? `Execution: ${summary.executionId.slice(0, 8)}...`
    : '';

  const flowHtml = summary.stages
    .map((stage, idx) => {
      const action = stage.primaryAction;
      const actionDetails = getStatusDetails(action.status, dark);
      const isLast = idx === summary.stages.length - 1;

      return `
        <div class=\"stage-node\">
          <div class=\"stage-title\" title=\"${stage.stageName}\">${stage.stageName}</div>
          <div class=\"stage-action-row\">
            <span style=\"color:${actionDetails.color};font-weight:700;\">${actionDetails.symbol}</span>
            <span class=\"action-name\" title=\"${action.actionName}\">${action.actionName}</span>
            ${action.durationText ? `<span class=\"stage-duration\">${action.durationText}</span>` : ''}
          </div>
          ${
            stage.progressSummaryText
              ? `<div class=\"stage-progress-summary\" title=\"${stage.progressSummaryText}\">${stage.progressSummaryText}</div>`
              : `<div class=\"stage-progress-summary\" style=\"opacity:0;\">-</div>`
          }
        </div>
        ${!isLast ? '<div class=\"flow-arrow\"><svg width=\"12\" height=\"12\" viewBox=\"0 0 16 16\" fill=\"currentColor\"><path fill-rule=\"evenodd\" d=\"M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z\"/></svg></div>' : ''}
      `;
    })
    .join('');

  const container = document.createElement('div');
  container.innerHTML = `
    <div class=\"popover-header\">
      <div class=\"popover-title-row\">
        <span class=\"popover-service-icon\">
          <svg width=\"14\" height=\"14\" viewBox=\"0 0 16 16\" fill=\"currentColor\"><path d=\"M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3zm2 1v8h8V4H4z\"/></svg>
        </span>
        <span class=\"popover-title-text\">${summary.pipelineName}</span>
      </div>
      <div class=\"popover-badge\" style=\"background:${overall.bg};color:${overall.color};border-color:${overall.border};\">
        <span>${overall.symbol}</span>
        <span>${summary.status}</span>
      </div>
    </div>
    <div class=\"popover-meta\">
      ${executionText ? `<span>${executionText}</span>` : ''}
      <span>Stages: ${summary.stages.length}</span>
    </div>
    <div class=\"popover-flow\">
      ${flowHtml || '<div style=\"color:#545b64;font-size:12px;\">No stage information</div>'}
    </div>
  `;
  popover.appendChild(container);

  const flowEl = container.querySelector<HTMLElement>('.popover-flow');
  if (flowEl) {
    enableHorizontalWheel(flowEl);
  }

  document.body.appendChild(popover);
  positionPopover(popover, targetElement.getBoundingClientRect());
  requestAnimationFrame(() => popover.classList.add('popover-visible'));

  return popover;
}
