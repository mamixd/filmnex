// src/modules/video/video.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VideoSource, VideoSourceDocument, VideoSourceType, VideoQuality } from '../../database/schemas/series.schema';

export interface VideoStreamResponse {
  sources: Array<{
    src: string;
    type: string;
    quality: string;
    priority: number;
  }>;
  subtitles: Array<{
    src: string;
    srclang: string;
    label: string;
    default?: boolean;
  }>;
  poster: string;
  title: string;
}

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    @InjectModel('VideoSource') private videoSourceModel: Model<VideoSourceDocument>,
  ) {}

  async getVideoSources(contentId: string, contentType: 'movie' | 'episode'): Promise<VideoStreamResponse> {
    const sources = await this.videoSourceModel
      .find({
        contentId,
        contentType,
        isActive: true,
        isHealthy: true,
      })
      .sort({ priority: 1 })
      .lean();

    if (!sources.length) {
      throw new NotFoundException('Bu içerik için video kaynağı bulunamadı');
    }

    const videoSources = sources.map((s) => ({
      src: s.url,
      type: this.getMimeType(s.type),
      quality: s.quality,
      priority: s.priority,
    }));

    const subtitles = sources[0]?.subtitles?.map((sub) => ({
      src: sub.url,
      srclang: sub.lang,
      label: sub.label,
      default: sub.lang === 'tr',
    })) || [];

    return {
      sources: videoSources,
      subtitles,
      poster: '',
      title: '',
    };
  }

  async addVideoSource(dto: {
    contentId: string;
    contentType: 'movie' | 'episode';
    url: string;
    type: VideoSourceType;
    quality: VideoQuality;
    priority?: number;
    subtitles?: Array<{ lang: string; label: string; url: string }>;
  }): Promise<VideoSourceDocument> {
    return this.videoSourceModel.create({
      ...dto,
      priority: dto.priority ?? 1,
      isActive: true,
      isHealthy: true,
    });
  }

  async removeVideoSource(sourceId: string): Promise<void> {
    await this.videoSourceModel.deleteOne({ _id: sourceId });
  }

  async toggleSource(sourceId: string, isActive: boolean): Promise<void> {
    await this.videoSourceModel.updateOne({ _id: sourceId }, { $set: { isActive } });
  }

  async getSourcesForAdmin(contentId: string, contentType: string) {
    return this.videoSourceModel.find({ contentId, contentType }).lean();
  }

  private getMimeType(type: VideoSourceType): string {
    switch (type) {
      case VideoSourceType.HLS:
        return 'application/x-mpegURL';
      case VideoSourceType.MP4:
        return 'video/mp4';
      case VideoSourceType.EMBED:
        return 'text/html';
      default:
        return 'video/mp4';
    }
  }
}

// ─────────────────────────────────────────────────────
// src/modules/video/video.controller.ts
import {
  Controller, Get, Post, Delete, Body, Param,
  UseGuards, Patch, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VideoService } from './video.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Video')
@Controller('v1/video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Get(':contentType/:contentId/sources')
  async getSources(
    @Param('contentType') contentType: 'movie' | 'episode',
    @Param('contentId') contentId: string,
  ) {
    return this.videoService.getVideoSources(contentId, contentType);
  }

  @Post('sources')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  async addSource(@Body() dto: any) {
    return this.videoService.addVideoSource(dto);
  }

  @Delete('sources/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSource(@Param('id') id: string) {
    return this.videoService.removeVideoSource(id);
  }

  @Patch('sources/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  async toggleSource(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.videoService.toggleSource(id, body.isActive);
  }
}

// ─────────────────────────────────────────────────────
// src/modules/video/video.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { VideoSource, VideoSourceSchema } from '../../database/schemas/series.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'VideoSource', schema: VideoSourceSchema }]),
  ],
  controllers: [VideoController],
  providers: [VideoService],
  exports: [VideoService],
})
export class VideoModule {}
