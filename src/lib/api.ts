/**
 * Centralized API client for communicating with the Affeto backend server.
 * Guarantees cross-browser data persistence for admin settings, logo, address,
 * products, categories, orders, and delivery zones.
 */

function resolveEndpoint(endpoint: string): string {
  if (typeof window !== 'undefined') return endpoint;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) return endpoint;
  return `http://localhost:3000${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
}

export const api = {
  async get<T>(endpoint: string): Promise<T | null> {
    try {
      const res = await fetch(resolveEndpoint(endpoint), {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch (err) {
      console.warn(`[API GET] Failed on ${endpoint}:`, err);
      return null;
    }
  },

  async post<T>(endpoint: string, body: unknown): Promise<T | null> {
    try {
      const res = await fetch(resolveEndpoint(endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch (err) {
      console.warn(`[API POST] Failed on ${endpoint}:`, err);
      return null;
    }
  },

  async put<T>(endpoint: string, body: unknown): Promise<T | null> {
    try {
      const res = await fetch(resolveEndpoint(endpoint), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch (err) {
      console.warn(`[API PUT] Failed on ${endpoint}:`, err);
      return null;
    }
  },

  async patch<T>(endpoint: string, body: unknown): Promise<T | null> {
    try {
      const res = await fetch(resolveEndpoint(endpoint), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch (err) {
      console.warn(`[API PATCH] Failed on ${endpoint}:`, err);
      return null;
    }
  },

  async delete(endpoint: string): Promise<boolean> {
    try {
      const res = await fetch(resolveEndpoint(endpoint), {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      return res.ok;
    } catch (err) {
      console.warn(`[API DELETE] Failed on ${endpoint}:`, err);
      return false;
    }
  },
};
