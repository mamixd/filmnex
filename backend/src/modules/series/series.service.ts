// src/modules/series/series.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import slugify from 'slugify';
import { Series, SeriesDocument } from '../../database/schemas/series.schema';
import { TmdbService } from '../movies/tmdb.service';

@Injectable()
export class SeriesService {
  private readonly logger = new Logger(SeriesService.name);

  constructor(
    @InjectModel(Series.name) private seriesModel: Model<SeriesDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly tmdbService: TmdbService,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    genre?: string;
    sort?: string;
    search?: string;
  }) {
    const { page = 1, limit = 20, genre, sort = '-popularity', search } = query;
    const cacheKey = `series:list:${JSON.stringify(query)}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const filter: any = { isPublished: true };
    if (genre) filter.genres = genre;
    if (search) filter.$text = { $search: search };

    const [data, total] = await Promise.all([
      this.seriesModel.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      this.seriesModel.countDocuments(filter),
    ]);

    const result = { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    await this.cacheManager.set(cacheKey, result, 300);
    return result;
  }

  async findBySlug(slug: string): Promise<SeriesDocument> {
    const series = await this.seriesModel.findOne({ slug, isPublished: true }).lean();
    if (!series) throw new NotFoundException(`Dizi bulunamadı: ${slug}`);
    await this.seriesModel.updateOne({ slug }, { $inc: { viewCount: 1 } });
    return series;
  }

  async getTrending(): Promise<Series[]> {
    const cacheKey = 'series:trending';
    const cached = await this.cacheManager.get<Series[]>(cacheKey);
    if (cached) return cached;

    const series = await this.seriesModel
      .find({ isPublished: true, isTrending: true })
      .sort('-popularity').limit(20).lean();

    await this.cacheManager.set(cacheKey, series, 1800);
    return series;
  }

  async syncTrending(): Promise<void> {
    this.logger.log('Syncing trending series...');
    const items = await this.tmdbService.getTrendingSeries('week');
    let added = 0, updated = 0;

    for (const item of items) {
      try {
        const slug = slugify(item.name, { lower: true, strict: true, locale: 'tr' }) + '-' + item.id;
        const existing = await this.seriesModel.findOne({ tmdbId: item.id });
        const data = {
          tmdbId: item.id,
          name: item.name,
          originalName: item.original_name,
          slug,
          overview: item.overview,
          posterPath: this.tmdbService.getPosterUrl(item.poster_path),
          backdropPath: this.tmdbService.getBackdropUrl(item.backdrop_path),
          firstAirDate: item.first_air_date,
          genres: item.genres?.map((g) => g.name) || [],
          voteAverage: item.vote_average,
          popularity: item.popularity,
          status: item.status || 'Unknown',
        };

        if (existing) {
          await this.seriesModel.updateOne({ tmdbId: item.id }, { $set: { ...data, isTrending: true } });
          updated++;
        } else {
          await this.seriesModel.create(data);
          added++;
        }
      } catch (err) {
        this.logger.warn(`Series sync failed (${item.id}): ${err.message}`);
      }
    }

    await this.seriesModel.updateMany({}, { $set: { isTrending: false } });
    const tmdbIds = items.map((i) => i.id);
    await this.seriesModel.updateMany({ tmdbId: { $in: tmdbIds } }, { $set: { isTrending: true } });
    await this.cacheManager.del('series:trending');
    this.logger.log(`Series trending sync: added=${added}, updated=${updated}`);
  }

  async syncPopular(): Promise<void> {
    this.logger.log('Syncing popular series...');
    const items = await this.tmdbService.getPopularSeries(1);
    let added = 0;
    for (const item of items) {
      try {
        const slug = slugify(item.name, { lower: true, strict: true, locale: 'tr' }) + '-' + item.id;
        await this.seriesModel.findOneAndUpdate(
          { tmdbId: item.id },
          {
            $setOnInsert: {
              tmdbId: item.id, name: item.name, slug,
              overview: item.overview,
              posterPath: this.tmdbService.getPosterUrl(item.poster_path),
              backdropPath: this.tmdbService.getBackdropUrl(item.backdrop_path),
              voteAverage: item.vote_average,
              popularity: item.popularity,
            },
            $set: { popularity: item.popularity },
          },
          { upsert: true },
        );
        added++;
      } catch (err) {
        this.logger.warn(`Series popular sync failed: ${err.message}`);
      }
    }
    this.logger.log(`Popular series sync: processed=${added}`);
  }
}

// ─────────────────────────────────────────────────────
// src/modules/series/series.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';
import { TmdbService } from '../movies/tmdb.service';
import { Series, SeriesSchema } from '../../database/schemas/series.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Series.name, schema: SeriesSchema }])],
  controllers: [SeriesController],
  providers: [SeriesService, TmdbService],
  exports: [SeriesService],
})
export class SeriesModule {}

// ─────────────────────────────────────────────────────
// src/modules/series/series.controller.ts
import { Controller, Get, Param, Query, UseGuards, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SeriesService } from './series.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Series')
@Controller('v1/series')
@UseGuards(JwtAuthGuard)
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  @Get() @Public()
  findAll(@Query() query: any) { return this.seriesService.findAll(query); }

  @Get('trending') @Public()
  getTrending() { return this.seriesService.getTrending(); }

  @Get(':slug') @Public()
  findBySlug(@Param('slug') slug: string) { return this.seriesService.findBySlug(slug); }

  @Post('admin/sync/trending')
  @UseGuards(RolesGuard) @Roles('admin') @ApiBearerAuth()
  async syncTrending() {
    await this.seriesService.syncTrending();
    return { message: 'Series trending sync triggered' };
  }
}
