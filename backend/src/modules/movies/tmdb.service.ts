// src/modules/movies/tmdb.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface TmdbMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  runtime?: number;
  genres?: Array<{ id: number; name: string }>;
  genre_ids?: number[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
  adult: boolean;
  spoken_languages?: Array<{ iso_639_1: string; name: string }>;
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
}

export interface TmdbSeries {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  first_air_date: string;
  last_air_date: string;
  number_of_seasons: number;
  number_of_episodes: number;
  genres?: Array<{ id: number; name: string }>;
  genre_ids?: number[];
  vote_average: number;
  popularity: number;
  status: string;
}

@Injectable()
export class TmdbService {
  private readonly logger = new Logger(TmdbService.name);
  private readonly http: AxiosInstance;
  private readonly imageBase: string;
  private readonly language: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('tmdb.apiKey');
    const baseUrl = this.configService.get<string>('tmdb.baseUrl');
    this.imageBase = this.configService.get<string>('tmdb.imageBaseUrl');
    this.language = this.configService.get<string>('tmdb.language');

    this.http = axios.create({
      baseURL: baseUrl,
      params: {
        api_key: apiKey,
        language: this.language,
      },
      timeout: 10000,
    });

    // Retry interceptor
    this.http.interceptors.response.use(undefined, async (error) => {
      const config = error.config;
      if (!config || config.__retryCount >= 3) return Promise.reject(error);
      config.__retryCount = (config.__retryCount || 0) + 1;
      await new Promise((r) => setTimeout(r, 1000 * config.__retryCount));
      return this.http(config);
    });
  }

  // ── MOVIES ──────────────────────────────────────

  async getTrendingMovies(timeWindow: 'day' | 'week' = 'week'): Promise<TmdbMovie[]> {
    try {
      const { data } = await this.http.get(`/trending/movie/${timeWindow}`);
      return data.results;
    } catch (err) {
      this.logger.error(`Trending movies fetch failed: ${err.message}`);
      return [];
    }
  }

  async getPopularMovies(page = 1): Promise<TmdbMovie[]> {
    try {
      const { data } = await this.http.get('/movie/popular', { params: { page } });
      return data.results;
    } catch (err) {
      this.logger.error(`Popular movies fetch failed: ${err.message}`);
      return [];
    }
  }

  async getNowPlayingMovies(): Promise<TmdbMovie[]> {
    try {
      const { data } = await this.http.get('/movie/now_playing', {
        params: { region: this.configService.get('tmdb.region') },
      });
      return data.results;
    } catch (err) {
      this.logger.error(`Now playing fetch failed: ${err.message}`);
      return [];
    }
  }

  async getTopRatedMovies(page = 1): Promise<TmdbMovie[]> {
    try {
      const { data } = await this.http.get('/movie/top_rated', { params: { page } });
      return data.results;
    } catch (err) {
      this.logger.error(`Top rated movies fetch failed: ${err.message}`);
      return [];
    }
  }

  async getMovieDetails(tmdbId: number): Promise<TmdbMovie | null> {
    try {
      const { data } = await this.http.get(`/movie/${tmdbId}`, {
        params: { append_to_response: 'credits,videos,images' },
      });
      return data;
    } catch (err) {
      this.logger.error(`Movie details fetch failed (${tmdbId}): ${err.message}`);
      return null;
    }
  }

  async searchMovies(query: string, page = 1): Promise<TmdbMovie[]> {
    try {
      const { data } = await this.http.get('/search/movie', { params: { query, page } });
      return data.results;
    } catch (err) {
      this.logger.error(`Search movies failed: ${err.message}`);
      return [];
    }
  }

  // ── TV SERIES ────────────────────────────────────

  async getTrendingSeries(timeWindow: 'day' | 'week' = 'week'): Promise<TmdbSeries[]> {
    try {
      const { data } = await this.http.get(`/trending/tv/${timeWindow}`);
      return data.results;
    } catch (err) {
      this.logger.error(`Trending series fetch failed: ${err.message}`);
      return [];
    }
  }

  async getPopularSeries(page = 1): Promise<TmdbSeries[]> {
    try {
      const { data } = await this.http.get('/tv/popular', { params: { page } });
      return data.results;
    } catch (err) {
      this.logger.error(`Popular series fetch failed: ${err.message}`);
      return [];
    }
  }

  async getSeriesDetails(tmdbId: number): Promise<TmdbSeries | null> {
    try {
      const { data } = await this.http.get(`/tv/${tmdbId}`, {
        params: { append_to_response: 'seasons,credits,videos' },
      });
      return data;
    } catch (err) {
      this.logger.error(`Series details fetch failed (${tmdbId}): ${err.message}`);
      return null;
    }
  }

  async getSeasonDetails(seriesId: number, seasonNumber: number) {
    try {
      const { data } = await this.http.get(`/tv/${seriesId}/season/${seasonNumber}`);
      return data;
    } catch (err) {
      this.logger.error(`Season details fetch failed: ${err.message}`);
      return null;
    }
  }

  // ── UTILITY ─────────────────────────────────────

  getPosterUrl(path: string, size = 'w500'): string {
    if (!path) return '';
    return `${this.imageBase}/${size}${path}`;
  }

  getBackdropUrl(path: string, size = 'w1280'): string {
    if (!path) return '';
    return `${this.imageBase}/${size}${path}`;
  }

  async getGenres(): Promise<Array<{ id: number; name: string }>> {
    try {
      const [movies, tv] = await Promise.all([
        this.http.get('/genre/movie/list'),
        this.http.get('/genre/tv/list'),
      ]);
      const all = [...movies.data.genres, ...tv.data.genres];
      return [...new Map(all.map((g) => [g.id, g])).values()];
    } catch (err) {
      this.logger.error(`Genres fetch failed: ${err.message}`);
      return [];
    }
  }
}
