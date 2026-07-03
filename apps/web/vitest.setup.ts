import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// Without vitest globals, Testing Library's auto-cleanup never registers —
// do it explicitly so renders don't leak across tests.
afterEach(() => {
  cleanup();
});

// findBy/waitFor default to 1s, which flakes when the three workspace test
// suites run in parallel on one machine. Give async queries generous headroom.
configure({ asyncUtilTimeout: 10_000 });
