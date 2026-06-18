import { apiRequest } from './api';

export interface AdminStats {
  users: { passengers: number; drivers: number; pendingDrivers: number; onlineDrivers: number };
  rides: { byStatus: Record<string, number>; completed: number; revenue: number };
}

export interface AdminDocument {
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  url?: string;
  rejectionReason?: string;
  reviewedAt?: string;
}

export interface AdminDriver {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  isBlocked: boolean;
  createdAt?: string;
  driver: {
    approvalStatus: 'pending' | 'approved' | 'rejected';
    isOnline: boolean;
    vehicle?: { plate?: string; licenseNumber?: string };
    documents: AdminDocument[];
  };
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  isBlocked: boolean;
  avatarUrl?: string;
  createdAt?: string;
}

export interface AdminRide {
  _id: string;
  status: string;
  fare?: { total?: number };
  pickup?: { address?: string };
  destination?: { address?: string };
  passenger?: { _id: string; fullName: string; email: string };
  driver?: { _id: string; fullName: string; email: string };
  createdAt?: string;
}

export const adminApi = {
  stats: (token: string) =>
    apiRequest<AdminStats>('/api/admin/stats', { token }),

  listDrivers: (token: string, status?: string) =>
    apiRequest<{ drivers: AdminDriver[] }>(
      `/api/admin/drivers${status ? `?status=${status}` : ''}`,
      { token }
    ),

  getUser: (token: string, id: string) =>
    apiRequest<{ user: AdminDriver | AdminUser }>(`/api/admin/users/${id}`, { token }),

  setApproval: (token: string, id: string, status: 'approved' | 'rejected' | 'pending', reason?: string) =>
    apiRequest<{ driver: AdminDriver }>(`/api/admin/drivers/${id}/approval`, {
      method: 'PATCH',
      token,
      body: { status, reason },
    }),

  reviewDocument: (
    token: string,
    driverId: string,
    docType: string,
    status: 'approved' | 'rejected',
    rejectionReason?: string
  ) =>
    apiRequest<{ driver: AdminDriver }>(`/api/admin/drivers/${driverId}/documents/${docType}`, {
      method: 'PATCH',
      token,
      body: { status, rejectionReason },
    }),

  listUsers: (token: string) =>
    apiRequest<{ users: AdminUser[] }>('/api/admin/users?role=passenger', { token }),

  setBlocked: (token: string, id: string, isBlocked: boolean) =>
    apiRequest<{ user: AdminUser }>(`/api/admin/users/${id}/block`, {
      method: 'PATCH',
      token,
      body: { isBlocked },
    }),

  listRides: (token: string, status?: string) =>
    apiRequest<{ rides: AdminRide[] }>(
      `/api/admin/rides${status ? `?status=${status}` : ''}`,
      { token }
    ),
};
