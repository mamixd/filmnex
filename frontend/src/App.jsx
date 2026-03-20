import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import axios from 'axios';
import Navbar from './components/Navbar';
import MovieCard from './components/MovieCard';
import MovieDetail from './components/MovieDetail';
import Sidebar from './components/Sidebar';
import Admin from './components/Admin';
import Contact from './components/Contact';
import SecurityGuard from './components/SecurityGuard';
import DiscoverFilters from './components/DiscoverFilters';
import Profile from './components/Profile';
import TermsOfUse from './components/TermsOfUse';

const API_URL = 'http://localhost:5000/api';

function App() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all'); 
  const [currentPage, setCurrentPage] = useState(1);
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const ITEMS_PER_PAGE = 20;

  const [user, setUser] = useState({ 
    token: localStorage.getItem('token'), 
    username: localStorage.getItem('username'), 
    role: localStorage.getItem('role') 
  });

  const [exploreFilters, setExploreFilters] = useState({
    type: 'all',
    genre: 'all',
    year: 'all',
    rating: 'all',
    sort: 'newest'
  });

  useEffect(() => {
    console.log("Sunucu ile bağlantı kuruluyor...");
    axios.get(`${API_URL}/movies`)
      .then(res => {
         setMovies(res.data);
         setIsLoading(false);
      })
      .catch(err => {
         console.error(err);
         setIsLoading(false);
      });
  }, []);

  const handleSetCategory = (cat) => {
    setActiveCategory(cat);
    setSearchQuery('');
    setCurrentPage(1);
    navigate('/');
  };

  // Filter Logic In-Memory (Replacing Dexie IndexedDB)
  const filteredMovies = React.useMemo(() => {
    let result = [...movies];

    if (activeCategory === 'movie') {
      result = result.filter(m => m.type !== 'tv');
    } else if (activeCategory === 'tv') {
      result = result.filter(m => m.type === 'tv');
    } else if (activeCategory === 'dublaj') {
      result = result.filter(m => (m.lang && m.lang.toLowerCase().includes('dublaj')) || (m.genre && m.genre.toLowerCase().includes('dublaj')));
    } else if (activeCategory === 'altyazi') {
      result = result.filter(m => (m.lang && m.lang.toLowerCase().includes('altyazi')) || (m.genre && m.genre.toLowerCase().includes('altyazi')));
    } else if (activeCategory === 'explore') {
       // Film Robotu Filtreleri
       const f = exploreFilters;
       if (f.type !== 'all') result = result.filter(m => m.type === f.type);
       if (f.genre !== 'all') {
         result = result.filter(m => 
           (m.genres && m.genres.some(g => g.toLowerCase().includes(f.genre.toLowerCase()))) ||
           (m.genre && m.genre.toLowerCase().includes(f.genre.toLowerCase()))
         );
       }
       
       if (f.year !== 'all') {
          if (f.year === '2015-2010') result = result.filter(m => m.year >= 2010 && m.year <= 2015);
          else if (f.year === '2010-2000') result = result.filter(m => m.year >= 2000 && m.year < 2010);
          else if (f.year === 'before-2000') result = result.filter(m => m.year < 2000);
          else {
            const y = parseInt(f.year);
            result = result.filter(m => m.year === y || String(m.year) === f.year);
          }
       }

       if (f.rating !== 'all') {
          const minRating = parseFloat(f.rating);
          if (f.rating === '5 ve altı') result = result.filter(m => parseFloat(m.rating || 0) <= 5);
          else result = result.filter(m => parseFloat(m.rating || 0) >= minRating);
       }

       // Sıralama
       if (f.sort === 'newest') {
         result.sort((a,b) => (b.year || 0) - (a.year || 0) || new Date(b.createdAt) - new Date(a.createdAt));
       } else if (f.sort === 'oldest') {
         result.sort((a,b) => (a.year || 0) - (b.year || 0) || new Date(a.createdAt) - new Date(b.createdAt));
       } else if (f.sort === 'imdb_desc' || f.sort === 'views_desc') {
         result.sort((a,b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
       } else if (f.sort === 'imdb_asc' || f.sort === 'views_asc') {
         result.sort((a,b) => parseFloat(a.rating || 0) - parseFloat(b.rating || 0));
       }
    } else if (!isNaN(activeCategory) && String(activeCategory).length === 4) {
      result = result.filter(m => String(m.year) === String(activeCategory));
    } else if (activeCategory !== 'all' && activeCategory !== 'popular' && activeCategory !== 'imdb' && activeCategory !== 'upcoming') {
      result = result.filter(m => m.genre && m.genre.toLowerCase().includes(activeCategory.toLowerCase()));
    }
    
    // Yüksek Puandan Düşüğe Sıralama ve 500 Sınırı (IMDb Kategorisi)
    if (activeCategory === 'imdb') {
      result.sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
      result = result.slice(0, 500);
    }

    if (searchQuery) {
      const searchTerms = searchQuery.toLowerCase().split(' ');
      result = result.filter(m => 
        searchTerms.every(term => 
          m.title.toLowerCase().includes(term) || 
          (m.originalTitle && m.originalTitle.toLowerCase().includes(term))
        )
      );
    } else if (activeCategory === 'all' || activeCategory === 'movie' || activeCategory === 'tv') {
      // Varsayılan Kategorilerde Yıl Bazlı Sıralama (En Yeniden En Eskiye)
      result.sort((a,b) => (b.year || 0) - (a.year || 0) || new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    return result;
  }, [activeCategory, searchQuery, movies, exploreFilters]);

  const totalCount = filteredMovies.length;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const paginatedMovies = filteredMovies.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const renderMovieGrid = () => (
    <div className="container">
      <div className="main-layout">
        <div className="primary-content">
          {isLoading ? (
            <div className="flex justify-center flex-col items-center" style={{ padding: '5rem' }}>
              <div className="loader"></div>
              <p className="mt-4 text-text-muted text-sm font-bold">İçerikler Yükleniyor...</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '3rem' }}>
                <h2 className="section-title mb-4">
                  {searchQuery ? `"${searchQuery}" için sonuçlar` : 
                   activeCategory === 'all' ? 'En Yeni Eklenenler (HD Film izle)' : 
                   activeCategory === 'movie' ? 'FİLMLER' : 
                   activeCategory === 'tv' ? 'DİZİLER' : 
                   activeCategory === 'imdb' ? 'IMDb Puanı Yüksek Filmler' :
                   activeCategory === 'popular' ? 'En Çok İzlenenler' :
                   activeCategory === 'explore' ? 'Film Robotu: Keşfedin' :
                   !isNaN(activeCategory) && String(activeCategory).length === 4 ? `${activeCategory} Yılı Filmleri` :
                   `${activeCategory.toUpperCase()} Filmleri`}
                </h2>
                {activeCategory === 'explore' && (
                  <DiscoverFilters onFilter={(f) => { setExploreFilters(f); setCurrentPage(1); }} />
                )}
                <div className="movie-grid">
                  {paginatedMovies.map((item) => (
                    <MovieCard key={item.id} movie={item} />
                  ))}
                  {paginatedMovies.length === 0 && <p style={{color:'#888', gridColumn:'1/-1', textAlign:'center', padding:'30px'}}>Bu kategoride film bulunamadı.</p>}
                </div>

                {totalPages > 1 && (
                  <div className="pagination">
                    {currentPage > 1 && (
                      <button className="pagination-btn" onClick={() => { setCurrentPage(1); window.scrollTo(0, 0); }}>‹ İlk</button>
                    )}
                    {currentPage > 1 && (
                      <button className="pagination-btn" onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo(0, 0); }}>Önceki</button>
                    )}

                    <div className="pagination-pages">
                      {Array.from({length: totalPages}, (_, i) => i + 1)
                        .filter(i => i === 1 || i === totalPages || Math.abs(currentPage - i) <= 2)
                        .map((i, index, arr) => (
                          <React.Fragment key={i}>
                            {index > 0 && arr[index - 1] !== i - 1 && <span className="pagination-dots">...</span>}
                            <button className={`pagination-num ${currentPage === i ? 'active' : ''}`} onClick={() => { setCurrentPage(i); window.scrollTo(0, 0); }}>{i}</button>
                          </React.Fragment>
                      ))}
                    </div>

                    {currentPage < totalPages && (
                      <button className="pagination-btn" onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo(0, 0); }}>Sonraki</button>
                    )}
                    {currentPage < totalPages && (
                      <button className="pagination-btn" onClick={() => { setCurrentPage(totalPages); window.scrollTo(0, 0); }}>Son ›</button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="sidebar-content">
          <Sidebar setCategory={handleSetCategory} user={user} />
        </div>
      </div>
    </div>
  );

  const renderWithLayout = (children) => (
    <div className="min-h-screen page-wrapper">
      <SecurityGuard />
      <Navbar 
        onSearch={setSearchQuery} 
        searchQuery={searchQuery}
        searchResults={searchQuery ? filteredMovies : []} 
        currentCategory={activeCategory} 
        setCategory={handleSetCategory} 
        user={user}
        setUser={setUser}
      />
      <main>{children}</main>
      <footer style={{ padding: '3rem 0', background: 'var(--bg-main)', borderTop: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
          <Link to="/iletisim" style={{ color: '#888', textDecoration: 'none', fontSize: '0.9rem' }}>İletişim & Telif Hakkı</Link>
          <span style={{ color: '#222' }}>|</span>
          <Link to="/kullanim-kosullari" style={{ color: '#888', textDecoration: 'none', fontSize: '0.9rem' }}>Kullanım Koşulları</Link>
        </div>
        <p style={{ color: '#555', fontSize: '0.85rem' }}>
          © 2026 HDFilm-Limani - Tüm Hakları Saklıdır.
        </p>
      </footer>
    </div>
  );

  return (
    <Routes>
      <Route path="/" element={renderWithLayout(renderMovieGrid())} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/iletisim" element={renderWithLayout(<Contact user={user} />)} />
      <Route path="/profil" element={renderWithLayout(<Profile user={user} />)} />
      <Route path="/kullanim-kosullari" element={renderWithLayout(<TermsOfUse />)} />
      <Route path="/:id" element={renderWithLayout(<MovieDetail movies={movies} />)} />
    </Routes>
  );
}

export default App;
