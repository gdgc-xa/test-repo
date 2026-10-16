/* ============================================================
   time.js — "now" in Manila, as the database writes it.

   Everything in MySQL is Manila local time with no offset
   ("2026-10-12 08:00:00"). Asia/Manila is UTC+8 all year (no
   daylight saving), so shifting by 8 hours is exact — and it does
   not depend on the container's TZ setting.
   ============================================================ */

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

const manilaIso = (date) => new Date(date.getTime() + MANILA_OFFSET_MS).toISOString();

/** "2026-10-12" */
export const manilaDate = (date) => manilaIso(date).slice(0, 10);

/** "2026-10-12 08:00:00" */
export const manilaDateTime = (date) => {
  const iso = manilaIso(date);
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)}`;
};
