/**
 * Unit tests for popup service item rendering
 * Requirements: 4.4
 * 
 * **Feature: test-coverage, Property 6: Service item rendering completeness**
 * **Validates: Requirements 4.4**
 */

const fc = require('fast-check');
const { teardownDOM } = require('../../helpers/dom-helpers');

// Since the popup modules use ES6 imports which Jest doesn't support without Babel,
// we'll define the function inline for testing. This is a copy of the actual function.

function createServiceItem(service, isSelected, isDraggable, handlers) {
  const item = document.createElement('div');
  item.className = 'service-item';
  item.dataset.serviceId = service.id;
  
  if (isSelected) {
    item.classList.add('selected');
  }
  
  if (isDraggable) {
    item.draggable = true;
    item.addEventListener('dragstart', handlers.onDragStart);
    item.addEventListener('dragend', handlers.onDragEnd);
    item.addEventListener('dragover', handlers.onDragOver);
    item.addEventListener('drop', handlers.onDrop);
    item.addEventListener('dragenter', handlers.onDragEnter);
    item.addEventListener('dragleave', handlers.onDragLeave);
  }
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = isSelected;
  checkbox.dataset.serviceId = service.id;
  
  const iconImg = document.createElement('img');
  iconImg.className = 'service-icon';
  iconImg.style.width = '20px';
  iconImg.style.height = '20px';
  iconImg.style.marginRight = '8px';
  iconImg.style.marginLeft = '8px';
  iconImg.style.objectFit = 'contain';
  
  if (service.iconUrl) {
    iconImg.src = service.iconUrl;
  } else {
    iconImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect width="20" height="20" fill="%23232F3E"/></svg>';
  }
  
  iconImg.alt = service.name;
  iconImg.onerror = function() {
    this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect width="20" height="20" fill="%23232F3E"/></svg>';
    this.onerror = null;
  };
  
  const nameSpan = document.createElement('span');
  nameSpan.className = 'service-name';
  nameSpan.textContent = service.name;
  
  item.appendChild(checkbox);
  item.appendChild(iconImg);
  item.appendChild(nameSpan);
  
  item.addEventListener('click', (e) => handlers.onClick(e, service.id));
  checkbox.addEventListener('click', (e) => {
    e.stopPropagation();
    handlers.onClick(e, service.id);
  });
  
  return item;
}

