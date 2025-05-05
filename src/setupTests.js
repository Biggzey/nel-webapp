// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';

// Mock import.meta.env
global.import = {
  meta: {
    env: {
      VITE_OPENAI_MODEL: 'gpt-3.5-turbo',
      VITE_OPENAI_API_KEY: 'test-key',
      MODE: 'test',
      DEV: true,
      PROD: false,
      SSR: false
    }
  }
};

// Mock TextEncoder/TextDecoder
global.TextEncoder = class {
  encode(str) {
    return new Uint8Array([...str].map(c => c.charCodeAt(0)));
  }
};

global.TextDecoder = class {
  decode(arr) {
    return String.fromCharCode(...arr);
  }
};

// Mock setImmediate
global.setImmediate = (fn) => setTimeout(fn, 0);

// Mock IntersectionObserver
class IntersectionObserver {
  constructor() {}
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
}
window.IntersectionObserver = IntersectionObserver;

// Mock ResizeObserver
class ResizeObserver {
  constructor() {}
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
}
window.ResizeObserver = ResizeObserver;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
}); 