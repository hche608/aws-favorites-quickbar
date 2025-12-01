// Storage utilities - localStorage + browser.storage sync

window.AWSFavoritesQuickbar = window.AWSFavoritesQuickbar || {};

window.AWSFavoritesQuickbar.saveServicesToStorage = function(services) {
  try {
    const data = {
      services: services,
      timestamp: Date.now()
    };
    localStorage.setItem('awsFavoritesQuickbar_services', JSON.stringify(data));
    
    browser.storage.local.set({ cachedServices: data }).catch(err => {
      console.warn('AWS Favorites Quickbar: Error saving to browser.storage', err);
    });
  } catch (error) {
    console.warn('AWS Favorites Quickbar: Error saving to localStorage', error);
  }
};

window.AWSFavoritesQuickbar.loadServicesFromStorage = function() {
  try {
    const stored = localStorage.getItem('awsFavoritesQuickbar_services');
    if (!stored) return [];
    
    const data = JSON.parse(stored);
    return data.services || [];
  } catch (error) {
    return [];
  }
};

window.AWSFavoritesQuickbar.loadUserFavorites = async function() {
  try {
    const result = await browser.storage.sync.get(['userFavorites']);
    return result.userFavorites || [];
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error loading favorites', error);
    return [];
  }
};
