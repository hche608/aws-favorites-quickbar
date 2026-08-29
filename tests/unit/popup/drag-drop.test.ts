/**
 * Unit tests for popup drag-and-drop functionality
 * Requirements: 4.5
 */

import { teardownDOM } from '../../helpers/dom-helpers';
import { setupChromeMocks, clearChromeMocks } from '../../helpers/mocks';
import {
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  createDropHandler
} from '../../../src/popup/drag-drop';

// Mock DragEvent and DataTransfer for jsdom
class MockDataTransfer {
  data: Record<string, string> = {};
  effectAllowed: string = 'none';
  dropEffect: string = 'none';

  setData(format: string, data: string): void {
    this.data[format] = data;
  }

  getData(format: string): string {
    return this.data[format] || '';
  }
}

class MockDragEvent extends Event {
  dataTransfer: MockDataTransfer;

  constructor(type: string, options: any = {}) {
    super(type, options);
    this.dataTransfer = options.dataTransfer || new MockDataTransfer();
  }
}

(global as any).DataTransfer = MockDataTransfer;
(global as any).DragEvent = MockDragEvent;

describe('Popup Drag and Drop', () => {
  beforeEach(() => {
    teardownDOM();
    setupChromeMocks();
  });

  afterEach(() => {
    teardownDOM();
    clearChromeMocks();
  });

  describe('handleDragStart', () => {
    it('should add dragging class to element', () => {
      const element = document.createElement('div');
      element.classList.add('service-item');
      document.body.appendChild(element);

      const event = new MockDragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(event, 'currentTarget', { value: element, writable: false });

      handleDragStart(event);

      expect(element.classList.contains('dragging')).toBe(true);
    });

    it('should set dataTransfer effectAllowed to move', () => {
      const element = document.createElement('div');
      element.classList.add('service-item');
      element.innerHTML = '<span>Test</span>';
      document.body.appendChild(element);

      const event = new MockDragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(event, 'currentTarget', { value: element, writable: false });

      handleDragStart(event);

      expect(event.dataTransfer.effectAllowed).toBe('move');
    });

    it('should set dataTransfer data to element innerHTML', () => {
      const element = document.createElement('div');
      element.classList.add('service-item');
      element.innerHTML = '<span>Test Content</span>';
      document.body.appendChild(element);

      const event = new MockDragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(event, 'currentTarget', { value: element, writable: false });

      handleDragStart(event);

      expect(event.dataTransfer.getData('text/html')).toBe('<span>Test Content</span>');
    });
  });

  describe('handleDragEnd', () => {
    it('should remove drag-over class from all service items', () => {
      const item1 = document.createElement('div');
      item1.classList.add('service-item', 'drag-over');
      const item2 = document.createElement('div');
      item2.classList.add('service-item', 'drag-over');
      document.body.appendChild(item1);
      document.body.appendChild(item2);

      // First start a drag
      const draggedItem = document.createElement('div');
      draggedItem.classList.add('service-item', 'dragging');
      document.body.appendChild(draggedItem);

      const startEvent = new MockDragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(startEvent, 'currentTarget', { value: draggedItem, writable: false });
      handleDragStart(startEvent);

      const event = new MockDragEvent('dragend', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;

      handleDragEnd(event);

      expect(item1.classList.contains('drag-over')).toBe(false);
      expect(item2.classList.contains('drag-over')).toBe(false);
    });

    it('should remove dragging class from draggedElement', () => {
      const element = document.createElement('div');
      element.classList.add('service-item');
      document.body.appendChild(element);

      const startEvent = new MockDragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(startEvent, 'currentTarget', { value: element, writable: false });
      handleDragStart(startEvent);

      expect(element.classList.contains('dragging')).toBe(true);

      const endEvent = new MockDragEvent('dragend', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;

      handleDragEnd(endEvent);

      expect(element.classList.contains('dragging')).toBe(false);
    });
  });

  describe('handleDragOver', () => {
    it('should prevent default behavior', () => {
      const event = new MockDragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      handleDragOver(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should set dropEffect to move', () => {
      const event = new MockDragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;

      handleDragOver(event);

      expect(event.dataTransfer.dropEffect).toBe('move');
    });

    it('should return false', () => {
      const event = new MockDragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;

      const result = handleDragOver(event);

      expect(result).toBe(false);
    });
  });

  describe('handleDragEnter', () => {
    it('should add drag-over class to selected target', () => {
      const target = document.createElement('div');
      target.classList.add('service-item', 'selected');
      document.body.appendChild(target);

      const dragged = document.createElement('div');
      dragged.classList.add('service-item', 'selected');
      document.body.appendChild(dragged);

      // Start drag on dragged element
      const startEvent = new MockDragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(startEvent, 'currentTarget', { value: dragged, writable: false });
      handleDragStart(startEvent);

      const event = new MockDragEvent('dragenter', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(event, 'currentTarget', { value: target, writable: false });

      handleDragEnter(event);

      expect(target.classList.contains('drag-over')).toBe(true);
    });

    it('should not add drag-over class to non-selected target', () => {
      const target = document.createElement('div');
      target.classList.add('service-item');
      document.body.appendChild(target);

      const event = new MockDragEvent('dragenter', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(event, 'currentTarget', { value: target, writable: false });

      handleDragEnter(event);

      expect(target.classList.contains('drag-over')).toBe(false);
    });

    it('should not add drag-over class to draggedElement itself', () => {
      const element = document.createElement('div');
      element.classList.add('service-item', 'selected');
      document.body.appendChild(element);

      // Start drag on element
      const startEvent = new MockDragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(startEvent, 'currentTarget', { value: element, writable: false });
      handleDragStart(startEvent);

      const event = new MockDragEvent('dragenter', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(event, 'currentTarget', { value: element, writable: false });

      handleDragEnter(event);

      expect(element.classList.contains('drag-over')).toBe(false);
    });
  });

  describe('handleDragLeave', () => {
    it('should remove drag-over class from target', () => {
      const target = document.createElement('div');
      target.classList.add('service-item', 'drag-over');
      document.body.appendChild(target);

      const event = new MockDragEvent('dragleave', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(event, 'currentTarget', { value: target, writable: false });

      handleDragLeave(event);

      expect(target.classList.contains('drag-over')).toBe(false);
    });
  });

  describe('createDropHandler', () => {
    let currentFavorites: string[];
    let saveCallback: jest.Mock;
    let renderCallback: jest.Mock;
    let errorCallback: jest.Mock;
    let notifyCallback: jest.Mock;
    let dropHandler: (event: DragEvent) => Promise<boolean>;

    beforeEach(() => {
      currentFavorites = ['s3', 'ec2', 'lambda'];
      saveCallback = jest.fn().mockResolvedValue(undefined);
      renderCallback = jest.fn();
      errorCallback = jest.fn();
      notifyCallback = jest.fn().mockResolvedValue(undefined);
      dropHandler = createDropHandler(
        currentFavorites,
        saveCallback,
        renderCallback,
        errorCallback,
        notifyCallback
      );
    });

    it('should reorder favorites when dropping on different selected item', async () => {
      const draggedItem = document.createElement('div');
      draggedItem.classList.add('service-item', 'selected');
      draggedItem.dataset.serviceId = 's3';
      document.body.appendChild(draggedItem);

      // Start drag
      const startEvent = new MockDragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(startEvent, 'currentTarget', { value: draggedItem, writable: false });
      handleDragStart(startEvent);

      const targetItem = document.createElement('div');
      targetItem.classList.add('service-item', 'selected');
      targetItem.dataset.serviceId = 'lambda';
      document.body.appendChild(targetItem);

      const event = new MockDragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(event, 'currentTarget', { value: targetItem, writable: false });
      const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');

      await dropHandler(event);

      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(currentFavorites).toEqual(['ec2', 'lambda', 's3']);
      expect(saveCallback).toHaveBeenCalledWith(['ec2', 'lambda', 's3']);
      expect(renderCallback).toHaveBeenCalled();
    });

    it('should not reorder when dropping on non-selected item', async () => {
      const draggedItem = document.createElement('div');
      draggedItem.classList.add('service-item', 'selected');
      draggedItem.dataset.serviceId = 's3';
      document.body.appendChild(draggedItem);

      // Start drag
      const startEvent = new MockDragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(startEvent, 'currentTarget', { value: draggedItem, writable: false });
      handleDragStart(startEvent);

      const targetItem = document.createElement('div');
      targetItem.classList.add('service-item');
      targetItem.dataset.serviceId = 'dynamodb';
      document.body.appendChild(targetItem);

      const event = new MockDragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(event, 'currentTarget', { value: targetItem, writable: false });

      await dropHandler(event);

      expect(currentFavorites).toEqual(['s3', 'ec2', 'lambda']);
      expect(saveCallback).not.toHaveBeenCalled();
    });

    it('should not reorder when dropping on itself', async () => {
      const item = document.createElement('div');
      item.classList.add('service-item', 'selected');
      item.dataset.serviceId = 's3';
      document.body.appendChild(item);

      // Start drag
      const startEvent = new MockDragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(startEvent, 'currentTarget', { value: item, writable: false });
      handleDragStart(startEvent);

      const event = new MockDragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(event, 'currentTarget', { value: item, writable: false });

      await dropHandler(event);

      expect(currentFavorites).toEqual(['s3', 'ec2', 'lambda']);
      expect(saveCallback).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive service id matching', async () => {
      const draggedItem = document.createElement('div');
      draggedItem.classList.add('service-item', 'selected');
      draggedItem.dataset.serviceId = 'S3';
      document.body.appendChild(draggedItem);

      // Start drag
      const startEvent = new MockDragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(startEvent, 'currentTarget', { value: draggedItem, writable: false });
      handleDragStart(startEvent);

      const targetItem = document.createElement('div');
      targetItem.classList.add('service-item', 'selected');
      targetItem.dataset.serviceId = 'LAMBDA';
      document.body.appendChild(targetItem);

      const event = new MockDragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(event, 'currentTarget', { value: targetItem, writable: false });

      await dropHandler(event);

      expect(currentFavorites).toEqual(['ec2', 'lambda', 's3']);
    });

    it('should restore original order on save error', async () => {
      saveCallback.mockRejectedValueOnce(new Error('Storage error'));

      const draggedItem = document.createElement('div');
      draggedItem.classList.add('service-item', 'selected');
      draggedItem.dataset.serviceId = 's3';
      document.body.appendChild(draggedItem);

      // Start drag
      const startEvent = new MockDragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(startEvent, 'currentTarget', { value: draggedItem, writable: false });
      handleDragStart(startEvent);

      const targetItem = document.createElement('div');
      targetItem.classList.add('service-item', 'selected');
      targetItem.dataset.serviceId = 'lambda';
      document.body.appendChild(targetItem);

      const event = new MockDragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(event, 'currentTarget', { value: targetItem, writable: false });

      await dropHandler(event);

      expect(currentFavorites).toEqual(['s3', 'ec2', 'lambda']);
      expect(errorCallback).toHaveBeenCalledWith('Failed to save new order. Please try again.');
      expect(renderCallback).toHaveBeenCalledTimes(1);
    });

    it('should notify tabs after successful reorder', async () => {
      const draggedItem = document.createElement('div');
      draggedItem.classList.add('service-item', 'selected');
      draggedItem.dataset.serviceId = 's3';
      document.body.appendChild(draggedItem);

      // Start drag
      const startEvent = new MockDragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(startEvent, 'currentTarget', { value: draggedItem, writable: false });
      handleDragStart(startEvent);

      const targetItem = document.createElement('div');
      targetItem.classList.add('service-item', 'selected');
      targetItem.dataset.serviceId = 'lambda';
      document.body.appendChild(targetItem);

      const event = new MockDragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(event, 'currentTarget', { value: targetItem, writable: false });

      await dropHandler(event);

      expect(notifyCallback).toHaveBeenCalled();
    });

    it('should return false', async () => {
      const draggedItem = document.createElement('div');
      draggedItem.classList.add('service-item', 'selected');
      draggedItem.dataset.serviceId = 's3';
      document.body.appendChild(draggedItem);

      // Start drag
      const startEvent = new MockDragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(startEvent, 'currentTarget', { value: draggedItem, writable: false });
      handleDragStart(startEvent);

      const targetItem = document.createElement('div');
      targetItem.classList.add('service-item', 'selected');
      targetItem.dataset.serviceId = 'lambda';
      document.body.appendChild(targetItem);

      const event = new MockDragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new MockDataTransfer()
      }) as any;
      Object.defineProperty(event, 'currentTarget', { value: targetItem, writable: false });

      const result = await dropHandler(event);

      expect(result).toBe(false);
    });
  });
});
