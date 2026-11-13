import type { PipelineStatus } from './types';

/**
 * Calculates brightness of a color string (rgb, rgba, or hex) and returns
 * whether the color is dark (brightness < 128). Returns null if color cannot be parsed.
 */
export function isColorDark(colorStr: string): boolean | null {
  if (!colorStr) return null;
  const str = colorStr.trim().toLowerCase();

  // Handle rgb / rgba
  const rgbMatch = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    const alpha = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;
    if (alpha > 0.1) {
      const r = parseInt(rgbMatch[1], 10);
      const g = parseInt(rgbMatch[2], 10);
      const b = parseInt(rgbMatch[3], 10);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness < 128;
    }
    return null;
  }

  // Handle hex #fff, #161e2e
  if (str.startsWith('#')) {
    const hex = str.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return (r * 299 + g * 587 + b * 114) / 1000 < 128;
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return (r * 299 + g * 587 + b * 114) / 1000 < 128;
    }
  }

  return null;
}

/**
 * Checks whether the current page environment is in Dark Mode,
 * checking configured override, AWS Console visual mode cookie, Cloudscape
 * polaris classes, CSS custom properties, DOM background luminance, and prefers-color-scheme.
 */
export function isDarkMode(override?: 'light' | 'dark' | 'auto'): boolean {
  if (override === 'dark') return true;
  if (override === 'light') return false;

  if (typeof document === 'undefined') return false;

  // 1. Check AWS Console visual mode cookie (awsc-color-theme)
  try {
    const cookieMatch = document.cookie.match(/(?:^|;\s*)awsc-color-theme=([^;]+)/);
    if (cookieMatch) {
      const mode = decodeURIComponent(cookieMatch[1]).toLowerCase();
      if (mode === 'dark') return true;
      if (mode === 'light') return false;
    }
  } catch {
    // Ignore cookie read error
  }

  // 2. Check Cloudscape dark mode classes anywhere in DOM or root
  if (
    document.body.classList.contains('awsui-dark-mode') ||
    document.body.classList.contains('awsui-polaris-dark-mode') ||
    document.documentElement.classList.contains('awsui-dark-mode') ||
    document.documentElement.classList.contains('awsui-polaris-dark-mode') ||
    document.body.getAttribute('data-theme') === 'dark' ||
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    document.documentElement.hasAttribute('data-darkreader-mode') ||
    document.querySelector(
      '.awsui-dark-mode, .awsui-polaris-dark-mode, [data-theme="dark"], [data-color-mode="dark"], style.darkreader, meta[name="darkreader"]'
    ) !== null
  ) {
    return true;
  }

  // 3. Check Cloudscape CSS custom properties on documentElement
  try {
    const rootStyle = window.getComputedStyle(document.documentElement);
    const layoutBg =
      rootStyle.getPropertyValue('--color-background-layout-main') ||
      rootStyle.getPropertyValue('--color-background-container-content');
    if (layoutBg) {
      const dark = isColorDark(layoutBg);
      if (dark !== null) return dark;
    }
  } catch {
    // Ignore fallback
  }

  // 4. Check computed background color of main layout elements
  try {
    const selectors = ['main', '#app', '#b', '.awsui-app-layout', 'table', 'body'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const bg = window.getComputedStyle(el).backgroundColor;
        const dark = isColorDark(bg);
        if (dark !== null) return dark;
      }
    }
  } catch {
    // Ignore fallback
  }

  // 5. Fallback to browser/system color scheme
  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }
  } catch {
    // Ignore matchMedia error
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
