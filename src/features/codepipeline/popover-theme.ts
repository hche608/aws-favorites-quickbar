import type { PipelineStatus } from './types';

/**
 * Checks whether the current page environment is in Dark Mode,
 * checking Cloudscape classes, theme attributes, Dark Reader, and computed background luminance.
 */
export function isDarkMode(): boolean {
  if (typeof document === 'undefined') return false;

  if (
    document.body.classList.contains('awsui-dark-mode') ||
    document.documentElement.classList.contains('awsui-dark-mode') ||
    document.body.getAttribute('data-theme') === 'dark' ||
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    document.querySelector('meta[name="darkreader"]') !== null
  ) {
    return true;
  }

  try {
    const bg = window.getComputedStyle(document.body).backgroundColor;
    const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      const alpha = match[4] !== undefined ? parseFloat(match[4]) : 1;
      if (alpha > 0.1) {
        const r = parseInt(match[1], 10);
        const g = parseInt(match[2], 10);
        const b = parseInt(match[3], 10);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        if (brightness < 128) return true;
      }
    }
  } catch {
    // Ignore fallback
  }

  return false;
}

export interface StatusStyleDetails {
  color: string;
  bg: string;
  border: string;
  accent: string;
  symbol: string;
}

/**
 * Resolves status badge colors and symbols according to Cloudscape Design tokens.
 */
export function getStatusDetails(status: PipelineStatus, dark: boolean): StatusStyleDetails {
  switch (status) {
    case 'Succeeded':
      return {
        color: dark ? '#4ade80' : '#037f0c',
        bg: dark ? '#0d2b18' : '#f2fcf3',
        border: dark ? '#1e562c' : '#bce3be',
        accent: dark ? '#22c55e' : '#037f0c',
        symbol: '✓'
      };
    case 'InProgress':
      return {
        color: dark ? '#38bdf8' : '#0073bb',
        bg: dark ? '#0c2b44' : '#f1faff',
        border: dark ? '#1a5b88' : '#bce1f8',
        accent: dark ? '#38bdf8' : '#0972d3',
        symbol: '↻'
      };
    case 'Failed':
      return {
        color: dark ? '#f87171' : '#d13212',
        bg: dark ? '#3c1218' : '#fdf3f1',
        border: dark ? '#701c25' : '#f8b8ab',
        accent: dark ? '#f87171' : '#d13212',
        symbol: '✕'
      };
    case 'Stopped':
      return {
        color: dark ? '#fbbf24' : '#876600',
        bg: dark ? '#342704' : '#fffbe6',
        border: dark ? '#6d5208' : '#ffe58f',
        accent: dark ? '#fbbf24' : '#876600',
        symbol: '⊘'
      };
    default:
      return {
        color: dark ? '#94a3b8' : '#545b64',
        bg: dark ? '#1e293b' : '#f2f3f3',
        border: dark ? '#354153' : '#d5dbdb',
        accent: dark ? '#64748b' : '#545b64',
        symbol: '—'
      };
  }
}
