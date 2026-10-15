/* ============================================================
   db.js — the MySQL connection pool.

   THE DATE/TIME TRAP: `dateStrings: true` makes MySQL's DATE,
   DATETIME and TIME columns arrive as plain text exactly as stored
   ("2026-10-12", "2026-10-12 08:00:00", "08:00:00"). Without it the
   driver turns them into JavaScript Dates in the container's time
   zone, and every time on the site moves by 8 hours.
   ============================================================ */

import mysql from 'mysql2/promise';

const QUERY_TIMEOUT_MS = 5000;

export function createPool(db) {
  return mysql.createPool({
    host: db.host,
    port: db.port,
    database: db.database,
    user: db.user,
    password: db.password,
    dateStrings: true,
    connectionLimit: 5,      // one CPU core: a few connections are plenty
    maxIdle: 5,
    idleTimeout: 60000,
    queueLimit: 100,         // past this, fail fast instead of piling up
    connectTimeout: 5000,
    enableKeepAlive: true,
  });
}

/** SELECT 1 — is the database answering? */
export async function ping(pool) {
  await pool.query({ sql: 'SELECT 1', timeout: QUERY_TIMEOUT_MS });
}

/**
 * readOnly(pool, fn) — run several SELECTs as one consistent read.
 *
 * The sync replaces every table in one transaction. Reading inside a
 * snapshot transaction means a request sees all-old or all-new data,
 * never matches from one sync and events from the next.
 * fn receives q(sql, params) → rows.
 */
export async function readOnly(pool, fn) {
  const conn = await pool.getConnection();
  const q = async (sql, params = []) => {
    const [rows] = await conn.query({ sql, timeout: QUERY_TIMEOUT_MS }, params);
    return rows;
  };
  try {
    await q('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    const result = await fn(q);
    await q('COMMIT');
    conn.release();
    return result;
  } catch (err) {
    // A failed or timed-out connection is not put back in the pool.
    conn.destroy();
    throw err;
  }
}
