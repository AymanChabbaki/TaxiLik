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
  rating?: number;
  ratingCount?: number;
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

export interface RideRating {
  stars: number;
  comment?: string;
  ratedAt: string;
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
  passengerRating?: RideRating;
  driverRating?: RideRating;
  createdAt: string;
}

export interface Coords {
  lng: number;
  lat: number;
}
