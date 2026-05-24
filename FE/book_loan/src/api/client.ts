import { getStoredToken } from '../auth/storage';
import { emitAuthExpired, emitToast } from '../notifications/events';
import { ApiError } from '../lib/errors';
import i18n, { getCurrentLanguage } from '../i18n';

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api';
const GET_CACHE_TTL_MS = 15_000;

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

function buildRequestUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function invalidateResponseCache() {
  responseCache.clear();
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
      emitToast({
        tone: 'error',
        title: i18n.t('api.sessionExpiredTitle'),
        message: i18n.t('api.sessionExpiredMessage'),
      });
      emitAuthExpired(message || i18n.t('api.sessionExpiredFallback'));
    }

    throw new ApiError(message, { status: response.status, details: payload });
  }

  return payload as T;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { auth = true, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);
  const token = auth ? getStoredToken() : null;
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
  invalidateResponseCache();
  return payload;
}

export { API_BASE_URL };