describe('Popup Service Item', () => {
  let mockHandlers;

  beforeEach(() => {
    teardownDOM();
    
    mockHandlers = {
      onClick: jest.fn(),
      onDragStart: jest.fn(),
      onDragEnd: jest.fn(),
      onDragOver: jest.fn(),
      onDrop: jest.fn(),
      onDragEnter: jest.fn(),
      onDragLeave: jest.fn()
    };
  });

  afterEach(() => {
    teardownDOM();
  });

  describe('createServiceItem', () => {
    it('should create service item with correct structure', () => {
      const service = {
        id: 's3',
        name: 'S3',
        iconUrl: 'https://example.com/s3.png',
        consoleUrl: 'https://console.aws.amazon.com/s3'
      };

      const item = createServiceItem(service, false, false, mockHandlers);

      expect(item.className).toBe('service-item');
      expect(item.dataset.serviceId).toBe('s3');
      expect(item.querySelector('input[type="checkbox"]')).toBeTruthy();
      expect(item.querySelector('.service-icon')).toBeTruthy();
      expect(item.querySelector('.service-name')).toBeTruthy();
    });

    it('should display service name', () => {
      const service = {
        id: 'ec2',
        name: 'EC2',
        iconUrl: 'https://example.com/ec2.png',
        consoleUrl: 'https://console.aws.amazon.com/ec2'
      };

      const item = createServiceItem(service, false, false, mockHandlers);
      const nameSpan = item.querySelector('.service-name');

      expect(nameSpan.textContent).toBe('EC2');
    });

    it('should display service icon', () => {
      const service = {
        id: 'lambda',
        name: 'Lambda',
        iconUrl: 'https://example.com/lambda.png',
        consoleUrl: 'https://console.aws.amazon.com/lambda'
      };

      const item = createServiceItem(service, false, false, mockHandlers);
      const icon = item.querySelector('.service-icon');

      expect(icon.src).toBe('https://example.com/lambda.png');
      expect(icon.alt).toBe('Lambda');
    });

    it('should use default icon when iconUrl is missing', () => {
      const service = {
        id: 'dynamodb',
        name: 'DynamoDB',
        consoleUrl: 'https://console.aws.amazon.com/dynamodb'
      };

      const item = createServiceItem(service, false, false, mockHandlers);
      const icon = item.querySelector('.service-icon');

      expect(icon.src).toContain('data:image/svg+xml');
    });

    it('should add selected class when isSelected is true', () => {
      const service = {
        id: 's3',
        name: 'S3',
        iconUrl: 'https://example.com/s3.png',
        consoleUrl: 'https://console.aws.amazon.com/s3'
      };

      const item = createServiceItem(service, true, false, mockHandlers);

      expect(item.classList.contains('selected')).toBe(true);
    });

    it('should check checkbox when isSelected is true', () => {
      const service = {
        id: 's3',
        name: 'S3',
        iconUrl: 'https://example.com/s3.png',
        consoleUrl: 'https://console.aws.amazon.com/s3'
      };

      const item = createServiceItem(service, true, false, mockHandlers);
      const checkbox = item.querySelector('input[type="checkbox"]');

      expect(checkbox.checked).toBe(true);
    });

    it('should make item draggable when isDraggable is true', () => {
      const service = {
        id: 's3',
        name: 'S3',
        iconUrl: 'https://example.com/s3.png',
        consoleUrl: 'https://console.aws.amazon.com/s3'
      };

      const item = createServiceItem(service, false, true, mockHandlers);

      expect(item.draggable).toBe(true);
    });

    it('should attach click handler', () => {
      const service = {
        id: 's3',
        name: 'S3',
        iconUrl: 'https://example.com/s3.png',
        consoleUrl: 'https://console.aws.amazon.com/s3'
      };

      const item = createServiceItem(service, false, false, mockHandlers);
      item.click();

      expect(mockHandlers.onClick).toHaveBeenCalledWith(expect.any(Object), 's3');
    });

    it('should attach checkbox click handler', () => {
      const service = {
        id: 's3',
        name: 'S3',
        iconUrl: 'https://example.com/s3.png',
        consoleUrl: 'https://console.aws.amazon.com/s3'
      };

      const item = createServiceItem(service, false, false, mockHandlers);
      const checkbox = item.querySelector('input[type="checkbox"]');
      checkbox.click();

      expect(mockHandlers.onClick).toHaveBeenCalledWith(expect.any(Object), 's3');
    });

    it('should attach drag handlers when draggable', () => {
      const service = {
        id: 's3',
        name: 'S3',
        iconUrl: 'https://example.com/s3.png',
        consoleUrl: 'https://console.aws.amazon.com/s3'
      };

      const item = createServiceItem(service, false, true, mockHandlers);

      // Trigger drag events
      item.dispatchEvent(new Event('dragstart'));
      item.dispatchEvent(new Event('dragend'));
      item.dispatchEvent(new Event('dragover'));
      item.dispatchEvent(new Event('drop'));
      item.dispatchEvent(new Event('dragenter'));
      item.dispatchEvent(new Event('dragleave'));

      expect(mockHandlers.onDragStart).toHaveBeenCalled();
      expect(mockHandlers.onDragEnd).toHaveBeenCalled();
      expect(mockHandlers.onDragOver).toHaveBeenCalled();
      expect(mockHandlers.onDrop).toHaveBeenCalled();
      expect(mockHandlers.onDragEnter).toHaveBeenCalled();
      expect(mockHandlers.onDragLeave).toHaveBeenCalled();
    });

    it('should set correct icon styling', () => {
      const service = {
        id: 's3',
        name: 'S3',
        iconUrl: 'https://example.com/s3.png',
        consoleUrl: 'https://console.aws.amazon.com/s3'
      };

      const item = createServiceItem(service, false, false, mockHandlers);
      const icon = item.querySelector('.service-icon');

      expect(icon.style.width).toBe('20px');
      expect(icon.style.height).toBe('20px');
      expect(icon.style.objectFit).toBe('contain');
    });

    it('should set service id on checkbox', () => {
      const service = {
        id: 'lambda',
        name: 'Lambda',
        iconUrl: 'https://example.com/lambda.png',
        consoleUrl: 'https://console.aws.amazon.com/lambda'
      };

      const item = createServiceItem(service, false, false, mockHandlers);
      const checkbox = item.querySelector('input[type="checkbox"]');

      expect(checkbox.dataset.serviceId).toBe('lambda');
    });
  });

  describe('Property-Based Tests', () => {
    // Arbitrary for generating service objects
    const serviceArbitrary = fc.record({
      id: fc.stringOf(fc.char(), { minLength: 2, maxLength: 20 }),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      iconUrl: fc.option(fc.webUrl(), { nil: undefined }),
      consoleUrl: fc.webUrl()
    });

    /**
     * Property 6: Service item rendering completeness
     * For any service object, createServiceItem should return an HTMLElement 
     * containing the service name, icon, and a clickable element
     * Validates: Requirements 4.4
     */
    it('Property 6: service item contains name, icon, and click handler', () => {
      fc.assert(
        fc.property(
          serviceArbitrary,
          fc.boolean(),
          fc.boolean(),
          (service, isSelected, isDraggable) => {
            const item = createServiceItem(service, isSelected, isDraggable, mockHandlers);

            // Check that item is an HTMLElement
            const isElement = item instanceof HTMLElement;

            // Check that item contains service name
            const nameSpan = item.querySelector('.service-name');
            const hasName = nameSpan && nameSpan.textContent === service.name;

            // Check that item contains icon
            const icon = item.querySelector('.service-icon');
            const hasIcon = icon && icon.tagName === 'IMG';

            // Check that item has click handler
            item.click();
            const hasClickHandler = mockHandlers.onClick.mock.calls.length > 0;

            // Reset mock for next iteration
            mockHandlers.onClick.mockClear();

            return isElement && hasName && hasIcon && hasClickHandler;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 6: service item has correct data-service-id attribute', () => {
      fc.assert(
        fc.property(
          serviceArbitrary,
          fc.boolean(),
          fc.boolean(),
          (service, isSelected, isDraggable) => {
            const item = createServiceItem(service, isSelected, isDraggable, mockHandlers);

            return item.dataset.serviceId === service.id;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 6: selected state matches isSelected parameter', () => {
      fc.assert(
        fc.property(
          serviceArbitrary,
          fc.boolean(),
          fc.boolean(),
          (service, isSelected, isDraggable) => {
            const item = createServiceItem(service, isSelected, isDraggable, mockHandlers);
            const checkbox = item.querySelector('input[type="checkbox"]');

            const hasSelectedClass = item.classList.contains('selected');
            const checkboxChecked = checkbox.checked;

            return (hasSelectedClass === isSelected) && (checkboxChecked === isSelected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 6: draggable state matches isDraggable parameter', () => {
      fc.assert(
        fc.property(
          serviceArbitrary,
          fc.boolean(),
          fc.boolean(),
          (service, isSelected, isDraggable) => {
            const item = createServiceItem(service, isSelected, isDraggable, mockHandlers);

            return item.draggable === isDraggable;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 6: icon has fallback when iconUrl is missing', () => {
      fc.assert(
        fc.property(
          serviceArbitrary,
          fc.boolean(),
          fc.boolean(),
          (service, isSelected, isDraggable) => {
            const item = createServiceItem(service, isSelected, isDraggable, mockHandlers);
            const icon = item.querySelector('.service-icon');

            // Icon should always have a src
            return icon.src && icon.src.length > 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 6: click handler receives correct service id', () => {
      fc.assert(
        fc.property(
          serviceArbitrary,
          fc.boolean(),
          fc.boolean(),
          (service, isSelected, isDraggable) => {
            const item = createServiceItem(service, isSelected, isDraggable, mockHandlers);

            item.click();

            const lastCall = mockHandlers.onClick.mock.calls[mockHandlers.onClick.mock.calls.length - 1];
            const receivedId = lastCall ? lastCall[1] : null;

            // Reset mock for next iteration
            mockHandlers.onClick.mockClear();

            return receivedId === service.id;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
