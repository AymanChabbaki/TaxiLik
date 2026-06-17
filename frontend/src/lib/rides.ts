import { apiRequest } from './api';
import type { Coords, Fare, Ride } from './types';

export function estimateFare(
  token: string,
  pickup: Coords,
  destination: Coords,
  signal?: AbortSignal
) {
  return apiRequest<{ fare: Fare }>('/api/rides/estimate', {
    method: 'POST',
    token,
    body: { pickup, destination },
    signal,
  });
}

export function createRide(
  token: string,
  pickup: { address: string } & Coords,
  destination: { address: string } & Coords,
  passengers = 1
) {
  return apiRequest<{ ride: Ride; driversNotified: number }>('/api/rides', {
    method: 'POST',
    token,
    body: { pickup, destination, passengers },
  });
}

export function getActiveRide(token: string) {
  return apiRequest<{ ride: Ride | null }>('/api/rides/active', { token });
}

export function getNearbyDrivers(token: string, coords: Coords, signal?: AbortSignal) {
  return apiRequest<{ drivers: { id: string; lng: number; lat: number }[] }>(
    `/api/rides/nearby-drivers?lng=${coords.lng}&lat=${coords.lat}`,
    { token, signal }
  );
}

export function cancelRide(token: string, id: string, reason?: string) {
  return apiRequest<{ ride: Ride }>(`/api/rides/${id}/cancel`, {
    method: 'POST',
    token,
    body: { reason },
  });
}

export function getRideHistory(token: string) {
  return apiRequest<{ rides: Ride[] }>('/api/rides', { token });
}

export function formatMAD(amount: number) {
  return `${amount.toFixed(2)} MAD`;
}
