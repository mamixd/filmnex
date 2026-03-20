import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  MessageSquare, Heart, Globe, Type, 
  ChevronRight, Star, TrendingUp, Calendar,
  Skull, Ghost, Rocket, Zap, Music, Smile, Swords
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const Sidebar = ({ setCategory, user }) => {
  const navigate = useNavigate();
  const [topMovies, setTopMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/movies/top`)
      .then(res => {
        setTopMovies(res.data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Top movies error:", err);
        setIsLoading(false);
      });
  }, []);

  const genres = [
    { name: 'Aile Filmleri', icon: <Swords size={16} /> },
    { name: 'Aksiyon Filmleri', icon: <Zap size={16} /> },
    { name: 'Animasyon Filmleri', icon: <Smile size={16} /> },
    { name: 'Belgesel Filmleri', icon: <Globe size={16} /> },
    { name: 'Bilim Kurgu Filmleri', icon: <Rocket size={16} /> },
    { name: 'Dram Filmleri', icon: <Heart size={16} /> },
    { name: 'Fantastik Filmler', icon: <Zap size={16} /> },
    { name: 'Gerilim Filmleri', icon: <Ghost size={16} /> },
    { name: 'Gizem Filmleri', icon: <Skull size={16} /> },
    { name: 'Komedi Filmleri', icon: <Smile size={16} /> },
    { name: 'Korku Filmleri', icon: <Skull size={16} /> },
  ];

  const generateSlug = (text) => text?.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');

  const formatViews = (val) => {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
    return val;
  };

  return (
    <aside className="hd-sidebar">
      {/* Film İstekleri */}
      <Link to="/iletisim?type=request" className="hd-sidebar-box request-box" style={{ textDecoration: 'none' }}>
        <div className="request-icon">
          <MessageSquare size={24} />
        </div>
        <div className="request-text">
          <h4>Film İstekleri</h4>
          <p>Film isteği yapabilirsiniz</p>
        </div>
      </Link>

      {/* Günün En Çok İzlenenleri */}
      <div className="hd-sidebar-box">
        <h3 className="hd-sidebar-title">GÜNÜN EN ÇOK İZLENENLERİ</h3>
        <div className="hd-trend-list">
          {isLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>Yükleniyor...</div>
          ) : topMovies.length > 0 ? (
            topMovies.map((trend, index) => (
              <Link 
                to={`/${generateSlug(trend.title)}`} 
                className={`hd-trend-item rank-${index + 1}`} 
                key={trend.id}
                style={{ textDecoration: 'none' }}
              >
                 <span className="trend-rank">#{index + 1}</span>
                 <div className="trend-info">
                   <span className="trend-title">{trend.title}</span>
                   <span className="trend-views"><TrendingUp size={12} /> {formatViews(trend.views)} izlenme</span>
                 </div>
              </Link>
            ))
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>Henüz veri yok.</div>
          )}
        </div>
      </div>

      {/* Dillere Göre */}
      <div className="hd-sidebar-box">
        <h3 className="hd-sidebar-title">Dillere Göre Filmler</h3>
        <div className="hd-lang-list">
          <button onClick={() => setCategory('dublaj')} className="hd-lang-item">
            <span role="img" aria-label="tr">🇹🇷</span> Türkçe Dublaj
          </button>
          <button onClick={() => setCategory('altyazi')} className="hd-lang-item">
             <span role="img" aria-label="cc">💬</span> Türkçe Altyazılı
          </button>
        </div>
      </div>

      {/* Türlere Göre */}
      <div className="hd-sidebar-box">
        <h3 className="hd-sidebar-title">Türlerine Göre Filmler</h3>
        <div className="hd-sidebar-genres">
          {genres.map(genre => (
            <button key={genre.name} onClick={() => setCategory(genre.name.toLowerCase().replace(' filmleri', '').replace(' film', ''))} className="hd-sidebar-genre-item">
              <span className="genre-icon">{genre.icon}</span>
              <span className="genre-name">{genre.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Özel Kategoriler */}
      <div className="hd-sidebar-box">
        <h3 className="hd-sidebar-title">Özel Kategoriler</h3>
        <div className="hd-sidebar-years">
          {['2025 Filmleri', '2024 Filmleri', '2023 Filmleri'].map(year => (
            <button key={year} onClick={() => setCategory(year.split(' ')[0])} className="hd-sidebar-year-item">
              {year}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
