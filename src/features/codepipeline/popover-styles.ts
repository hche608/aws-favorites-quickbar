export const POPOVER_ID = 'aws-favorites-codepipeline-popover';

/**
 * Builds the isolated CSS stylesheet string for the CodePipeline hover popover.
 */
export function getPopoverStyles(dark: boolean): string {
  const bg = dark ? '#161f28' : '#ffffff';
  const border = dark ? '#414d5c' : '#eaeded';
  const textPrimary = dark ? '#f2f3f3' : '#16191f';
  const textMuted = dark ? '#9ba7b4' : '#687078';
  const cardBg = dark ? '#232f3e' : '#f8f9fa';
  const cardBorder = dark ? '#344252' : '#e9ebed';
  const shadow = dark ? '0 8px 24px rgba(0, 0, 0, 0.65)' : '0 8px 24px rgba(0, 7, 22, 0.15)';

  return `
    #${POPOVER_ID} {
      position: fixed;
      z-index: 999999;
      background: ${bg};
      border: 1px solid ${border};
      border-radius: 8px;
      box-shadow: ${shadow};
      font-family: "Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      color: ${textPrimary};
      padding: 12px 16px;
      min-width: 480px;
      max-width: 820px;
      pointer-events: none;
      transition: opacity 0.15s ease-out, transform 0.15s ease-out;
      opacity: 0;
      transform: translateY(4px);
    }
    #${POPOVER_ID}.popover-visible {
      opacity: 1;
      transform: translateY(0);
    }
    #${POPOVER_ID} .popover-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid ${border};
    }
    #${POPOVER_ID} .popover-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 14px;
      color: ${textPrimary};
    }
    #${POPOVER_ID} .popover-meta {
      font-size: 11px;
      color: ${textMuted};
      display: flex;
      gap: 12px;
    }
    #${POPOVER_ID} .popover-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    #${POPOVER_ID} .popover-flow {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
      padding: 4px 0;
    }
    #${POPOVER_ID} .stage-node {
      background: ${cardBg};
      border: 1px solid ${cardBorder};
      border-radius: 6px;
      padding: 8px 10px;
      min-width: 130px;
      max-width: 170px;
      height: 64px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      flex-shrink: 0;
    }
    #${POPOVER_ID} .stage-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${textMuted};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #${POPOVER_ID} .stage-action-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      color: ${textPrimary};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #${POPOVER_ID} .stage-action-row .action-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }
    #${POPOVER_ID} .stage-duration {
      font-size: 11px;
      color: ${textMuted};
      flex-shrink: 0;
    }
    #${POPOVER_ID} .stage-progress-summary {
      font-size: 10px;
      color: ${textMuted};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #${POPOVER_ID} .flow-arrow {
      color: ${textMuted};
      font-size: 12px;
      flex-shrink: 0;
      user-select: none;
    }
    #${POPOVER_ID} .popover-loading {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 0;
      color: ${textMuted};
      font-size: 12px;
    }
  `;
}
