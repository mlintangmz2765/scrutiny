import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Without vitest globals, Testing Library's auto-cleanup never registers —
// do it explicitly so renders don't leak across tests.
afterEach(() => {
  cleanup();
});
