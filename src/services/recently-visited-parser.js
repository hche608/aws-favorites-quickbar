// Recently Visited widget parser

window.AWSFavoritesQuickbar = window.AWSFavoritesQuickbar || {};

window.AWSFavoritesQuickbar.waitForRecentlyVisitedWidget = async function(timeout = 10000) {
  return new Promise((resolve) => {
    const MIN_ITEMS = 3;
    
    const isWidgetFullyLoaded = () => {
      const widget = document.querySelector('[data-widget-type="recently-visited"]');
      if (!widget) return false;
      
      const ariaLabel = widget.querySelector('[aria-label="Recently visited"]');
      if (!ariaLabel) return false;
      
      const listItems = ariaLabel.querySelectorAll('[class*="listItem-"]');
      return listItems.length >= MIN_ITEMS;
    };
    
    if (isWidgetFullyLoaded()) {
      resolve(true);
      return;
    }
    
    let timeoutId;
    let lastItemCount = 0;
    let stabilityCheckTimeout = null;
    
    const observer = new MutationObserver(() => {
      if (isWidgetFullyLoaded()) {
        const widget = document.querySelector('[data-widget-type="recently-visited"]');
        const ariaLabel = widget.querySelector('[aria-label="Recently visited"]');
        const currentItemCount = ariaLabel.querySelectorAll('[class*="listItem-"]').length;
        
        if (currentItemCount !== lastItemCount) {
          lastItemCount = currentItemCount;
          
          if (stabilityCheckTimeout) {
            clearTimeout(stabilityCheckTimeout);
          }
          
          stabilityCheckTimeout = setTimeout(() => {
            clearTimeout(timeoutId);
            observer.disconnect();
            resolve(true);
          }, 500);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-widget-type', 'aria-label', 'class']
    });

    timeoutId = setTimeout(() => {
      observer.disconnect();
      if (stabilityCheckTimeout) {
        clearTimeout(stabilityCheckTimeout);
      }
      
      const widget = document.querySelector('[data-widget-type="recently-visited"]');
      if (widget) {
        const ariaLabel = widget.querySelector('[aria-label="Recently visited"]');
        if (ariaLabel) {
          const itemCount = ariaLabel.querySelectorAll('[class*="listItem-"]').length;
          if (itemCount > 0) {
            resolve(true);
            return;
          }
        }
      }
      
      resolve(false);
    }, timeout);
  });
};

window.AWSFavoritesQuickbar.parseRecentlyVisited = async function() {
  try {
    const widgetContainer = document.querySelector('[data-widget-type="recently-visited"]');
    if (!widgetContainer) return [];
    
    const politeRegion = widgetContainer.querySelector('[data-testid="polite"]');
    
    if (!politeRegion) {
      const ariaLabelContainer = widgetContainer.querySelector('[aria-label="Recently visited"]');
      if (!ariaLabelContainer) return [];
      return window.AWSFavoritesQuickbar.extractServicesFromContainer(ariaLabelContainer);
    }
    
    let recentlyVisitedSection = null;
    const maxRetries = 10;
    const retryDelay = 500;
    
    for (let i = 0; i < maxRetries; i++) {
      recentlyVisitedSection = politeRegion.querySelector('[aria-label="Recently visited"]');
      if (recentlyVisitedSection) break;
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
    
    if (!recentlyVisitedSection) return [];
    
    return window.AWSFavoritesQuickbar.extractServicesFromContainer(recentlyVisitedSection);
    
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error parsing Recently Visited', error);
    return [];
  }
};

window.AWSFavoritesQuickbar.extractServicesFromContainer = function(container) {
  const services = [];
  
  try {
    const allElements = container.querySelectorAll('[class*="listItem-"]');
    
    if (allElements.length === 0) {
      const links = container.querySelectorAll('a[href]');
      for (const link of links) {
        const service = window.AWSFavoritesQuickbar.extractServiceFromLink(link);
        if (service) services.push(service);
      }
      return services;
    }
    
    for (const item of allElements) {
      try {
        const link = item.querySelector('a[href]');
        if (!link) continue;
        
        let iconUrl = null;
        const img = item.querySelector('img');
        if (img && img.src) {
          iconUrl = img.src;
        }
        
        const service = window.AWSFavoritesQuickbar.extractServiceFromLink(link, iconUrl);
        if (service) services.push(service);
        
      } catch (error) {
        // Continue with other items
      }
    }
    
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error extracting services', error);
  }
  
  return services;
};

window.AWSFavoritesQuickbar.extractServiceFromLink = function(link, iconUrl = null) {
  try {
    let url = link.href;
    if (!url || typeof url !== 'string') return null;
    
    if (url.startsWith('/')) {
      url = `https://${window.location.hostname}${url}`;
    }
    
    let serviceId = null;
    const urlObj = new URL(url);
    
    const hostname = urlObj.hostname;
    const hostnameMatch = hostname.match(/^([^.]+)\.console\.aws\.amazon\.com$/);
    if (hostnameMatch) {
      const subdomain = hostnameMatch[1];
      if (!subdomain.match(/^[a-z]{2}-[a-z]+-\d+$/)) {
        serviceId = subdomain;
      }
    }
    
    if (!serviceId) {
      const pathMatch = urlObj.pathname.match(/^\/([^\/]+)/);
      if (pathMatch) {
        serviceId = pathMatch[1];
      }
    }
    
    if (!serviceId) return null;
    
    const name = link.textContent?.trim() || serviceId;
    
    if (!iconUrl) {
      const img = link.querySelector('img');
      if (img && img.src) {
        iconUrl = img.src;
      }
    }
    
    return {
      id: serviceId,
      name: name,
      iconUrl: iconUrl,
      consoleUrl: url,
      source: 'recent'
    };
    
  } catch (error) {
    return null;
  }
};
