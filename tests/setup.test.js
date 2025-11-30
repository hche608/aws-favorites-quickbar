/**
 * Test to verify test infrastructure is working correctly
 */

const { mockChromeStorage, mockLocalStorage, setupChromeMocks } = require('./helpers/mocks');
const { createSampleService, createSampleServices } = require('./helpers/fixtures');
const { setupDOM, teardownDOM, createMockElement } = require('./helpers/dom-helpers');

describe('Test Infrastructure', () => {
  describe('Custom Matchers', () => {
    it('should have toBeValidServiceElement matcher', () => {
      const element = document.createElement('div');
      element.setAttribute('data-service-id', 's3');
      const anchor = document.createElement('a');
      element.appendChild(anchor);
      
      expect(element).toBeValidServiceElement();
    });

    it('should have toContainServiceWithId matcher', () => {
      const services = createSampleServices(3);
      expect(services).toContainServiceWithId('s3');
    });

    it('should have toHaveNoDuplicateIds matcher', () => {
      const services = createSampleServices(3);
      expect(services).toHaveNoDuplicateIds();
    });
  });

  describe('Mocks', () => {
    it('should create chrome.storage mock', () => {
      const storage = mockChromeStorage();
      expect(storage.sync.get).toBeDefined();
      expect(storage.sync.set).toBeDefined();
      expect(storage.local.get).toBeDefined();
      expect(storage.local.set).toBeDefined();
    });

    it('should create localStorage mock', () => {
      const localStorage = mockLocalStorage();
      expect(localStorage.getItem).toBeDefined();
      expect(localStorage.setItem).toBeDefined();
    });
  });

  describe('Fixtures', () => {
    it('should create sample service', () => {
      const service = createSampleService();
      expect(service).toHaveProperty('id');
      expect(service).toHaveProperty('name');
      expect(service).toHaveProperty('iconUrl');
      expect(service).toHaveProperty('consoleUrl');
    });

    it('should create multiple sample services', () => {
      const services = createSampleServices(5);
      expect(services).toHaveLength(5);
    });
  });

  describe('DOM Helpers', () => {
    afterEach(() => {
      teardownDOM();
    });

    it('should setup DOM from HTML string', () => {
      const container = setupDOM('<div id="test">Hello</div>');
      expect(container).toBeDefined();
      expect(document.getElementById('test')).toBeTruthy();
    });

    it('should create mock element', () => {
      const element = createMockElement('div', { id: 'test', className: 'test-class' }, ['Hello']);
      expect(element.tagName).toBe('DIV');
      expect(element.id).toBe('test');
      expect(element.className).toBe('test-class');
      expect(element.textContent).toBe('Hello');
    });

    it('should teardown DOM', () => {
      setupDOM('<div id="test">Hello</div>');
      teardownDOM();
      expect(document.body.innerHTML).toBe('');
    });
  });
});
