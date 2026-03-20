import React, { useState } from 'react';
import { ChevronDown, Filter } from 'lucide-react';

const DiscoverFilters = ({ onFilter }) => {
  const [filters, setFilters] = useState({
    type: 'all',
    genre: 'all',
    year: 'all',
    rating: 'all',
    sort: 'newest'
  });

  const [activeDropdown, setActiveDropdown] = useState(null);

  const options = {
    type: [
      { id: 'all', label: 'Tümü' },
      { id: 'movie', label: 'Filmler' },
      { id: 'tv', label: 'Diziler' }
    ],
    genre: [
      { id: 'all', label: 'Tüm Türler' },
      { id: 'aksiyon', label: 'Aksiyon' },
      { id: 'komedi', label: 'Komedi' },
      { id: 'korku', label: 'Korku' },
      { id: 'bilim kurgu', label: 'Bilim Kurgu' },
      { id: 'dram', label: 'Dram' },
      { id: 'macera', label: 'Macera' },
      { id: 'animasyon', label: 'Animasyon' },
      { id: 'gerilim', label: 'Gerilim' },
      { id: 'fantastik', label: 'Fantastik' },
    ],
    year: [
      { id: 'all', label: 'Tüm Yıllar' },
      { id: '2026', label: '2026' },
      { id: '2025', label: '2025' },
      { id: '2024', label: '2024' },
      { id: '2023', label: '2023' },
      { id: '2022', label: '2022' },
      { id: '2021', label: '2021' },
      { id: '2020', label: '2020' },
      { id: '2015-2010', label: '2015-2010 arası' },
      { id: '2010-2000', label: '2010-2000 arası' },
      { id: 'before-2000', label: '2000 öncesi' }
    ],
    rating: [
      { id: 'all', label: 'Tüm Puanlar' },
      { id: '9', label: '9+' },
      { id: '8', label: '8+' },
      { id: '7', label: '7+' },
      { id: '6', label: '6+' },
      { id: '5', label: '5 ve altı' }
    ],
    sort: [
      { id: 'newest', label: 'Yıla Göre (Yeniden Eskiye)' },
      { id: 'oldest', label: 'Yıla Göre (Eskiden Yeniye)' },
      { id: 'imdb_desc', label: 'IMDb Puanına Göre Yüksek' },
      { id: 'imdb_asc', label: 'IMDb Puanına Göre Düşük' },
      { id: 'views_desc', label: 'İzlenme (Yüksekten Düşüğe)' },
      { id: 'views_asc', label: 'İzlenme (Düşükten Yükseğe)' }
    ]
  };

  const handleSelect = (key, id) => {
    setFilters(prev => ({ ...prev, [key]: id }));
    setActiveDropdown(null);
  };

  const toggleDropdown = (key) => {
    setActiveDropdown(activeDropdown === key ? null : key);
  };

  return (
    <div className="hd-discover-section">
      <h2 className="hd-discover-title">Film Robotu</h2>
      <div className="hd-filter-grid">
        {/* Type Dropdown */}
        <div className="hd-filter-item">
          <button className="hd-filter-btn" onClick={() => toggleDropdown('type')}>
            {options.type.find(o => o.id === filters.type)?.label} <ChevronDown size={14} />
          </button>
          {activeDropdown === 'type' && (
            <div className="hd-filter-dropdown">
              {options.type.map(opt => (
                <button key={opt.id} onClick={() => handleSelect('type', opt.id)}>{opt.label}</button>
              ))}
            </div>
          )}
        </div>

        {/* Genre Dropdown */}
        <div className="hd-filter-item">
          <button className="hd-filter-btn" onClick={() => toggleDropdown('genre')}>
            {options.genre.find(o => o.id === filters.genre)?.label} <ChevronDown size={14} />
          </button>
          {activeDropdown === 'genre' && (
            <div className="hd-filter-dropdown">
              {options.genre.map(opt => (
                <button key={opt.id} onClick={() => handleSelect('genre', opt.id)}>{opt.label}</button>
              ))}
            </div>
          )}
        </div>

        {/* Year Dropdown */}
        <div className="hd-filter-item">
          <button className="hd-filter-btn" onClick={() => toggleDropdown('year')}>
            {options.year.find(o => o.id === filters.year)?.label} <ChevronDown size={14} />
          </button>
          {activeDropdown === 'year' && (
            <div className="hd-filter-dropdown">
              {options.year.map(opt => (
                <button key={opt.id} onClick={() => handleSelect('year', opt.id)}>{opt.label}</button>
              ))}
            </div>
          )}
        </div>

        {/* Rating Dropdown */}
        <div className="hd-filter-item">
          <button className="hd-filter-btn" onClick={() => toggleDropdown('rating')}>
            {options.rating.find(o => o.id === filters.rating)?.label} <ChevronDown size={14} />
          </button>
          {activeDropdown === 'rating' && (
            <div className="hd-filter-dropdown">
              {options.rating.map(opt => (
                <button key={opt.id} onClick={() => handleSelect('rating', opt.id)}>{opt.label}</button>
              ))}
            </div>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="hd-filter-item">
          <button className="hd-filter-btn" onClick={() => toggleDropdown('sort')}>
            {options.sort.find(o => o.id === filters.sort)?.label} <ChevronDown size={14} />
          </button>
          {activeDropdown === 'sort' && (
            <div className="hd-filter-dropdown">
              {options.sort.map(opt => (
                <button key={opt.id} onClick={() => handleSelect('sort', opt.id)}>{opt.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <button className="hd-filter-submit" onClick={() => onFilter(filters)}>
        Filtrele
      </button>

      {activeDropdown && <div className="hd-dropdown-overlay" onClick={() => setActiveDropdown(null)}></div>}
    </div>
  );
};

export default DiscoverFilters;
