/**
 * Sample data generators and fixtures for tests
 */

/**
 * Creates a sample service object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Service object
 */
function createSampleService(overrides = {}) {
  const defaults = {
    id: 's3',
    name: 'S3',
    iconUrl: 'https://console.aws.amazon.com/s3/icon.png',
    consoleUrl: 'https://console.aws.amazon.com/s3/home',
    source: 'recent'
  };
  
  return { ...defaults, ...overrides };
}

/**
 * Creates an array of sample services
 * @param {number} count - Number of services to create
 * @returns {Array} Array of service objects
 */
function createSampleServices(count = 3) {
  const services = [
    { id: 's3', name: 'S3', iconUrl: 'https://console.aws.amazon.com/s3/icon.png', consoleUrl: 'https://console.aws.amazon.com/s3/home', source: 'recent' },
    { id: 'ec2', name: 'EC2', iconUrl: 'https://console.aws.amazon.com/ec2/icon.png', consoleUrl: 'https://console.aws.amazon.com/ec2/home', source: 'recent' },
    { id: 'lambda', name: 'Lambda', iconUrl: 'https://console.aws.amazon.com/lambda/icon.png', consoleUrl: 'https://console.aws.amazon.com/lambda/home', source: 'recent' },
    { id: 'dynamodb', name: 'DynamoDB', iconUrl: 'https://console.aws.amazon.com/dynamodb/icon.png', consoleUrl: 'https://console.aws.amazon.com/dynamodb/home', source: 'user' },
    { id: 'rds', name: 'RDS', iconUrl: 'https://console.aws.amazon.com/rds/icon.png', consoleUrl: 'https://console.aws.amazon.com/rds/home', source: 'user' },
    { id: 'cloudwatch', name: 'CloudWatch', iconUrl: 'https://console.aws.amazon.com/cloudwatch/icon.png', consoleUrl: 'https://console.aws.amazon.com/cloudwatch/home', source: 'recent' },
    { id: 'iam', name: 'IAM', iconUrl: 'https://console.aws.amazon.com/iam/icon.png', consoleUrl: 'https://console.aws.amazon.com/iam/home', source: 'user' },
    { id: 'vpc', name: 'VPC', iconUrl: 'https://console.aws.amazon.com/vpc/icon.png', consoleUrl: 'https://console.aws.amazon.com/vpc/home', source: 'recent' }
  ];
  
  return services.slice(0, Math.min(count, services.length));
}

/**
 * Sample user favorites data
 */
const sampleUserFavorites = [
  { id: 'dynamodb', name: 'DynamoDB', iconUrl: 'https://console.aws.amazon.com/dynamodb/icon.png', consoleUrl: 'https://console.aws.amazon.com/dynamodb/home', source: 'user' },
  { id: 'rds', name: 'RDS', iconUrl: 'https://console.aws.amazon.com/rds/icon.png', consoleUrl: 'https://console.aws.amazon.com/rds/home', source: 'user' },
  { id: 'iam', name: 'IAM', iconUrl: 'https://console.aws.amazon.com/iam/icon.png', consoleUrl: 'https://console.aws.amazon.com/iam/home', source: 'user' }
];

/**
 * Sample recent services data
 */
const sampleRecentServices = [
  { id: 's3', name: 'S3', iconUrl: 'https://console.aws.amazon.com/s3/icon.png', consoleUrl: 'https://console.aws.amazon.com/s3/home', source: 'recent' },
  { id: 'ec2', name: 'EC2', iconUrl: 'https://console.aws.amazon.com/ec2/icon.png', consoleUrl: 'https://console.aws.amazon.com/ec2/home', source: 'recent' },
  { id: 'lambda', name: 'Lambda', iconUrl: 'https://console.aws.amazon.com/lambda/icon.png', consoleUrl: 'https://console.aws.amazon.com/lambda/home', source: 'recent' }
];

/**
 * Creates a mock quickbar DOM structure
 * @returns {HTMLElement} Mock quickbar element
 */
