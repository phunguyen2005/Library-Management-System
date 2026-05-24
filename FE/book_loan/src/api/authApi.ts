import type { AuthSession, UserRole } from '../auth/storage';
import { apiRequest } from './client';

type AuthResponse = {
  message: string;
  user: AuthSession['user'];
  role: UserRole;
  token: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function loginUser(identifier: string, password: string) {
  return apiRequest<AuthResponse>('/login', {
    auth: false,
    method: 'POST',
    body: { identifier, password },
  });
}

export async function registerStudent(
  name: string,
  identifier: string,
  password: string,
  phoneNumber?: string
) {
  if (!isValidEmail(identifier)) {
    throw new Error('Vui lòng nhập email hợp lệ để đăng ký.');
  }

  return apiRequest<AuthResponse>('/register', {
    auth: false,
    method: 'POST',
    body: {
      name,
      email: identifier,
      password,
      password_confirmation: password,
      phone_number: phoneNumber,
    },
  });
}

export async function logoutUser() {
  return apiRequest<{ message: string }>('/logout', {
    method: 'POST',
  });
}

export async function verifyOtp(email: string, otp: string) {
  return apiRequest<AuthResponse>('/verify-otp', {
    auth: false,
    method: 'POST',
    body: { email, otp },
  });
}

export async function resendOtp(email: string) {
  return apiRequest<{ message: string }>('/resend-otp', {
    auth: false,
    method: 'POST',
    body: { email },
  });
}

export async function forgotPassword(email: string) {
  return apiRequest<{ message: string }>('/forgot-password', {
    auth: false,
    method: 'POST',
    body: { email },
  });
}

export async function verifyForgotPasswordOtp(email: string, otp: string) {
  return apiRequest<{ message: string }>('/verify-forgot-password-otp', {
    auth: false,
    method: 'POST',
    body: { email, otp },
  });
}

export async function resetPassword(email: string, otp: string, password: string) {
  return apiRequest<{ message: string }>('/reset-password', {
    auth: false,
    method: 'POST',
    body: { email, otp, password, password_confirmation: password },
  });
}

export type DeviceSession = {
  history_id: number;
  ip_address: string;
  device_type: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown';
  browser: string;
  platform: string;
  token_id: string;
  is_current: boolean;
  created_at: string;
};

export async function getActiveDevices() {
  return apiRequest<DeviceSession[]>('/me/devices', {
    method: 'GET',
  });
}

export async function revokeDevice(tokenId: string) {
  return apiRequest<{ message: string }>(`/me/devices/${tokenId}`, {
    method: 'DELETE',
  });
}
