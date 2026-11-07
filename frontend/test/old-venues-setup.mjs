// Import this FIRST in a test file to run it against the OLD venue map
// (three campus venues, icons only where a fixture exists). It does what
// adding ?venues=old to the page address does.
globalThis.location = { search: '?venues=old' };
