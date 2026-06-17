import { Platform } from 'react-native';

import { API_BASE_URL, ApiError, apiRequest } from './api';
import type { Coords, DocType, Ride, User } from './types';

// Upload an image/PDF and get back a hosted URL to attach to a document.
export async function uploadFile(
  token: string,
  file: { uri: string; name: string; type: string }
): Promise<{ url: string }> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    // On web the picker yields a blob/data URI; materialize it for multipart.
    const blob = await (await fetch(file.uri)).blob();
    form.append('file', blob, file.name);
  } else {
    // React Native FormData accepts { uri, name, type }; cast for TS.
    form.append('file', file as any);
  }

  const res = await fetch(`${API_BASE_URL}/api/driver/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new ApiError(res.status, data?.error || 'Upload échoué');
  return data;
}

export function submitDocument(token: string, type: DocType, url: string) {
  return apiRequest<{ driver: User }>('/api/driver/documents', {
    method: 'PUT',
    token,
    body: { type, url },
  });
}

export function updateVehicle(token: string, plate: string, licenseNumber: string) {
  return apiRequest<{ driver: User }>('/api/driver/vehicle', {
    method: 'PUT',
    token,
    body: { plate, licenseNumber },
  });
}

export function setStatus(token: string, isOnline: boolean, coords?: Coords) {
  return apiRequest<{ isOnline: boolean }>('/api/driver/status', {
    method: 'POST',
    token,
    body: { isOnline, ...(coords ?? {}) },
  });
}

export function getAvailableRides(token: string) {
  return apiRequest<{ rides: Ride[] }>('/api/driver/rides/available', { token });
}

export function acceptRide(token: string, id: string) {
  return apiRequest<{ ride: Ride }>(`/api/driver/rides/${id}/accept`, { method: 'POST', token });
}

export function declineRide(token: string, id: string) {
  return apiRequest<{ ok: boolean }>(`/api/driver/rides/${id}/decline`, { method: 'POST', token });
}

export function advanceRide(token: string, id: string, action: 'arrive' | 'start' | 'complete') {
  return apiRequest<{ ride: Ride }>(`/api/driver/rides/${id}/${action}`, { method: 'POST', token });
}

export function getDriverRides(token: string) {
  return apiRequest<{ rides: Ride[] }>('/api/driver/rides', { token });
}
