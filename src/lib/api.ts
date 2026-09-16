/**
 * Centralized API client for communicating with the Affeto backend server.
 * Guarantees cross-browser data persistence for admin settings, logo, address,
 * products, categories, orders, and delivery zones.
 */

export const api = {
  async get<T>(endpoint: string): Promise<T | null> {
    try {
      const res = await fetch(endpoint, {
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
      const res = await fetch(endpoint, {
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
      const res = await fetch(endpoint, {
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
      const res = await fetch(endpoint, {
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
      const res = await fetch(endpoint, {
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
