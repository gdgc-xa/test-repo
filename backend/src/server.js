/* ============================================================
   server.js — starts the API.
     node src/server.js            (settings from the environment)
     npm run dev                   (settings from .env, restarts on save)
   ============================================================ */

import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { createStore } from './store.js';
import { createApp } from './app.js';

const config = loadConfig();
const pool = createPool(config.db);
const store = createStore(pool, { staleSeconds: config.staleSeconds });
const app = createApp({ store, config });

const server = app.listen(config.port, () => {
  console.log(`[api] listening on port ${config.port}; allowed origins: ${config.allowedOrigins.join(', ') || '(none)'}`);
});
server.headersTimeout = 10000;
server.requestTimeout = 15000;

// A database outage must never stop the API: log it and carry on.
process.on('unhandledRejection', (err) => {
  console.error(`[api] unhandled rejection: ${err?.code || ''} ${String(err?.message || err).slice(0, 200)}`);
});

// Docker stops containers with SIGTERM: finish open requests, then close.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close(() => pool.end().finally(() => process.exit(0)));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
