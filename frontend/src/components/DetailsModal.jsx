import React, { useState, useEffect } from 'react';
import { Play, X, Star, Zap, Volume2 } from 'lucide-react';
import PremiumPlayer from './PremiumPlayer';

const DetailsModal = ({ movie, isOpen, onClose }) => {
  const [showPlayer, setShowPlayer] = useState(false);
  const [resolvedId, setResolvedId] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [activeSource, setActiveSource] = useState('dub'); 
  const [turkishTitle, setTurkishTitle] = useState('');

  useEffect(() => {
    if (isOpen && movie) {
      setShowPlayer(false);
      setResolvedId(null);
      setActiveSource(movie.directSource ? 'dub' : (movie.directSourceAlt ? 'sub' : 'original'));
      setTurkishTitle('');

      if (movie.id && String(movie.id).startsWith('bot-')) {
        resolveId(movie.title);
      } else {
        setResolvedId(movie.id);
        fetchMovieTitles(movie.id, movie.type);
      }
    }
  }, [isOpen, movie]);

  const fetchMovieTitles = async (id, type) => {
    const TMDB_KEY = 'aa772c74751e0ed9d9368a5e5423c448';
    const mediaType = type === 'tv' ? 'tv' : 'movie';
    try {
      const res = await fetch(`https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${TMDB_KEY}&language=tr-TR`);
      const data = await res.json();
      setTurkishTitle(data.title || data.name || movie.title);
    } catch (e) {
      setTurkishTitle(movie.title);
    }
  };

  const resolveId = async (title) => {
    setIsResolving(true);
    try {
      const TMDB_KEY = 'aa772c74751e0ed9d9368a5e5423c448';
      const cleanTitle = title.split(/[-:()]/)[0].trim();
      const year = movie.year && movie.year.length === 4 ? movie.year : null;

      let query = cleanTitle;
      if (year) query += ` ${year}`;

      const response = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=tr-TR`);
      const data = await response.json();
      const result = data.results?.find(r => r.media_type !== 'person');
      
      if (result) {
        setResolvedId(result.id);
        fetchMovieTitles(result.id, result.media_type);
      } else {
        const fallbackRes = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(cleanTitle)}&language=tr-TR`);
        const fallbackData = await fallbackRes.json();
        const fallbackResult = fallbackData.results?.find(r => r.media_type !== 'person');
        if (fallbackResult) {
          setResolvedId(fallbackResult.id);
          fetchMovieTitles(fallbackResult.id, fallbackResult.media_type);
        }
      }
    } catch (e) {
      console.error("Resolution failed:", e);
    } finally {
      setIsResolving(false);
    }
  };

  if (!movie || !isOpen) return null;

  const mediaType = movie.type === 'movie' ? 'movie' : 'tv';
  const idValue = resolvedId || movie.id;
  
  let playerUrl = null;
  if (activeSource === 0 && movie.directSource) {
      playerUrl = movie.directSource;
  } else if (activeSource === 1 && movie.directSourceAlt) {
      playerUrl = movie.directSourceAlt;
  }

  const sources = [
    { id: 'dub', name: 'Türkçe Dublaj', icon: <Volume2 size={18} />, hide: !movie.directSource },
    { id: 'sub', name: 'Türkçe Altyazılı', icon: <Zap size={18} />, hide: !movie.directSourceAlt },
    { id: 'original', name: 'Orijinal', icon: <Play size={18} />, hide: !movie.directSourceOriginal },
  ].filter(s => !s.hide);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>

        <div className="modal-body pb-layout">
          {/* Player at the top now */}
          {showPlayer && (
            <div className="modal-player-container-full">
              <PremiumPlayer 
                movieTitle={turkishTitle || movie.title}
                movieId={movie.id}
                sources={{
                  dub: movie.directSource,
                  sub: movie.directSourceAlt,
                  original: movie.directSourceOriginal
                }} 
                subtitles={movie.subtitles || []}
                initialAudioSource={activeSource}
              />
            </div>
          )}
          
          <div className="modal-details-row">
            <img src={movie.image} className="modal-poster-small" alt={movie.title} />
            <div className="modal-info-content">
              <h2 className="modal-title">{turkishTitle || movie.title}</h2>
              <div className="modal-meta-row">
                <span className="meta-badge">{movie.year}</span>
                <span className="meta-badge">{movie.genre || movie.label}</span>
                <div className="rating-badge">
                  <Star size={14} fill="currentColor" />
                  <span>{movie.rating}</span>
                </div>
              </div>
              <p className="modal-description-text">
                {movie.description}
              </p>
              
              <div className="modal-audio-controls">
                {sources.map(source => (
                  <button
                    key={source.id}
                    className={`audio-btn ${activeSource === source.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveSource(source.id);
                      if (!showPlayer) setShowPlayer(true);
                    }}
                    disabled={isResolving}
                  >
                    {source.icon}
                    <span>{source.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailsModal;
