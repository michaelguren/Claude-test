/**
 * htmx-lite.js - A minimal AJAX utility for vanilla JS applications
 * Inspired by HTMX but tailored specifically for our needs with zero dependencies
 */

const htmxLite = (function () {
  // Private state
  const handlers = {};

  // Initialize the library
  function init() {
    // Set up event delegation for the entire document
    document.addEventListener("click", handleEvent);
    document.addEventListener("submit", handleEvent);
    document.addEventListener("change", handleEvent);

    // Set up history handling for browser back button
    window.addEventListener("popstate", handlePopState);

    console.log("htmx-lite initialized");
  }

  // Register a handler function that can be triggered by data-x-* attributes
  function register(name, handlerFn) {
    handlers[name] = handlerFn;
    return htmxLite; // For chaining
  }

  // Main event handler that delegates to registered functions
  function handleEvent(event) {
    // Find the element with a data-x-* attribute matching the event type
    const prefix = `data-x-${event.type}`;
    let target = event.target;

    while (target && target !== document) {
      if (target.hasAttribute(prefix)) {
        const handlerName = target.getAttribute(prefix);

        if (handlers[handlerName]) {
          // Extract data from element
          const targetSelector = target.getAttribute("data-x-target");
          const value = target.getAttribute("data-x-value");
          const id = target.closest("[data-id]")?.getAttribute("data-id");

          // Default behavior prevention for forms and links
          if (
            event.type === "submit" ||
            (event.type === "click" && target.tagName === "A")
          ) {
            event.preventDefault();
          }

          // Add loading state to trigger element
          target.classList.add("x-loading");

          // Execute the handler and handle the response
          try {
            const result = handlers[handlerName](event, {
              element: target,
              target: targetSelector
                ? document.querySelector(targetSelector)
                : null,
              value: value,
              id: id,
            });

            // If the handler returns a promise, handle async behavior
            if (result instanceof Promise) {
              result
                .then(() => {
                  target.classList.remove("x-loading");
                })
                .catch((error) => {
                  console.error("Handler error:", error);
                  target.classList.remove("x-loading");
                });
            } else {
              // Synchronous handler
              target.classList.remove("x-loading");
            }
          } catch (error) {
            console.error("Error executing handler:", error);
            target.classList.remove("x-loading");
          }

          return;
        }
      }

      // Move up the DOM tree
      target = target.parentElement;
    }
  }

  // Handle browser back button
  function handlePopState(event) {
    if (event.state && event.state.htmxLite) {
      // Restore the previous state
      const targetId = event.state.htmxLite.targetId;
      const content = event.state.htmxLite.content;

      const target = document.getElementById(targetId);
      if (target) {
        target.innerHTML = content;
      }
    }
  }

  // Push current state to browser history
  function pushState(targetElement, title = document.title) {
    const targetId = targetElement.id;
    if (!targetId) return; // We need an ID to restore state

    const state = {
      htmxLite: {
        targetId: targetId,
        content: targetElement.innerHTML,
      },
    };

    window.history.pushState(state, title, window.location.href);
  }

  // Simple HTML template function
  function template(templateId, data) {
    const templateElement = document.getElementById(templateId);
    if (!templateElement) return "";

    let html = templateElement.innerHTML;

    // Replace {{var}} with data values
    for (const key in data) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      html = html.replace(regex, data[key]);
    }

    return html;
  }

  // Public API
  return {
    init,
    register,
    pushState,
    template,
  };
})();

// Initialize the library when the DOM is ready
document.addEventListener("DOMContentLoaded", htmxLite.init);
