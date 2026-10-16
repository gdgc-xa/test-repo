/* ============================================================
   setup-test-db.js — a throwaway MySQL for the database tests.

   Starts MySQL 8.4 in Docker on 127.0.0.1:3307 (never the real
   server), loads the real schema, creates the read-only campus_api
   user the way 02-users.sh does, and loads the sample data through
   the real sync_snapshot procedure — the same way the server was
   tested. Expect "ok 12 3 8" (12 matches, 3 events, 8 places).

   Needs CC_DB_DIR: the path to the campus-compass-db folder (ask the
   database lead; it is not part of this repo).
     CC_DB_DIR=/path/to/campus-compass-db npm run test:db
   Remove the container afterwards with  npm run test:db:stop
   ============================================================ */

import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import mysql from 'mysql2/promise';
import { TEST_DB } from './test-db.js';

const dir = process.env.CC_DB_DIR;
if (!dir) {
  console.error('Set CC_DB_DIR to the campus-compass-db folder (it holds mysql/init/01-schema.sql).');
  process.exit(1);
}
const schema = readFileSync(join(dir, 'mysql', 'init', '01-schema.sql'));
const payload = readFileSync(join(dir, 'mysql', 'test', 'sample-payload.json'), 'utf8');

console.log(`Starting ${TEST_DB.container} (MySQL 8.4) on 127.0.0.1:${TEST_DB.port} …`);
spawnSync('docker', ['rm', '-f', TEST_DB.container], { stdio: 'ignore' });
execFileSync('docker', [
  'run', '-d', '--name', TEST_DB.container,
  '-e', `MYSQL_ROOT_PASSWORD=${TEST_DB.rootPassword}`,
  '-e', 'TZ=Asia/Manila',
  '-p', `127.0.0.1:${TEST_DB.port}:3306`,
  'mysql:8.4',
  '--default-time-zone=+08:00',
  '--character-set-server=utf8mb4',
  '--collation-server=utf8mb4_0900_ai_ci',
  '--performance-schema=OFF',
  '--skip-name-resolve',
], { stdio: ['ignore', 'ignore', 'inherit'] });

// The image sets itself up first with networking off, so wait until
// root can connect over TCP.
let root;
for (let i = 0; i < 120 && !root; i++) {
  try {
    root = await mysql.createConnection({
      host: TEST_DB.host, port: TEST_DB.port, user: 'root', password: TEST_DB.rootPassword,
    });
  } catch {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
if (!root) {
  console.error('MySQL did not start within 2 minutes. Check: docker logs ' + TEST_DB.container);
  process.exit(1);
}

// The schema uses DELIMITER, which only the mysql command-line client
// understands, so it is loaded with the client inside the container.
execFileSync('docker', ['exec', '-i', '-e', `MYSQL_PWD=${TEST_DB.rootPassword}`, TEST_DB.container, 'mysql', '-uroot'],
  { input: schema, stdio: ['pipe', 'ignore', 'inherit'] });

await root.query("CREATE USER IF NOT EXISTS 'campus_api'@'%' IDENTIFIED BY ?", [TEST_DB.apiPassword]);
await root.query("GRANT SELECT ON campus_compass.* TO 'campus_api'@'%'");
await root.query('USE campus_compass');
await root.query('CALL sync_snapshot(?, 0)', [payload]);

const [[log]] = await root.query(
  'SELECT result, matches_count, events_count, places_count FROM sync_log ORDER BY id DESC LIMIT 1');
await root.end();

const line = `${log.result} ${log.matches_count} ${log.events_count} ${log.places_count}`;
console.log(`sync_log: ${line}`);
if (line !== 'ok 12 3 8') {
  console.error('Expected "ok 12 3 8". The sample payload or the schema has changed.');
  process.exit(1);
}
