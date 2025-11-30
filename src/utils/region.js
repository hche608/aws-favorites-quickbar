// AWS region detection

window.AWSFavoritesQuickbar = window.AWSFavoritesQuickbar || {};

window.AWSFavoritesQuickbar.detectRegion = function() {
  const DEFAULT_REGION = 'us-east-1';
  
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const regionParam = urlParams.get('region');
    if (regionParam) return regionParam;
  } catch (error) {
    // Continue to next method
  }
  
  try {
    const storedRegion = localStorage.getItem('awsc-region');
    if (storedRegion) return storedRegion;
  } catch (error) {
    // Continue to fallback
  }
  
  return DEFAULT_REGION;
};
