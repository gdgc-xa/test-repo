/* ============================================================
   components/sports.js — the Sports view of the Xavier Cup tab,
   laid out like the sport pages on olympics.com.

     index   one tile per sport: its picture, its divisions, and
             how many of its games are live / still to come
     sport   Sports › Basketball
               header (photo, name, counts) + division switch
               latest news · photo strip · standings · knockouts
               · every match of the division
     team    Sports › Basketball › CCS Wizards
               the team's record in the division, a Follow button,
               its upcoming games and its results

   Every number is worked out in lib/standings.js from GAMES; this
   file only paints. screens/cup.js picks what to show and handles
   the taps (data-sports-*).
   ============================================================ */

import { matchCardHtml } from './match-card.js';
import { sportPictogram } from './sport-pictograms.js';
import { outcome } from '../lib/standings.js';
import { parseDate, formatDay, formatTime, formatRange } from '../lib/dates.js';
import { escapeHtml, escapeAttr, safeUrl } from '../lib/html.js';

const STATUS_ORDER = { ongoing: 0, upcoming: 1, finished: 2 };

/** Live, then soonest to start, then the latest results. */
const byInterest = (a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
  || (a.status === 'finished'
    ? (b.start?.getTime() ?? 0) - (a.start?.getTime() ?? 0)
    : (a.start?.getTime() ?? Infinity) - (b.start?.getTime() ?? Infinity));

const count = (n, word) => `${n} ${word}${n === 1 ? '' : (word.endsWith('h') ? 'es' : 's')}`;

/** "1 live · 3 upcoming", or "4 results" once nothing is left to play. */
function tally(games) {
  const live = games.filter(g => g.status === 'ongoing').length;
  const next = games.filter(g => g.status === 'upcoming').length;
  const done = games.filter(g => g.status === 'finished').length;
  const parts = [];
  if (live) parts.push(`${live} live`);
  if (next) parts.push(`${next} upcoming`);
  if (!live && !next && done) parts.push(count(done, 'result'));   // none at all: '' ("No games yet")
  return { live, next, done, text: parts.join(' · ') };
}

const crestHtml = (team, cls) => (team?.logo
  ? `<img class="${cls}" src="${escapeAttr(team.logo)}" alt="" loading="lazy" decoding="async">`
  : `<span class="${cls} ${cls}--blank" aria-hidden="true"></span>`);

/* A sport with no photo yet: the news placeholder graphic with the
   sport's picture on it, so the frame never jumps later. */
function photoHtml(sport, i = 0) {
  if (sport.photo) {
    return `<img class="sport-head__img" src="${escapeAttr(sport.photo)}" alt="" decoding="async">`;
  }
  const mark = sportPictogram(sport.name, { cls: 'sport-head__mark' })
    || (sport.icon ? `<img class="sport-head__mark" src="${escapeAttr(sport.icon)}" alt="">` : '');
  return `
    <span class="sport-head__img news-ph news-ph--${i % 4}" aria-hidden="true">${mark}</span>`;
}

/* ============================================================
   INDEX
   ============================================================ */

/** The sport's pictogram, else its picture, else its first letter. */
function sportIconHtml(s) {
  return sportPictogram(s.name)
    || (s.icon ? `<img src="${escapeAttr(s.icon)}" alt="" loading="lazy" decoding="async">` : '')
    || `<span class="sport-tile__letter">${escapeHtml(s.name.slice(0, 1))}</span>`;
}

/** "Men · Women"; "Men · Women · 3x3" for events with divisions
    ("3x3 · Men"); "13 events" when a sport has too many to list. */
function categoriesText(cats) {
  if (cats.length > 4) return `${cats.length} events`;
  return [...new Set(cats.flatMap(c => c.split(' · ')))].join(' · ');
}

/**
 * sportsIndexHtml({ sports, games, categoriesOf })
 *   sports         allSports(), in order
 *   games          every resolved game
 *   categoriesOf   (sport, games) => ['Men', 'Women', …]
 */
export function sportsIndexHtml({ sports, games, categoriesOf }) {
  const tiles = sports.map((s, i) => {
    const theirs = games.filter(g => g.sport === s.name);
    const t = tally(theirs);
    const cats = categoriesOf(s, theirs).filter(c => c !== 'Open');
    const label = `${[s.name, categoriesText(cats), t.text || 'No games yet'].filter(Boolean).join('. ')}.`;
    return `
      <button class="sport-tile reveal" type="button" data-sports-open="${escapeAttr(s.id)}"
              style="--reveal-delay: ${Math.min(i * 50, 300)}ms;" aria-label="${escapeAttr(label)}">
        <span class="sport-tile__icon" aria-hidden="true">${sportIconHtml(s)}</span>
        <span class="sport-tile__name" aria-hidden="true">${escapeHtml(s.name)}</span>
        ${cats.length ? `<span class="sport-tile__divs" aria-hidden="true">${escapeHtml(categoriesText(cats))}</span>` : ''}
        <span class="sport-tile__stats" aria-hidden="true">
          ${t.live ? '<i class="sport-tile__live"></i>' : ''}${escapeHtml(t.text || 'No games yet')}
        </span>
      </button>`;
  }).join('');

  return `
    <div class="cup-section__head">
      <div>
        <h2 class="cup-section__title" tabindex="-1" data-sports-heading>Sports</h2>
        <p class="cup-section__hint">Pick a sport for its standings, knockouts, news and matches.</p>
      </div>
    </div>
    <div class="sport-grid">${tiles}</div>`;
}

/* ============================================================
   SPORT PAGE (and the team view inside it)
   ============================================================ */

function crumbsHtml(sport, team) {
  const sep = '<span class="sports-crumbs__sep" aria-hidden="true">›</span>';
  return `
    <nav class="sports-crumbs" aria-label="Breadcrumb">
      <button type="button" data-sports-crumb="index">Sports</button>
      ${sep}
      ${team
        ? `<button type="button" data-sports-crumb="sport">${escapeHtml(sport.name)}</button>
           ${sep}<span aria-current="page">${escapeHtml(team.name)}</span>`
        : `<span aria-current="page">${escapeHtml(sport.name)}</span>`}
    </nav>`;
}

/* The categories to switch between: a two- or three-way switch (Men /
   Women), or for a sport with many (Athletics' events, Esports'
   games) a row of small chips that scrolls sideways. */
function divisionsHtml(divisions, div, sport) {
  if (divisions.length < 2) return '';
  const label = escapeAttr(`${sport.name} category`);
  if (divisions.length > 3) {
    return `
      <div class="sport-cats" role="group" aria-label="${label}">
        ${divisions.map(d => `
          <button class="cup-daychip" type="button" data-sports-div="${escapeAttr(d)}"
                  aria-pressed="${d === div}">${escapeHtml(d)}</button>`).join('')}
      </div>`;
  }
  return `
    <div class="seg sport-divs" role="group" aria-label="${label}">
      ${divisions.map(d => `
        <button class="seg__btn" type="button" data-sports-div="${escapeAttr(d)}"
                aria-pressed="${d === div}">${escapeHtml(d)}</button>`).join('')}
    </div>`;
}

function headHtml(sport, sportGames, index) {
  const t = tally(sportGames);
  return `
    <header class="sport-head">
      <div class="sport-head__media">${photoHtml(sport, index)}</div>
      <div class="sport-head__text">
        <span class="sport-head__icon" aria-hidden="true">${sportIconHtml(sport)}</span>
        <h2 class="sport-head__name" tabindex="-1" data-sports-heading>${escapeHtml(sport.name)}</h2>
        <p class="sport-head__stats">
          ${t.live ? '<i class="sport-tile__live"></i>' : ''}${escapeHtml(sportGames.length ? [count(sportGames.length, 'match'), t.text].filter(Boolean).join(' · ') : 'No games yet')}
        </p>
      </div>
    </header>`;
}

function sectionHtml(title, body, { id = '', extra = '' } = {}) {
  return `
    <section class="sport-sec"${id ? ` aria-labelledby="${id}"` : ''}>
      <div class="sport-sec__head">
        <h3 class="sport-sec__title"${id ? ` id="${id}"` : ''}>${escapeHtml(title)}</h3>
        ${extra}
      </div>
      ${body}
    </section>`;
}

/* --- Latest news: the site's plain post cards --- */
function newsHtml(posts, sport) {
  if (!posts.length) {
    return `<p class="sport-empty">No ${escapeHtml(sport.name)} news yet. Posts tagged #${escapeHtml(sport.name.replace(/\s+/g, ''))} show up here.</p>`;
  }
  return `<div class="news-posts sport-news">${posts.map(p => {
    const link = safeUrl(p.link);
    return `
      <article class="news-post">
        <div class="news-post__head">
          ${p.tag ? `<span class="news-post__tag">${escapeHtml(p.tag)}</span>` : ''}
          ${parseDate(p.date) ? `<span class="news-post__date">${escapeHtml(formatRange(p.date))}</span>` : ''}
        </div>
        <h4 class="news-post__title">${escapeHtml(p.title)}</h4>
        ${p.body ? `<p class="news-post__body">${escapeHtml(p.body)}</p>` : ''}
        ${link ? `<a class="news-post__link" href="${escapeAttr(link)}" target="_blank" rel="noopener noreferrer">Read on Facebook →</a>` : ''}
      </article>`;
  }).join('')}</div>`;
}

/* --- Photo strip (only when the sport has photos) --- */
function photosHtml(photos) {
  return `<div class="sport-photos">${photos.map(p => {
    const src = typeof p === 'string' ? p : p?.src;
    return src ? `<img src="${escapeAttr(src)}" alt="${escapeAttr(p?.alt || '')}" loading="lazy" decoding="async">` : '';
  }).join('')}</div>`;
}

/* --- Standings: wins and losses --- */
function standingsHtml(table, { sport, div, mine }) {
  if (!table.length) {
    return `<p class="sport-empty">No group games in ${escapeHtml(sport.name)} · ${escapeHtml(div)}.</p>`;
  }
  const rows = table.map(r => `
    <tr class="${mine.includes(r.id) ? 'is-mine' : ''}">
      <td class="standings__rank">${r.rank}</td>
      <th scope="row" class="standings__team">
        <button type="button" class="standings__btn" data-sports-team="${escapeAttr(r.id)}">
          ${crestHtml(r.team, 'standings__crest')}
          <span class="standings__name">${escapeHtml(r.team?.name || r.id)}</span>
          <span class="standings__short">${escapeHtml(r.team?.short || r.id)}</span>
        </button>
      </th>
      <td class="standings__num">${r.w}</td>
      <td class="standings__num">${r.l}</td>
    </tr>`).join('');
  return `
    <div class="standings-wrap">
      <table class="standings">
        <caption class="sr-only">${escapeHtml(`${sport.name} ${div} standings`)}</caption>
        <thead>
          <tr>
            <th scope="col" class="standings__rank"><span class="sr-only">Rank</span>#</th>
            <th scope="col" class="standings__team">Team</th>
            <th scope="col" class="standings__num">Wins</th>
            <th scope="col" class="standings__num">Losses</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="sport-note">From finished group games. Tap a team for its matches.</p>`;
}

/* --- Knockouts: semifinals → final (→ bronze) --- */
function koBoxHtml(g, mine) {
  if (!g) {
    return `<div class="kobox kobox--tbd"><span class="kobox__tbd">To be decided</span></div>`;
  }
  const o = outcome(g);
  const scored = g.status !== 'upcoming' && g.score?.home !== undefined && g.score?.away !== undefined;
  const side = (team, i) => {
    const won = o?.winner === (i === 0 ? 'home' : 'away');
    const score = scored ? (i === 0 ? g.score.home : g.score.away) : '';
    return `
      <span class="kobox__row${won ? ' is-winner' : ''}${o?.winner && !won ? ' is-loser' : ''}">
        ${crestHtml(team, 'kobox__crest')}
        <span class="kobox__name">${escapeHtml(team?.short || team?.name || 'TBD')}</span>
        <b class="kobox__score">${escapeHtml(String(score))}</b>
      </span>`;
  };
  const when = g.status === 'ongoing' ? 'Live'
    : g.status === 'finished' ? 'Final'
    : (g.start ? `${formatDay(g.start, { withYear: false })} · ${formatTime(g.start)}` : 'Time to follow');
  const isMine = g.teamIds?.some(id => mine.includes(id));
  return `
    <button class="kobox kobox--${g.status}${isMine ? ' is-mine' : ''}" type="button" data-game-id="${escapeAttr(g.id)}"
            aria-label="${escapeAttr(`${g.round}: ${g.title}. ${when}${scored ? `, ${g.score.home} to ${g.score.away}` : ''}. Open match details`)}">
      ${side(g.sides?.[0], 0)}
      ${side(g.sides?.[1], 1)}
      <span class="kobox__meta">${g.status === 'ongoing' ? '<i class="sport-tile__live"></i>' : ''}${escapeHtml(when)}</span>
    </button>`;
}

function knockoutsHtml(ko, mine) {
  if (!ko.semis.length && !ko.final && !ko.bronze) {
    return '<p class="sport-empty">The knockouts have not been drawn yet.</p>';
  }
  // Two semifinal slots, filled as the draw is made.
  const semis = [ko.semis[0] || null, ko.semis[1] || null, ...ko.semis.slice(2)];
  return `
    <div class="bracket">
      <div class="bracket__col">
        <p class="bracket__label">Semifinals</p>
        ${semis.map(g => koBoxHtml(g, mine)).join('')}
      </div>
      <div class="bracket__col bracket__col--final">
        <p class="bracket__label">Final</p>
        ${koBoxHtml(ko.final, mine)}
        ${ko.bronze ? `<p class="bracket__label">Bronze</p>${koBoxHtml(ko.bronze, mine)}` : ''}
      </div>
    </div>`;
}

const gridHtml = (games, mine) =>
  `<div class="match-grid">${games.map((g, i) => matchCardHtml(g, { i, myTeams: mine })).join('')}</div>`;

/* --- The team view --- */
function teamHtml({ team, sport, div, games, row, mine }) {
  const following = mine.includes(team.id);
  const next = games.filter(g => g.status !== 'finished').sort(byInterest);
  const done = games.filter(g => g.status === 'finished').sort(byInterest);
  const stat = (label, value) =>
    `<div class="team-record__item"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value))}</dd></div>`;

  return `
    <header class="team-head">
      ${crestHtml(team, 'team-head__crest')}
      <div class="team-head__text">
        <p class="team-head__kicker">${escapeHtml(`${sport.name} · ${div}`)}</p>
        <h2 class="team-head__name" tabindex="-1" data-sports-heading>${escapeHtml(team.name)}</h2>
        ${team.college ? `<p class="team-head__college">${escapeHtml(team.college)}</p>` : ''}
      </div>
      <button class="btn btn--sm ${following ? 'btn--primary' : 'btn--ghost'} team-head__follow" type="button"
              data-sports-follow="${escapeAttr(team.id)}" aria-pressed="${following}">
        ${following ? 'Following ✓' : 'Follow'}
      </button>
    </header>
    ${row ? `
      <dl class="team-record">
        ${stat('Rank', `${row.rank} of ${row.total}`)}${stat('Wins', row.w)}${stat('Losses', row.l)}
      </dl>` : ''}
    <p class="sport-note">${following
      ? `You follow ${escapeHtml(team.name)}: their games are at the top of Matches.`
      : `Follow ${escapeHtml(team.name)} to put their games at the top of Matches.`}</p>
    ${!games.length ? `<p class="sport-empty">No ${escapeHtml(sport.name)} · ${escapeHtml(div)} games for ${escapeHtml(team.name)}.</p>` : ''}
    ${next.length ? sectionHtml('Upcoming', gridHtml(next, mine)) : ''}
    ${done.length ? sectionHtml('Results', gridHtml(done, mine)) : ''}`;
}

/**
 * sportPageHtml({...}) — one sport, or one team inside it.
 *   sport, index      the SPORTS entry and its place in the list
 *   sportGames        every game of the sport
 *   divisions, div    its divisions and the chosen one
 *   divGames          the chosen division's games
 *   table, ko         standings() and knockouts() for the division
 *   news              posts about the sport, newest first
 *   team              a TEAMS entry for the team view, or null
 *   mine              followed team ids
 *   matchesShown      how many of the division's matches to list
 *                     before a "Show all" button (Infinity = all)
 *   collapsible       false where the list is a swipe row: no button
 */
export function sportPageHtml({
  sport, index, sportGames, divisions, div, divGames, table, ko, news, team, mine,
  matchesShown = Infinity, collapsible = true,
}) {
  const head = `${crumbsHtml(sport, team)}`;
  const divs = divisionsHtml(divisions, div, sport);

  if (team) {
    const row = table.find(r => r.id === team.id);
    return `
      ${head}
      ${teamHtml({
        team, sport, div, mine,
        games: divGames.filter(g => g.teamIds.includes(team.id)),
        row: row ? { ...row, total: table.length } : null,
      })}
      ${divs ? `<div class="sport-divs-row">${divs}</div>` : ''}`;
  }

  // Every college at once (races, routines): no table, no bracket.
  const versus = sport.format !== 'field';
  const named = div && div !== 'Open';
  return `
    ${head}
    ${headHtml(sport, sportGames, index)}
    ${divs ? `<div class="sport-divs-row">${divs}</div>` : ''}
    ${sectionHtml('Latest news', newsHtml(news, sport), { id: 'sport-news' })}
    ${sport.photos?.length ? sectionHtml('Photos', photosHtml(sport.photos), { id: 'sport-photos' }) : ''}
    ${versus ? sectionHtml('Standings', standingsHtml(table, { sport, div, mine }), {
      id: 'sport-standings', extra: named ? `<span class="browse-count">${escapeHtml(div)}</span>` : '' }) : ''}
    ${versus ? sectionHtml('Knockouts', knockoutsHtml(ko, mine), { id: 'sport-ko' }) : ''}
    ${sectionHtml(named ? `${div} matches` : 'Matches', divGames.length
      ? matchListHtml([...divGames].sort(byInterest), mine, matchesShown, collapsible)
      : '<p class="sport-empty">No matches yet.</p>', {
      id: 'sport-matches', extra: `<span class="browse-count">${count(divGames.length, 'match')}</span>` })}`;
}

/** The first few matches (live and next first), and a button for the rest. */
function matchListHtml(games, mine, shown, collapsible = true) {
  const cut = games.length > shown;
  return `
    ${gridHtml(cut ? games.slice(0, shown) : games, mine)}
    ${collapsible && (cut || shown === Infinity) && games.length > 6 ? `
      <button class="btn btn--ghost btn--sm sport-more" type="button" data-sports-more aria-expanded="${!cut}">
        ${cut ? `Show all ${games.length}` : 'Show fewer'}
      </button>` : ''}`;
}
