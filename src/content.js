// AWS Favorites Quickbar - Main Content Script
// Performance: MutationObserver-based, parallel execution, ~1s injection

(function() {
  const {
    waitForDOMReady,
    waitForElement,
    isAWSConsolePage,
    isAWSConsoleHomepage,
    saveServicesToStorage,
    loadServicesFromStorage,
    loadUserFavorites,
    detectRegion,
    extractIconUrlsFromConsole,
    isValidIconUrl,
    updateServiceIcons,
    waitForRecentlyVisitedWidget,
    parseRecentlyVisited,
    mergeServices,
    injectServices
  } = window.AWSFavoritesQuickbar;

  const QUICKBAR_SELECTORS = [
  'ol[data-rbd-droppable-id="global-nav-favorites-bar-list-edit-mode"]',
  'ol.globalNav-2279',
  'ol[class*="globalNav"][class*="2279"]',
  '[data-testid="favorites-bar-list"]',
  'nav[class*="favorites"] ol'
];

async function init() {
  try {
    await waitForDOMReady();
    
    if (!isAWSConsolePage()) return;
    
    const region = detectRegion();
    const favoriteIds = await loadUserFavorites();
    
    let maxServices = 10;
    try {
      const result = await browser.storage.sync.get(['maxServices']);
      if (result.maxServices && typeof result.maxServices === 'number') {
        maxServices = result.maxServices;
      }
    } catch (error) {
      // Use default
    }
    
    // Start quickbar detection in parallel
    const quickbarPromise = waitForElement(QUICKBAR_SELECTORS, 10000);
    
    let userFavorites = [];
    let recentServices = [];
    
    if (isAWSConsoleHomepage()) {
      const widgetLoaded = await waitForRecentlyVisitedWidget();
      
      if (widgetLoaded) {
        recentServices = await parseRecentlyVisited();
        
        const recentMap = {};
        recentServices.forEach(s => {
          recentMap[s.id.toLowerCase()] = s;
        });
        
        userFavorites = favoriteIds.map(id => {
          const recent = recentMap[id.toLowerCase()];
          if (recent) {
            return { ...recent, source: 'user' };
          }
          const fallbackName = id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          return {
            id: id,
            name: fallbackName,
            iconUrl: null,
            consoleUrl: `https://${region}.console.aws.amazon.com/${id}/home?region=${region}`,
            source: 'user'
          };
        });
        
        const allServices = mergeServices(userFavorites, recentServices);
        saveServicesToStorage(allServices);
      }
    } else {
      const cachedServices = loadServicesFromStorage();
      const cachedPinned = cachedServices.filter(s => 
        favoriteIds.some(id => id.toLowerCase() === s.id.toLowerCase())
      );
      recentServices = cachedServices.filter(s => 
        s.source === 'recent' && !favoriteIds.some(id => id.toLowerCase() === s.id.toLowerCase())
      );
      
      userFavorites = favoriteIds.map(id => {
        const cached = cachedPinned.find(s => s.id.toLowerCase() === id.toLowerCase());
        if (cached) {
          return { ...cached, source: 'user' };
        }
        const fallbackName = id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        return {
          id: id,
          name: fallbackName,
          iconUrl: null,
          consoleUrl: `https://${region}.console.aws.amazon.com/${id}/home?region=${region}`,
          source: 'user'
        };
      });
    }
    
    let mergedServices = mergeServices(userFavorites, recentServices);
    if (mergedServices.length > maxServices) {
      mergedServices = mergedServices.slice(0, maxServices);
    }
    
    const quickbar = await quickbarPromise;
    await injectServices(mergedServices, quickbar);
    
    // Background icon update
    (async () => {
      try {
        const iconMap = await extractIconUrlsFromConsole();
        
        if (Object.keys(iconMap).length > 0) {
          const updatedUserFavorites = await Promise.all(
            userFavorites.map(async (service) => {
              const newIconUrl = iconMap[service.id.toLowerCase()];
              if (newIconUrl && newIconUrl !== service.iconUrl) {
                const isValid = await isValidIconUrl(newIconUrl);
                if (isValid) {
                  return { ...service, iconUrl: newIconUrl };
                }
              }
              return service;
            })
          );
          
          const updatedRecentServices = await updateServiceIcons(recentServices, iconMap);
          
          let updatedMerged = mergeServices(updatedUserFavorites, updatedRecentServices);
          if (updatedMerged.length > maxServices) {
            updatedMerged = updatedMerged.slice(0, maxServices);
          }
          
          saveServicesToStorage(updatedMerged);
          await injectServices(updatedMerged, quickbar);
        }
      } catch (error) {
        console.error('AWS Favorites Quickbar: Background update error', error);
      }
    })();
    
  } catch (error) {
    console.error('AWS Favorites Quickbar: Initialization error', error);
  }
  }

  browser.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'updateQuickbar') {
      init().then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }
  });

  init();
})();
