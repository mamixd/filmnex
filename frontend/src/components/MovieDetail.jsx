import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Star, Home, ChevronRight, Calendar, Clock, Globe, User, 
  Play, Video, Share2, Plus, CheckCircle2, Tv, MapPin, 
  ThumbsUp, ThumbsDown, Info, Zap, Heart
} from 'lucide-react';
import PremiumPlayer from './PremiumPlayer';
import axios from 'axios';
import MovieCard from './MovieCard';

const API_URL = 'http://localhost:5000/api';

const MovieDetail = ({ movies }) => {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [activeSourceTab, setActiveSourceTab] = useState('dub'); // dub, sub, trailer
  const [isFollowed, setIsFollowed] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const viewCountedRef = React.useRef(null);

  useEffect(() => {
    if (!movies || movies.length === 0) return;
    
    // Aynı film için bu render döngüsünde zaten sayaç tetiklendiyse dur (Double Counting Fix)
    if (viewCountedRef.current === id) return;
    viewCountedRef.current = id;
    
    // Check login status
    setIsLoggedIn(!!localStorage.getItem('token'));

    const generateSlugLocal = (text) => text?.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
    
    // İzlenme sayısını artır ve detayları getir (Misafir veya Kayıtlı fark etmez)
    axios.get(`${API_URL}/movies/${id}`)
      .then(res => {
        const movieData = res.data;
        
        // Kaynakları da ekle (Daha detaylı verileri çekmek için)
        axios.get(`${API_URL}/movies/${movieData.id}/sources`)
          .then(sourceRes => {
            setMovie({ ...movieData, ...sourceRes.data });
            
            // Sadece kayıtlı kullanıcılar için 'İzleme Geçmişi' kaydet
            const token = localStorage.getItem('token');
            if (token) {
              axios.post(`${API_URL}/user/watch`, 
                { movieId: movieData.id }, 
                { headers: { Authorization: `Bearer ${token}` } }
              ).then(() => setIsWatched(true))
               .catch(e => console.error("Watch History error:", e));
            }
          })
          .catch(() => setMovie(movieData));
      })
      .catch(err => {
        console.error("Movie fetch error:", err);
        // Fallback: Prop'dan bul (Maalesef API hatası durumunda views artmaz)
        const foundMovie = movies.find(m => m.id === id || generateSlugLocal(m.title) === id);
        if (foundMovie) setMovie(foundMovie);
      });

    window.scrollTo(0, 0);
  }, [id, movies]);

  const handleRate = async (score) => {
    if (!isLoggedIn) {
        alert('Puan verebilmek için giriş yapmalısınız!');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const res = await axios.post(`${API_URL}/movies/${movie.id}/rate`, 
            { score },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        setUserRating(score);
        setMovie(curr => ({
            ...curr,
            siteRating: res.data.siteRating,
            siteVoteCount: res.data.siteVoteCount
        }));
        alert(`Teşekkürler! Filme ${score} puan verdiniz.`);
    } catch (err) {
        alert(err.response?.data?.error || 'Puan kaydedilirken hata oluştu.');
    }
  };

  const handleShare = async () => {
    const shareData = {
        title: movie.title,
        text: `${movie.title} filmini HDFilmLimani'nda izle!`,
        url: window.location.href
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(window.location.href);
            alert('Bağlantı kopyalandı!');
        }
    } catch (err) {
        console.error('Sharing failed:', err);
    }
  };

  const generateSlug = (text) => text?.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');

  const similarMovies = React.useMemo(() => {
    if (!movie || !movies) return [];
    const mainGenre = movie.genre?.split(',')[0].trim();
    return movies
      .filter(m => m.id !== movie.id && m.genre?.includes(mainGenre))
      .slice(0, 6);
  }, [movie, movies]);

  if (!movie) return <div className="container py-20 text-center text-white text-xl">Film Bilgileri Yükleniyor...</div>;

  const trailerUrl = movie.players?.find(p => p.source.toLowerCase().includes('fragman') || p.source.toLowerCase().includes('trailer'))?.url;

  return (
    <div className={`hd-detail-v2 ${isCinemaMode ? 'cinema-active' : ''}`}>
      <div className="container">
        {/* Header Section */}
        <div className="detail-header-v2">
          <h1 className="detail-title-v2">
            {movie.title} <span className="detail-year-v2">({movie.year})</span>
          </h1>
          {movie.originalTitle && movie.originalTitle !== movie.title && (
            <div className="detail-original-title-v2">{movie.originalTitle}</div>
          )}
          
          <div className="hd-breadcrumb" style={{ marginTop: '15px', background: 'transparent', padding: 0 }}>
            <Link to="/"><Home size={14} /></Link>
            <ChevronRight size={14} />
            <Link to="/">{movie.year}</Link>
            <ChevronRight size={14} />
            <span>{movie.title}</span>
          </div>
        </div>

        {/* Action Tabs & Player Controls */}
        <div className="detail-actions-bar">
          <div className="actions-left-v2">
            <button 
              className={`action-tab-v2 ${activeSourceTab === 'sub' ? 'active' : ''}`}
              onClick={() => setActiveSourceTab('sub')}
            >
              <Globe size={16} /> Türkçe Altyazılı
            </button>
            <button 
              className={`action-tab-v2 ${activeSourceTab === 'dub' ? 'active' : ''}`}
              onClick={() => setActiveSourceTab('dub')}
            >
              <Tv size={16} /> Türkçe Dublaj
            </button>
            {trailerUrl && (
              <button 
                className={`action-tab-v2 btn-trailer-v2 ${activeSourceTab === 'trailer' ? 'active' : ''}`}
                onClick={() => setActiveSourceTab('trailer')}
              >
                <Video size={16} /> Fragman
              </button>
            )}
          </div>
          <div className="actions-right-v2">
            <button 
              className="btn-cinema-v2"
              onClick={() => setIsCinemaMode(!isCinemaMode)}
              style={{ color: isCinemaMode ? '#FF2B5E' : '#eab308' }}
            >
              <Zap size={16} fill={isCinemaMode ? '#FF2B5E' : 'none'} /> {isCinemaMode ? 'Normal Mod' : 'Sinema Modu'}
            </button>
          </div>
        </div>

        {/* Player Container */}
        <div className="detail-player-container-v2">
          <PremiumPlayer 
            movieTitle={movie.title}
            movieId={movie.id}
            initialAudioSource={activeSourceTab}
            onSourceChange={setActiveSourceTab}
            sources={{
              dub: movie.players?.find(p => p.source.toLowerCase().includes('dub'))?.url || movie.directSource,
              sub: movie.players?.find(p => p.source.toLowerCase().includes('sub'))?.url || movie.directSourceAlt,
              original: movie.directSourceOriginal,
              trailer: trailerUrl
            }}
            subtitles={movie.subtitles || []}
          />
        </div>

        {/* Main Info Grid */}
        <div className="detail-main-grid-v2">
          {/* Left Column: Poster */}
          <div className="detail-poster-column-v2">
            <img src={movie.image || movie.poster} alt={movie.title} />
          </div>

          {/* Middle Column: Info & Synopsis */}
          <div className="detail-info-column-v2">
            <div className="info-box-v2">
              <h3>{movie.title} Film Bilgileri</h3>
              <p className="info-synopsis-v2">
                {movie.description || 'Bu film için henüz bir özet girilmemiş.'}
              </p>
            </div>

            <table className="info-table-v2">
              <tbody>
                <tr className="info-row-v2">
                  <td className="info-cell-v2 info-label-v2">Tür:</td>
                  <td className="info-cell-v2 info-value-v2">{movie.genre}</td>
                </tr>
                <tr className="info-row-v2">
                  <td className="info-cell-v2 info-label-v2">Dil:</td>
                  <td className="info-cell-v2 info-value-v2">{movie.lang || 'Türkçe Dublaj & Altyazı'}</td>
                </tr>
                <tr className="info-row-v2">
                  <td className="info-cell-v2 info-label-v2">Süre:</td>
                  <td className="info-cell-v2 info-value-v2">105 Dakika</td>
                </tr>
                <tr className="info-row-v2">
                  <td className="info-cell-v2 info-label-v2">İzlenme:</td>
                  <td className="info-cell-v2 info-value-v2">{movie.views || 0}</td>
                </tr>
                <tr className="info-row-v2">
                  <td className="info-cell-v2 info-label-v2">Yıl:</td>
                  <td className="info-cell-v2 info-value-v2">{movie.year}</td>
                </tr>
                <tr className="info-row-v2">
                  <td className="info-cell-v2 info-label-v2">Ülke:</td>
                  <td className="info-cell-v2 info-value-v2">ABD</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Right Column: Sidebar Actions */}
          <div className="detail-sidebar-column-v2">
            <button 
                className="sidebar-action-btn-v2"
                style={{ color: isWatched ? '#22c55e' : 'inherit' }}
                onClick={() => {
                  if (!isLoggedIn) return alert('Bu özelliği kullanabilmek için giriş yapmalısınız!');
                  setIsWatched(!isWatched);
                }}
            >
              {isWatched ? <CheckCircle2 size={18} fill="#22c55e" color="#fff" /> : <CheckCircle2 size={18} />} 
              {isWatched ? 'İzledim olarak işaretlendi' : 'İzledim olarak işaretle'}
            </button>
            <button 
                className="sidebar-action-btn-v2"
                onClick={() => {
                  if (!isLoggedIn) return alert('Bu özelliği kullanabilmek için giriş yapmalısınız!');
                  setIsFollowed(!isFollowed);
                }}
                style={{ color: isFollowed ? '#FF2B5E' : 'inherit' }}
            >
              {isFollowed ? <Heart size={18} fill="#FF2B5E" color="#FF2B5E" /> : <Plus size={18} />} 
              {isFollowed ? 'Takibi Bırak' : 'Takip Et'}
            </button>
            <button className="sidebar-action-btn-v2" onClick={handleShare}>
              <Share2 size={18} /> Paylaş
            </button>

            <div className="sidebar-rating-card-v2">
              <div className="rating-header-v2">Site Puanı</div>
              <div className="site-rating-v2">
                <Star size={32} color="#FF2B5E" fill="#FF2B5E" />
                <span className="rating-score-v2">{movie.siteRating || '0.0'}</span>
                <span className="rating-max-v2">/ 10</span>
              </div>
              <div className="rating-count-v2">{movie.siteVoteCount || 0} kişi oy verdi</div>
              
              <div className="rating-header-v2" style={{ marginTop: '20px' }}>Senin Puanın: {userRating || 'Henüz Yok'}</div>
              <div className="star-rating-v2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                  <Star 
                    key={star} 
                    size={18} 
                    className="clickable-star" 
                    fill={star <= (userRating || 0) ? '#eab308' : 'none'}
                    color={star <= (userRating || 0) ? '#eab308' : '#333'}
                    onClick={() => handleRate(star)}
                  />
                ))}
              </div>
            </div>

            <div className="sidebar-rating-card-v2" style={{ background: '#eab308', color: '#000', border: 'none' }}>
              <div className="rating-header-v2" style={{ color: '#000', opacity: 0.6 }}>IMDb Puanı</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '900' }}>{movie.rating}</div>
            </div>
          </div>
        </div>

        {/* Similar Movies */}
        <div className="similar-movies-v2">
          <h3>Benzer Filmler</h3>
          <div className="similar-grid-v2">
            {similarMovies.map(m => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetail;
