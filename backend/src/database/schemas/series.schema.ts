// src/database/schemas/series.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SeriesDocument = Series & Document;

@Schema({ timestamps: true, collection: 'series' })
export class Series {
  @Prop({ required: true, unique: true })
  tmdbId: number;

  @Prop({ required: true })
  name: string;

  @Prop()
  originalName: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  overview: string;

  @Prop()
  posterPath: string;

  @Prop()
  backdropPath: string;

  @Prop()
  firstAirDate: string;

  @Prop()
  lastAirDate: string;

  @Prop({ default: 0 })
  numberOfSeasons: number;

  @Prop({ default: 0 })
  numberOfEpisodes: number;

  @Prop({ type: [String], default: [] })
  genres: string[];

  @Prop({ default: 0 })
  voteAverage: number;

  @Prop({ default: 0 })
  popularity: number;

  @Prop({ default: 'Continuing' })
  status: string;

  @Prop({ default: true })
  isPublished: boolean;

  @Prop({ default: false })
  isTrending: boolean;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Season' }] })
  seasons: Types.ObjectId[];
}

export const SeriesSchema = SchemaFactory.createForClass(Series);
SeriesSchema.index({ tmdbId: 1 }, { unique: true });
SeriesSchema.index({ slug: 1 }, { unique: true });
SeriesSchema.index({ popularity: -1 });
SeriesSchema.index({ name: 'text', overview: 'text' });

// ─────────────────────────────────────────────
// src/database/schemas/episode.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EpisodeDocument = Episode & Document;

@Schema({ timestamps: true, collection: 'episodes' })
export class Episode {
  @Prop({ required: true })
  tmdbId: number;

  @Prop({ type: Types.ObjectId, ref: 'Series', required: true })
  seriesId: Types.ObjectId;

  @Prop({ required: true })
  seasonNumber: number;

  @Prop({ required: true })
  episodeNumber: number;

  @Prop({ required: true })
  name: string;

  @Prop()
  overview: string;

  @Prop()
  stillPath: string;

  @Prop()
  airDate: string;

  @Prop({ default: 0 })
  runtime: number;

  @Prop({ default: 0 })
  voteAverage: number;

  @Prop({ default: true })
  isPublished: boolean;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'VideoSource' }] })
  videoSources: Types.ObjectId[];
}

export const EpisodeSchema = SchemaFactory.createForClass(Episode);
EpisodeSchema.index({ seriesId: 1, seasonNumber: 1, episodeNumber: 1 });
EpisodeSchema.index({ tmdbId: 1 });

// ─────────────────────────────────────────────
// src/database/schemas/video-source.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VideoSourceDocument = VideoSource & Document;

export enum VideoSourceType {
  HLS = 'hls',
  MP4 = 'mp4',
  EMBED = 'embed',
}

export enum VideoQuality {
  Q1080 = '1080p',
  Q720 = '720p',
  Q480 = '480p',
  Q360 = '360p',
  AUTO = 'auto',
}

@Schema({ timestamps: true, collection: 'videoSources' })
export class VideoSource {
  @Prop({ required: true, enum: VideoSourceType })
  type: VideoSourceType;

  @Prop({ required: true })
  url: string;

  @Prop({ enum: VideoQuality, default: VideoQuality.AUTO })
  quality: VideoQuality;

  @Prop({ default: 1 })
  priority: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastChecked: Date;

  @Prop({ default: true })
  isHealthy: boolean;

  @Prop({ default: 0 })
  failCount: number;

  @Prop({ type: Object })
  subtitles: Array<{ lang: string; label: string; url: string }>;

  @Prop()
  contentId: string; // movie or episode id

  @Prop({ enum: ['movie', 'episode'] })
  contentType: string;
}

export const VideoSourceSchema = SchemaFactory.createForClass(VideoSource);
VideoSourceSchema.index({ contentId: 1, contentType: 1 });
VideoSourceSchema.index({ isActive: 1, isHealthy: 1 });

// ─────────────────────────────────────────────
// src/database/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  username: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ default: 'user', enum: ['user', 'admin', 'moderator'] })
  role: string;

  @Prop()
  avatar: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: [] })
  favorites: string[];

  @Prop({
    type: [
      {
        contentId: String,
        contentType: String,
        progress: Number,
        duration: Number,
        updatedAt: Date,
      },
    ],
    default: [],
  })
  watchHistory: Array<{
    contentId: string;
    contentType: string;
    progress: number;
    duration: number;
    updatedAt: Date;
  }>;

  @Prop({ type: Object, default: {} })
  preferences: {
    language?: string;
    autoplay?: boolean;
    quality?: string;
    subtitles?: boolean;
  };
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 }, { unique: true });
