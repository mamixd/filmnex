// src/modules/movies/movies.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import slugify from 'slugify';

import { Movie, MovieDocument } from '../../database/schemas/movie.schema';
import { TmdbService, TmdbMovie } from './tmdb.service';

export interface PaginatedMovies {
  data: Movie[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class MoviesService {
  private readonly logger = new Logger(MoviesService.name);

  constructor(
    @InjectModel(Movie.name) private movieModel: Model<MovieDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectQueue('content-sync') private contentSyncQueue: Queue,
    private readonly tmdbService: TmdbService,
  ) {}

  // ── FETCH & PAGINATE ─────────────────────────────

  async findAll(query: {
    page?: number;
    limit?: number;
    genre?: string;
    sort?: string;
    search?: string;
  }): Promise<PaginatedMovies> {
    const { page = 1, limit = 20, genre, sort = '-popularity', search } = query;
    const cacheKey = `movies:list:${JSON.stringify(query)}`;

    const cached = await this.cacheManager.get<PaginatedMovies>(cacheKey);
    if (cached) return cached;

    const filter: any = { isPublished: true };
    if (genre) filter.genres = genre;
    if (search) filter.$text = { $search: search };

    const [data, total] = await Promise.all([
      this.movieModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-videoSources -metadata')
        .lean(),
      this.movieModel.countDocuments(filter),
    ]);

    const result: PaginatedMovies = {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    await this.cacheManager.set(cacheKey, result, 300); // 5 min
    return result;
  }

  async findBySlug(slug: string): Promise<MovieDocument> {
    const cacheKey = `movie:${slug}`;
    const cached = await this.cacheManager.get<MovieDocument>(cacheKey);
    if (cached) return cached;

    const movie = await this.movieModel
      .findOne({ slug, isPublished: true })
      .populate('videoSources')
      .lean();

    if (!movie) throw new NotFoundException(`Film bulunamadı: ${slug}`);

    await this.cacheManager.set(cacheKey, movie, 600); // 10 min
    await this.movieModel.updateOne({ slug }, { $inc: { viewCount: 1 } });
    return movie;
  }

  async getTrending(): Promise<Movie[]> {
    const cacheKey = 'movies:trending';
    const cached = await this.cacheManager.get<Movie[]>(cacheKey);
    if (cached) return cached;

    const movies = await this.movieModel
      .find({ isPublished: true, isTrending: true })
      .sort('-popularity')
      .limit(20)
      .select('-videoSources -metadata')
      .lean();

    await this.cacheManager.set(cacheKey, movies, 1800); // 30 min
    return movies;
  }

  async getFeatured(): Promise<Movie[]> {
    return this.movieModel
      .find({ isPublished: true, isFeatured: true })
      .sort('-createdAt')
      .limit(10)
      .lean();
  }

  // ── TMDB SYNC ─────────────────────────────────────

  async syncFromTmdb(tmdbMovies: TmdbMovie[]): Promise<{ added: number; updated: number; skipped: number }> {
    let added = 0, updated = 0, skipped = 0;

    for (const tmdbMovie of tmdbMovies) {
      try {
        const slug = this.generateSlug(tmdbMovie.title, tmdbMovie.id);
        const existing = await this.movieModel.findOne({ tmdbId: tmdbMovie.id });

        const movieData = {
          tmdbId: tmdbMovie.id,
          title: tmdbMovie.title,
          originalTitle: tmdbMovie.original_title,
          slug,
          overview: tmdbMovie.overview,
          posterPath: this.tmdbService.getPosterUrl(tmdbMovie.poster_path),
          backdropPath: this.tmdbService.getBackdropUrl(tmdbMovie.backdrop_path),
          releaseDate: tmdbMovie.release_date,
          runtime: tmdbMovie.runtime || 0,
          genres: tmdbMovie.genres?.map((g) => g.name) || [],
          genreIds: tmdbMovie.genre_ids || tmdbMovie.genres?.map((g) => g.id) || [],
          voteAverage: tmdbMovie.vote_average,
          voteCount: tmdbMovie.vote_count,
          popularity: tmdbMovie.popularity,
          language: tmdbMovie.original_language,
          adult: tmdbMovie.adult,
        };

        if (existing) {
          await this.movieModel.updateOne(
            { tmdbId: tmdbMovie.id },
            { $set: { ...movieData, isTrending: true } },
          );
          updated++;
        } else {
          await this.movieModel.create(movieData);
          added++;
          // Enqueue video source check for new movies
          await this.contentSyncQueue.add('video-check', { contentId: tmdbMovie.id, type: 'movie' }, { delay: 5000 });
        }
      } catch (err) {
        this.logger.warn(`Movie sync failed (${tmdbMovie.id}): ${err.message}`);
        skipped++;
      }
    }

    return { added, updated, skipped };
  }

  async syncTrending(): Promise<void> {
    this.logger.log('Syncing trending movies from TMDB...');
    const movies = await this.tmdbService.getTrendingMovies('week');
    const result = await this.syncFromTmdb(movies);

    // Reset trending flags, mark new ones
    await this.movieModel.updateMany({}, { $set: { isTrending: false } });
    const tmdbIds = movies.map((m) => m.id);
    await this.movieModel.updateMany({ tmdbId: { $in: tmdbIds } }, { $set: { isTrending: true } });

    // Invalidate cache
    await this.cacheManager.del('movies:trending');
    this.logger.log(`Trending sync complete: ${JSON.stringify(result)}`);
  }

  async syncPopular(pages = 3): Promise<void> {
    this.logger.log('Syncing popular movies...');
    const allMovies: TmdbMovie[] = [];
    for (let p = 1; p <= pages; p++) {
      const movies = await this.tmdbService.getPopularMovies(p);
      allMovies.push(...movies);
    }
    const result = await this.syncFromTmdb(allMovies);
    this.logger.log(`Popular sync complete: ${JSON.stringify(result)}`);
  }

  async syncNowPlaying(): Promise<void> {
    this.logger.log('Syncing now playing movies...');
    const movies = await this.tmdbService.getNowPlayingMovies();
    const result = await this.syncFromTmdb(movies);
    this.logger.log(`Now playing sync complete: ${JSON.stringify(result)}`);
  }

  // ── PRIVATE ──────────────────────────────────────

  private generateSlug(title: string, id: number): string {
    return slugify(title, { lower: true, strict: true, locale: 'tr' }) + '-' + id;
  }

  async findById(id: string): Promise<MovieDocument> {
    const movie = await this.movieModel.findById(id).populate('videoSources');
    if (!movie) throw new NotFoundException('Film bulunamadı');
    return movie;
  }

  async getStats() {
    const [total, published, trending] = await Promise.all([
      this.movieModel.countDocuments(),
      this.movieModel.countDocuments({ isPublished: true }),
      this.movieModel.countDocuments({ isTrending: true }),
    ]);
    return { total, published, trending };
  }
}
