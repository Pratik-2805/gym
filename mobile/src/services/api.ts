import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Auto-resolve base URL depending on Android vs iOS simulator
const DEV_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
export const BASE_URL = DEV_URL;

let inMemoryToken = '';

// Helper to save authentication token
export async function saveAuthToken(token: string) {
  try {
    inMemoryToken = token;
    await SecureStore.setItemAsync('auth_token', token);
  } catch (err) {
    console.warn('[SecureStore] Failed to save token locally, fallback active:', err);
  }
}

// Helper to fetch authentication token
export async function getAuthToken(): Promise<string> {
  try {
    const token = await SecureStore.getItemAsync('auth_token');
    return token || inMemoryToken;
  } catch (err) {
    return inMemoryToken;
  }
}

// Helper to delete authentication token on sign out
export async function deleteAuthToken() {
  try {
    inMemoryToken = '';
    await SecureStore.deleteItemAsync('auth_token');
  } catch (err) {
    console.warn('[SecureStore] Failed to delete token:', err);
  }
}

/**
 * Base custom network fetch wrapper.
 * Dynamically binds secure cookies to Next.js API routes!
 */
export async function apiRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});
  
  // Attach content type
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach auth_token directly to cookie header so Next.js cookies() resolver works seamlessly!
  if (token) {
    headers.set('Cookie', `auth_token=${token}`);
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${BASE_URL}${path}`;
  console.log(`[API Network Request] ${options.method || 'GET'} -> ${url}`);

  return fetch(url, {
    ...options,
    headers,
  });
}
