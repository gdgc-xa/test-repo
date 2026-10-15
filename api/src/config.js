/* ============================================================
   config.js — every setting comes from an environment variable
   (the .env file, in Docker). Nothing secret lives in the code.
   See .env.example for what each one means.
   ============================================================ */

const REQUIRED = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];

export function loadConfig(env = process.env) {
  const missing = REQUIRED.filter(name => !env[name]);
  if (missing.length) {
    throw new Error(`Missing settings: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`);
  }

  return {
    port: int(env.PORT, 3000),
    db: {
      host: env.DB_HOST,
      port: int(env.DB_PORT, 3306),
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
    },
    // "https://gdgc-xa.github.io,http://localhost:*"
    allowedOrigins: list(env.ALLOWED_ORIGINS),
    cacheSeconds: int(env.CACHE_SECONDS, 10),
    rateLimitPerMinute: int(env.RATE_LIMIT_PER_MINUTE, 600),
    staleSeconds: int(env.STALE_SECONDS, 180),
    // How many proxies sit in front of the API (Traefik = 1). Needed to
    // read the visitor's real IP for the rate limit.
    trustProxyHops: int(env.TRUST_PROXY_HOPS, 1),
  };
}

function int(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function list(value) {
  return String(value || '').split(',').map(s => s.trim()).filter(Boolean);
}
