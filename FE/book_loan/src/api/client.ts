import { getStoredToken, getStoredRefreshToken, getStoredSession, setStoredSession } from '../auth/storage';
import { emitAuthExpired, emitToast, emitAuthRefreshed } from '../notifications/events';
import { ApiError } from '../lib/errors';
import i18n, { getCurrentLanguage } from '../i18n';

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api';
const GET_CACHE_TTL_MS = 60_000;

const rawBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || DEFAULT_API_BASE_URL;

const API_BASE_URL = rawBaseUrl.replace(/\/$/, '');

type ApiOptions = Omit<RequestInit, 'body'> & {
  auth?: boolean;
  body?: unknown;
};

type RequestOptions = Omit<ApiOptions, 'auth'>;

type CacheEntry = {
  expiresAt: number;
  promise?: Promise<unknown>;
  value?: unknown;
};

const responseCache = new Map<string, CacheEntry>();

i18n.on('languageChanged', () => {
  responseCache.clear();
});

function buildRequestUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function invalidateResponseCache(path?: string) {
  if (!path) {
    responseCache.clear();
    return;
  }

  const normalizedPath = path.toLowerCase();

  // If it's a settings update
  if (normalizedPath.includes('/settings') || normalizedPath.includes('/library-settings')) {
    for (const key of responseCache.keys()) {
      if (key.includes('/settings') || key.includes('/library-settings')) {
        responseCache.delete(key);
      }
    }
    return;
  }

  // If it's a book mutate (e.g. edit book, import, review)
  if (normalizedPath.includes('/books') || normalizedPath.includes('/reviews') || normalizedPath.includes('/favorites')) {
    for (const key of responseCache.keys()) {
      if (key.includes('/books') || key.includes('/reviews') || key.includes('/favorites') || key.includes('/reports')) {
        responseCache.delete(key);
      }
    }
    return;
  }

  // If it's a borrowing/request mutate
  if (normalizedPath.includes('/requests') || normalizedPath.includes('/borrow')) {
    for (const key of responseCache.keys()) {
      if (key.includes('/requests') || key.includes('/books') || key.includes('/reports')) {
        responseCache.delete(key);
      }
    }
    return;
  }

  // If it's room bookings
  if (normalizedPath.includes('/room-bookings') || normalizedPath.includes('/rooms')) {
    for (const key of responseCache.keys()) {
      if (key.includes('/room-bookings') || key.includes('/rooms') || key.includes('/reports')) {
        responseCache.delete(key);
      }
    }
    return;
  }

  // If it's fine payment
  if (normalizedPath.includes('/fines') || normalizedPath.includes('/pay') || normalizedPath.includes('/momo') || normalizedPath.includes('/vnpay')) {
    for (const key of responseCache.keys()) {
      if (key.includes('/fines') || key.includes('/requests') || key.includes('/reports')) {
        responseCache.delete(key);
      }
    }
    return;
  }

  // Default: clear everything
  responseCache.clear();
}

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const session = getStoredSession();
      const refreshToken = getStoredRefreshToken();

      const url = `${API_BASE_URL}/refresh`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Accept-Language': getCurrentLanguage(),
        },
        credentials: 'include',
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Refresh token request failed');
      }

      const data = await response.json();
      if (!data.token) {
        throw new Error('No access token returned from refresh API');
      }

      if (session) {
        const nextSession = {
          ...session,
          token: data.token,
          refreshToken: data.refresh_token || session.refreshToken,
        };
        setStoredSession(nextSession);
        emitAuthRefreshed(nextSession);
      }

      return data.token as string;
    } catch (error) {
      refreshPromise = null;
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function performRequest<T>(
  url: string,
  options: RequestOptions,
  headers: Headers,
  token: string | null,
) {
  const { body, ...fetchOptions } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? body
          : JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    const fallbackMessage = i18n.t('api.requestFailed', { status: response.status });
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String(payload.message)
        : typeof payload === 'string' && payload.trim()
          ? payload
          : fallbackMessage;

    if (response.status === 401 && token) {
      const hasRefreshToken = Boolean(getStoredRefreshToken());
      if (!hasRefreshToken) {
        emitToast({
          tone: 'error',
          title: i18n.t('api.sessionExpiredTitle'),
          message: i18n.t('api.sessionExpiredMessage'),
        });
        emitAuthExpired(message || i18n.t('api.sessionExpiredFallback'));
      }
    }

    throw new ApiError(message, { status: response.status, details: payload });
  }

  return payload as T;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { auth = true, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);
  let token = auth ? getStoredToken() : null;
  const method = (requestOptions.method || 'GET').toUpperCase();
  const url = buildRequestUrl(path);

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const language = getCurrentLanguage();
  headers.set('Accept-Language', language);

  const isFormData = typeof FormData !== 'undefined' && requestOptions.body instanceof FormData;

  if (requestOptions.body !== undefined && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const runRequest = async (): Promise<T> => {
    if (method === 'GET' && !requestOptions.signal) {
      const cacheKey = `${language}:${token ?? 'guest'}:${url}`;
      const cached = responseCache.get(cacheKey);

      if (cached && cached.expiresAt > Date.now()) {
        if (cached.promise) {
          return cached.promise as Promise<T>;
        }

        if ('value' in cached) {
          return cached.value as T;
        }
      }

      const promise = performRequest<T>(url, requestOptions, headers, token)
        .then((payload) => {
          responseCache.set(cacheKey, {
            expiresAt: Date.now() + GET_CACHE_TTL_MS,
            value: payload,
          });

          return payload;
        })
        .catch((error) => {
          responseCache.delete(cacheKey);
          throw error;
        });

      responseCache.set(cacheKey, {
        expiresAt: Date.now() + GET_CACHE_TTL_MS,
        promise,
      });

      return promise;
    }

    const payload = await performRequest<T>(url, requestOptions, headers, token);
    invalidateResponseCache(path);
    return payload;
  };

  try {
    return await runRequest();
  } catch (error: unknown) {
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      auth &&
      getStoredRefreshToken()
    ) {
      try {
        const newToken = await refreshAccessToken();
        token = newToken;
        headers.set('Authorization', `Bearer ${newToken}`);
        return await runRequest();
      } catch (refreshErr) {
        emitToast({
          tone: 'error',
          title: i18n.t('api.sessionExpiredTitle'),
          message: i18n.t('api.sessionExpiredMessage'),
        });
        emitAuthExpired(error.message || i18n.t('api.sessionExpiredFallback'));
        throw error;
      }
    }
    throw error;
  }
}

export { API_BASE_URL };
