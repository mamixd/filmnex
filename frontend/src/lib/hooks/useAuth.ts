// src/lib/hooks/useAuth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getMe, login as apiLogin, register as apiRegister } from '../api';

interface AuthState {
  user: any | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const data: any = await apiLogin(email, password);
          set({ user: data.user, token: data.token, isLoading: false });
          if (typeof window !== 'undefined') {
            localStorage.setItem('cinemax_token', data.token);
          }
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (email, username, password) => {
        set({ isLoading: true });
        try {
          const data: any = await apiRegister(email, username, password);
          set({ user: data.user, token: data.token, isLoading: false });
          if (typeof window !== 'undefined') {
            localStorage.setItem('cinemax_token', data.token);
          }
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        set({ user: null, token: null });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cinemax_token');
          window.location.href = '/';
        }
      },

      fetchMe: async () => {
        try {
          const user = await getMe();
          set({ user });
        } catch {
          set({ user: null, token: null });
        }
      },
    }),
    {
      name: 'cinemax-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);

// ─────────────────────────────────────────────────────
// src/lib/hooks/useWatchProgress.ts
import { useCallback } from 'react';
import { saveWatchProgress } from '../api';
import { useAuth } from './useAuth';

const PROGRESS_KEY = 'cinemax_progress';
const SAVE_INTERVAL_MS = 10000; // Save to API every 10 seconds

let lastApiSave = 0;

export function useWatchProgress() {
  const { user } = useAuth();

  const getProgress = useCallback((contentId: string) => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(`${PROGRESS_KEY}:${contentId}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const saveProgress = useCallback(
    async (contentId: string, contentType: string, currentTime: number, duration: number) => {
      if (typeof window === 'undefined') return;
      const progress = { progress: currentTime, duration, updatedAt: Date.now() };

      // Always save locally
      localStorage.setItem(`${PROGRESS_KEY}:${contentId}`, JSON.stringify(progress));

      // Throttle API calls
      const now = Date.now();
      if (user && now - lastApiSave > SAVE_INTERVAL_MS) {
        lastApiSave = now;
        try {
          await saveWatchProgress(contentId, contentType, currentTime, duration);
        } catch {
          // Silent fail - local progress is still saved
        }
      }
    },
    [user],
  );

  const clearProgress = useCallback((contentId: string) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`${PROGRESS_KEY}:${contentId}`);
  }, []);

  return { getProgress, saveProgress, clearProgress };
}

// ─────────────────────────────────────────────────────
// src/lib/hooks/useMovies.ts
import useSWR from 'swr';
import { apiClient } from '../api';

const fetcher = (url: string) => apiClient.get(url);

export function useMovies(params?: Record<string, any>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return useSWR(`/v1/movies${query}`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });
}

export function useTrendingMovies() {
  return useSWR('/v1/movies/trending', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 1800000, // 30 min
  });
}

export function useSeries(params?: Record<string, any>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return useSWR(`/v1/series${query}`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });
}
