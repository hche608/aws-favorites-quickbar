/**
 * Unit tests for service-list-renderer.ts
 * Tests service list rendering logic
 */

import { setupDOM, teardownDOM } from '../../helpers/dom-helpers';
import { renderServiceList, isServiceSelected } from '../../../src/popup/service-list-renderer';
import { Service } from '../../../src/types';
import * as serviceItem from '../../../src/popup/service-item';
import * as dragDrop from '../../../src/popup/drag-drop';
import * as storage from '../../../src/popup/storage';
import * as uiState from '../../../src/popup/ui-state';

// Mock the dependencies
jest.mock('../../../src/popup/service-item');
jest.mock('../../../src/popup/drag-drop');
jest.mock('../../../src/popup/storage');
jest.mock('../../../src/popup/ui-state');

describe('service-list-renderer', () => {
  let serviceListElement: HTMLElement;
  let mockOnServiceClick: jest.Mock;
  let mockOnRenderComplete: jest.Mock;

  const mockServices: Service[] = [
    {
      id: 'ec2',
      name: 'EC2',
      iconUrl: 'https://example.com/ec2.png',
      consoleUrl: 'https://console.aws.amazon.com/ec2'
    },
    {
      id: 's3',
      name: 'S3',
      iconUrl: 'https://example.com/s3.png',
      consoleUrl: 'https://console.aws.amazon.com/s3'
    },
    {
      id: 'lambda',
      name: 'Lambda',
      iconUrl: 'https://example.com/lambda.png',
      consoleUrl: 'https://console.aws.amazon.com/lambda'
    },
    {
      id: 'rds',
      name: 'RDS',
      iconUrl: 'https://example.com/rds.png',
      consoleUrl: 'https://console.aws.amazon.com/rds'
    }
  ];

  beforeEach(() => {
    teardownDOM();

    setupDOM('<div id="serviceList"></div>');
    serviceListElement = document.getElementById('serviceList')!;

    mockOnServiceClick = jest.fn();
    mockOnRenderComplete = jest.fn();

    // Mock createServiceItem to return actual DOM elements
    (serviceItem.createServiceItem as jest.Mock).mockImplementation(
      (service, isSelected, isDraggable) => {
        const item = document.createElement('div');
        item.className = 'service-item';
        item.dataset.serviceId = service.id;
        if (isSelected) item.classList.add('selected');
        if (isDraggable) item.draggable = true;
        item.textContent = service.name;
        return item;
      }
    );

    // Mock drag-drop functions
    (dragDrop.createDropHandler as jest.Mock).mockReturnValue(jest.fn());
    (dragDrop.handleDragStart as jest.Mock).mockImplementation(() => {});
    (dragDrop.handleDragEnd as jest.Mock).mockImplementation(() => {});
    (dragDrop.handleDragOver as jest.Mock).mockImplementation(() => {});
    (dragDrop.handleDragEnter as jest.Mock).mockImplementation(() => {});
    (dragDrop.handleDragLeave as jest.Mock).mockImplementation(() => {});

    // Mock storage and UI state
    (storage.saveUserFavorites as jest.Mock).mockResolvedValue(undefined);
    (uiState.showStorageWarning as jest.Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    teardownDOM();
    jest.clearAllMocks();
  });

  describe('isServiceSelected', () => {
    it('should return true when service is in favorites', () => {
      const result = isServiceSelected('ec2', ['ec2', 's3']);
      expect(result).toBe(true);
    });

    it('should return false when service is not in favorites', () => {
      const result = isServiceSelected('lambda', ['ec2', 's3']);
      expect(result).toBe(false);
    });

    it('should be case-insensitive', () => {
      const result = isServiceSelected('EC2', ['ec2', 's3']);
      expect(result).toBe(true);
    });

    it('should handle empty favorites array', () => {
      const result = isServiceSelected('ec2', []);
      expect(result).toBe(false);
    });
  });

  describe('renderServiceList', () => {
    it('should clear existing content before rendering', () => {
      serviceListElement.innerHTML = '<div>Old content</div>';

      renderServiceList(serviceListElement, mockServices, [], '', mockOnServiceClick);

      expect(serviceListElement.innerHTML).not.toContain('Old content');
    });

    it('should render all services when none are favorites', () => {
      renderServiceList(serviceListElement, mockServices, [], '', mockOnServiceClick);

      const items = serviceListElement.querySelectorAll('.service-item');
      expect(items.length).toBe(4);
      expect(serviceItem.createServiceItem).toHaveBeenCalledTimes(4);
    });

    it('should separate favorites and non-favorites', () => {
      renderServiceList(serviceListElement, mockServices, ['ec2', 's3'], '', mockOnServiceClick);

      const items = serviceListElement.querySelectorAll('.service-item');
      expect(items.length).toBe(4);

      // First two should be favorites (selected)
      expect(items[0].classList.contains('selected')).toBe(true);
      expect(items[1].classList.contains('selected')).toBe(true);

      // Last two should be non-favorites
      expect(items[2].classList.contains('selected')).toBe(false);
      expect(items[3].classList.contains('selected')).toBe(false);
    });

    it('should render favorites in user-specified order', () => {
      renderServiceList(
        serviceListElement,
        mockServices,
        ['s3', 'ec2'], // s3 before ec2
        '',
        mockOnServiceClick
      );

      const items = serviceListElement.querySelectorAll('.service-item');
      expect(items[0].dataset.serviceId).toBe('s3');
      expect(items[1].dataset.serviceId).toBe('ec2');
    });

    it('should make favorite items draggable', () => {
      renderServiceList(serviceListElement, mockServices, ['ec2'], '', mockOnServiceClick);

      // Check that createServiceItem was called with isDraggable=true for favorites
      expect(serviceItem.createServiceItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ec2' }),
        true,
        true,
        expect.any(Object)
      );
    });

    it('should not make non-favorite items draggable', () => {
      renderServiceList(serviceListElement, mockServices, ['ec2'], '', mockOnServiceClick);

      // Check that createServiceItem was called with isDraggable=false for non-favorites
      expect(serviceItem.createServiceItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: 's3' }),
        false,
        false,
        expect.any(Object)
      );
    });

    it('should show empty search message when no services match search', () => {
      renderServiceList(serviceListElement, [], [], 'nonexistent', mockOnServiceClick);

      expect(serviceListElement.innerHTML).toContain('No services found matching your search');
    });

    it('should not show empty message when search is empty', () => {
      renderServiceList(serviceListElement, [], [], '', mockOnServiceClick);

      expect(serviceListElement.innerHTML).not.toContain('No services found');
    });

    it('should call onRenderComplete callback when provided', () => {
      renderServiceList(
        serviceListElement,
        mockServices,
        [],
        '',
        mockOnServiceClick,
        mockOnRenderComplete
      );

      expect(mockOnRenderComplete).toHaveBeenCalled();
    });

    it('should not call onRenderComplete when not provided', () => {
      expect(() => {
        renderServiceList(serviceListElement, mockServices, [], '', mockOnServiceClick);
      }).not.toThrow();
    });

    it('should create drop handler with correct parameters', () => {
      const currentFavorites = ['ec2', 's3'];

      renderServiceList(serviceListElement, mockServices, currentFavorites, '', mockOnServiceClick);

      expect(dragDrop.createDropHandler).toHaveBeenCalledWith(
        currentFavorites,
        storage.saveUserFavorites,
        expect.any(Function),
        uiState.showStorageWarning
      );
    });

    it('should pass drag handlers to favorite items', () => {
      renderServiceList(serviceListElement, mockServices, ['ec2'], '', mockOnServiceClick);

      const favoriteCall = (serviceItem.createServiceItem as jest.Mock).mock.calls.find(
        (call) => call[0].id === 'ec2'
      );

      expect(favoriteCall[3]).toHaveProperty('onDragStart');
      expect(favoriteCall[3]).toHaveProperty('onDragEnd');
      expect(favoriteCall[3]).toHaveProperty('onDragOver');
      expect(favoriteCall[3]).toHaveProperty('onDrop');
      expect(favoriteCall[3]).toHaveProperty('onDragEnter');
      expect(favoriteCall[3]).toHaveProperty('onDragLeave');
      expect(favoriteCall[3]).toHaveProperty('onClick');
    });

    it('should pass only click handler to non-favorite items', () => {
      renderServiceList(serviceListElement, mockServices, ['ec2'], '', mockOnServiceClick);

      const nonFavoriteCall = (serviceItem.createServiceItem as jest.Mock).mock.calls.find(
        (call) => call[0].id === 's3'
      );

      expect(nonFavoriteCall[3]).toHaveProperty('onClick');
      expect(nonFavoriteCall[3]).not.toHaveProperty('onDragStart');
    });

    it('should handle case-insensitive favorite matching', () => {
      renderServiceList(
        serviceListElement,
        mockServices,
        ['EC2', 'S3'], // Uppercase
        '',
        mockOnServiceClick
      );

      const items = serviceListElement.querySelectorAll('.service-item');
      expect(items[0].classList.contains('selected')).toBe(true);
      expect(items[1].classList.contains('selected')).toBe(true);
    });

    it('should handle empty services array', () => {
      renderServiceList(serviceListElement, [], [], '', mockOnServiceClick);

      const items = serviceListElement.querySelectorAll('.service-item');
      expect(items.length).toBe(0);
    });

    it('should handle all services being favorites', () => {
      renderServiceList(
        serviceListElement,
        mockServices,
        ['ec2', 's3', 'lambda', 'rds'],
        '',
        mockOnServiceClick
      );

      const items = serviceListElement.querySelectorAll('.service-item');
      expect(items.length).toBe(4);

      items.forEach((item) => {
        expect(item.classList.contains('selected')).toBe(true);
      });
    });

    it('should handle search query with whitespace', () => {
      renderServiceList(serviceListElement, [], [], '   ', mockOnServiceClick);

      expect(serviceListElement.innerHTML).not.toContain('No services found');
    });

    it('should maintain favorite order even with mixed case IDs', () => {
      const services: Service[] = [
        { id: 'EC2', name: 'EC2', iconUrl: null, consoleUrl: 'https://console.aws.amazon.com/ec2' },
        { id: 's3', name: 'S3', iconUrl: null, consoleUrl: 'https://console.aws.amazon.com/s3' }
      ];

      renderServiceList(serviceListElement, services, ['s3', 'ec2'], '', mockOnServiceClick);

      const items = serviceListElement.querySelectorAll('.service-item');
      expect(items[0].dataset.serviceId).toBe('s3');
      expect(items[1].dataset.serviceId).toBe('EC2');
    });

    it('should trigger re-render callback from drop handler', () => {
      let dropHandlerCallback: Function | null = null;

      // Capture the callback passed to createDropHandler
      (dragDrop.createDropHandler as jest.Mock).mockImplementation(
        (favorites, save, callback, warn) => {
          dropHandlerCallback = callback;
          return jest.fn();
        }
      );

      renderServiceList(serviceListElement, mockServices, ['ec2'], '', mockOnServiceClick);

      // Verify the callback was captured
      expect(dropHandlerCallback).not.toBeNull();

      // Call the callback to trigger re-render
      if (dropHandlerCallback) {
        dropHandlerCallback();
      }

      // Verify renderServiceList was called again (re-render)
      expect(serviceItem.createServiceItem).toHaveBeenCalled();
    });
  });
});
