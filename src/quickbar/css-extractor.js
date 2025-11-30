// CSS class extraction from native AWS favorites

window.AWSFavoritesQuickbar = window.AWSFavoritesQuickbar || {};

window.AWSFavoritesQuickbar.extractAWSFavoriteClasses = function() {
  const quickbar = document.querySelector('ol[data-rbd-droppable-id="global-nav-favorites-bar-list-edit-mode"]');
  if (!quickbar) return null;
  
  const existingItems = quickbar.querySelectorAll('li:not([data-source])');
  if (existingItems.length === 0) return null;
  
  const existingItem = existingItems[0];
  const anchor = existingItem.querySelector('a');
  const mainContainer = anchor?.querySelector('div');
  const iconWrapper = mainContainer?.querySelector('div');
  const icon = iconWrapper?.querySelector('img');
  const label = mainContainer?.querySelector(':scope > span');
  
  if (!anchor || !mainContainer || !iconWrapper || !icon || !label) {
    return null;
  }
  
  return {
    li: existingItem.className,
    anchor: anchor.className,
    mainContainer: mainContainer.className,
    iconWrapper: iconWrapper.className,
    icon: icon.className,
    label: label.className
  };
};

window.AWSFavoritesQuickbar.waitForNativeFavorites = async function(quickbar, timeout = 3000) {
  return new Promise((resolve) => {
    const cssClasses = window.AWSFavoritesQuickbar.extractAWSFavoriteClasses();
    if (cssClasses) {
      resolve(cssClasses);
      return;
    }

    let timeoutId;
    const observer = new MutationObserver(() => {
      const classes = window.AWSFavoritesQuickbar.extractAWSFavoriteClasses();
      if (classes) {
        clearTimeout(timeoutId);
        observer.disconnect();
        resolve(classes);
      }
    });

    observer.observe(quickbar, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    timeoutId = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
};
