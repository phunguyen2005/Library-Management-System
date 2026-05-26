export type UserRole = 'student' | 'admin' | 'librarian';

export type AuthUser = {
  member_id?: number;
  librarian_id?: number;
  role?: UserRole;
  name: string;
  email?: string | null;
  phone_number?: string | null;
  join_date?: string | null;
  hire_date?: string | null;
  notify_due_soon?: boolean;
  notify_new_books?: boolean;
  notify_borrow_status?: boolean;
  notify_room_status?: boolean;
  notify_room_reminder?: boolean;
  notify_fine_status?: boolean;
  notify_reservation?: boolean;
  permissions?: string[];
  xp?: number;
  points?: number;
  level?: number;
  daily_streak?: number;
  last_check_in_at?: string | null;
};

export type AuthSession = {
  token: string;
  role: UserRole;
  user: AuthUser;
};

const AUTH_STORAGE_KEY = 'book-loan-auth';

export function getStoredSession(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function setStoredSession(session: AuthSession) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getStoredToken() {
  return getStoredSession()?.token ?? null;
}
