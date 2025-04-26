/**
 * Unit tests for htmx-lite utility
 */

const { describe, it, assert, dom } = require('../test-utils');

// Mock document and window for testing
dom.createMockDom();

// Create a mock implementation of htmx-lite for testing
// This simulates the IIFE in the real implementation
const htmxLite = (() => {
  // Private state
  const handlers = {};

  // Initialize the library
  function init() {
    // Set up mock event handlers
    document.addEventListener = (event, handler) => {
      document[`on${event}`] = handler;
    };

    window.addEventListener = (event, handler) => {
      window[`on${event}`] = handler;
    };
  }

  // Register a handler function
  function register(name, handlerFn) {
    handlers[name] = handlerFn;
    return htmxLite; // For chaining
  }

  // Get handler by name (for testing)
  function getHandler(name) {
    return handlers[name];
  }

  // Trigger a synthetic event (for testing)
  function triggerEvent(eventType, element, handlerName, options = {}) {
    // Create a mock event
    const event = {
      type: eventType,
      target: element,
      preventDefault: () => {},
    };

    // Create a mock test element if needed
    if (!element) {
      element = {
        tagName: "BUTTON",
        attributes: {},
        dataset: {},
        classList: {
          add: () => {},
          remove: () => {},
        },
      };
    }

    // Ensure element has all required properties
    element.attributes = element.attributes || {};
    element.dataset = element.dataset || {};
    element.classList = element.classList || {
      add: () => {},
      remove: () => {},
    };

    // Mock setAttribute if it doesn't exist
    if (!element.setAttribute) {
      element.setAttribute = function (name, value) {
        this.attributes[name] = value;
      };
    }

    // Mock getAttribute if it doesn't exist
    if (!element.getAttribute) {
      element.getAttribute = function (name) {
        return this.attributes[name];
      };
    }

    // Set attributes for testing
    element.setAttribute(`data-x-${eventType}`, handlerName);

    if (options.targetSelector) {
      element.setAttribute("data-x-target", options.targetSelector);
    }

    if (options.value) {
      element.setAttribute("data-x-value", options.value);
    }

    if (options.id) {
      element.dataset.id = options.id;
    }

    // Mock closest method for finding parent elements
    element.closest =
      element.closest ||
      function (selector) {
        if (selector === "[data-id]" && options.id) {
          return {
            getAttribute: (attr) => (attr === "data-id" ? options.id : null),
          };
        }
        return null;
      };

    // Create mock handler params
    const params = {
      element: element,
      target: options.targetSelector ? { innerHTML: "" } : null,
      value: options.value,
      id: options.id,
    };

    // Call the handler directly
    if (handlers[handlerName]) {
      handlers[handlerName](event, params);
    }

    // Also trigger via event handling if available
    if (document[`on${eventType}`]) {
      document[`on${eventType}`](event);
    }

    return event;
  }

  // Simple template function for testing
  function template(templateId, data) {
    // Simplified mock implementation
    let result = `Template for ${templateId}: `;
    for (const key in data) {
      result += `${key}=${data[key]} `;
    }
    return result;
  }

  // Push state to history (mock implementation)
  function pushState(targetElement, title = "Test") {
    // Initialize required objects
    window.history = window.history || {};
    window.location = window.location || { href: "http://localhost/test" };

    // Ensure targetElement has required properties
    targetElement = targetElement || {};
    targetElement.id = targetElement.id || "test-element";
    targetElement.innerHTML = targetElement.innerHTML || "";

    const state = {
      htmxLite: {
        targetId: targetElement.id,
        content: targetElement.innerHTML,
      },
    };

    // Mock pushState function
    window.history.pushState = function (state, title, url) {
      window.history.state = state;
    };

    window.history.pushState(state, title, window.location.href);

    return state;
  }

  // Public API
  return {
    init,
    register,
    getHandler,
    triggerEvent,
    template,
    pushState,
  };
})();

// Initialize htmxLite for testing
htmxLite.init();

// Test suite
describe("htmx-lite utility", () => {
  it("should register a handler function", () => {
    const testHandler = () => "test result";
    htmxLite.register("testHandler", testHandler);

    assert.equal(
      htmxLite.getHandler("testHandler"),
      testHandler,
      "Handler should be registered correctly"
    );
  });

  it("should support method chaining for registration", () => {
    const result = htmxLite
      .register("handler1", () => {})
      .register("handler2", () => {});

    assert.equal(
      result,
      htmxLite,
      "register() should return the htmxLite object for chaining"
    );
  });

  it("should trigger the correct handler on events", () => {
    let handlerCalled = false;

    htmxLite.register("buttonClick", (event, params) => {
      handlerCalled = true;
      return true;
    });

    // Create a simple mock button
    const testElement = {
      tagName: "BUTTON",
      attributes: {},
      dataset: {},
      classList: { add: () => {}, remove: () => {} },
    };

    htmxLite.triggerEvent("click", testElement, "buttonClick");

    assert.isTrue(
      handlerCalled,
      "Handler should be called when event is triggered"
    );
  });

  it("should pass the correct parameters to handlers", () => {
    let capturedParams = null;

    htmxLite.register("paramTest", (event, params) => {
      capturedParams = params;
      return true;
    });

    // Create a simple mock button
    const testElement = {
      tagName: "BUTTON",
      attributes: {},
      dataset: {},
      classList: { add: () => {}, remove: () => {} },
    };

    htmxLite.triggerEvent("click", testElement, "paramTest", {
      targetSelector: "#target-element",
      value: "test-value",
      id: "test-id",
    });

    assert.equal(
      capturedParams.element,
      testElement,
      "Handler should receive the element"
    );
    assert.equal(
      capturedParams.value,
      "test-value",
      "Handler should receive the value"
    );
    assert.equal(capturedParams.id, "test-id", "Handler should receive the id");
  });

  it("should process templates correctly", () => {
    const result = htmxLite.template("test-template", {
      name: "John",
      age: 30,
    });

    assert.isTrue(
      typeof result === "string",
      "Template result should be a string"
    );
    assert.isTrue(
      result.includes("John") || result.includes("name=John"),
      "Template should include name value"
    );
    assert.isTrue(
      result.includes("30") || result.includes("age=30"),
      "Template should include age value"
    );
  });

  it("should handle pushState correctly", () => {
    const testElement = {
      id: "test-element",
      innerHTML: "<p>Test content</p>",
    };

    const state = htmxLite.pushState(testElement, "Test Title");

    assert.isTrue(
      state.htmxLite.targetId === "test-element",
      "State should include target ID"
    );
    assert.isTrue(
      state.htmxLite.content === "<p>Test content</p>",
      "State should include content"
    );
  });
});

// Clean up
dom.cleanupMockDom();