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

import { CUP_CONFIG } from '../data/xavier-cup.js';
import { matchCardHtml } from './match-card.js';
import { sportPictogram } from './sport-pictograms.js';
import { outcome, bracketRounds, seedTeams } from '../lib/standings.js';
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
  ? `<img class="${cls}" src="${escapeAttr(team.logo)}" alt="">`
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
        <p class="cup-section__hint">Pick a sport for its standings, ${CUP_CONFIG.showBracket !== false ? 'knockouts, ' : ''}news and matches.</p>
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

/* --- Getting back ---
   Deep in a sport's page (its bracket, its matches) the breadcrumb is
   far above. So a pill floats at the foot of the screen once the
   breadcrumb has scrolled away (screens/cup.js → watchSportsBack), and
   the page ends with the way back and, to carry on, the next sport.
   Both reuse the breadcrumb's and the grid's own buttons
   (data-sports-crumb, data-sports-open). */
const chevron = (points) => `<svg class="btn__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="${points}"/></svg>`;
const BACK_ICON = chevron('10,3 5,8 10,13');
const NEXT_ICON = chevron('6,3 11,8 6,13');

/** The floating pill: up one level (a team → its sport, a sport → all sports). */
function backFloatHtml(sport, team) {
  return `
    <button class="btn btn--primary sports-float" type="button" data-sports-float
            data-sports-crumb="${team ? 'sport' : 'index'}"
            aria-label="${escapeAttr(team ? `Back to ${sport.name}` : 'Back to all sports')}">
      ${BACK_ICON}<span>${escapeHtml(team ? sport.name : 'All sports')}</span>
    </button>`;
}

