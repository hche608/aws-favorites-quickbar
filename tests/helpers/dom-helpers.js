/**
 * DOM manipulation utilities for tests
 */

/**
 * Sets up DOM structure from HTML string
 * @param {string} html - HTML string to parse
 * @returns {HTMLElement} Root element
 */
function setupDOM(html) {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

/**
 * Cleans up DOM after test
 */
function teardownDOM() {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
}

/**
 * Waits for a DOM mutation to occur
 * @param {Function} callback - Function that triggers the mutation
 * @param {Object} options - MutationObserver options
 * @returns {Promise<MutationRecord[]>} Promise that resolves with mutation records
 */
function waitForMutation(callback, options = {}) {
  return new Promise((resolve) => {
    const defaultOptions = {
      childList: true,
      subtree: true,
      attributes: true,
      ...options
    };

    const observer = new MutationObserver((mutations) => {
      observer.disconnect();
      resolve(mutations);
    });

    observer.observe(document.body, defaultOptions);
    
    // Execute the callback that should trigger mutations
    if (callback) {
      callback();
    }
  });
}

/**
 * Creates a mock DOM element with attributes and children
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {Array<HTMLElement|string>} children - Child elements or text
 * @returns {HTMLElement} Created element
 */
function createMockElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);
  
  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else {
      element.setAttribute(key, value);
    }
  });
  
  // Add children
  children.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof HTMLElement) {
      element.appendChild(child);
    }
  });
  
  return element;
}

/**
 * Waits for an element to appear in the DOM
 * @param {string} selector - CSS selector
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<HTMLElement>} Promise that resolves with the element
 */
function waitForElement(selector, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Simulates a click event on an element
 * @param {HTMLElement} element - Element to click
 * @param {Object} options - Event options
 */
function simulateClick(element, options = {}) {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window,
    ...options
  });
  element.dispatchEvent(event);
}

/**
 * Simulates a drag and drop operation
 * @param {HTMLElement} source - Source element
 * @param {HTMLElement} target - Target element
 */
function simulateDragDrop(source, target) {
  // Drag start
  const dragStartEvent = new DragEvent('dragstart', {
    bubbles: true,
    cancelable: true,
    dataTransfer: new DataTransfer()
  });
  source.dispatchEvent(dragStartEvent);

  // Drag over
  const dragOverEvent = new DragEvent('dragover', {
    bubbles: true,
    cancelable: true,
    dataTransfer: dragStartEvent.dataTransfer
  });
  target.dispatchEvent(dragOverEvent);

  // Drop
  const dropEvent = new DragEvent('drop', {
    bubbles: true,
    cancelable: true,
    dataTransfer: dragStartEvent.dataTransfer
  });
  target.dispatchEvent(dropEvent);

  // Drag end
  const dragEndEvent = new DragEvent('dragend', {
    bubbles: true,
    cancelable: true,
    dataTransfer: dragStartEvent.dataTransfer
  });
  source.dispatchEvent(dragEndEvent);
}

/**
 * Simulates typing into an input element
 * @param {HTMLElement} element - Input element
 * @param {string} text - Text to type
 */
function simulateTyping(element, text) {
  element.value = text;
  
  const inputEvent = new Event('input', {
    bubbles: true,
    cancelable: true
  });
  element.dispatchEvent(inputEvent);
  
  const changeEvent = new Event('change', {
    bubbles: true,
    cancelable: true
  });
  element.dispatchEvent(changeEvent);
}

/**
 * Gets all text content from an element, excluding hidden elements
 * @param {HTMLElement} element - Element to get text from
 * @returns {string} Visible text content
 */
function getVisibleText(element) {
  if (!element) return '';
  
  const clone = element.cloneNode(true);
  
  // Remove hidden elements
  const hiddenElements = clone.querySelectorAll('[style*="display: none"], [style*="display:none"], [hidden]');
  hiddenElements.forEach(el => el.remove());
  
  return clone.textContent.trim();
}

/**
 * Checks if an element is visible
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if element is visible
 */
function isElementVisible(element) {
  if (!element) return false;
  
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         !element.hidden;
}

/**
 * Waits for a condition to be true
 * @param {Function} condition - Function that returns boolean
 * @param {number} timeout - Timeout in milliseconds
 * @param {number} interval - Check interval in milliseconds
 * @returns {Promise<void>} Promise that resolves when condition is true
 */
function waitForCondition(condition, timeout = 1000, interval = 50) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime >= timeout) {
        reject(new Error('Condition not met within timeout'));
      } else {
        setTimeout(check, interval);
      }
    };
    
    check();
  });
}

module.exports = {
  setupDOM,
  teardownDOM,
  waitForMutation,
  createMockElement,
  waitForElement,
  simulateClick,
  simulateDragDrop,
  simulateTyping,
  getVisibleText,
  isElementVisible,
  waitForCondition
};
