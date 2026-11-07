// Loaded before the tests (npm test runs node --import ./test/database-path.js).
//
// The site's data lives in the top-level database/ folder, next to frontend/.
// On the web it is served at /database/ (by serve.js here, by the Pages
// workflow online), so the loaders in src/js/data import
// '../../../database/x.json'. On disk that path points at frontend/database/,
// which doesn't exist. This sends those imports to ../database/ instead.
import { registerHooks } from 'node:module';

const asWritten = new URL('../database/', import.meta.url).href;   // frontend/database/
const onDisk = new URL('../../database/', import.meta.url).href;   // database/

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL && /^\.\.?\//.test(specifier)) {
      const url = new URL(specifier, context.parentURL).href;
      if (url.startsWith(asWritten)) return nextResolve(onDisk + url.slice(asWritten.length), context);
    }
    return nextResolve(specifier, context);
  },
});
