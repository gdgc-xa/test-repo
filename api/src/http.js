/* ============================================================
   http.js — the small pieces every request passes through:
   security headers, GET-only, CORS, a per-IP rate limit and a
   short in-memory cache. No extra packages.
   ============================================================ */

/* ---------- Security headers ---------- */

export function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Strict-Transport-Security': 'max-age=31536000',
  });
  next();
}

/* ---------- Read-only: GET, HEAD and OPTIONS only ---------- */

export function readOnlyMethods(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  res.set('Allow', 'GET, HEAD, OPTIONS');
  res.status(405).json({ error: 'This API is read-only. Only GET requests are allowed.' });
}

/* ---------- CORS ----------
   ALLOWED_ORIGINS is a comma-separated list. Each entry is either an
   exact origin or uses one of two wildcards:
     https://gdgc-xa.github.io     exactly that site
     http://localhost:*            any port (for development)
     https://*.example.pages.dev   any one subdomain
   A browser on any other origin gets no Access-Control-Allow-Origin
   header, so it cannot read the response. */

export function originMatcher(patterns) {
  const rules = patterns.map(toRegex);
  return (origin) => Boolean(origin) && rules.some(re => re.test(String(origin).toLowerCase()));
}

function toRegex(pattern) {
  const escaped = pattern.trim().toLowerCase().replace(/\/+$/, '')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const source = escaped
    .replace(/:\\\*$/, ':\\d{1,5}')                          // :*  → any port
    .replace(/^(https?:\/\/)\\\*\\\./, '$1[a-z0-9-]+\\.');    // //*. → one subdomain
  return new RegExp(`^${source}$`);
}

export function cors(isAllowed) {
  return (req, res, next) => {
    res.vary('Origin');
    const origin = req.get('Origin');
    if (origin && isAllowed(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.set('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  };
}

/* ---------- Rate limit ----------
   A fixed one-minute window per IP. Generous on purpose: a whole
   campus on one Wi-Fi network can share a single public IP. */

export function rateLimit({ perMinute, now = Date.now }) {
  let windowStart = now();
  let hits = new Map();
  return (req, res, next) => {
    const t = now();
    if (t - windowStart >= 60000) {
      windowStart = t;
      hits = new Map();
    }
    const count = (hits.get(req.ip) || 0) + 1;
    hits.set(req.ip, count);
    if (count > perMinute) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((windowStart + 60000 - t) / 1000))));
      return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
    }
    next();
  };
}

/* ---------- Cache ----------
   Keeps each answer for a few seconds, so hundreds of students
   refreshing at once cost the database one query, not hundreds.
   While a query is running, everyone asking for the same thing waits
   for that one query. Failures are never cached. */

export function createCache({ seconds, maxEntries = 200, now = Date.now }) {
  const entries = new Map();   // key → { expires, promise }
  return {
    get(key, load) {
      const t = now();
      const hit = entries.get(key);
      if (hit && hit.expires > t) return hit.promise;

      const promise = Promise.resolve().then(load);
      entries.set(key, { expires: t + seconds * 1000, promise });
      promise.catch(() => {
        if (entries.get(key)?.promise === promise) entries.delete(key);
      });
      // Oldest out first once the cache is full (many filter combinations).
      if (entries.size > maxEntries) entries.delete(entries.keys().next().value);
      return promise;
    },
    clear() { entries.clear(); },
  };
}
