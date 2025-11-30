// Quickbar injector - injects services with duplicate filtering

window.AWSFavoritesQuickbar = window.AWSFavoritesQuickbar || {};

(function() {
  const QUICKBAR_SELECTORS = [
    'ol[data-rbd-droppable-id="global-nav-favorites-bar-list-edit-mode"]',
    'ol.globalNav-2279',
    'ol[class*="globalNav"][class*="2279"]',
    '[data-testid="favorites-bar-list"]',
    'nav[class*="favorites"] ol'
  ];

  window.AWSFavoritesQuickbar.injectServices = async function(services, quickbar = null) {
  if (!services || services.length === 0) return true;

  try {
    if (!quickbar) {
      quickbar = await window.AWSFavoritesQuickbar.waitForElement(QUICKBAR_SELECTORS, 10000);
      
      if (!quickbar) {
        console.error('AWS Favorites Quickbar: Quickbar not found');
        return false;
      }
    }

    let cssClasses = window.AWSFavoritesQuickbar.extractAWSFavoriteClasses();
    let nativeServiceIds = new Set();
    
    if (!cssClasses) {
      cssClasses = await window.AWSFavoritesQuickbar.waitForNativeFavorites(quickbar, 3000);
    }
    
    if (cssClasses) {
      const nativeFavorites = quickbar.querySelectorAll('li:not([data-source])');
      nativeFavorites.forEach(item => {
        const link = item.querySelector('a[data-testid^="awsc-nav-favorites-bar-"]');
        if (link) {
          const testId = link.getAttribute('data-testid');
          const serviceId = testId.replace('awsc-nav-favorites-bar-', '');
          nativeServiceIds.add(serviceId.toLowerCase());
        }
      });
    }
    
    const servicesToInject = services.filter(service => 
      !nativeServiceIds.has(service.id.toLowerCase())
    );

    const existingInjected = quickbar.querySelectorAll('[data-source="user"], [data-source="recent"]');
    existingInjected.forEach(element => element.remove());

    for (const service of servicesToInject) {
      const serviceLink = window.AWSFavoritesQuickbar.createServiceLink(service, cssClasses);
      if (serviceLink) {
        quickbar.appendChild(serviceLink);
      }
    }

    return true;
    
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error injecting services', error);
    return false;
  }
  };
})();
