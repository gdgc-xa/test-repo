/* ============================================================
   data/news-featured.js — the FEATURED posts on News & Updates.
   Edited by hand. Pure data. No DOM.

   Every post the Facebook page makes (or shares) shows up in the
   "More updates" carousel on its own; nothing here is needed for
   that. This file only decides which posts ALSO get the big
   featured slot at the top of the tab. Leave the list empty and
   the featured slot simply isn't shown.

   Items show in the order written here. Three ways to add one:

   1. A Facebook post, by its link. Easiest: on the website, right-
      click the post's card in "More updates" → Copy link address,
      and paste it here. Its text and picture come from Facebook.

        { post: 'https://www.facebook.com/122093256447504109/posts/122093247141504109' },

   2. A Facebook post, by a few words from it. The newest post
      whose text contains them is featured.

        { match: 'ordered your jersey' },

   3. Something that isn't on Facebook, written out in full.
      Put the picture in docs/assets/news/featured/.

        {
          title: 'Opening ceremony starts at 7 AM',
          body:  'All colleges assemble at the Main Field.',
          image: 'assets/news/featured/opening.jpg',
          link:  'https://www.facebook.com/profile.php?id=61595123270779',
          tag:   'CSG',
          date:  '2026-10-10',
        },

   Links copied from Facebook's own app sometimes look like
   ".../posts/pfbid02AbC..." — those can't be matched. Use the link
   from the website's card (way 1) or a few words (way 2) instead.

   After you save this file and push it, GitHub picks it up within
   a minute or two (the "Update Facebook news" workflow runs on it).
   ============================================================ */

export const FEATURED_NEWS = {
  /** false hides the featured slot without emptying the list. */
  enabled: true,

  /** How long each featured post stays up before the next, in seconds. */
  secondsPerPost: 7,

  items: [
    // Add featured posts here, e.g.
    // { match: 'ordered your jersey' },
  ],
};
