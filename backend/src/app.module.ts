// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bullmq';
import * as redisStore from 'cache-manager-ioredis-yet';

import { MoviesModule } from './modules/movies/movies.module';
import { SeriesModule } from './modules/series/series.module';
import { EpisodesModule } from './modules/episodes/episodes.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { VideoModule } from './modules/video/video.module';
import { AdminModule } from './modules/admin/admin.module';
import { QueueModule } from './queue/queue.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import tmdbConfig from './config/tmdb.config';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, tmdbConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
        dbName: configService.get<string>('database.name'),
      }),
      inject: [ConfigService],
    }),

    // Redis Cache
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        password: configService.get('REDIS_PASSWORD'),
        ttl: 300, // 5 minutes default
      }),
      inject: [ConfigService],
    }),

    // BullMQ
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
      { name: 'long', ttl: 60000, limit: 200 },
    ]),

    // Cron Jobs
    ScheduleModule.forRoot(),

    // Feature Modules
    MoviesModule,
    SeriesModule,
    EpisodesModule,
    UsersModule,
    AuthModule,
    VideoModule,
    AdminModule,
    QueueModule,
  ],
})
export class AppModule {}
