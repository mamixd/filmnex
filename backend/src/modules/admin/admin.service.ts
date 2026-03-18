// src/modules/admin/admin.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel('Movie') private movieModel: Model<any>,
    @InjectModel('Series') private seriesModel: Model<any>,
    @InjectModel('VideoSource') private videoSourceModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
    @InjectQueue('content-sync') private contentSyncQueue: Queue,
    @InjectQueue('video-check') private videoCheckQueue: Queue,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getDashboardStats() {
    const [
      totalMovies, totalSeries, totalUsers,
      totalVideoSources, unhealthyVideoSources,
      pendingJobs, failedJobs,
    ] = await Promise.all([
      this.movieModel.countDocuments(),
      this.seriesModel.countDocuments(),
      this.userModel.countDocuments(),
      this.videoSourceModel.countDocuments({ isActive: true }),
      this.videoSourceModel.countDocuments({ isActive: true, isHealthy: false }),
      this.contentSyncQueue.getWaitingCount(),
      this.contentSyncQueue.getFailedCount(),
    ]);

    const [newUsersToday, moviesThisWeek] = await Promise.all([
      this.userModel.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      this.movieModel.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    return {
      content: { totalMovies, totalSeries },
      users: { total: totalUsers, newToday: newUsersToday },
      videos: { totalSources: totalVideoSources, unhealthy: unhealthyVideoSources },
      queue: { pending: pendingJobs, failed: failedJobs },
      newContent: { moviesThisWeek },
    };
  }

  async getQueueStatus() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.contentSyncQueue.getWaitingCount(),
      this.contentSyncQueue.getActiveCount(),
      this.contentSyncQueue.getCompletedCount(),
      this.contentSyncQueue.getFailedCount(),
      this.contentSyncQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  async triggerSync(type: string) {
    switch (type) {
      case 'trending-movies':
        await this.contentSyncQueue.add('sync-trending-movies', {}, { priority: 1 });
        break;
      case 'popular-movies':
        await this.contentSyncQueue.add('sync-popular-movies', { pages: 5 }, { priority: 2 });
        break;
      case 'trending-series':
        await this.contentSyncQueue.add('sync-trending-series', {}, { priority: 1 });
        break;
      case 'video-health-check':
        await this.videoCheckQueue.add('check-all-sources', {}, { priority: 1 });
        break;
    }
    return { triggered: type };
  }

  async flushCache(pattern?: string) {
    if (pattern) {
      // flush specific cache keys
      await this.cacheManager.del(pattern);
    } else {
      // flush all (use with caution in production)
      const store = (this.cacheManager as any).store;
      if (store?.reset) await store.reset();
    }
    return { flushed: true };
  }

  async getUnhealthyVideoSources() {
    return this.videoSourceModel
      .find({ isActive: true, isHealthy: false })
      .sort({ failCount: -1 })
      .limit(50)
      .lean();
  }

  async getRecentMovies(limit = 20) {
    return this.movieModel.find().sort({ createdAt: -1 }).limit(limit).lean();
  }

  async toggleMoviePublish(movieId: string, isPublished: boolean) {
    await this.movieModel.updateOne({ _id: movieId }, { $set: { isPublished } });
    return { updated: true };
  }

  async toggleSeriesPublish(seriesId: string, isPublished: boolean) {
    await this.seriesModel.updateOne({ _id: seriesId }, { $set: { isPublished } });
    return { updated: true };
  }
}

// ─────────────────────────────────────────────────────
// src/modules/admin/admin.controller.ts
import {
  Controller, Get, Post, Put, Body, Param,
  UseGuards, Query
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin')
@Controller('v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() { return this.adminService.getDashboardStats(); }

  @Get('queue/status')
  getQueueStatus() { return this.adminService.getQueueStatus(); }

  @Post('sync/:type')
  triggerSync(@Param('type') type: string) { return this.adminService.triggerSync(type); }

  @Post('cache/flush')
  flushCache(@Body() body: { pattern?: string }) { return this.adminService.flushCache(body.pattern); }

  @Get('video-sources/unhealthy')
  getUnhealthyVideoSources() { return this.adminService.getUnhealthyVideoSources(); }

  @Get('movies/recent')
  getRecentMovies(@Query('limit') limit: number) { return this.adminService.getRecentMovies(limit); }

  @Put('movies/:id/publish')
  toggleMoviePublish(@Param('id') id: string, @Body() body: { isPublished: boolean }) {
    return this.adminService.toggleMoviePublish(id, body.isPublished);
  }

  @Put('series/:id/publish')
  toggleSeriesPublish(@Param('id') id: string, @Body() body: { isPublished: boolean }) {
    return this.adminService.toggleSeriesPublish(id, body.isPublished);
  }
}
