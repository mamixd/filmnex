import React from 'react';
import { Star, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

const MovieCard = ({ movie }) => {
  const generateSlug = (text) => text.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
  const movieSlug = generateSlug(movie.title);
  
  return (
    <Link 
      to={`/${movieSlug}`}
      className="hd-movie-card"
    >
      <div className="hd-card-poster">
        <img 
          src={movie.poster || movie.image} 
          alt={movie.title}
          loading="lazy"
        />
        
        {/* Language Badge */}
        <div className="hd-card-badge-left">
          <span className="hd-badge-lang">
            <span role="img" aria-label="tr">🇹🇷</span> {movie.label?.includes('Dublaj') ? 'DUBLAJ' : 'ALTYAZI'}
          </span>
        </div>

        {/* IMDB Badge */}
        {movie.rating && (
          <div className="hd-card-badge-right">
            <span className="hd-badge-imdb">
              <Star size={10} fill="currentColor" /> {movie.rating}
            </span>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="hd-card-overlay">
          <Play fill="currentColor" size={32} />
        </div>
      </div>

      <div className="hd-card-info">
        <span className="hd-card-year">{movie.year}</span>
        <h3 className="hd-card-title">{movie.title || movie.originalTitle}</h3>
      </div>
    </Link>
  );
};

export default MovieCard;

