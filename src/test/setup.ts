import '@testing-library/jest-dom';

// Ensure crypto is polyfilled/available in test environment if needed
if (!globalThis.crypto) {
  // @ts-ignore
  const { webcrypto } = await import('node:crypto');
  // @ts-ignore
  globalThis.crypto = webcrypto;
}

// Polyfill window.matchMedia if needed
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
