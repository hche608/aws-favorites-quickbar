/**
 * DOM manipulation utilities for tests
 */

/**
 * Sets up DOM structure from HTML string
 * @param html - HTML string to parse
 * @returns Root element
 */
export function setupDOM(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

/**
 * Cleans up DOM after test
 */
export function teardownDOM(): void {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
}

/**
 * Waits for a DOM mutation to occur
 * @param callback - Function that triggers the mutation
 * @param options - MutationObserver options
 * @returns Promise that resolves with mutation records
 */
export function waitForMutation(
  callback?: () => void,
  options: MutationObserverInit = {}
): Promise<MutationRecord[]> {
  return new Promise((resolve) => {
    const defaultOptions: MutationObserverInit = {
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
 * @param tag - HTML tag name
 * @param attributes - Element attributes
 * @param children - Child elements or text
 * @returns Created element
 */
export function createMockElement(
  tag: string,
  attributes: Record<string, any> = {},
  children: (HTMLElement | string)[] = []
): HTMLElement {
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
  children.forEach((child) => {
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
 * @param selector - CSS selector
 * @param timeout - Timeout in milliseconds
 * @returns Promise that resolves with the element
 */
export function waitForElement(selector: string, timeout: number = 1000): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element as HTMLElement);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve(element as HTMLElement);
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
 * @param element - Element to click
 * @param options - Event options
 */
export function simulateClick(element: HTMLElement, options: MouseEventInit = {}): void {
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
 * @param source - Source element
 * @param target - Target element
 */
export function simulateDragDrop(source: HTMLElement, target: HTMLElement): void {
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
 * @param element - Input element
 * @param text - Text to type
 */
export function simulateTyping(element: HTMLInputElement, text: string): void {
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
 * @param element - Element to get text from
 * @returns Visible text content
 */
export function getVisibleText(element: HTMLElement | null): string {
  if (!element) return '';

  const clone = element.cloneNode(true) as HTMLElement;

  // Remove hidden elements
  const hiddenElements = clone.querySelectorAll(
    '[style*="display: none"], [style*="display:none"], [hidden]'
  );
  hiddenElements.forEach((el) => el.remove());

  return clone.textContent?.trim() || '';
}

/**
 * Checks if an element is visible
 * @param element - Element to check
 * @returns True if element is visible
 */
export function isElementVisible(element: HTMLElement | null): boolean {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    !element.hidden
  );
}

/**
 * Waits for a condition to be true
 * @param condition - Function that returns boolean
 * @param timeout - Timeout in milliseconds
 * @param interval - Check interval in milliseconds
 * @returns Promise that resolves when condition is true
 */
export function waitForCondition(
  condition: () => boolean,
  timeout: number = 1000,
  interval: number = 50
): Promise<void> {
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
