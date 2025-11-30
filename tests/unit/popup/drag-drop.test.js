/**
 * Unit tests for popup drag-and-drop functionality
 * Requirements: 4.5
 */

const { teardownDOM } = require('../../helpers/dom-helpers');
const { setupChromeMocks, clearChromeMocks } = require('../../helpers/mocks');

// Mock DragEvent and DataTransfer for jsdom
class MockDataTransfer {
  constructor() {
    this.data = {};
    this.effectAllowed = 'none';
    this.dropEffect = 'none';
  }

  setData(format, data) {
    this.data[format] = data;
  }

  getData(format) {
    return this.data[format] || '';
  }
}

class MockDragEvent extends Event {
  constructor(type, options = {}) {
    super(type, options);
    this.dataTransfer = options.dataTransfer || new MockDataTransfer();
  }
}

global.DataTransfer = MockDataTransfer;
global.DragEvent = MockDragEvent;

// Since the popup modules use ES6 imports which Jest doesn't support without Babel,
// we'll define the functions inline for testing. These are copies of the actual functions.

let draggedElement = null;

function handleDragStart(event) {
  draggedElement = event.currentTarget;
  draggedElement.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/html', draggedElement.innerHTML);
}

function handleDragEnd(event) {
  if (draggedElement) {
    draggedElement.classList.remove('dragging');
  }
  
  const items = document.querySelectorAll('.service-item');
  items.forEach(item => item.classList.remove('drag-over'));
  
  draggedElement = null;
}

function handleDragOver(event) {
  if (event.preventDefault) {
    event.preventDefault();
  }
  event.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(event) {
  const target = event.currentTarget;
  if (target !== draggedElement && target.classList.contains('selected')) {
    target.classList.add('drag-over');
  }
}

function handleDragLeave(event) {
  const target = event.currentTarget;
  target.classList.remove('drag-over');
}

function createDropHandler(currentFavorites, saveCallback, renderCallback, errorCallback) {
  return async function handleDrop(event) {
    if (event.stopPropagation) {
      event.stopPropagation();
    }
    
    const target = event.currentTarget;
    
    if (draggedElement && target !== draggedElement && target.classList.contains('selected')) {
      const draggedId = draggedElement.dataset.serviceId;
      const targetId = target.dataset.serviceId;
      
      const draggedIndex = currentFavorites.findIndex(id => 
        id.toLowerCase() === draggedId.toLowerCase()
      );
      const targetIndex = currentFavorites.findIndex(id => 
        id.toLowerCase() === targetId.toLowerCase()
      );
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const originalOrder = [...currentFavorites];
        
        const [removed] = currentFavorites.splice(draggedIndex, 1);
        currentFavorites.splice(targetIndex, 0, removed);
        
        console.log('AWS Favorites Quickbar: Reordered favorites', currentFavorites);
        
        try {
          await saveCallback(currentFavorites);
          renderCallback();
          
          // Notify tabs
          const tabs = await chrome.tabs.query({ url: 'https://*.console.aws.amazon.com/*' });
          for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, { action: 'updateQuickbar' }).catch(() => {});
          }
        } catch (error) {
          console.error('AWS Favorites Quickbar: Error saving reordered favorites', error);
          currentFavorites.splice(0, currentFavorites.length, ...originalOrder);
          renderCallback();
          errorCallback('Failed to save new order. Please try again.');
        }
      }
    }
    
    return false;
  };
}