/** The end of the page: back, and the next sport (a team's page: its sport, and all sports). */
function endNavHtml(sport, team, next) {
  const back = team
    ? `<button class="btn btn--ghost" type="button" data-sports-crumb="sport">${BACK_ICON}${escapeHtml(sport.name)}</button>`
    : `<button class="btn btn--ghost" type="button" data-sports-crumb="index">${BACK_ICON}All sports</button>`;
  const onward = team
    ? `<button class="btn btn--ghost" type="button" data-sports-crumb="index">All sports</button>`
    : (next && next.id !== sport.id
      ? `<button class="btn btn--primary sports-endnav__next" type="button" data-sports-open="${escapeAttr(next.id)}"
                 aria-label="${escapeAttr(`Next sport: ${next.name}`)}">
           <span class="sports-endnav__kicker">Next</span>${escapeHtml(next.name)}${NEXT_ICON}
         </button>`
      : '');
  return `<nav class="sports-endnav" aria-label="Keep browsing" data-sports-endnav>${back}${onward}</nav>`;
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

/* --- Standings: wins and losses, one table per group --- */
function standingsHtml(tables, { sport, div, mine, format }) {
  if (!tables.some(t => t.table.length)) {
    return `<p class="sport-empty">No group games in ${escapeHtml(sport.name)} · ${escapeHtml(div)}.</p>`;
  }
  return `
    <div class="standings-groups">${tables.map(t => groupTableHtml(t, { sport, div, mine })).join('')}</div>
    <p class="sport-note">${escapeHtml(format.note)} Tap a team for its matches.</p>`;
}

function groupTableHtml({ group, table }, { sport, div, mine }) {
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
    <div class="standings-group">
      ${group ? `<p class="standings__group">Group ${escapeHtml(group)}</p>` : ''}
    <div class="standings-wrap">
      <table class="standings">
        <caption class="sr-only">${escapeHtml(`${sport.name} ${div}${group ? ` group ${group}` : ''} standings`)}</caption>
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
    </div>`;
}

/* --- The bracket: the rounds of the sport's format (lib/standings.js) ---
   Like the World Cup's: a chip per round, the rounds side by side (two
   on a phone, all of them where they fit), each match two team
   bubbles; slide sideways for the rounds after. screens/cup.js lays
   the columns out (the round at the left stacked close, each later
   match halfway between the two that feed it) and slides them. The
   games below the podium and the groups sit under it. */

/** "Live", "Final", or when it starts. */
const whenOf = (g) => (g.status === 'ongoing' ? 'Live'
  : g.status === 'finished' ? 'Final'
  : (g.start ? `${formatDay(g.start, { withYear: false })} · ${formatTime(g.start)}` : 'Time to follow'));

const sideOf = (g, k) => g?.sides?.[k] || null;
/** 0 or 1 for the side that won a decided game, else -1. */
const wonBy = (g) => {
  const o = g ? outcome(g) : null;
  return o?.winner ? (o.winner === 'home' ? 0 : 1) : -1;
};

/** A seed in words, once its group is played: "A3 vs B3" → "SBM vs MED". */
const seedName = (seed, seeds) => String(seed)
  .replace(/#\d+|\b[A-Z]\d\b/g, s => (seeds[s] ? (seeds[s].short || seeds[s].name) : s));

/** One game below the podium (5th, 7th); before it is set, who will play it. */
function koBoxHtml(g, mine, seed = null, seeds = {}) {
  if (!g) {
    return `
      <div class="kobox kobox--tbd">
        ${seed ? `<span class="kobox__seed">${escapeHtml(seedName(seed, seeds))}</span>` : ''}
        <span class="kobox__tbd">To be decided</span>
      </div>`;
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
  const when = whenOf(g);
  const isMine = g.teamIds?.some(id => mine.includes(id));
  return `
    <button class="kobox kobox--${g.status}${isMine ? ' is-mine' : ''}" type="button" data-game-id="${escapeAttr(g.id)}"
            aria-label="${escapeAttr(`${g.round}: ${g.title}. ${when}${scored ? `, ${g.score.home} to ${g.score.away}` : ''}. Open match details`)}">
      ${side(g.sides?.[0], 0)}
      ${side(g.sides?.[1], 1)}
      <span class="kobox__meta">${g.status === 'ongoing' ? '<i class="sport-tile__live"></i>' : ''}${escapeHtml(when)}</span>
    </button>`;
}

const teamBubbleHtml = (team, mine, extra = '') => `
  <span class="kteam${extra}${team && mine.includes(team.id) ? ' is-mine' : ''}">
    ${crestHtml(team, 'kteam__crest')}
    <span class="kteam__name">${escapeHtml(team?.short || team?.name || '')}</span>
    <b class="kteam__score"></b>
  </span>`;

/** Entrant k of a match: its game's team and score; before that, who
    comes through from the round before, a seed's team once its group
    is played, or the seed itself. */
function slideTeamHtml(m, k, prev, mine, seeds) {
  const g = m.game;
  if (g) {
    const w = wonBy(g);
    const team = sideOf(g, k);
    const scored = g.status !== 'upcoming' && g.score?.home !== undefined && g.score?.away !== undefined;
    const score = scored ? (k === 0 ? g.score.home : g.score.away) : '';
    const state = w < 0 ? '' : (w === k ? ' is-winner' : ' is-out');
    return `
      <span class="kteam${state}${team && mine.includes(team.id) ? ' is-mine' : ''}">
        ${team ? crestHtml(team, 'kteam__crest') : ''}
        <span class="kteam__name">${escapeHtml(team ? (team.short || team.name) : (m.seeds[k] || 'To be decided'))}</span>
        <b class="kteam__score">${escapeHtml(String(score))}</b>
      </span>`;
  }
  const feeder = m.from?.[k] != null ? prev?.matches[m.from[k]] : null;
  const fw = feeder ? wonBy(feeder.game) : -1;
  if (fw >= 0) return teamBubbleHtml(sideOf(feeder.game, m.losers ? 1 - fw : fw), mine);
  if (seeds[m.seeds[k]]) return teamBubbleHtml(seeds[m.seeds[k]], mine);
  const label = m.seeds[k]
    || (feeder && feeder.seeds.every(Boolean) ? `${m.losers ? 'L' : 'W'} ${feeder.seeds.join('/')}` : 'To be decided');
  return `<span class="kteam is-seed"><span class="kteam__name">${escapeHtml(label)}</span></span>`;
}

function slideMatchHtml(m, prev, mine, seeds) {
  const g = m.game;
  const status = !g ? 'To be decided'
    : g.status === 'finished' ? 'Full time'
    : whenOf(g);
  const head = `${m.label ? `${escapeHtml(m.label)} · ` : ''}${escapeHtml(status)}`;
  const body = `
    <span class="kmatch__head${g?.status === 'ongoing' ? ' is-live' : ''}">${head}</span>
    <span class="kmatch__teams">${slideTeamHtml(m, 0, prev, mine, seeds)}${slideTeamHtml(m, 1, prev, mine, seeds)}</span>
    <span class="kmatch__link" aria-hidden="true"></span>`;
  // Which matches before feed this one (for its place and its line); the
  // third-place game takes the losers, so it gets no line.
  const from = `data-from="${(m.from || []).filter(i => i != null).join(',')}"${m.losers ? ' data-losers' : ''}`;
  return g
    ? `<button class="kmatch" type="button" data-game-id="${escapeAttr(g.id)}" ${from}
               aria-label="${escapeAttr(`${m.label || g.round}: ${g.title}. ${status}. Open match details`)}">${body}</button>`
    : `<div class="kmatch" ${from}>${body}</div>`;
}

function slideHtml(rounds, mine, seeds) {
  // Opens on the first round still to be played; when everything is
  // played, on the last two (the semifinals and the final).
  const open = rounds.findIndex(r => r.matches.some(m => m.game?.status !== 'finished'));
  const start = Math.max(0, Math.min(open < 0 ? rounds.length : open, rounds.length - 2));
  return `
    <div class="kslide" data-kslide data-start="${start}" style="--krounds: ${rounds.length};">
      <div class="kslide__rounds" role="group" aria-label="Rounds">
        ${rounds.map((r, i) => `<button class="cup-daychip kslide__round" type="button" data-kslide-round="${i}" aria-pressed="false">${escapeHtml(r.label)}</button>`).join('')}
      </div>
      <div class="kslide__frame" tabindex="0" aria-label="Bracket, round by round: slide sideways for the rounds after">
        <div class="kslide__track">
          ${rounds.map((r, i) => `
            <div class="kslide__col" data-kslide-col="${i}" aria-label="${escapeAttr(r.label)}">
              ${r.matches.map(m => slideMatchHtml(m, rounds[i - 1], mine, seeds)).join('')}
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}

/* --- The groups, under the bracket: a gold head, the teams in table order --- */
function groupBoxesHtml(tables, mine) {
  return `
    <div class="tgroups">${tables.map(({ group, table }) => `
      <section class="tgroup" aria-label="${escapeAttr(`Group ${group}`)}">
        <h4 class="tgroup__head">Group ${escapeHtml(group)}</h4>
        <ol class="tgroup__list">${table.map(r => `
          <li>
            <button type="button" class="tgroup__team${mine.includes(r.id) ? ' is-mine' : ''}" data-sports-team="${escapeAttr(r.id)}"
                    aria-label="${escapeAttr(`${r.rank}. ${r.team?.name || r.id}, ${r.w} wins, ${r.l} losses`)}">
              <span class="tgroup__rank" aria-hidden="true">${r.rank}</span>
              ${crestHtml(r.team, 'tgroup__crest')}
              <span class="tgroup__name" aria-hidden="true">${escapeHtml(r.team?.short || r.team?.name || r.id)}</span>
              <span class="tgroup__rec" aria-hidden="true">${r.w}–${r.l}</span>
            </button>
          </li>`).join('')}
        </ol>
      </section>`).join('')}
    </div>`;
}

/** The whole bracket section: the rounds, the games below the podium, the groups. */
function bracketHtml(ko, format, { mine, tables, seeds, withGroups }) {
  const rounds = bracketRounds(ko, format);
  // A format from a schedule shows its slots from the start; the
  // original one waits for the draw.
  const seeded = ko.columns.some(c => c.slots.some(s => s.seed));
  if (!ko.drawn && !seeded) {
    return '<p class="sport-empty">The knockouts have not been drawn yet.</p>';
  }
  return `
    ${slideHtml(rounds, mine, seeds)}
    ${ko.placings.length ? `
      <div class="bracket-places">${ko.placings.map(p => `
        <div class="bracket__col bracket__col--place">
          <p class="bracket__label">${escapeHtml(p.label)}</p>
          ${p.slots.map(s => koBoxHtml(s.game, mine, s.seed, seeds)).join('')}
        </div>`).join('')}
      </div>` : ''}
    ${withGroups ? groupBoxesHtml(tables, mine) : ''}
    <p class="sport-note">${withGroups ? `${escapeHtml(format.note)} ` : ''}${seeded ? 'A1 = 1st in group A · #1 = 1st in the table · W / L = the winner or loser of that game; a seed becomes its team once its group is played. ' : ''}Tap a match for its details${withGroups ? ', a team in a group for all its matches' : ''}.</p>`;
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
        ${stat(row.group ? `Rank · Group ${row.group}` : 'Rank', `${row.rank} of ${row.total}`)}${stat('Wins', row.w)}${stat('Losses', row.l)}
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
 *   format            the division's tournament format (BRACKETS)
 *   tables, ko        groupTables() and knockouts() for the division
 *   news              posts about the sport, newest first
 *   team              a TEAMS entry for the team view, or null
 *   mine              followed team ids
 *   matchesShown      how many of the division's matches to list
 *                     before a "Show all" button (Infinity = all)
 *   collapsible       false where the list is a swipe row: no button
 */
export function sportPageHtml({
  sport, index, sportGames, divisions, div, divGames, format, tables, ko, news, team, mine,
  matchesShown = Infinity, collapsible = true, next = null,
}) {
  const head = `${crumbsHtml(sport, team)}`;
  const divs = divisionsHtml(divisions, div, sport);
  const foot = `${endNavHtml(sport, team, next)}${backFloatHtml(sport, team)}`;

  if (team) {
    // The team's place within its own group.
    const own = tables.find(t => t.table.some(r => r.id === team.id));
    const row = own?.table.find(r => r.id === team.id);
    return `
      ${head}
      ${teamHtml({
        team, sport, div, mine,
        games: divGames.filter(g => g.teamIds.includes(team.id)),
        row: row ? { ...row, total: own.table.length, group: own.group } : null,
      })}
      ${divs ? `<div class="sport-divs-row">${divs}</div>` : ''}
      ${foot}`;
  }

  // Every college at once (races, routines): no table, no bracket.
  const versus = sport.format !== 'field';
  // The bracket can be switched off (CUP_CONFIG.showBracket).
  const bracketOn = versus && CUP_CONFIG.showBracket !== false;
  // Two groups: once the games say who is in which group, the groups
  // sit under the bracket in place of a separate standings table (with
  // the bracket off, the standings show them).
  const withGroups = bracketOn && format.groups.length > 0 && tables.some(t => t.group);
  // A group played to the end puts its teams into the bracket's seeds.
  const seeds = versus ? seedTeams(tables, divGames) : {};
  const named = div && div !== 'Open';
  return `
    ${head}
    ${headHtml(sport, sportGames, index)}
    ${divs ? `<div class="sport-divs-row">${divs}</div>` : ''}
    ${sectionHtml('Latest news', newsHtml(news, sport), { id: 'sport-news' })}
    ${sport.photos?.length ? sectionHtml('Photos', photosHtml(sport.photos), { id: 'sport-photos' }) : ''}
    ${versus && !withGroups ? sectionHtml('Standings', standingsHtml(tables, { sport, div, mine, format }), {
      id: 'sport-standings', extra: named ? `<span class="browse-count">${escapeHtml(div)}</span>` : '' }) : ''}
    ${bracketOn ? sectionHtml('Bracket', bracketHtml(ko, format, { mine, tables, seeds, withGroups }), {
      id: 'sport-ko', extra: named ? `<span class="browse-count">${escapeHtml(div)}</span>` : '' }) : ''}
    ${sectionHtml(named ? `${div} matches` : 'Matches', divGames.length
      ? matchListHtml([...divGames].sort(byInterest), mine, matchesShown, collapsible)
      : '<p class="sport-empty">No matches yet.</p>', {
      id: 'sport-matches', extra: `<span class="browse-count">${count(divGames.length, 'match')}</span>` })}
    ${foot}`;
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
