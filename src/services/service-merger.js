// Service merging - combines pinned + recent, dedupes by ID

window.AWSFavoritesQuickbar = window.AWSFavoritesQuickbar || {};

window.AWSFavoritesQuickbar.mergeServices = function(userFavorites, recentServices) {
  const userFavoriteIds = new Set(
    userFavorites.map(s => s.id.toLowerCase())
  );
  
  const filteredRecentServices = recentServices.filter(service => 
    !userFavoriteIds.has(service.id.toLowerCase())
  );
  
  return [...userFavorites, ...filteredRecentServices];
};
