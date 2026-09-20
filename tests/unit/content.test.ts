/**
 * Unit tests for content.ts
 *
 * content.ts auto-executes init() on import, so all dependencies must be mocked first.
 * We test the module's behavior through its side effects and message handler.
 */

// Mock all dependencies before importing
vi.mock('../../src/utils/dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/dom')>();
  return {
    ...actual,
    waitForDOMReady: vi.fn().mockResolvedValue(undefined),
    waitForElement: vi.fn().mockResolvedValue(null),
    isAWSConsolePage: vi.fn().mockReturnValue(false),
    isAWSConsoleHomepage: vi.fn().mockReturnValue(false),
    location: { getHostname: vi.fn(), getPathname: vi.fn() },
    parseServiceIdFromUrl: vi.fn((url) => actual.parseServiceIdFromUrl(url))
  };
});

vi.mock('../../src/utils/storage', () => ({
  saveServicesToStorage: vi.fn(),
  loadServicesFromStorage: vi.fn().mockReturnValue(undefined)
}));

vi.mock('../../src/utils/region', () => ({
  detectRegion: vi.fn().mockReturnValue('us-east-1')
}));

vi.mock('../../src/services/icon-extractor', () => ({
  extractIconUrlsFromConsole: vi.fn().mockResolvedValue({})
}));

vi.mock('../../src/services/icon-validator', () => ({
  isValidIconUrl: vi.fn().mockResolvedValue(true),
  updateServiceIcons: vi.fn().mockResolvedValue([])
}));

vi.mock('../../src/services/recently-visited-parser', () => ({
  waitForRecentlyVisitedWidget: vi.fn().mockResolvedValue(false),
  parseRecentlyVisited: vi.fn().mockResolvedValue([])
}));

vi.mock('../../src/services/service-merger', () => ({
  mergeServices: vi.fn().mockReturnValue([])
}));

vi.mock('../../src/quickbar/injector', () => ({
  injectServices: vi.fn().mockResolvedValue(true)
}));

vi.mock('../../src/settings', () => ({
  loadSettings: vi.fn().mockResolvedValue({
    favoriteIds: [],
    maxServices: 10,
    visualMode: 'light'
  }),
  applyVisualMode: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../src/browser-api', () => ({
  runtime: {
    onMessage: {
      addListener: vi.fn()
    }
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined)
    },
    sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined)
    }
  }
}));

import {
  waitForDOMReady,
  isAWSConsolePage,
  isAWSConsoleHomepage,
  waitForElement
} from '../../src/utils/dom';
import { saveServicesToStorage, loadServicesFromStorage } from '../../src/utils/storage';
import { detectRegion } from '../../src/utils/region';
import {
  waitForRecentlyVisitedWidget,
  parseRecentlyVisited
} from '../../src/services/recently-visited-parser';
import { mergeServices } from '../../src/services/service-merger';
import { injectServices } from '../../src/quickbar/injector';
import { loadSettings, applyVisualMode } from '../../src/settings';
import { runtime, storage as browserStorage } from '../../src/browser-api';

