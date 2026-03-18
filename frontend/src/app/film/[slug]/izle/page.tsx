// src/app/film/[slug]/izle/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import WatchPageClient from './WatchPageClient';
import { getMovie } from '@/lib/api';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const movie = await getMovie(params.slug);
  if (!movie) return {};

  return {
    title: `${movie.title} izle - CineMax`,
    description: movie.overview?.slice(0, 160),
    openGraph: {
      title: `${movie.title} izle`,
      description: movie.overview,
      images: [{ url: movie.backdropPath || movie.posterPath }],
      type: 'video.movie',
    },
    other: {
      'video:release_date': movie.releaseDate,
    },
  };
}

export default async function WatchPage({ params }: Props) {
  const movie = await getMovie(params.slug);
  if (!movie) notFound();

  // JSON-LD Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: movie.title,
    description: movie.overview,
    image: movie.posterPath,
    datePublished: movie.releaseDate,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: movie.voteAverage,
      ratingCount: movie.voteCount,
      bestRating: 10,
    },
    genre: movie.genres,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <WatchPageClient movie={movie} />
    </>
  );
}

// src/app/film/[slug]/izle/WatchPageClient.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Star, Clock, Calendar, Heart, Share2, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getVideoSources } from '@/lib/api';
import { useWatchProgress } from '@/lib/hooks/useWatchProgress';
import { useAuth } from '@/lib/hooks/useAuth';

const VideoPlayer = dynamic(() => import('@/components/player/VideoPlayer'), { ssr: false });

export default function WatchPageClient({ movie }: { movie: any }) {
  const router = useRouter();
  const { user } = useAuth();
  const { saveProgress, getProgress } = useWatchProgress();
  const [videoSources, setVideoSources] = useState<any[]>([]);
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const savedProgress = getProgress(movie._id);

  useEffect(() => {
    (async () => {
      try {
        const data = await getVideoSources('movie', movie._id);
        setVideoSources(data.sources || []);
        setSubtitles(data.subtitles || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [movie._id]);

  const handleProgress = (currentTime: number, duration: number) => {
    if (user) saveProgress(movie._id, 'movie', currentTime, duration);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Backdrop */}
      {movie.backdropPath && (
        <div className="fixed inset-0 opacity-10 pointer-events-none">
          <Image src={movie.backdropPath} alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0f]" />
        </div>
      )}

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span>Geri Dön</span>
        </button>

        {/* Player */}
        <div className="mb-6">
          {loading ? (
            <div className="aspect-video bg-white/5 rounded-xl flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : videoSources.length > 0 ? (
            <VideoPlayer
              sources={videoSources}
              subtitles={subtitles}
              poster={movie.backdropPath || movie.posterPath}
              title={movie.title}
              startTime={savedProgress?.progress || 0}
              onProgress={handleProgress}
              autoplay
            />
          ) : (
            <div className="aspect-video bg-white/5 rounded-xl flex flex-col items-center justify-center gap-4">
              <div className="text-5xl">🎬</div>
              <p className="text-white/50">Bu film için henüz video kaynağı eklenmemiş</p>
            </div>
          )}
        </div>

        {/* Movie Info */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Poster */}
          <div className="hidden lg:block flex-shrink-0">
            <div className="relative w-48 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              <Image
                src={movie.posterPath || '/placeholder-poster.jpg'}
                alt={movie.title}
                width={192}
                height={288}
                className="object-cover"
              />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1">
            <h1 className="text-3xl lg:text-4xl font-bold mb-2 tracking-tight">{movie.title}</h1>
            {movie.originalTitle !== movie.title && (
              <p className="text-white/40 mb-4 italic">{movie.originalTitle}</p>
            )}

            {/* Meta badges */}
            <div className="flex flex-wrap gap-3 mb-5">
              {movie.voteAverage > 0 && (
                <div className="flex items-center gap-1.5 bg-yellow-500/15 text-yellow-400 px-3 py-1.5 rounded-full text-sm font-medium">
                  <Star size={14} fill="currentColor" />
                  {movie.voteAverage.toFixed(1)}
                </div>
              )}
              {movie.runtime > 0 && (
                <div className="flex items-center gap-1.5 bg-white/10 text-white/70 px-3 py-1.5 rounded-full text-sm">
                  <Clock size={14} />
                  {Math.floor(movie.runtime / 60)}s {movie.runtime % 60}dk
                </div>
              )}
              {movie.releaseDate && (
                <div className="flex items-center gap-1.5 bg-white/10 text-white/70 px-3 py-1.5 rounded-full text-sm">
                  <Calendar size={14} />
                  {new Date(movie.releaseDate).getFullYear()}
                </div>
              )}
            </div>

            {/* Genres */}
            {movie.genres?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {movie.genres.map((genre: string) => (
                  <span key={genre} className="px-3 py-1 bg-red-600/20 text-red-400 rounded-full text-xs font-medium border border-red-500/20">
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            <p className="text-white/70 leading-relaxed mb-6 max-w-2xl">{movie.overview}</p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                  isFavorite
                    ? 'bg-red-600 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/15'
                }`}
              >
                <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
                {isFavorite ? 'Favorilerde' : 'Favorilere Ekle'}
              </button>
              <button
                onClick={() => navigator.share?.({ title: movie.title, url: window.location.href })}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white/70 rounded-xl font-medium transition-all"
              >
                <Share2 size={16} />
                Paylaş
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
