// Polyfill to ensure window.fetch has a setter if the host environment/iframe only defines a getter
if (typeof window !== 'undefined' && window.fetch) {
  try {
    const originalFetch = window.fetch.bind(window);
    let currentFetch: typeof window.fetch = originalFetch;

    try {
      Object.defineProperty(window, 'fetch', {
        get() {
          return currentFetch;
        },
        set(newFetch) {
          currentFetch = newFetch;
        },
        configurable: true,
        enumerable: true,
      });
    } catch {
      try {
        if (window.Window && window.Window.prototype) {
          Object.defineProperty(window.Window.prototype, 'fetch', {
            get() {
              return currentFetch;
            },
            set(newFetch) {
              currentFetch = newFetch;
            },
            configurable: true,
            enumerable: true,
          });
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

export {};
