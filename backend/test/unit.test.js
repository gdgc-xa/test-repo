/* Unit tests — no database needed.   npm test */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp, isDate, isShortText } from '../src/app.js';
import { originMatcher, createCache } from '../src/http.js';
import { hhmm, toSync } from '../src/store.js';
import { manilaDate, manilaDateTime } from '../src/time.js';

const quiet = { error() {}, log() {} };

const baseConfig = {
  allowedOrigins: ['https://gdgc-xa.github.io', 'http://localhost:*'],
  cacheSeconds: 10,
  rateLimitPerMinute: 1000,
  staleSeconds: 180,
  trustProxyHops: 1,
};

/** A store that records what was asked and can be told to fail. */
function fakeStore({ fail = false } = {}) {
  const calls = [];
  const answer = (name, body) => async (...args) => {
    calls.push([name, ...args]);
    if (fail) throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    return body;
  };
  return {
    calls,
    today: () => '2026-10-12',
    health: answer('health', undefined),
    snapshot: answer('snapshot', { matches: [], events: [] }),
    schedule: answer('schedule', { matches: [], events: [] }),
    venuesNow: answer('venuesNow', { venues: [] }),
    status: answer('status', { sync: {} }),
    meta: answer('meta', {}),
    match: answer('match', null),
    event: answer('event', null),
  };
}

async function serve(app) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    url: (path) => `http://127.0.0.1:${server.address().port}${path}`,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

async function withApp({ store = fakeStore(), config = {} } = {}, fn) {
  const app = createApp({ store, config: { ...baseConfig, ...config }, log: quiet });
  const s = await serve(app);
  try { await fn(s, store); } finally { await s.close(); }
}

/* ---------- Helpers ---------- */

test('Manila time is UTC+8, whatever the machine’s time zone', () => {
  const d = new Date('2026-10-12T16:30:05Z');
  assert.equal(manilaDate(d), '2026-10-13');
  assert.equal(manilaDateTime(d), '2026-10-13 00:30:05');
});

test('TIME values lose their seconds', () => {
  assert.equal(hhmm('08:00:00'), '08:00');
  assert.equal(hhmm('23:59:59'), '23:59');
  assert.equal(hhmm(null), null);
});

test('sync is stale after STALE_SECONDS, or when it never ran', () => {
  assert.equal(toSync({ seconds_since_check: 10 }, 180).stale, false);
  assert.equal(toSync({ seconds_since_check: 181 }, 180).stale, true);
  assert.equal(toSync({ seconds_since_check: '42' }, 180).seconds_since_check, 42);
  assert.equal(toSync({ seconds_since_check: null }, 180).stale, true);
  assert.equal(toSync(undefined, 180).stale, true);
});

test('dates must be real days written YYYY-MM-DD', () => {
  assert.equal(isDate('2026-10-12'), true);
  assert.equal(isDate('2028-02-29'), true);
  assert.equal(isDate('2026-02-30'), false);
  assert.equal(isDate('2026-13-01'), false);
  assert.equal(isDate('2026-1-2'), false);
  assert.equal(isDate('12-10-2026'), false);
  assert.equal(isDate(['2026-10-12']), false);
});

test('filters must be short single strings', () => {
  assert.equal(isShortText('Soccer', 50), true);
  assert.equal(isShortText('x'.repeat(51), 50), false);
  assert.equal(isShortText('   ', 50), false);
  assert.equal(isShortText(['a', 'b'], 50), false);
  assert.equal(isShortText('a\u0000b', 50), false);
});

test('origin wildcards match only what they say', () => {
  const ok = originMatcher(['https://gdgc-xa.github.io', 'http://localhost:*', 'https://*.compass.pages.dev']);
  assert.equal(ok('https://gdgc-xa.github.io'), true);
  assert.equal(ok('HTTPS://GDGC-XA.GITHUB.IO'), true);
  assert.equal(ok('http://localhost:8765'), true);
  assert.equal(ok('https://abc123.compass.pages.dev'), true);

  assert.equal(ok('https://gdgc-xa.github.io.evil.example'), false);
  assert.equal(ok('http://gdgc-xa.github.io'), false);
  assert.equal(ok('http://localhost.evil.example:80'), false);
  assert.equal(ok('https://a.b.compass.pages.dev'), false);
  assert.equal(ok('https://compass.pages.dev'), false);
  assert.equal(ok('null'), false);
  assert.equal(ok(undefined), false);
});

test('the cache answers repeats from memory and forgets failures', async () => {
  let t = 0;
  const cache = createCache({ seconds: 10, now: () => t });
  let loads = 0;
  const load = async () => { loads += 1; return loads; };

  assert.equal(await cache.get('k', load), 1);
  assert.equal(await cache.get('k', load), 1);
  t = 10001;
  assert.equal(await cache.get('k', load), 2);

  await assert.rejects(cache.get('bad', async () => { throw new Error('down'); }));
  assert.equal(await cache.get('bad', async () => 'back'), 'back');
});

