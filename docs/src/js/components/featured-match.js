/* ============================================================
   components/featured-match.js — which game to feature on a day.

   The Xavier Cup tab shows one match per day under a "‹ day ›"
   pager rather than a second list. This module only decides; the
   screen paints it with matchCardHtml().

   The pick for a day, in order:
     1. your team's game (live first, then next up, then any)
     2. a live game
     3. the next game still to start
     4. a game marked `featured` in the data
     5. the first game of the day
   ============================================================ */

import { parseDate } from '../lib/dates.js';

const pad = (n) => String(n).padStart(2, '0');

/** "2026-10-12" for a Date, in local time. */
export function dayKey(date) {
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Every day that has at least one game, in order. */
export function gameDays(games) {
  return [...new Set(games.map(g => dayKey(g.start)).filter(Boolean))].sort();
}

/** The day to open on: today if it has games, else the next day that does, else the last. */
export function initialDay(days, now) {
  const today = dayKey(now);
  if (days.includes(today)) return today;
  return days.find(d => d > today) || days[days.length - 1] || '';
}

export function gamesOn(games, key) {
  return games
    .filter(g => dayKey(g.start) === key)
    .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0));
}

export function pickFeatured(dayGames, myTeam = '') {
  if (!dayGames.length) return null;
  const firstOf = (list) =>
    list.find(g => g.status === 'ongoing')
    || list.find(g => g.status === 'upcoming')
    || list[0];

  const mine = myTeam ? dayGames.filter(g => g.teamIds?.includes(myTeam)) : [];
  if (mine.length) return firstOf(mine);

  return dayGames.find(g => g.status === 'ongoing')
    || dayGames.find(g => g.status === 'upcoming')
    || dayGames.find(g => g.featured)
    || dayGames[0];
}

/** Parse a day key back to local midnight. */
export function keyToDate(key) {
  return parseDate(key);
}
