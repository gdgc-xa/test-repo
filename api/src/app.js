/* ============================================================
   app.js — the routes. All GET, all read-only.

     GET /health             {ok:true} when MySQL answers, else 503
     GET /v1/snapshot        everything, in the api.gs shape, + sync
     GET /v1/schedule        one day (?date=YYYY-MM-DD, default today
                             in Manila); filters ?sport= ?college= ?venue=
     GET /v1/venues/now      per venue: Ongoing today + next Upcoming today
     GET /v1/status          sync freshness ("Updated X min ago")
     GET /v1/meta            colleges, sports, venues
     GET /v1/matches/:id     one match
     GET /v1/events/:id      one event

   createApp() takes the store (store.js) and the settings, so tests
   can pass a store with a fake clock, or one whose database is down.
   ============================================================ */

import express from 'express';
import { securityHeaders, readOnlyMethods, cors, originMatcher, rateLimit, createCache } from './http.js';

const LIMITS = { sport: 50, college: 20, venue: 100, id: 40 };

export function createApp({ store, config, log = console }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxyHops ?? 1);

  const cache = createCache({ seconds: config.cacheSeconds ?? 10 });
  const publicCache = `public, max-age=${config.cacheSeconds ?? 10}`;

  app.use(securityHeaders);
  app.use(readOnlyMethods);
  app.use(cors(originMatcher(config.allowedOrigins || [])));
  app.use(rateLimit({ perMinute: config.rateLimitPerMinute ?? 600 }));

  /** Answer from the cache, or ask the store and remember it. */
  const send = (res, key, load) =>
    cache.get(key, load).then(body => {
      if (body === null) return notFound(res);
      res.set('Cache-Control', publicCache).json(body);
    });

  app.get('/health', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      await store.health();
      res.json({ ok: true });
    } catch (err) {
      logDbError(log, req, err);
      res.status(503).json({ ok: false, error: 'Database unavailable.' });
    }
  });

  app.get('/v1/snapshot', (req, res) => send(res, 'snapshot', () => store.snapshot()));

  app.get('/v1/schedule', (req, res) => {
    const date = req.query.date === undefined ? store.today() : req.query.date;
    if (!isDate(date)) return badRequest(res, 'date must be a real date written YYYY-MM-DD.');

    const filters = {};
    for (const name of ['sport', 'college', 'venue']) {
      const value = req.query[name];
      if (value === undefined || value === '') continue;
      if (!isShortText(value, LIMITS[name])) {
        return badRequest(res, `${name} must be plain text of at most ${LIMITS[name]} characters.`);
      }
      filters[name] = value.trim();
    }

    const key = `schedule ${JSON.stringify([date, filters.sport, filters.college, filters.venue])}`;
    return send(res, key, () => store.schedule({ date, ...filters }));
  });

  app.get('/v1/venues/now', (req, res) => send(res, `venues-now ${store.today()}`, () => store.venuesNow()));

  app.get('/v1/status', (req, res) => send(res, 'status', () => store.status()));

  app.get('/v1/meta', (req, res) => send(res, 'meta', () => store.meta()));

  app.get('/v1/matches/:id', (req, res) => {
    const { id } = req.params;
    if (!isShortText(id, LIMITS.id)) return badRequest(res, 'Not a valid match id.');
    return send(res, `match ${id}`, () => store.match(id));
  });

  app.get('/v1/events/:id', (req, res) => {
    const { id } = req.params;
    if (!isShortText(id, LIMITS.id)) return badRequest(res, 'Not a valid event id.');
    return send(res, `event ${id}`, () => store.event(id));
  });

  app.use((req, res) => notFound(res));

  // Anything that went wrong while reading: the database is down,
  // slow or refusing. Answer 503 in JSON and keep running.
  // (Express 5 passes rejected promises from routes here.)
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    logDbError(log, req, err);
    res.set('Cache-Control', 'no-store');
    res.status(503).json({ error: 'Data is unavailable right now. Please try again shortly.' });
  });

  return app;
}

/* ---------- Helpers ---------- */

/** "2026-10-12", and a day that exists. */
export function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** A single string (not a repeated parameter), short, no control characters. */
export function isShortText(value, max) {
  if (typeof value !== 'string') return false;
  const s = value.trim();
  return s.length > 0 && s.length <= max && !/[\u0000-\u001f\u007f]/.test(s);
}

function badRequest(res, message) {
  res.set('Cache-Control', 'no-store');
  return res.status(400).json({ error: message });
}

function notFound(res) {
  res.set('Cache-Control', 'no-store');
  return res.status(404).json({ error: 'Not found.' });
}

/** One line per failure: the route and the error code, never data or passwords. */
function logDbError(log, req, err) {
  const code = err?.code || err?.name || 'Error';
  const message = String(err?.message || '').slice(0, 200);
  log.error(`[api] ${new Date().toISOString()} ${req.method} ${req.path} failed: ${code} ${message}`);
}
