// src/modules/movies/movies.controller.ts
import {
  Controller, Get, Post, Put, Delete, Param,
  Query, Body, UseGuards, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MoviesService } from './movies.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Movies')
@Controller('v1/movies')
@UseGuards(JwtAuthGuard)
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  @Public()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'genre', required: false })
  @ApiQuery({ name: 'sort', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Query() query: any) {
    return this.moviesService.findAll(query);
  }

  @Get('trending')
  @Public()
  getTrending() {
    return this.moviesService.getTrending();
  }

  @Get('featured')
  @Public()
  getFeatured() {
    return this.moviesService.getFeatured();
  }

  @Get(':slug')
  @Public()
  findBySlug(@Param('slug') slug: string) {
    return this.moviesService.findBySlug(slug);
  }

  // Admin: Manual TMDB sync trigger
  @Post('admin/sync/trending')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async syncTrending() {
    await this.moviesService.syncTrending();
    return { message: 'Trending sync triggered' };
  }

  @Post('admin/sync/popular')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  async syncPopular() {
    await this.moviesService.syncPopular();
    return { message: 'Popular sync triggered' };
  }

  @Post('admin/sync/now-playing')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  async syncNowPlaying() {
    await this.moviesService.syncNowPlaying();
    return { message: 'Now playing sync triggered' };
  }

  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  getStats() {
    return this.moviesService.getStats();
  }
}

// ─────────────────────────────────────────────────────
// src/modules/movies/movies.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { TmdbService } from './tmdb.service';
import { Movie, MovieSchema } from '../../database/schemas/movie.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Movie.name, schema: MovieSchema }]),
    BullModule.registerQueue({ name: 'content-sync' }),
  ],
  controllers: [MoviesController],
  providers: [MoviesService, TmdbService],
  exports: [MoviesService, TmdbService],
})
export class MoviesModule {}
