/**
 * UI state management
 *
 * This module provides functions for managing the popup UI state,
 * including error states, empty states, and warning messages.
 */

/**
 * Shows or hides the error state
 * @param errorStateElement - The error state container element
 * @param serviceListElement - The service list container element
 * @param show - Whether to show the error state
 * @param message - Optional error message to display
 */
export function showErrorState(
  errorStateElement: HTMLElement,
  serviceListElement: HTMLElement,
  show: boolean,
  message: string | null = null
): void {
  if (show) {
    errorStateElement.style.display = 'block';
    serviceListElement.style.display = 'none';

    if (message) {
      const errorMessageElement = errorStateElement.querySelector('.error-message');
      if (errorMessageElement) {
        errorMessageElement.textContent = message;
      }
    }
  } else {
    errorStateElement.style.display = 'none';
    serviceListElement.style.display = 'block';
  }
}

/**
 * Updates the empty state visibility based on current favorites and search
 * @param emptyStateElement - The empty state container element
 * @param currentFavorites - Array of current favorite service IDs
 * @param searchValue - Current search query value
 */
export function updateEmptyState(
  emptyStateElement: HTMLElement,
  currentFavorites: string[],
  searchValue: string
): void {
  if (currentFavorites.length === 0 && searchValue.trim() === '') {
    emptyStateElement.style.display = 'block';
  } else {
    emptyStateElement.style.display = 'none';
  }
}

/**
 * Shows a warning banner with a message
 * @param message - Warning message to display
 */
export function showStorageWarning(message: string): void {
  console.warn('AWS Favorites Quickbar:', message);

  let warningBanner = document.getElementById('warningBanner');
  if (!warningBanner) {
    warningBanner = document.createElement('div');
    warningBanner.id = 'warningBanner';
    warningBanner.className = 'warning-banner';
    warningBanner.style.cssText =
      'background-color: #fff3cd; color: #856404; padding: 10px; margin-bottom: 10px; border-radius: 4px; font-size: 14px;';

    const container = document.querySelector('.container') || document.body;
    container.insertBefore(warningBanner, container.firstChild);
  }

  warningBanner.textContent = message;
  warningBanner.style.display = 'block';

  setTimeout(() => {
    if (warningBanner) {
      warningBanner.style.display = 'none';
    }
  }, 5000);
}

/**
 * Sets the active popup UI theme (light or dark)
 * @param mode - The visual mode ('light' | 'dark')
 */
export function setPopupTheme(mode: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', mode);
}

/**
 * Updates the favorites count badge in the header
 * @param badgeElement - The badge DOM element
 * @param count - Current number of pinned favorites
 * @param max - Maximum allowed quickbar services
 */
export function updateFavoritesBadge(
  badgeElement: HTMLElement | null,
  count: number,
  max: number
): void {
  if (!badgeElement) {
    return;
  }
  badgeElement.textContent = `${count} / ${max}`;
  if (count >= max) {
    badgeElement.classList.add('limit-reached');
  } else {
    badgeElement.classList.remove('limit-reached');
  }
}

/**
 * Sets up a clear button for the search input
 * @param input - The search input element
 * @param clearBtn - The clear button element
 * @param onClear - Callback invoked after input is cleared
 */
export function setupClearSearchButton(
  input: HTMLInputElement,
  clearBtn: HTMLElement | null,
  onClear: () => void
): void {
  if (!clearBtn) {
    return;
  }

  const updateVisibility = () => {
    clearBtn.style.display = input.value.length > 0 ? 'flex' : 'none';
  };

  input.addEventListener('input', updateVisibility);
  clearBtn.addEventListener('click', () => {
    input.value = '';
    updateVisibility();
    input.focus();
    onClear();
  });
}
