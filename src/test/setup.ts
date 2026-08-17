import '@testing-library/jest-dom/vitest';
import { afterEach, vi, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';

// ── Polyfills para jsdom ───────────────────────────────────────────────────────
// matchMedia não existe em jsdom; vários libs (react-datepicker, transições) usam.
beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
  }
  // scrollTo não existe em jsdom
  if (!window.scrollTo) {
    window.scrollTo = vi.fn();
  }
  // getComputedStyle em jsdom não retorna CSS variables corretamente; noop ok.
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
