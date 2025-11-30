// Extracts icon URLs from AWS Console DOM

window.AWSFavoritesQuickbar = window.AWSFavoritesQuickbar || {};

window.AWSFavoritesQuickbar.extractIconUrlsFromConsole = async function() {
  const iconMap = {};
  
  try {
    const links = document.querySelectorAll('a[href*="console.aws.amazon.com"]');
    
    for (const link of links) {
      try {
        const img = link.querySelector('img[src*="awsstatic.com"]');
        if (!img || !img.src) continue;
        
        const url = link.href;
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        
        let serviceId = null;
        const serviceMatch = hostname.match(/^([^.]+)\.console\.aws\.amazon\.com$/);
        if (serviceMatch) {
          const subdomain = serviceMatch[1];
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
        
        if (serviceId && img.src) {
          iconMap[serviceId.toLowerCase()] = img.src;
        }
      } catch (error) {
        // Skip this link
      }
    }
  } catch (error) {
    console.warn('AWS Favorites Quickbar: Error extracting icons', error);
  }
  
  return iconMap;
};
