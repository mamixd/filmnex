// src/database/schemas/movie.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MovieDocument = Movie & Document;

@Schema({ timestamps: true, collection: 'movies' })
export class Movie {
  @Prop({ required: true, unique: true })
  tmdbId: number;

  @Prop({ required: true })
  title: string;

  @Prop()
  originalTitle: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  overview: string;

  @Prop()
  posterPath: string;

  @Prop()
  backdropPath: string;

  @Prop()
  releaseDate: string;

  @Prop()
  runtime: number;

  @Prop({ type: [String], default: [] })
  genres: string[];

  @Prop({ type: [Number], default: [] })
  genreIds: number[];

  @Prop({ default: 0 })
  voteAverage: number;

  @Prop({ default: 0 })
  voteCount: number;

  @Prop({ default: 0 })
  popularity: number;

  @Prop({ default: 'tr' })
  language: string;

  @Prop({ type: [String], default: [] })
  spokenLanguages: string[];

  @Prop({ type: [String], default: [] })
  productionCountries: string[];

  @Prop({ default: false })
  adult: boolean;

  @Prop({ default: true })
  isPublished: boolean;

  @Prop({ default: false })
  isTrending: boolean;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'VideoSource' }] })
  videoSources: Types.ObjectId[];

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const MovieSchema = SchemaFactory.createForClass(Movie);

// Indexes
MovieSchema.index({ tmdbId: 1 }, { unique: true });
MovieSchema.index({ slug: 1 }, { unique: true });
MovieSchema.index({ createdAt: -1 });
MovieSchema.index({ popularity: -1 });
MovieSchema.index({ voteAverage: -1 });
MovieSchema.index({ isTrending: 1 });
MovieSchema.index({ genres: 1 });
MovieSchema.index({ releaseDate: -1 });
MovieSchema.index({ title: 'text', overview: 'text' });