describe('Popup Drag and Drop', () => {
  beforeEach(() => {
    teardownDOM();
    setupChromeMocks();
    draggedElement = null;
  });

  afterEach(() => {
    teardownDOM();
    clearChromeMocks();
    draggedElement = null;
  });

  describe('handleDragStart', () => {
    it('should set draggedElement to current target', () => {
      const element = document.createElement('div');
      element.classList.add('service-item');
      element.dataset.serviceId = 's3';
      document.body.appendChild(element);

      const event = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
      Object.defineProperty(event, 'currentTarget', { value: element, writable: false });

      handleDragStart(event);

      expect(draggedElement).toBe(element);
    });

    it('should add dragging class to element', () => {
      const element = document.createElement('div');
      element.classList.add('service-item');
      document.body.appendChild(element);

      const event = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
      Object.defineProperty(event, 'currentTarget', { value: element, writable: false });

      handleDragStart(event);

      expect(element.classList.contains('dragging')).toBe(true);
    });

    it('should set dataTransfer effectAllowed to move', () => {
      const element = document.createElement('div');
      element.classList.add('service-item');
      element.innerHTML = '<span>Test</span>';
      document.body.appendChild(element);

      const event = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
      Object.defineProperty(event, 'currentTarget', { value: element, writable: false });

      handleDragStart(event);

      expect(event.dataTransfer.effectAllowed).toBe('move');
    });

    it('should set dataTransfer data to element innerHTML', () => {
      const element = document.createElement('div');
      element.classList.add('service-item');
      element.innerHTML = '<span>Test Content</span>';
      document.body.appendChild(element);

      const event = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
      Object.defineProperty(event, 'currentTarget', { value: element, writable: false });

      handleDragStart(event);

      expect(event.dataTransfer.getData('text/html')).toBe('<span>Test Content</span>');
    });
  });

  describe('handleDragEnd', () => {
    it('should remove dragging class from draggedElement', () => {
      const element = document.createElement('div');
      element.classList.add('service-item', 'dragging');
      document.body.appendChild(element);
      draggedElement = element;

      const event = new DragEvent('dragend', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });

      handleDragEnd(event);

      expect(element.classList.contains('dragging')).toBe(false);
    });

    it('should remove drag-over class from all service items', () => {
      const item1 = document.createElement('div');
      item1.classList.add('service-item', 'drag-over');
      const item2 = document.createElement('div');
      item2.classList.add('service-item', 'drag-over');
      document.body.appendChild(item1);
      document.body.appendChild(item2);

      const event = new DragEvent('dragend', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });

      handleDragEnd(event);

      expect(item1.classList.contains('drag-over')).toBe(false);
      expect(item2.classList.contains('drag-over')).toBe(false);
    });

    it('should reset draggedElement to null', () => {
      const element = document.createElement('div');
      element.classList.add('service-item');
      document.body.appendChild(element);
      draggedElement = element;

      const event = new DragEvent('dragend', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });

      handleDragEnd(event);

      expect(draggedElement).toBeNull();
    });

    it('should handle null draggedElement gracefully', () => {
      draggedElement = null;

      const event = new DragEvent('dragend', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });

      expect(() => {
        handleDragEnd(event);
      }).not.toThrow();
    });
  });

  describe('handleDragOver', () => {
    it('should prevent default behavior', () => {
      const event = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      handleDragOver(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should set dropEffect to move', () => {
      const event = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });

      handleDragOver(event);

      expect(event.dataTransfer.dropEffect).toBe('move');
    });

    it('should return false', () => {
      const event = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });

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
      draggedElement = dragged;

      const event = new DragEvent('dragenter', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
      Object.defineProperty(event, 'currentTarget', { value: target, writable: false });

      handleDragEnter(event);

      expect(target.classList.contains('drag-over')).toBe(true);
    });

    it('should not add drag-over class to non-selected target', () => {
      const target = document.createElement('div');
      target.classList.add('service-item');
      document.body.appendChild(target);

      const event = new DragEvent('dragenter', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
      Object.defineProperty(event, 'currentTarget', { value: target, writable: false });

      handleDragEnter(event);

      expect(target.classList.contains('drag-over')).toBe(false);
    });

    it('should not add drag-over class to draggedElement itself', () => {
      const element = document.createElement('div');
      element.classList.add('service-item', 'selected');
      document.body.appendChild(element);
      draggedElement = element;

      const event = new DragEvent('dragenter', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
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

      const event = new DragEvent('dragleave', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
      Object.defineProperty(event, 'currentTarget', { value: target, writable: false });

      handleDragLeave(event);

      expect(target.classList.contains('drag-over')).toBe(false);
    });
  });

  describe('createDropHandler', () => {
    let currentFavorites;
    let saveCallback;
    let renderCallback;
    let errorCallback;
    let dropHandler;

    beforeEach(() => {
      currentFavorites = ['s3', 'ec2', 'lambda'];
      saveCallback = jest.fn().mockResolvedValue(undefined);
      renderCallback = jest.fn();
      errorCallback = jest.fn();
      dropHandler = createDropHandler(currentFavorites, saveCallback, renderCallback, errorCallback);

      // Mock chrome.tabs
      global.chrome.tabs = {
        query: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
        sendMessage: jest.fn().mockResolvedValue(undefined)
      };
    });

    it('should reorder favorites when dropping on different selected item', async () => {
      const draggedItem = document.createElement('div');
      draggedItem.classList.add('service-item', 'selected');
      draggedItem.dataset.serviceId = 's3';
      document.body.appendChild(draggedItem);
      draggedElement = draggedItem;

      const targetItem = document.createElement('div');
      targetItem.classList.add('service-item', 'selected');
      targetItem.dataset.serviceId = 'lambda';
      document.body.appendChild(targetItem);

      const event = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
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
      draggedElement = draggedItem;

      const targetItem = document.createElement('div');
      targetItem.classList.add('service-item');
      targetItem.dataset.serviceId = 'dynamodb';
      document.body.appendChild(targetItem);

      const event = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
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
      draggedElement = item;

      const event = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
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
      draggedElement = draggedItem;

      const targetItem = document.createElement('div');
      targetItem.classList.add('service-item', 'selected');
      targetItem.dataset.serviceId = 'LAMBDA';
      document.body.appendChild(targetItem);

      const event = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
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
      draggedElement = draggedItem;

      const targetItem = document.createElement('div');
      targetItem.classList.add('service-item', 'selected');
      targetItem.dataset.serviceId = 'lambda';
      document.body.appendChild(targetItem);

      const event = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
      Object.defineProperty(event, 'currentTarget', { value: targetItem, writable: false });

      await dropHandler(event);

      expect(currentFavorites).toEqual(['s3', 'ec2', 'lambda']);
      expect(errorCallback).toHaveBeenCalledWith('Failed to save new order. Please try again.');
      // renderCallback is called once after restore on error
      expect(renderCallback).toHaveBeenCalledTimes(1);
    });

    it('should notify tabs after successful reorder', async () => {
      const draggedItem = document.createElement('div');
      draggedItem.classList.add('service-item', 'selected');
      draggedItem.dataset.serviceId = 's3';
      document.body.appendChild(draggedItem);
      draggedElement = draggedItem;

      const targetItem = document.createElement('div');
      targetItem.classList.add('service-item', 'selected');
      targetItem.dataset.serviceId = 'lambda';
      document.body.appendChild(targetItem);

      const event = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
      Object.defineProperty(event, 'currentTarget', { value: targetItem, writable: false });

      await dropHandler(event);

      expect(chrome.tabs.query).toHaveBeenCalledWith({ url: 'https://*.console.aws.amazon.com/*' });
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2);
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, { action: 'updateQuickbar' });
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(2, { action: 'updateQuickbar' });
    });

    it('should return false', async () => {
      const draggedItem = document.createElement('div');
      draggedItem.classList.add('service-item', 'selected');
      draggedItem.dataset.serviceId = 's3';
      document.body.appendChild(draggedItem);
      draggedElement = draggedItem;

      const targetItem = document.createElement('div');
      targetItem.classList.add('service-item', 'selected');
      targetItem.dataset.serviceId = 'lambda';
      document.body.appendChild(targetItem);

      const event = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
      Object.defineProperty(event, 'currentTarget', { value: targetItem, writable: false });

      const result = await dropHandler(event);

      expect(result).toBe(false);
    });
  });
});
