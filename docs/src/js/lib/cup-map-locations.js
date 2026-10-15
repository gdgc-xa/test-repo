// Venue records are the single location registry. Sport names never decide a venue.
import { escapeHtml, escapeAttr } from './html.js';
export const isOffCampus = venue => venue?.venueType === 'off-campus';
export const hasCampusPoint = venue => Boolean(venue && !isOffCampus(venue)
  && Array.isArray(venue.label) && venue.label.length === 2 && venue.label.every(Number.isFinite));
export function validGps(gps) {
  return Array.isArray(gps) && gps.length === 2 && gps.every(Number.isFinite)
    && Math.abs(gps[0]) <= 180 && Math.abs(gps[1]) <= 90;
}
/** Stored [longitude, latitude]; Google Maps query takes latitude,longitude. */
export function googleMapsUrl(venue) {
  return validGps(venue?.gps)
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.gps[1]},${venue.gps[0]}`)}` : '';
}
export function venueLocationHtml(venue) {
  const url = isOffCampus(venue) ? googleMapsUrl(venue) : '';
  return `<div class="venue-location">
    ${isOffCampus(venue) ? '<span class="tag tag--plain">Outside campus</span>' : ''}
    ${venue?.address ? `<p class="venue-panel__hint">${escapeHtml(venue.address)}</p>` : ''}
    ${url ? `<a class="btn btn--ghost btn--sm" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">Open in Google Maps ↗</a>` : ''}
  </div>`;
}
