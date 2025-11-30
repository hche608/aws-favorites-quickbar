// DOM utilities - MutationObserver-based detection

window.AWSFavoritesQuickbar = window.AWSFavoritesQuickbar || {};

window.AWSFavoritesQuickbar.waitForDOMReady = async function() {
  return new Promise((resolve) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', resolve);
    } else {
      resolve();
    }
  });
};

window.AWSFavoritesQuickbar.waitForElement = async function(selectors, timeout = 5000) {
  return new Promise((resolve) => {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
    }

    let timeoutId;
    const observer = new MutationObserver(() => {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          clearTimeout(timeoutId);
          observer.disconnect();
          resolve(element);
          return;
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    timeoutId = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
};

window.AWSFavoritesQuickbar.isAWSConsolePage = function() {
  return window.location.hostname.includes('console.aws.amazon.com');
};

window.AWSFavoritesQuickbar.isAWSConsoleHomepage = function() {
  const pathname = window.location.pathname;
  return pathname === '/' || pathname === '/console/home';
};
