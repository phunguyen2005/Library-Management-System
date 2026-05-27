export const APP_TOAST_EVENT = 'book-loan:toast';
export const AUTH_EXPIRED_EVENT = 'book-loan:auth-expired';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export type ToastEventDetail = {
  message: string;
  tone?: ToastTone;
  title?: string;
};

export type AuthExpiredEventDetail = {
  message: string;
};

export function emitToast(detail: ToastEventDetail) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<ToastEventDetail>(APP_TOAST_EVENT, { detail }));
}

export function emitAuthExpired(message: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AuthExpiredEventDetail>(AUTH_EXPIRED_EVENT, {
      detail: { message },
    }),
  );
}

export const AUTH_REFRESHED_EVENT = 'book-loan:auth-refreshed';

export type AuthRefreshedEventDetail = {
  session: unknown;
};

export function emitAuthRefreshed(session: unknown) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AuthRefreshedEventDetail>(AUTH_REFRESHED_EVENT, {
      detail: { session },
    }),
  );
}
