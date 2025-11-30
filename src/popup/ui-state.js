// UI state management

export function showErrorState(errorStateElement, serviceListElement, show, message = null) {
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

export function updateEmptyState(emptyStateElement, currentFavorites, searchValue) {
  if (currentFavorites.length === 0 && searchValue.trim() === '') {
    emptyStateElement.style.display = 'block';
  } else {
    emptyStateElement.style.display = 'none';
  }
}

export function showStorageWarning(message) {
  console.warn('AWS Favorites Quickbar:', message);
  
  let warningBanner = document.getElementById('warningBanner');
  if (!warningBanner) {
    warningBanner = document.createElement('div');
    warningBanner.id = 'warningBanner';
    warningBanner.className = 'warning-banner';
    warningBanner.style.cssText = 'background-color: #fff3cd; color: #856404; padding: 10px; margin-bottom: 10px; border-radius: 4px; font-size: 14px;';
    
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
