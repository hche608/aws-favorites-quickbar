/**
 * Type declarations for mock implementations
 */

export interface MockMutationObserver {
  new (callback: MutationCallback): MutationObserver;
  trigger: (mutations: MutationRecord[]) => void;
  instances: Array<MutationObserver & { callback: MutationCallback }>;
}

export function mockChromeStorage(): typeof chrome.storage;
export function mockChromeRuntime(): typeof chrome.runtime;
export function mockChromeTabs(): typeof chrome.tabs;
export function mockBrowserStorage(): typeof chrome.storage;
export function mockBrowserRuntime(): typeof chrome.runtime;
export function mockBrowserTabs(): typeof chrome.tabs;
export function mockLocalStorage(): Storage;
export function mockMutationObserver(): MockMutationObserver;
export function mockImage(): new () => HTMLImageElement;
export function mockFetch(): typeof fetch;
export function setupChromeMocks(): void;
export function setupFirefoxMocks(): void;
export function clearChromeMocks(): void;
export function clearFirefoxMocks(): void;
export function clearAllBrowserMocks(): void;