function createQuickbarDOM() {
  const quickbar = document.createElement('div');
  quickbar.id = 'awsc-nav-header-favorites';
  quickbar.className = 'awsc-nav-header-favorites';
  
  const container = document.createElement('div');
  container.className = 'awsc-nav-header-favorites-container';
  quickbar.appendChild(container);
  
  return quickbar;
}

/**
 * Creates a mock recently visited widget DOM structure
 * @returns {HTMLElement} Mock recently visited widget
 */
function createRecentlyVisitedDOM() {
  const widget = document.createElement('div');
  widget.setAttribute('data-testid', 'recently-visited-widget');
  
  const container = document.createElement('div');
  container.className = 'recently-visited-container';
  
  // Add sample service links
  const services = [
    { id: 's3', name: 'S3', url: 'https://console.aws.amazon.com/s3/home' },
    { id: 'ec2', name: 'EC2', url: 'https://console.aws.amazon.com/ec2/home' },
    { id: 'lambda', name: 'Lambda', url: 'https://console.aws.amazon.com/lambda/home' }
  ];
  
  services.forEach(service => {
    const link = document.createElement('a');
    link.href = service.url;
    link.textContent = service.name;
    link.setAttribute('data-service-id', service.id);
    
    const img = document.createElement('img');
    img.src = `https://console.aws.amazon.com/${service.id}/icon.png`;
    link.appendChild(img);
    
    container.appendChild(link);
  });
  
  widget.appendChild(container);
  return widget;
}

/**
 * Creates a mock native AWS favorites DOM structure
 * @returns {Array<HTMLElement>} Array of mock favorite elements
 */
function createNativeFavoritesDOM() {
  const favorites = [];
  
  const services = [
    { id: 'cloudformation', name: 'CloudFormation' },
    { id: 'cloudfront', name: 'CloudFront' }
  ];
  
  services.forEach(service => {
    const favorite = document.createElement('div');
    favorite.className = 'awsc-nav-favorite-item';
    favorite.setAttribute('data-service-id', service.id);
    
    const link = document.createElement('a');
    link.href = `https://console.aws.amazon.com/${service.id}/home`;
    link.textContent = service.name;
    
    favorite.appendChild(link);
    favorites.push(favorite);
  });
  
  return favorites;
}

/**
 * Creates a complete AWS Console page DOM structure
 * @param {Object} options - Configuration options
 * @returns {void} Modifies document.body
 */
function createAWSConsolePageDOM(options = {}) {
  const {
    includeQuickbar = true,
    includeRecentlyVisited = true,
    includeNativeFavorites = false
  } = options;
  
  // Clear existing body
  document.body.innerHTML = '';
  
  // Add AWS Console header
  const header = document.createElement('header');
  header.id = 'awsc-nav-header';
  
  if (includeQuickbar) {
    const quickbar = createQuickbarDOM();
    header.appendChild(quickbar);
    
    if (includeNativeFavorites) {
      const nativeFavorites = createNativeFavoritesDOM();
      const container = quickbar.querySelector('.awsc-nav-header-favorites-container');
      nativeFavorites.forEach(fav => container.appendChild(fav));
    }
  }
  
  document.body.appendChild(header);
  
  // Add main content area
  const main = document.createElement('main');
  main.id = 'awsc-main-content';
  
  if (includeRecentlyVisited) {
    const recentlyVisited = createRecentlyVisitedDOM();
    main.appendChild(recentlyVisited);
  }
  
  document.body.appendChild(main);
}

/**
 * Sample configuration objects
 */
const sampleConfig = {
  maxServices: 10,
  region: 'us-east-1',
  autoUpdate: true,
  updateInterval: 5000
};

/**
 * Sample storage data
 */
const sampleStorageData = {
  userFavorites: sampleUserFavorites,
  maxServices: 10,
  lastUpdate: Date.now()
};

module.exports = {
  createSampleService,
  createSampleServices,
  sampleUserFavorites,
  sampleRecentServices,
  createQuickbarDOM,
  createRecentlyVisitedDOM,
  createNativeFavoritesDOM,
  createAWSConsolePageDOM,
  sampleConfig,
  sampleStorageData
};
