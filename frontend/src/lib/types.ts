export type Role = 'passenger' | 'driver' | 'admin';

export type DocType = 'cin' | 'permis' | 'carte_grise' | 'assurance' | 'permis_confiance';

export interface DriverDocument {
  type: DocType;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface DriverProfile {
  approvalStatus: 'incomplete' | 'pending' | 'approved' | 'rejected';
  isOnline: boolean;
  vehicle?: { plate?: string; licenseNumber?: string };
  documents?: DriverDocument[];
}

export interface User {
  id: string;
  email: string;
  role: Role;
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  isBlocked: boolean;
  driver?: DriverProfile;
  createdAt: string;
}

export interface Fare {
  distanceKm: number;
  perKm: number;
  distanceCharge: number;
  pickupCharge: number;
  period: 'day' | 'night';
  total: number;
  currency: string;
}

export type RideStatus =
  | 'requested'
  | 'accepted'
  | 'arrived'
  | 'started'
  | 'completed'
  | 'cancelled'
  | 'expired';

export interface Place {
  address: string;
  location: { type: 'Point'; coordinates: [number, number] };
}

export interface Ride {
  _id: string;
  passenger: string;
  driver?: any;
  pickup: Place;
  destination: Place;
  fare: Fare;
  passengers?: number;
  status: RideStatus;
  createdAt: string;
}

export interface Coords {
  lng: number;
  lat: number;
}
