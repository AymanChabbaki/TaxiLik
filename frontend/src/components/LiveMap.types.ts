import type { ViewStyle } from 'react-native';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LiveMapProps {
  /** Map center. Falls back to user/pickup. */
  center?: LatLng | null;
  /** The current user's location (passenger pickup, or the driver themselves). */
  user?: LatLng | null;
  /** Nearby available cars to show as markers (inDrive-style). */
  drivers?: { id: string; lat: number; lng: number }[];
  /** The assigned driver during an active ride (highlighted, animated). */
  assignedDriver?: LatLng | null;
  /** Pickup / destination pins for an active ride. */
  pickup?: LatLng | null;
  destination?: LatLng | null;
  /** Keep the assigned driver centered while moving. */
  followAssigned?: boolean;
  /** Status label chip shown over the map. */
  label?: string;
  dark?: boolean;
  /** Who is looking: a passenger sees themselves as a person + driver as a car;
   *  a driver sees themselves as a car + the client (pickup) as a person. */
  viewerRole?: 'passenger' | 'driver';
  style?: ViewStyle;
}
