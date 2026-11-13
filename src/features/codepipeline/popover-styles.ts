export const POPOVER_ID = 'aws-favorites-codepipeline-popover';

/**
 * Builds the isolated CSS stylesheet string for the CodePipeline hover popover,
 * harmonized with AWS Cloudscape Design System standards.
 */
export function getPopoverStyles(dark: boolean): string {
  const bg = dark ? '#161e2e' : '#ffffff';
  const border = dark ? '#354153' : '#d5dbdb';
  const textPrimary = dark ? '#f8fafc' : '#16191f';
  const textMuted = dark ? '#94a3b8' : '#545b64';
  const headerBorder = dark ? '#2e3b4e' : '#eaeded';
  const cardBg = dark ? '#1c2536' : '#fafbfc';
  const cardBorder = dark ? '#2d3b4f' : '#e9ebed';
  const cardHoverBorder = dark ? '#59bfff' : '#0972d3';
  const shadow = dark ? '0 6px 24px 2px rgba(0, 0, 0, 0.7)' : '0 6px 24px 2px rgba(0, 7, 22, 0.16)';
  const scrollTrack = dark ? '#1c2536' : '#f1f3f5';
  const scrollThumb = dark ? '#414d5c' : '#c4cdd5';

  return `
    #${POPOVER_ID} {
      position: fixed;
      z-index: 999999;
      background: ${bg};
      border: 1px solid ${border};
      border-radius: 8px;
      box-shadow: ${shadow};
      font-family: "Amazon Ember", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: ${textPrimary};
      padding: 12px 14px 10px 14px;
      min-width: 440px;
      max-width: min(880px, calc(100vw - 32px));
      pointer-events: auto;
      transition: opacity 0.15s ease-out, transform 0.15s ease-out;
      opacity: 0;
      transform: translateY(4px);
      box-sizing: border-box;
      user-select: text;
    }
    #${POPOVER_ID}.popover-visible {
      opacity: 1;
      transform: translateY(0);
    }
    #${POPOVER_ID} .popover-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid ${headerBorder};
    }
    #${POPOVER_ID} .popover-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 13px;
      color: ${textPrimary};
      overflow: hidden;
    }
    #${POPOVER_ID} .popover-title-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #${POPOVER_ID} .popover-service-icon {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #0972d3;
    }
    #${POPOVER_ID} .popover-meta {
      font-size: 11px;
      color: ${textMuted};
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    #${POPOVER_ID} .popover-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid transparent;
      flex-shrink: 0;
    }
    #${POPOVER_ID} .popover-flow {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 4px 2px 8px 2px;
      scrollbar-width: thin;
      scrollbar-color: ${scrollThumb} ${scrollTrack};
    }
    #${POPOVER_ID} .popover-flow::-webkit-scrollbar {
      height: 6px;
    }
    #${POPOVER_ID} .popover-flow::-webkit-scrollbar-track {
      background: ${scrollTrack};
      border-radius: 3px;
    }
    #${POPOVER_ID} .popover-flow::-webkit-scrollbar-thumb {
      background: ${scrollThumb};
      border-radius: 3px;
    }
    #${POPOVER_ID} .stage-node {
      background: ${cardBg};
      border: 1px solid ${cardBorder};
      border-radius: 6px;
      padding: 7px 10px;
      min-width: 136px;
      max-width: 176px;
      height: 64px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      flex-shrink: 0;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    #${POPOVER_ID} .stage-node:hover {
      border-color: ${cardHoverBorder};
    }
    #${POPOVER_ID} .stage-title {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: ${textMuted};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #${POPOVER_ID} .stage-action-row {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 500;
      color: ${textPrimary};
      white-space: nowrap;
      overflow: hidden;
    }
    #${POPOVER_ID} .stage-action-row .action-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }
    #${POPOVER_ID} .stage-duration {
      font-size: 10.5px;
      color: ${textMuted};
      flex-shrink: 0;
      font-weight: 400;
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
      font-size: 13px;
      flex-shrink: 0;
      user-select: none;
      display: flex;
      align-items: center;
    }
    #${POPOVER_ID} .popover-loading {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 0;
      color: ${textMuted};
      font-size: 12px;
    }
  `;
}
