import axios from 'axios';
import { useAuthStore } from '../store/authStore';

/**
 * Resolve the backend base URL. Every server route is mounted under `/api` and
 * Vite inlines VITE_API_URL at build time. Normalising the value here means a
 * value of "https://host" or "https://host/" still targets "https://host/api"
 * (instead of silently hitting the frontend origin, which 404s), and never
 * duplicates the prefix into "/api/api".
 */
export function resolveBaseUrl() {
  const raw = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (raw === '') {
    // A production build without VITE_API_URL sends every request to the
    // static host, where no API is mounted. Say so loudly instead of leaving a
    // mysterious 404 in the network tab.
    if (import.meta.env.PROD) {
      console.error(
        '[API] VITE_API_URL is missing for this build, falling back to /api. ' +
          'Set it to the backend origin (e.g. https://your-api.onrender.com) and redeploy.'
      );
    }
    return '/api';
  }
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

const baseURL = resolveBaseUrl();

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 60000,
});

// Same base URL as the main client, but a separate instance with no
// interceptors. The interceptor below uses it to refresh tokens, so a failing
// refresh can never recursively re-enter the refresh logic and loop forever.
const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 60000,
});

let refreshPromise = null;

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  console.log(`[API] → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.params || config.data || '');
  return config;
});

api.interceptors.response.use(
  (res) => {
    console.log(`[API] ← ${res.config.method?.toUpperCase()} ${res.config.url} [${res.status}]`, res.data?.message || '');
    return res;
  },
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // Silent 401 for the refresh/me endpoints to avoid loops
    const isAuthCall = original?.url?.includes('/auth/');
    console.warn(`[API] ← ${original?.method?.toUpperCase()} ${original?.url} [${status}]`, error.message);
    if (status === 401 && !original._retry && !isAuthCall) {
      console.log('[API] Token expired, attempting refresh...');
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshClient
            .post('/auth/refresh')
            .then(({ data }) => {
              const token = data?.data?.accessToken;
              useAuthStore.getState().setToken(token);
              return token;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const newToken = await refreshPromise;
        if (newToken) {
          console.log('[API] Token refreshed successfully, retrying request...');
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      } catch (refreshErr) {
        console.warn('[API] Token refresh failed, logging out:', refreshErr.message);
        // Session expired - clear and redirect to login
        useAuthStore.getState().logout();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export function errorMessage(error, fallback = 'Something went wrong') {
  return error?.response?.data?.message || error?.message || fallback;
}

export default api;
