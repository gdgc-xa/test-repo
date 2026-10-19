/* ============================================================
   lib/post-filter.js — which news posts are fit to show, and
   which are Facebook reels.
   Used by the Xavier Cup > News tab and by Discover's Latest
   Updates, so both always agree.

   A reel is a video. The feed can only give us a still picture
   for it, and sometimes gives none, or one Facebook later stops
   serving. A reel that cannot show a picture is left out; one
   that can is shown with a "Watch reel" button.

   Switches (data/xavier-cup.js > CUP_NEWS):
     hideReelsWithoutPhoto  true  = leave out reels with no picture
                                    (or one that will not load)
     hideAllReels           true  = leave out every reel
     requirePhoto           true  = leave out every post without a picture

   Always: a post whose text is Facebook's "This content isn't
   available right now" error page (a deleted, private or
   restricted post) is left out, so the next post takes its place.
   ============================================================ */
import { CUP_NEWS } from '../data/xavier-cup.js';

const PROBE_MS = 5000;
const probed = new Map();   // picture address -> Promise<boolean>

/** True for a link to a Facebook reel or video. */
export function isReel(url) {
  return /(?:\/reels?\/|\/videos\/|\/watch\/?(?:[?#]|$)|\bfb\.watch\/)/i.test(String(url ?? ''));
}

/** Facebook's placeholder text for a post it will not show. */
const UNAVAILABLE = /this content isn['’‘`]?t available(?: right now)?/i;
export function isUnavailable(p) {
  return UNAVAILABLE.test(`${p?.title ?? ''} ${p?.body ?? ''}`);
}

/** Does this picture actually load? Cached, and never waits long. */
function pictureLoads(src) {
  if (!probed.has(src)) {
    probed.set(src, new Promise((resolve) => {
      const img = new Image();
      const timer = setTimeout(() => resolve(false), PROBE_MS);
      img.onload = () => { clearTimeout(timer); resolve(img.naturalWidth > 0); };
      img.onerror = () => { clearTimeout(timer); resolve(false); };
      img.src = src;
    }));
  }
  return probed.get(src);
}

/**
 * posts: already-normalised posts ({ link, image, … }).
 * Returns the ones to show, each marked with `isReel`.
 */
export async function displayablePosts(posts) {
  const keep = await Promise.all((posts || []).map(async (p) => {
    if (isUnavailable(p)) return false;
    p.isReel = isReel(p.link);
    if (CUP_NEWS.requirePhoto && !p.image) return false;
    if (p.isReel) {
      if (CUP_NEWS.hideAllReels) return false;
      if (CUP_NEWS.hideReelsWithoutPhoto !== false) {
        if (!p.image) return false;
        return pictureLoads(p.image);
      }
    }
    return true;
  }));
  return (posts || []).filter((_, i) => keep[i]);
}
