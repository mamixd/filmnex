import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, User, LogIn, Play, LogOut, ShieldAlert } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import AuthModal from './AuthModal';

const Navbar = ({ onSearch, searchQuery, searchResults, currentCategory, setCategory, user, setUser }) => {
  const navigate = useNavigate();
  const [localQuery, setLocalQuery] = useState(searchQuery || '');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const openAuth = (mode) => { setAuthMode(mode); setIsAuthOpen(true); };
  const handleLogout = () => { 
     localStorage.clear();
     setUser({}); 
     navigate('/');
  };

  const handleSearchChange = (val) => {
    setLocalQuery(val);
    onSearch(val);
  };

  const generateSlug = (text) => text.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');

  const handleResultClick = (movie) => {
    navigate(`/${generateSlug(movie.title)}`);
    onSearch('');
  };

  return (
    <>
    <nav className="hd-navbar">
      {/* Top Tier */}
      <div className="hd-navbar-top">
        <div className="container nav-top-container">
          <Link to="/" onClick={() => setCategory('all')} className="hd-logo">
            <div className="hd-logo-icon">
              <Play fill="currentColor" size={20} />
            </div>
            HDFilm<span>Limanı</span>
          </Link>

          <div className="hd-search-wrapper">
            <div className="hd-search-container">
              <input 
                type="text" 
                placeholder="Film adı veya IMDb ID'si ile ara" 
                value={localQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="hd-search-input"
              />
              <button className="hd-search-btn">
                <Search size={18} />
              </button>
            </div>

            {/* Search Results Dropdown */}
            {searchQuery && (
              <div className="hd-search-results">
                {searchResults.length > 0 ? (
                  <div className="hd-search-list">
                    {searchResults.slice(0, 5).map((movie) => (
                      <button 
                        key={movie.id} 
                        className="hd-search-item"
                        onClick={() => handleResultClick(movie)}
                      >
                        <img src={movie.poster || movie.image} alt={movie.title} />
                        <div className="hd-search-item-info">
                          <span className="hd-search-item-title">{movie.title}</span>
                          <span className="hd-search-item-meta">{movie.year} • {movie.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="hd-search-empty">Sonuç bulunamadı</div>
                )}
              </div>
            )}
          </div>

          <div className="hd-nav-auth">
            {user.token ? (
              <div className="profile-dropdown-container">
                <div className="profile-trigger">
                  <User size={18} style={{ color: 'var(--primary)' }} />
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>{user.username}</span>
                  <ChevronDown size={14} color="#666" />
                </div>
                
                <div className="dropdown-menu">
                  <div style={{ padding: '12px 15px', borderBottom: '1px solid #1a1a1a', marginBottom: '5px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{user.username}</div>
                    <div style={{ fontSize: '11px', color: '#555' }}>{user.role === 'admin' ? 'Sistem Yöneticisi' : 'Standart Üye'}</div>
                  </div>
                  
                  <button className="dropdown-item" onClick={() => navigate('/profil')}>
                    <User size={16} /> Profilim
                  </button>
                  
                  {user.role === 'admin' && (
                    <Link to="/admin" className="dropdown-item">
                      <ShieldAlert size={16} /> Admin Paneli
                    </Link>
                  )}
                  
                  <div style={{ height: '1px', background: '#1a1a1a', margin: '5px 0' }}></div>
                  
                  <button onClick={handleLogout} className="dropdown-item logout">
                    <LogOut size={16} /> Güvenli Çıkış
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => openAuth('register')} className="hd-auth-btn light">Kayıt Ol</button>
                <button onClick={() => openAuth('login')} className="hd-auth-btn primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LogIn size={16} /> Giriş Yap
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Tier */}
      <div className="hd-navbar-bottom">
        <div className="container nav-bottom-container">
          <ul className="hd-nav-links">
            <li><button onClick={() => setCategory('all')} className={currentCategory === 'all' ? 'active' : ''}>HD Filmler</button></li>
            <li><button onClick={() => setCategory('explore')} className={currentCategory === 'explore' ? 'active' : ''}>Keşfet</button></li>
            <li className="hd-nav-dropdown-wrapper">
              <button>Film Türleri <ChevronDown size={14} /></button>
              <div className="hd-nav-dropdown">
                {['Aksiyon', 'Komedi', 'Korku', 'Bilim Kurgu', 'Dram', 'Macera'].map(genre => (
                  <button key={genre} onClick={() => setCategory(genre.toLowerCase())} className={currentCategory === genre.toLowerCase() ? 'active' : ''}>{genre}</button>
                ))}
              </div>
            </li>
            <li><button onClick={() => setCategory('movie')} className={currentCategory === 'movie' ? 'active' : ''}>Filmlerimiz</button></li>
            <li><button onClick={() => setCategory('tv')} className={currentCategory === 'tv' ? 'active' : ''}>Dizilerimiz</button></li>
            <li><button onClick={() => setCategory('popular')} className={currentCategory === 'popular' ? 'active' : ''}>En Çok İzlenenler</button></li>
            <li><button onClick={() => setCategory('imdb')} className={currentCategory === 'imdb' ? 'active' : ''}>IMDb 500</button></li>
            <li className="hd-nav-dropdown-wrapper">
              <button>Yapım Yılı <ChevronDown size={14} /></button>
              <div className="hd-nav-dropdown grid-2">
                {[...Array(12)].map((_, i) => {
                  const year = (2026 - i).toString();
                  return <button key={year} onClick={() => setCategory(year)}>{year}</button>;
                })}
              </div>
            </li>
            <li style={{ marginLeft: 'auto' }}>
              <Link to="/iletisim" style={{ color: 'inherit', textDecoration: 'none' }}>
                <button className={window.location.pathname === '/iletisim' ? 'active' : ''}>İletişim</button>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
    <AuthModal isOpen={isAuthOpen} onClose={()=>setIsAuthOpen(false)} initialMode={authMode} onAuthSuccess={(data)=>setUser(data)} />
    </>
  );
};

export default Navbar;
