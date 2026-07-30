import * as SecureStore from 'expo-secure-store';
import { NativeModules, Platform } from 'react-native';

const getHostIp = () => {
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    const address = scriptURL.split('://')[1]?.split('/')[0]?.split(':')[0];
    if (address && address !== 'localhost' && address !== '127.0.0.1') {
      return address;
    }
  }
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
};

let BACKEND_URL = `http://${getHostIp()}:5000`;

const TOKEN_KEY = 'auth_token';
let cachedToken: string | null = null;

/**
 * Initializes the auth token from SecureStore. Should be called at app startup.
 */
export async function initAuthToken(): Promise<string | null> {
  try {
    cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (e) {
    console.warn('[API Client] SecureStore is unavailable or failed to load:', e);
  }
  return cachedToken;
}

/**
 * Saves or deletes the auth token in SecureStore and updates the cache.
 */
export async function setAuthToken(token: string | null) {
  cachedToken = token;
  try {
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (e) {
    console.warn('[API Client] SecureStore failed to persist/remove token:', e);
  }
}

export function getAuthToken(): string | null {
  return cachedToken;
}

export function setBackendUrl(url: string) {
  BACKEND_URL = url;
}

export function getBackendUrl(): string {
  return BACKEND_URL;
}

/**
 * Generic request helper wrapping fetch with token injection and status validation.
 */
async function request<T>(method: string, path: string, body?: any): Promise<{ data: T }> {
  const url = path.startsWith('http') ? path : `${BACKEND_URL}${path}`;
  const headers = new Headers();
  
  if (cachedToken) {
    headers.set('Authorization', `Bearer ${cachedToken}`);
  }
  
  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });

  if (!response.ok) {
    let errMsg = response.statusText;
    try {
      const errData = await response.json();
      errMsg = errData.error || errData.message || response.statusText;
    } catch (e) {}
    throw new Error(errMsg);
  }

  const data = await response.json();
  return { data };
}

export const api = {
  get: async <T = any>(path: string): Promise<{ data: T }> => {
    return request<T>('GET', path);
  },
  post: async <T = any>(path: string, body?: any): Promise<{ data: T }> => {
    return request<T>('POST', path, body);
  },
  put: async <T = any>(path: string, body?: any): Promise<{ data: T }> => {
    return request<T>('PUT', path, body);
  },
  delete: async <T = any>(path: string): Promise<{ data: T }> => {
    return request<T>('DELETE', path);
  },
};

export default api;
