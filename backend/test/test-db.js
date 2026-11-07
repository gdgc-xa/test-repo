/* Where the throwaway test database lives. Test-only passwords:
   this MySQL listens on 127.0.0.1 only and holds sample data. */

export const TEST_DB = {
  container: 'campus-api-test-db',
  host: '127.0.0.1',
  port: Number(process.env.TEST_DB_PORT || 3307),
  rootPassword: 'test-root-only',
  apiPassword: 'test-api-only',
};