test('the cache sends one query for many waiting requests', async () => {
  const cache = createCache({ seconds: 10 });
  let loads = 0;
  const slow = () => new Promise(resolve => setTimeout(() => resolve(++loads), 20));
  const results = await Promise.all(Array.from({ length: 50 }, () => cache.get('k', slow)));
  assert.equal(loads, 1);
  assert.ok(results.every(r => r === 1));
});

/* ---------- Over HTTP ---------- */

test('an allowed origin may read; any other origin may not', async () => {
  await withApp({}, async ({ url }) => {
    const allowed = await fetch(url('/v1/snapshot'), { headers: { Origin: 'https://gdgc-xa.github.io' } });
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://gdgc-xa.github.io');

    const dev = await fetch(url('/v1/snapshot'), { headers: { Origin: 'http://localhost:8765' } });
    assert.equal(dev.headers.get('access-control-allow-origin'), 'http://localhost:8765');

    const other = await fetch(url('/v1/snapshot'), { headers: { Origin: 'https://evil.example' } });
    assert.equal(other.headers.get('access-control-allow-origin'), null);
    assert.match(other.headers.get('vary') || '', /Origin/);
  });
});

test('only GET is allowed', async () => {
  await withApp({}, async ({ url }) => {
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      const res = await fetch(url('/v1/snapshot'), { method });
      assert.equal(res.status, 405, method);
      assert.ok((await res.json()).error);
    }
  });
});

test('security headers are set and Express is not announced', async () => {
  await withApp({}, async ({ url }) => {
    const res = await fetch(url('/v1/snapshot'));
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('x-powered-by'), null);
  });
});

test('responses are cached for CACHE_SECONDS and say so', async () => {
  await withApp({}, async ({ url }, store) => {
    const a = await fetch(url('/v1/snapshot'));
    await fetch(url('/v1/snapshot'));
    assert.equal(a.headers.get('cache-control'), 'public, max-age=10');
    assert.equal(store.calls.filter(c => c[0] === 'snapshot').length, 1);
  });
});

test('schedule: bad input gets a 400 with a short JSON error', async () => {
  await withApp({}, async ({ url }, store) => {
    for (const q of ['?date=2026-13-01', '?date=2026-02-30', '?date=12-10-2026', '?date=today',
                     '?sport=a&sport=b', `?sport=${'x'.repeat(51)}`, `?college=${'x'.repeat(21)}`]) {
      const res = await fetch(url(`/v1/schedule${q}`));
      assert.equal(res.status, 400, q);
      assert.ok((await res.json()).error, q);
    }
    assert.equal(store.calls.length, 0);
  });
});

test('schedule: defaults to today in Manila and passes filters through', async () => {
  await withApp({}, async ({ url }, store) => {
    await fetch(url('/v1/schedule'));
    await fetch(url('/v1/schedule?date=2026-10-13&sport=Soccer&college=CCS&venue=Soccer%20Field'));
    assert.deepEqual(store.calls[0], ['schedule', { date: '2026-10-12' }]);
    assert.deepEqual(store.calls[1], ['schedule', { date: '2026-10-13', sport: 'Soccer', college: 'CCS', venue: 'Soccer Field' }]);
  });
});

test('a database failure gives 503 JSON and the API keeps answering', async () => {
  await withApp({ store: fakeStore({ fail: true }) }, async ({ url }) => {
    for (const path of ['/v1/snapshot', '/v1/schedule', '/v1/venues/now', '/v1/status']) {
      const res = await fetch(url(path));
      assert.equal(res.status, 503, path);
      assert.equal(res.headers.get('cache-control'), 'no-store', path);
      assert.ok((await res.json()).error, path);
    }
    const health = await fetch(url('/health'));
    assert.equal(health.status, 503);
    assert.deepEqual(await health.json(), { ok: false, error: 'Database unavailable.' });
  });
});

test('health says ok when the database answers', async () => {
  await withApp({}, async ({ url }) => {
    const res = await fetch(url('/health'));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  });
});

test('unknown paths and missing records are 404 JSON', async () => {
  await withApp({}, async ({ url }) => {
    assert.equal((await fetch(url('/v1/nothing'))).status, 404);
    assert.equal((await fetch(url('/v1/matches/NOPE-001'))).status, 404);
  });
});

test('the rate limit answers 429 past the per-minute allowance', async () => {
  await withApp({ config: { rateLimitPerMinute: 3 } }, async ({ url }) => {
    const codes = [];
    for (let i = 0; i < 5; i++) codes.push((await fetch(url('/v1/snapshot'))).status);
    assert.deepEqual(codes, [200, 200, 200, 429, 429]);
  });
});
