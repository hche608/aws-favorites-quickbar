/**
 * Type declarations for DOM manipulation utilities
 */

export function setupDOM(html: string): HTMLElement;
export function teardownDOM(): void;
export function waitForMutation(
  callback?: () => void,
  options?: MutationObserverInit
): Promise<MutationRecord[]>;
export function createMockElement(
  tag: string,
  attributes?: Record<string, any>,
  children?: Array<HTMLElement | string>
): HTMLElement;
export function waitForElement(selector: string, timeout?: number): Promise<HTMLElement>;
export function simulateClick(element: HTMLElement, options?: MouseEventInit): void;
export function simulateDragDrop(source: HTMLElement, target: HTMLElement): void;
export function simulateTyping(element: HTMLElement, text: string): void;
export function getVisibleText(element: HTMLElement): string;
export function isElementVisible(element: HTMLElement): boolean;
export function waitForCondition(
  condition: () => boolean,
  timeout?: number,
  interval?: number
): Promise<void>;
