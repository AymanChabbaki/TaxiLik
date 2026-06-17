const env = require('../config/env');
const { distanceKm } = require('../utils/geo');

const round2 = (n) => Math.round(n * 100) / 100;

// Determines day/night period for the regulated pickup charge.
// Night spans nightStartHour (evening) -> nightEndHour (morning), wrapping midnight.
function isNight(date = new Date()) {
  const h = date.getHours();
  const { nightStartHour, nightEndHour } = env.fare;
  if (nightStartHour > nightEndHour) {
    // e.g. 20 -> 6 : night if hour >= 20 OR hour < 6
    return h >= nightStartHour || h < nightEndHour;
  }
  return h >= nightStartHour && h < nightEndHour;
}

/**
 * Compute the legal Moroccan petit-taxi fare. There is NO negotiation:
 * total = distance(km) * perKm + regulated pickup charge (day/night).
 *
 * @param {object} params
 * @param {[number,number]} params.pickup  [lng, lat]
 * @param {[number,number]} params.destination [lng, lat]
 * @param {Date} [params.at] reference time for day/night (defaults to now)
 * @param {number} [params.distanceKmOverride] use a precomputed routed distance
 */
function estimateFare({ pickup, destination, at = new Date(), distanceKmOverride }) {
  const km =
    typeof distanceKmOverride === 'number'
      ? distanceKmOverride
      : distanceKm(pickup, destination);

  const night = isNight(at);
  const period = night ? 'night' : 'day';
  const perKm = env.fare.perKm;
  const pickupCharge = night ? env.fare.pickupNight : env.fare.pickupDay;

  const distanceCharge = round2(km * perKm);
  let total = distanceCharge + pickupCharge;
  if (env.fare.minFare && total < env.fare.minFare) {
    total = env.fare.minFare;
  }
  // Round the final fare to the nearest 0.5 DH (clean petit-taxi pricing).
  total = Math.round(total * 2) / 2;

  return {
    distanceKm: round2(km),
    perKm,
    distanceCharge,
    pickupCharge,
    period,
    total,
    currency: 'MAD',
  };
}

module.exports = { estimateFare, isNight };
