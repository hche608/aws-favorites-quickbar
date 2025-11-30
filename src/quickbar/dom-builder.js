// DOM builder - creates service link elements

window.AWSFavoritesQuickbar = window.AWSFavoritesQuickbar || {};

(function() {
  const DEFAULT_ICON_URL = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23232F3E"/></svg>';

  window.AWSFavoritesQuickbar.createServiceLink = function(service, classes = null) {
  if (!service || !service.id) return null;
  
  const serviceId = service.id;
  const serviceName = service.name || serviceId.toUpperCase();
  const serviceUrl = service.consoleUrl || `https://console.aws.amazon.com/${serviceId}/home`;
  const serviceIcon = service.iconUrl || DEFAULT_ICON_URL;
  const serviceSource = service.source || 'user';
  
  const cssClasses = classes || {
    li: 'globalNav-1283',
    anchor: 'globalNav-1215 globalNav-1284 globalNav-1285',
    mainContainer: 'globalNav-1286',
    iconWrapper: 'globalNav-1290 globalNav-1288 globalNav-1289',
    icon: 'globalNav-1291 globalNav-1293 globalNav-1288 globalNav-1289',
    label: 'globalNav-12107 globalNav-1287'
  };
  
  const li = document.createElement('li');
  li.className = cssClasses.li;
  li.setAttribute('data-service-id', serviceId);
  li.setAttribute('data-source', serviceSource);

  const outerDiv = document.createElement('div');
  const innerDiv = document.createElement('div');

  const anchor = document.createElement('a');
  anchor.href = serviceUrl;
  anchor.className = cssClasses.anchor;
  anchor.target = '_top';
  anchor.setAttribute('aria-disabled', 'false');
  anchor.setAttribute('role', 'button');
  anchor.setAttribute('data-testid', `awsc-nav-favorites-bar-${serviceId}`);
  anchor.setAttribute('tabindex', '0');

  const mainContainer = document.createElement('div');
  mainContainer.className = cssClasses.mainContainer;

  const iconWrapper = document.createElement('div');
  iconWrapper.className = cssClasses.iconWrapper;

  const icon = document.createElement('img');
  icon.src = serviceIcon;
  icon.alt = '';
  icon.className = cssClasses.icon;
  icon.loading = 'lazy';
  icon.title = serviceName;
  icon.width = 20;
  icon.height = 20;
  
  icon.onerror = function() {
    this.src = DEFAULT_ICON_URL;
    this.onerror = null;
  };

  iconWrapper.appendChild(icon);

  const label = document.createElement('span');
  label.className = cssClasses.label;
  label.textContent = serviceName;

  mainContainer.appendChild(iconWrapper);
  mainContainer.appendChild(label);
  anchor.appendChild(mainContainer);
  innerDiv.appendChild(anchor);
  outerDiv.appendChild(innerDiv);
  li.appendChild(outerDiv);
  
  return li;
  };
})();
