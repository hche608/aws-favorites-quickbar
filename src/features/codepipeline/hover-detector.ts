import { fetchPipelineExecutionState, resolveCurrentRegion } from './pipeline-service';
import {
  renderPipelinePopover,
  renderLoadingPopover,
  renderErrorPopover,
  removePipelinePopover
} from './popover-renderer';
import { POPOVER_ID } from './popover-styles';
import { loadSettings } from '../../settings';

const HOVER_DELAY_MS = 3000;
const DISMISS_DELAY_MS = 250;

interface ActiveHoverState {
  element: HTMLElement;
  container: HTMLElement;
  pipelineName: string;
  region: string;
  timer: ReturnType<typeof setTimeout> | null;
}

let activeState: ActiveHoverState | null = null;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;
let isInitialized = false;

function clearDismissTimer(): void {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
}

function isInsideActiveContext(target: Node | null): boolean {
  if (!target) return false;
  if (activeState) {
    if (activeState.element.contains(target) || activeState.container.contains(target)) {
      return true;
    }
  }
  const popover = document.getElementById(POPOVER_ID);
  return Boolean(popover && popover.contains(target));
}

/**
 * Checks if the current page is an AWS CodePipeline console list or overview page.
 */
export function isCodePipelinePage(): boolean {
  if (typeof window === 'undefined' || !window.location) return false;
  const { hostname, pathname } = window.location;
  return (
    hostname.endsWith('.console.aws.amazon.com') &&
    pathname.includes('/codesuite/codepipeline/pipelines')
  );
}

/**
 * Parses pipeline name and region from a CodePipeline console anchor element.
 */
export function parsePipelineFromLink(
  anchor: HTMLAnchorElement
): { pipelineName: string; region: string } | null {
  const href = anchor.getAttribute('href') || anchor.href || '';
  if (!href) return null;

  // Pattern: /codesuite/codepipeline/pipelines/<pipelineName>/view
  const match = href.match(/\/codesuite\/codepipeline\/pipelines\/([^/?#]+)\/view/);
  if (!match || !match[1]) return null;

  const pipelineName = decodeURIComponent(match[1]);

  let region = resolveCurrentRegion();
  try {
    const url = new URL(href, window.location.href);
    const regionParam = url.searchParams.get('region');
    if (regionParam) {
      region = regionParam;
    }
  } catch {
    // Ignore URL parse fallback
  }

  return { pipelineName, region };
}

/**
 * Handles mouseover event delegation with popover interactivity support.
 */
function handleMouseOver(event: MouseEvent): void {
  if (!isCodePipelinePage()) return;

  const target = event.target as HTMLElement | null;
  if (!target) return;

  // If hovering inside the popover or active link/container, maintain active state
  if (isInsideActiveContext(target)) {
    clearDismissTimer();
    return;
  }

  const anchor = target.closest<HTMLAnchorElement>('a[href*="/codesuite/codepipeline/pipelines/"]');
  if (!anchor) return;

  const parsed = parsePipelineFromLink(anchor);
  if (!parsed) return;

  const container = (anchor.closest('tr') as HTMLElement | null) || anchor;

  // If already hovering this exact element, maintain current state
  if (activeState && (activeState.element === anchor || activeState.container === container)) {
    clearDismissTimer();
    return;
  }

  // Clear previous pending state
  cancelHover();

  const { pipelineName, region } = parsed;

  const timer = setTimeout(async () => {
    try {
      renderLoadingPopover(anchor, pipelineName);
      const summary = await fetchPipelineExecutionState(pipelineName, region);

      // Verify user is still hovering this element or the popover before rendering
      if (activeState && activeState.element === anchor) {
        renderPipelinePopover(anchor, summary);
      }
    } catch (error) {
      console.warn('AWS Favorites Quickbar: Failed to load pipeline state', error);
      if (activeState && activeState.element === anchor) {
        renderErrorPopover(
          anchor,
          pipelineName,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }, HOVER_DELAY_MS);

  activeState = {
    element: anchor,
    container,
    pipelineName,
    region,
    timer
  };
}

/**
 * Cancels pending timer and tears down active popover.
 */
export function cancelHover(): void {
  clearDismissTimer();
  if (activeState) {
    if (activeState.timer) {
      clearTimeout(activeState.timer);
    }
    activeState = null;
  }
  removePipelinePopover();
}

/**
 * Handles mouseout event delegation with debounce buffer for popover bridging.
 */
function handleMouseOut(event: MouseEvent): void {
  if (!activeState && !document.getElementById(POPOVER_ID)) return;

  const related = event.relatedTarget as Node | null;
  if (isInsideActiveContext(related)) {
    return;
  }

  clearDismissTimer();
  dismissTimer = setTimeout(() => {
    cancelHover();
  }, DISMISS_DELAY_MS);
}

/**
 * Initializes CodePipeline hover detection if on CodePipeline page and enabled in settings.
 */
export async function initCodePipelineHover(): Promise<void> {
  const settings = await loadSettings();
  if (settings.enableCodePipelineHoverPreview === false) {
    return;
  }

  if (isInitialized) {
    return;
  }

  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  isInitialized = true;
}

/**
 * Cleans up CodePipeline hover listeners and popovers (for tear-down and tests).
 */
export function cleanupCodePipelineHover(): void {
  cancelHover();
  if (isInitialized) {
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);
    isInitialized = false;
  }
}
