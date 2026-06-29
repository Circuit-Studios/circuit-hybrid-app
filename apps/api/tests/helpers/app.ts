import { createApp } from '../../src/server/app.js';

/** Single Express app instance reused across integration tests. */
export const app = createApp();
