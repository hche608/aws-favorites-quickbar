// Service merging - combines pinned + recent, dedupes by ID

window.AWSFavoritesQuickbar = window.AWSFavoritesQuickbar || {};

window.AWSFavoritesQuickbar.mergeServices = function(userFavorites, recentServices) {
  // Deduplicate user favorites first (keep first occurrence)
  const seenUserIds = new Set();
  const dedupedUserFavorites = [];
  for (const service of userFavorites) {
    const lowerId = service.id.toLowerCase();
    if (!seenUserIds.has(lowerId)) {
      seenUserIds.add(lowerId);
      dedupedUserFavorites.push(service);
    }
  }
  
  // Filter recent services: remove duplicates within recent AND remove any that match user favorites
  const seenRecentIds = new Set();
  const filteredRecentServices = [];
  for (const service of recentServices) {
    const lowerId = service.id.toLowerCase();
    if (!seenUserIds.has(lowerId) && !seenRecentIds.has(lowerId)) {
      seenRecentIds.add(lowerId);
      filteredRecentServices.push(service);
    }
  }
  
  return [...dedupedUserFavorites, ...filteredRecentServices];
};
