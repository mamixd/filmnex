// src/lib/api.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  withCredentials: true,
});

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('cinemax_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
apiClient.interceptors.response.use(
  (res) => res.data?.data ?? res.data,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('cinemax_token');
      window.location.href = '/giris';
    }
    return Promise.reject(err.response?.data || err);
  },
);

// ── Movies ───────────────────────────────────────────

export async function getMovies(params?: Record<string, any>) {
  return apiClient.get('/v1/movies', { params });
}

export async function getMovie(slug: string) {
  try {
    return await apiClient.get(`/v1/movies/${slug}`);
  } catch {
    return null;
  }
}

export async function getTrendingMovies() {
  return apiClient.get('/v1/movies/trending');
}

export async function getFeaturedMovies() {
  return apiClient.get('/v1/movies/featured');
}

// ── Series ───────────────────────────────────────────

export async function getSeries(params?: Record<string, any>) {
  return apiClient.get('/v1/series', { params });
}

export async function getSeriesItem(slug: string) {
  try {
    return await apiClient.get(`/v1/series/${slug}`);
  } catch {
    return null;
  }
}

export async function getEpisode(seriesSlug: string, season: number, episode: number) {
  return apiClient.get(`/v1/series/${seriesSlug}/season/${season}/episode/${episode}`);
}

// ── Video ─────────────────────────────────────────────

export async function getVideoSources(contentType: 'movie' | 'episode', contentId: string) {
  try {
    return await apiClient.get(`/v1/video/${contentType}/${contentId}/sources`);
  } catch {
    return { sources: [], subtitles: [] };
  }
}

// ── Auth ─────────────────────────────────────────────

export async function login(email: string, password: string) {
  return apiClient.post('/v1/auth/login', { email, password });
}

export async function register(email: string, username: string, password: string) {
  return apiClient.post('/v1/auth/register', { email, username, password });
}

export async function getMe() {
  return apiClient.get('/v1/auth/me');
}

// ── User ─────────────────────────────────────────────

export async function addFavorite(contentId: string, contentType: string) {
  return apiClient.post('/v1/users/favorites', { contentId, contentType });
}

export async function removeFavorite(contentId: string) {
  return apiClient.delete(`/v1/users/favorites/${contentId}`);
}

export async function saveWatchProgress(contentId: string, contentType: string, progress: number, duration: number) {
  return apiClient.post('/v1/users/watch-history', { contentId, contentType, progress, duration });
}

export async function getWatchHistory() {
  return apiClient.get('/v1/users/watch-history');
}
