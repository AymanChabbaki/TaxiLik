import type { Coords } from './types';

// Casablanca preset destinations (used until the live map + Places search is
// wired with a Maps API key). Coordinates are [lng, lat] friendly via the
// Coords shape below.
export interface Place {
  name: string;
  address: string;
  coords: Coords;
}

export const CASABLANCA_PLACES: Place[] = [
  { name: 'Technopark', address: 'Sidi Maârouf, Casablanca', coords: { lng: -7.6562, lat: 33.5239 } },
  { name: 'Gare Casa Port', address: 'Bd Hassan II, Casablanca', coords: { lng: -7.6045, lat: 33.5995 } },
  { name: 'Twin Center', address: 'Bd Zerktouni, Maârif', coords: { lng: -7.6325, lat: 33.5871 } },
  { name: 'Morocco Mall', address: 'Aïn Diab, Casablanca', coords: { lng: -7.6936, lat: 33.5664 } },
  { name: 'Aéroport Mohammed V', address: 'Nouaceur', coords: { lng: -7.5898, lat: 33.3675 } },
  { name: 'Place Mohammed V', address: 'Centre-ville, Casablanca', coords: { lng: -7.6187, lat: 33.5928 } },
];

// Fallback pickup if GPS is unavailable (central Casablanca).
export const DEFAULT_PICKUP: Place = {
  name: 'Position actuelle',
  address: 'Casablanca, Maroc',
  coords: { lng: -7.6038, lat: 33.5731 },
};
