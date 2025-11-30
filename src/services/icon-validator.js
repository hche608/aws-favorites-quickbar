// Icon URL validation - checks format, length, and loads image

window.AWSFavoritesQuickbar = window.AWSFavoritesQuickbar || {};

window.AWSFavoritesQuickbar.isValidIconUrl = async function(url) {
  if (!url || typeof url !== 'string') return false;
  
  const MIN_URL_LENGTH = 20;
  if (url.length < MIN_URL_LENGTH) return false;
  
  try {
    if (url.startsWith('data:image/')) {
      return url.length > 50;
    }
    
    if (url.startsWith('https://')) {
      new URL(url);
      
      return new Promise((resolve) => {
        const img = new Image();
        const timeout = setTimeout(() => {
          img.src = '';
          resolve(false);
        }, 3000);
        
        img.onload = () => {
          clearTimeout(timeout);
          resolve(img.width > 0 && img.height > 0);
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
        
        img.src = url;
      });
    }
    
    return false;
  } catch (error) {
    return false;
  }
};

window.AWSFavoritesQuickbar.updateServiceIcons = async function(services, iconMap) {
  const updated = await Promise.all(
    services.map(async (service) => {
      const newIconUrl = iconMap[service.id.toLowerCase()];
      
      if (newIconUrl && newIconUrl !== service.iconUrl) {
        const isValid = await window.AWSFavoritesQuickbar.isValidIconUrl(newIconUrl);
        if (isValid) {
          return { ...service, iconUrl: newIconUrl };
        }
      }
      return service;
    })
  );
  return updated;
};
