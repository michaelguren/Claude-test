/**
 * Mock factories for testing
 * 
 * This module provides reusable factories for creating mock objects used in tests.
 * Centralizing mock creation improves test consistency and maintainability.
 */

/**
 * Create a mock DOM element
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @returns {Object} Mock element
 */
function createElementMock(tag = 'div', attributes = {}) {
  const element = {
    tagName: tag.toUpperCase(),
    attributes: {...attributes},
    dataset: {},
    children: [],
    childNodes: [],
    innerHTML: '',
    value: '',
    checked: false,
    style: {},
    
    // Mock classList implementation
    classList: {
      list: [],
      add: function(cls) { 
        if (!this.list.includes(cls)) this.list.push(cls);
      },
      remove: function(cls) { 
        const index = this.list.indexOf(cls);
        if (index !== -1) this.list.splice(index, 1);
      },
      contains: function(cls) { 
        return this.list.includes(cls);
      },
      toggle: function(cls) {
        if (this.contains(cls)) {
          this.remove(cls);
          return false;
        } else {
          this.add(cls);
          return true;
        }
      }
    },
    
    // DOM manipulation
    setAttribute: function(name, value) { 
      this.attributes[name] = value;
    },
    getAttribute: function(name) { 
      return this.attributes[name];
    },
    hasAttribute: function(name) { 
      return Object.prototype.hasOwnProperty.call(this.attributes, name);
    },
    removeAttribute: function(name) { 
      delete this.attributes[name];
    },
    
    // Event handling
    addEventListener: function(event, handler) {
      this[`on${event}`] = handler;
    },
    removeEventListener: function(event) {
      delete this[`on${event}`];
    },
    
    // Node operations
    appendChild: function(child) {
      this.children.push(child);
      this.childNodes.push(child);
      if (child) {
        child.parentElement = this;
      }
      return child;
    },
    removeChild: function(child) {
      const index = this.children.indexOf(child);
      if (index !== -1) {
        this.children.splice(index, 1);
        this.childNodes.splice(index, 1);
        if (child) {
          child.parentElement = null;
        }
      }
      return child;
    },
    
    // Element traversal
    closest: function(selector) {
      // Very simplified implementation
      if (selector === '[data-id]' && this.hasAttribute('data-id')) {
        return this;
      }
      return null;
    },
    
    // User interactions
    click: function() {
      if (this.onclick) this.onclick();
    },
    focus: function() {},
    blur: function() {}
  };
  
  // Set initial attributes
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  
  return element;
}

/**
 * Create a mock document object
 * @returns {Object} Mock document
 */
function createDocumentMock() {
  const document = {
    body: createElementMock('body'),
    head: createElementMock('head'),
    documentElement: createElementMock('html'),
    
    // Element cache for getElementById
    _elements: {},
    
    // DOM methods
    createElement: function(tag) {
      return createElementMock(tag);
    },
    getElementById: function(id) {
      if (!this._elements[id]) {
        const element = createElementMock('div', { id });
        this._elements[id] = element;
      }
      return this._elements[id];
    },
    querySelector: function(selector) {
      // Very simplified implementation
      if (selector.startsWith('#')) {
        return this.getElementById(selector.substring(1));
      }
      return null;
    },
    querySelectorAll: function() {
      return [];
    },
    
    // Event handling
    addEventListener: function(event, handler) {
      this[`on${event}`] = handler;
    },
    removeEventListener: function(event) {
      delete this[`on${event}`];
    },
    
    // Event creation
    createEvent: function() {
      return {
        initEvent: function() {}
      };
    }
  };
  
  return document;
}

/**
 * Create a mock window object
 * @returns {Object} Mock window
 */
function createWindowMock() {
  return {
    document: createDocumentMock(),
    location: { href: 'http://localhost/test' },
    history: {
      state: null,
      pushState: function(state, title, url) {
        this.state = state;
      }
    },
    localStorage: createStorageMock(),
    sessionStorage: createStorageMock(),
    addEventListener: function(event, handler) {
      this[`on${event}`] = handler;
    },
    removeEventListener: function(event) {
      delete this[`on${event}`];
    }
  };
}

/**
 * Create a mock storage object (localStorage/sessionStorage)
 * @returns {Object} Mock storage
 */
function createStorageMock() {
  const store = {};
  return {
    getItem: function(key) {
      return store[key] || null;
    },
    setItem: function(key, value) {
      store[key] = String(value);
    },
    removeItem: function(key) {
      delete store[key];
    },
    clear: function() {
      Object.keys(store).forEach(key => delete store[key]);
    },
    key: function(index) {
      return Object.keys(store)[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    },
    // For testing purposes
    _getStore: function() {
      return {...store};
    }
  };
}

/**
 * Set up a complete mock browser environment
 * @returns {Object} Mock environment with document and window
 */
function createMockBrowserEnvironment() {
  const window = createWindowMock();
  const document = window.document;
  
  return { window, document };
}

/**
 * Clean up a mock browser environment
 */
function cleanupMockBrowserEnvironment() {
  if (typeof global !== 'undefined') {
    delete global.window;
    delete global.document;
  }
}

module.exports = {
  createElementMock,
  createDocumentMock,
  createWindowMock,
  createStorageMock,
  createMockBrowserEnvironment,
  cleanupMockBrowserEnvironment
};