describe('Content Script', () => {
  let messageHandler: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Capture the message handler registered by the module
    (runtime.onMessage.addListener as jest.Mock).mockImplementation((handler) => {
      messageHandler = handler;
    });
  });

  it('should register a message listener on import', async () => {
    // Re-import to trigger module execution
    vi.resetModules();
    await import('../../src/content');

    expect(runtime.onMessage.addListener).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should call init on import', async () => {
    vi.resetModules();
    await import('../../src/content');

    // Wait for async init to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(waitForDOMReady).toHaveBeenCalled();
  });

  it('should exit early when not on AWS Console page', async () => {
    (isAWSConsolePage as jest.Mock).mockReturnValue(false);

    vi.resetModules();
    await import('../../src/content');

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(waitForDOMReady).toHaveBeenCalled();
    expect(isAWSConsolePage).toHaveBeenCalled();
    expect(loadSettings).not.toHaveBeenCalled();
  });

  it('should load settings and apply visual mode on AWS Console page', async () => {
    (isAWSConsolePage as jest.Mock).mockReturnValue(true);
    (isAWSConsoleHomepage as jest.Mock).mockReturnValue(false);
    (loadSettings as jest.Mock).mockResolvedValue({
      favoriteIds: ['ec2'],
      maxServices: 10,
      visualMode: 'dark'
    });

    vi.resetModules();
    await import('../../src/content');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(loadSettings).toHaveBeenCalled();
    expect(applyVisualMode).toHaveBeenCalledWith('dark');
  });

  it('should parse recently visited on homepage', async () => {
    (isAWSConsolePage as jest.Mock).mockReturnValue(true);
    (isAWSConsoleHomepage as jest.Mock).mockReturnValue(true);
    (waitForRecentlyVisitedWidget as jest.Mock).mockResolvedValue(true);
    (parseRecentlyVisited as jest.Mock).mockResolvedValue([
      {
        id: 's3',
        name: 'S3',
        iconUrl: null,
        consoleUrl: 'https://console.aws.amazon.com/s3',
        source: 'recent'
      }
    ]);
    (loadSettings as jest.Mock).mockResolvedValue({
      favoriteIds: ['ec2'],
      maxServices: 10,
      visualMode: 'light'
    });
    (mergeServices as jest.Mock).mockReturnValue([
      {
        id: 'ec2',
        name: 'EC2',
        iconUrl: null,
        consoleUrl: 'https://console.aws.amazon.com/ec2',
        source: 'user'
      },
      {
        id: 's3',
        name: 'S3',
        iconUrl: null,
        consoleUrl: 'https://console.aws.amazon.com/s3',
        source: 'recent'
      }
    ]);

    vi.resetModules();
    await import('../../src/content');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(waitForRecentlyVisitedWidget).toHaveBeenCalled();
    expect(parseRecentlyVisited).toHaveBeenCalled();
    expect(mergeServices).toHaveBeenCalled();
    expect(saveServicesToStorage).toHaveBeenCalled();
  });

  it('should load from cached storage on non-homepage', async () => {
    (isAWSConsolePage as jest.Mock).mockReturnValue(true);
    (isAWSConsoleHomepage as jest.Mock).mockReturnValue(false);
    (loadServicesFromStorage as jest.Mock).mockReturnValue([
      {
        id: 's3',
        name: 'S3',
        iconUrl: null,
        consoleUrl: 'https://console.aws.amazon.com/s3',
        source: 'recent'
      }
    ]);
    (loadSettings as jest.Mock).mockResolvedValue({
      favoriteIds: ['ec2'],
      maxServices: 10,
      visualMode: 'light'
    });

    vi.resetModules();
    await import('../../src/content');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(loadServicesFromStorage).toHaveBeenCalled();
    expect(mergeServices).toHaveBeenCalled();
  });

  it('should cap merged services at maxServices', async () => {
    (isAWSConsolePage as jest.Mock).mockReturnValue(true);
    (isAWSConsoleHomepage as jest.Mock).mockReturnValue(false);
    (loadServicesFromStorage as jest.Mock).mockReturnValue(undefined);
    (loadSettings as jest.Mock).mockResolvedValue({
      favoriteIds: ['a', 'b', 'c', 'd', 'e'],
      maxServices: 3,
      visualMode: 'light'
    });
    const fiveServices = [
      { id: 'a', name: 'A', iconUrl: null, consoleUrl: 'https://a.com', source: 'user' },
      { id: 'b', name: 'B', iconUrl: null, consoleUrl: 'https://b.com', source: 'user' },
      { id: 'c', name: 'C', iconUrl: null, consoleUrl: 'https://c.com', source: 'user' },
      { id: 'd', name: 'D', iconUrl: null, consoleUrl: 'https://d.com', source: 'user' },
      { id: 'e', name: 'E', iconUrl: null, consoleUrl: 'https://e.com', source: 'user' }
    ];
    (mergeServices as jest.Mock).mockReturnValue(fiveServices);
    (waitForElement as jest.Mock).mockResolvedValue(document.createElement('ol'));
    (injectServices as jest.Mock).mockResolvedValue(true);

    vi.resetModules();
    await import('../../src/content');

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should be capped at 3
    const injectedServices = (injectServices as jest.Mock).mock.calls[0][0];
    expect(injectedServices.length).toBe(3);
  });

  it('should write injection status to storage', async () => {
    (isAWSConsolePage as jest.Mock).mockReturnValue(true);
    (isAWSConsoleHomepage as jest.Mock).mockReturnValue(false);
    (loadServicesFromStorage as jest.Mock).mockReturnValue(undefined);
    (loadSettings as jest.Mock).mockResolvedValue({
      favoriteIds: [],
      maxServices: 10,
      visualMode: 'light'
    });
    (mergeServices as jest.Mock).mockReturnValue([]);
    (waitForElement as jest.Mock).mockResolvedValue(document.createElement('ol'));
    (injectServices as jest.Mock).mockResolvedValue(true);

    vi.resetModules();
    await import('../../src/content');

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(browserStorage.local.set).toHaveBeenCalledWith({ injectionStatus: 'success' });
  });

  it('should write no-native-pin status when injection fails', async () => {
    (isAWSConsolePage as jest.Mock).mockReturnValue(true);
    (isAWSConsoleHomepage as jest.Mock).mockReturnValue(false);
    (loadServicesFromStorage as jest.Mock).mockReturnValue(undefined);
    (loadSettings as jest.Mock).mockResolvedValue({
      favoriteIds: [],
      maxServices: 10,
      visualMode: 'light'
    });
    (mergeServices as jest.Mock).mockReturnValue([]);
    (waitForElement as jest.Mock).mockResolvedValue(document.createElement('ol'));
    (injectServices as jest.Mock).mockResolvedValue(false);

    vi.resetModules();
    await import('../../src/content');

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(browserStorage.local.set).toHaveBeenCalledWith({ injectionStatus: 'no-native-pin' });
  });

  describe('message handler', () => {
    beforeEach(async () => {
      // Import to register the handler
      vi.resetModules();
      await import('../../src/content');
    });

    it('should handle updateQuickbar message', async () => {
      const handler = (runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
      const sendResponse = jest.fn();

      const result = handler({ action: 'updateQuickbar' }, {}, sendResponse);

      expect(result).toBe(true); // Keep channel open

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    it('should ignore non-updateQuickbar messages', () => {
      const handler = (runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
      const sendResponse = jest.fn();

      const result = handler({ action: 'unknownAction' }, {}, sendResponse);

      expect(result).toBeUndefined();
      expect(sendResponse).not.toHaveBeenCalled();
    });
  });
});
