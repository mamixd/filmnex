// src/queue/queue.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ContentSyncProcessor } from './processors/content-sync.processor';
import { VideoCheckProcessor } from './processors/video-check.processor';
import { CronJobsService } from './cron-jobs.service';
import { MoviesModule } from '../modules/movies/movies.module';
import { SeriesModule } from '../modules/series/series.module';
import { VideoModule } from '../modules/video/video.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'content-sync' },
      { name: 'video-check' },
      { name: 'cache-refresh' },
    ),
    MoviesModule,
    SeriesModule,
    VideoModule,
  ],
  providers: [ContentSyncProcessor, VideoCheckProcessor, CronJobsService],
  exports: [BullModule],
})
export class QueueModule {}

// ─────────────────────────────────────────────────────
// src/queue/processors/content-sync.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MoviesService } from '../../modules/movies/movies.service';
import { SeriesService } from '../../modules/series/series.service';

@Processor('content-sync', {
  concurrency: 3,
  limiter: { max: 10, duration: 1000 },
})
export class ContentSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(ContentSyncProcessor.name);

  constructor(
    private moviesService: MoviesService,
    private seriesService: SeriesService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing job: ${job.name} (${job.id})`);

    switch (job.name) {
      case 'sync-trending-movies':
        return this.moviesService.syncTrending();

      case 'sync-popular-movies':
        return this.moviesService.syncPopular(job.data?.pages || 3);

      case 'sync-now-playing':
        return this.moviesService.syncNowPlaying();

      case 'sync-trending-series':
        return this.seriesService.syncTrending();

      case 'sync-popular-series':
        return this.seriesService.syncPopular();

      case 'video-check':
        this.logger.log(`Video check queued for ${job.data.contentId}`);
        return { contentId: job.data.contentId, status: 'queued' };

      default:
        this.logger.warn(`Unknown job: ${job.name}`);
    }
  }
}

// ─────────────────────────────────────────────────────
// src/queue/processors/video-check.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from 'bullmq';
import axios from 'axios';
import { VideoSource, VideoSourceDocument } from '../../database/schemas/series.schema';

@Processor('video-check', { concurrency: 5 })
export class VideoCheckProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoCheckProcessor.name);

  constructor(
    @InjectModel('VideoSource') private videoSourceModel: Model<VideoSourceDocument>,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    if (job.name === 'check-all-sources') {
      return this.checkAllSources();
    }
    if (job.name === 'check-source') {
      return this.checkSingleSource(job.data.sourceId);
    }
  }

  private async checkAllSources() {
    const sources = await this.videoSourceModel.find({ isActive: true }).select('_id url type');
    this.logger.log(`Checking ${sources.length} video sources...`);

    let healthy = 0, unhealthy = 0;
    for (const source of sources) {
      const isHealthy = await this.checkUrl(source.url, source.type);
      await this.videoSourceModel.updateOne(
        { _id: source._id },
        {
          $set: { isHealthy, lastChecked: new Date() },
          ...(isHealthy
            ? { $set: { failCount: 0 } }
            : { $inc: { failCount: 1 } }),
        },
      );

      // Auto-disable after 5 consecutive failures
      if (!isHealthy) {
        const src = await this.videoSourceModel.findById(source._id);
        if (src && src.failCount >= 5) {
          await this.videoSourceModel.updateOne({ _id: source._id }, { $set: { isActive: false } });
          this.logger.warn(`Source auto-disabled: ${source._id}`);
        }
        unhealthy++;
      } else {
        healthy++;
      }
    }

    return { checked: sources.length, healthy, unhealthy };
  }

  private async checkSingleSource(sourceId: string) {
    const source = await this.videoSourceModel.findById(sourceId);
    if (!source) return;

    const isHealthy = await this.checkUrl(source.url, source.type);
    await this.videoSourceModel.updateOne(
      { _id: sourceId },
      { $set: { isHealthy, lastChecked: new Date() } },
    );
    return { isHealthy };
  }

  private async checkUrl(url: string, type: string): Promise<boolean> {
    try {
      if (type === 'hls') {
        // For HLS, check if the m3u8 manifest is reachable
        const response = await axios.head(url, { timeout: 5000 });
        return response.status === 200;
      } else {
        const response = await axios.head(url, { timeout: 5000 });
        return response.status < 400;
      }
    } catch {
      return false;
    }
  }
}

// ─────────────────────────────────────────────────────
// src/queue/cron-jobs.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class CronJobsService {
  private readonly logger = new Logger(CronJobsService.name);

  constructor(
    @InjectQueue('content-sync') private contentSyncQueue: Queue,
    @InjectQueue('video-check') private videoCheckQueue: Queue,
    @InjectQueue('cache-refresh') private cacheRefreshQueue: Queue,
  ) {}

  // Every day at 6 AM - Sync trending content
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async syncTrendingContent() {
    this.logger.log('⚡ Cron: Syncing trending content');
    await this.contentSyncQueue.add('sync-trending-movies', {}, { priority: 1 });
    await this.contentSyncQueue.add('sync-trending-series', {}, { priority: 1 });
  }

  // Every 6 hours - Sync popular content
  @Cron('0 */6 * * *')
  async syncPopularContent() {
    this.logger.log('⚡ Cron: Syncing popular content');
    await this.contentSyncQueue.add('sync-popular-movies', { pages: 3 }, { priority: 2 });
    await this.contentSyncQueue.add('sync-popular-series', {}, { priority: 2 });
  }

  // Every day at 8 AM - Now playing
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async syncNowPlaying() {
    this.logger.log('⚡ Cron: Syncing now playing');
    await this.contentSyncQueue.add('sync-now-playing', {}, { priority: 2 });
  }

  // Every 4 hours - Check video health
  @Cron('0 */4 * * *')
  async checkVideoSources() {
    this.logger.log('⚡ Cron: Health-checking video sources');
    await this.videoCheckQueue.add('check-all-sources', {}, { priority: 3 });
  }

  // Every 30 minutes - Refresh hot cache
  @Cron('*/30 * * * *')
  async refreshCache() {
    this.logger.log('⚡ Cron: Refreshing cache');
    await this.cacheRefreshQueue.add('refresh-homepage', {}, { priority: 1 });
  }
}
