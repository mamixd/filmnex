import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Film, LogOut, Radar, Terminal, Bot, Trash2, Database, ShieldAlert, ArrowLeft, Inbox, MessageSquare, Users, RefreshCw, Zap } from 'lucide-react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';

const adminStyles = `
  .hq-admin-wrap {
    background-color: #050505;
    background-image: radial-gradient(circle at top right, rgba(229, 9, 20, 0.05), transparent 600px);
    min-height: 100vh;
    color: #fff;
    display: flex;
    font-family: 'Roboto', sans-serif;
  }
  .hq-sidebar {
    width: 300px;
    background: #0a0a0a;
    border-right: 1px solid #1a1a1a;
    padding: 40px 25px;
    display: flex;
    flex-direction: column;
    z-index: 10;
  }
  .hq-logo {
    font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #fff;
    margin-bottom: 50px; display: flex; align-items: center; gap: 12px;
  }
  .hq-logo span { color: #FF2B5E; }
  .hq-nav-btn {
    width: 100%; display: flex; align-items: center; gap: 14px;
    padding: 16px 20px; border-radius: 12px; border: none;
    background: transparent; color: #777; font-size: 16px;
    font-weight: 600; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    text-align: left; margin-bottom: 10px;
  }
  .hq-nav-btn:hover { background: rgba(255,255,255,0.03); color: #fff; transform: translateX(5px); }
  .hq-nav-btn.active { background: #FF2B5E; color: #fff; box-shadow: 0 8px 25px rgba(255,43,94,0.35); transform: none; }
  .hq-main { flex: 1; padding: 50px 60px; overflow-y: auto; height: 100vh; position: relative; }
  .hq-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 50px; padding-bottom: 25px; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .hq-title { font-size: 32px; font-weight: 300; letter-spacing: 0.5px; }
  .hq-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 30px; margin-bottom: 50px; }
  .hq-card { background: rgba(255,255,255,0.02); border: 1px solid #1a1a1a; border-radius: 20px; padding: 35px; position: relative; overflow: hidden; backdrop-filter: blur(10px); transition: transform 0.3s; }
  .hq-card:hover { transform: translateY(-5px); border-color: #333; }
  .hq-card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: #FF2B5E; opacity: 0; transition: opacity 0.3s; }
  .hq-card:hover::before { opacity: 1; }
  .hq-stat-title { font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; color: #888; font-weight: 700; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
  .hq-stat-value { font-size: 48px; font-weight: 800; color: #fff; line-height: 1; }
  .hq-stat-subtitle { font-size: 13px; color: #555; margin-top: 10px; }
  
  .hq-action-btn { background: #FF2B5E; color: #fff; border: none; padding: 20px 40px; border-radius: 14px; font-size: 18px; font-weight: 800; cursor: pointer; transition: all 0.3s; box-shadow: 0 10px 30px rgba(255,43,94,0.3); display: inline-flex; align-items: center; gap: 12px; letter-spacing: 0.5px; }
  .hq-action-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 15px 40px rgba(229,9,20,0.4); }
  .hq-action-btn:disabled { opacity: 0.7; cursor: not-allowed; animation: pulse 2s infinite; background: #b9153a; }
  
  .hq-table-wrap { background: rgba(255,255,255,0.02); border: 1px solid #1a1a1a; border-radius: 20px; overflow: hidden; }
  .hq-table { width: 100%; border-collapse: collapse; text-align: left; }
  .hq-table th { padding: 24px; color: #777; font-size: 13px; text-transform: uppercase; font-weight: 800; border-bottom: 1px solid #1a1a1a; letter-spacing: 1px; }
  .hq-table td { padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.03); color: #ddd; vertical-align: middle; }
  .hq-table tr:hover { background: rgba(255,255,255,0.03); }
  
  .hq-login-bg { background-color: #050505; height: 100vh; display: flex; align-items: center; justify-content: center; background-image: radial-gradient(circle at center, rgba(255, 43, 94, 0.15), transparent 600px); color: #fff; font-family: 'Roboto', sans-serif;}
  .hq-login-box { background: rgba(10,10,10,0.8); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 60px 50px; width: 100%; max-width: 480px; box-shadow: 0 40px 100px rgba(0,0,0,0.8); backdrop-filter: blur(20px); text-align: center; }
  .hq-input { width: 100%; background: #0f0f0f; border: 1px solid #222; color: #fff; border-radius: 12px; padding: 18px 20px; font-size: 16px; margin-bottom: 24px; outline: none; transition: border-color 0.3s, box-shadow 0.3s; }
  .hq-input:focus { border-color: #FF2B5E; box-shadow: 0 0 0 4px rgba(255,43,94,0.1); }
  @keyframes pulse { 0% { opacity: 0.7; } 50% { opacity: 1; } 100% { opacity: 0.7; } }
  .terminal-box { background: #000; border: 1px solid #1a1a1a; border-radius: 14px; padding: 30px; max-height: 650px; overflow-y: auto; font-family: 'Courier New', monospace; font-size: 14px; box-shadow: inset 0 0 20px rgba(0,0,0,0.5); }
  
  .hq-message-card { background: rgba(255,255,255,0.02); border: 1px solid #1a1a1a; border-radius: 16px; padding: 25px; margin-bottom: 20px; transition: all 0.3s; position: relative; }
  .hq-message-card:hover { border-color: #FF2B5E; background: rgba(255,43,94,0.02); }
  .hq-message-header { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 15px; }
  .hq-message-badge { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
  .hq-message-badge.request { background: rgba(255,43,94,0.1); color: #FF2B5E; border: 1px solid rgba(255,43,94,0.2); }
  .hq-message-badge.contact { background: rgba(59,130,246,0.1); color: #3b82f6; border: 1px solid rgba(59,130,246,0.2); }
  .hq-message-info { font-size: 14px; color: #888; margin-bottom: 15px; }
  .hq-message-info strong { color: #fff; }
  .hq-message-body { font-size: 15px; line-height: 1.6; color: #ccc; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 10px; }

  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: #0a0a0a; }
  ::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: #FF2B5E; }
`;

const Admin = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token') && localStorage.getItem('role') === 'admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [movies, setMovies] = useState([]);
  const [defectMovies, setDefectMovies] = useState([]);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [isScraping, setIsScraping] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [manualIds, setManualIds] = useState({}); // MovieId -> ManualTMDBId

  useEffect(() => {
    // Inject Custom CSS
    const styleSheet = document.createElement("style");
    styleSheet.innerText = adminStyles;
    document.head.appendChild(styleSheet);
    
    if (isAuthenticated) {
      fetchMovies();
      fetchLogs();
      fetchMessages();
      fetchUsers();
      fetchDefectMovies();
    }
    
    return () => { document.head.removeChild(styleSheet); };
  }, [isAuthenticated]);

  const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const fetchMovies = () => axios.get(`${API_URL}/movies`).then(res => setMovies(res.data)).catch(console.error);
  const fetchDefectMovies = () => axios.get(`${API_URL}/admin/movies/check`, getAuthHeaders()).then(res => setDefectMovies(res.data)).catch(console.error);
  const fetchLogs = () => axios.get(`${API_URL}/admin/logs`, getAuthHeaders()).then(res => setLogs(res.data)).catch(console.error);
  const [messages, setMessages] = useState([]);
  const fetchMessages = () => axios.get(`${API_URL}/admin/support`, getAuthHeaders()).then(res => setMessages(res.data)).catch(console.error);
  
  const fetchUsers = () => axios.get(`${API_URL}/admin/users`, getAuthHeaders()).then(res => setUsers(res.data)).catch(console.error);

  const handleReSync = async (id, manualTmdbId = null) => {
    try {
      await axios.post(`${API_URL}/admin/movies/${id}/re-sync`, { tmdbId: manualTmdbId }, getAuthHeaders());
      fetchDefectMovies();
      fetchMovies();
      if (manualTmdbId) {
          setManualIds(prev => {
              const next = {...prev};
              delete next[id];
              return next;
          });
      }
    } catch(err) {
      alert("Senkronizasyon hatası");
    }
  };

  const handleAutoRepair = async () => {
    if (!window.confirm(`${defectMovies.length} adet kusurlu kayıt sırayla onarılacak. Onaylıyor musunuz?`)) return;
    setIsRepairing(true);
    for (const movie of defectMovies) {
      try {
        await axios.post(`${API_URL}/admin/movies/${movie._id}/re-sync`, {}, getAuthHeaders());
      } catch(e) { console.error(e); }
    }
    setIsRepairing(false);
    fetchDefectMovies();
    fetchMovies();
    alert("Otomatik onarım tamamlandı.");
  };

  const handleDeepScan = async () => {
    setIsRepairing(true);
    try {
      const res = await axios.post(`${API_URL}/admin/movies/scan`, {}, getAuthHeaders());
      alert(`Tarama Tamamlandı! ${res.data.scanned} film kontrol edildi, ${res.data.broken} adet bozuk link tespit edildi.`);
      fetchDefectMovies();
    } catch (err) {
      alert("Tarama sırasında hata oluştu");
    } finally {
      setIsRepairing(false);
    }
  };

  const deleteMessage = async (id) => {
    if(!window.confirm("Bu mesajı silmek istediğinize emin misiniz?")) return;
    try {
      await axios.delete(`${API_URL}/admin/support/${id}`, getAuthHeaders());
      fetchMessages();
    } catch(err) {
      alert("Silme hatası");
    }
  };

  const deleteUser = async (id) => {
    if(!window.confirm("Bu kullanıcıyı kalıcı olarak silmek istediğinize emin misiniz?")) return;
    try {
      await axios.delete(`${API_URL}/admin/users/${id}`, getAuthHeaders());
      fetchUsers();
    } catch(err) {
      alert(err.response?.data?.error || "Silme hatası");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
        const res = await axios.post(`${API_URL}/auth/login`, { username, password });
        if (res.data.role !== 'admin') {
            alert('Yetkisiz Erişim! Bu panele yalnızca sistem yöneticileri girebilir.');
            return;
        }
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('username', res.data.username);
        localStorage.setItem('role', res.data.role);
        setIsAuthenticated(true);
    } catch (err) {
        alert(err.response?.data?.error || 'Hatalı giriş bilgileri!');
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    setIsAuthenticated(false);
  };

  const handleScrape = async () => {
    if(!window.confirm("Otonom Ağ Motoru ateşlenecek. Onaylıyor musunuz?")) return;
    setIsScraping(true);
    try {
      const res = await axios.post(`${API_URL}/admin/scrape`, {}, getAuthHeaders());
      alert(res.data.message);
      fetchMovies();
      fetchLogs();
    } catch (err) {
      alert(err.response?.data?.error || 'Arka plan sunucu hatası.');
    } finally {
      setIsScraping(false);
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Bu filmi kalıcı olarak silmek istediğinize emin misiniz?")) return;
    try {
      await axios.delete(`${API_URL}/movies/${id}`, getAuthHeaders());
      fetchMovies();
    } catch(err) {
      alert('Silme işlemi başarısız');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="hq-login-bg">
        <div className="hq-login-box">
          <div style={{display:'flex', justifyContent:'center', marginBottom:'30px'}}>
             <div style={{width:'80px', height:'80px', background:'rgba(255,43,94,0.1)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(255,43,94,0.3)'}}>
                <ShieldAlert size={40} color="#FF2B5E" />
             </div>
          </div>
          <h2 style={{fontSize:'28px', fontWeight:'800', marginBottom:'10px', color:'#fff'}}>Yönetici Paneli</h2>
          <p style={{color:'#888', marginBottom:'40px', fontSize:'15px'}}>Yönetici Katmanı Güvenlik Doğrulaması</p>
          
          <form onSubmit={handleLogin}>
            <input 
              type="text" 
              placeholder="Yönetici ID (Kullanıcı Adı)" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="hq-input"
              required
            />
            <input 
              type="password" 
              placeholder="Erişim Şifresi" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="hq-input"
              required
            />
            <button type="submit" className="hq-action-btn" style={{width:'100%', justifyContent:'center', marginTop:'10px'}}>
               Ağa Bağlan
            </button>
          </form>
          <button onClick={() => navigate('/')} style={{marginTop:'30px', background:'none', border:'none', color:'#666', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', width:'100%', gap:'6px'}}>
             <ArrowLeft size={16} /> Siteye Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hq-admin-wrap">
      {/* Sidebar */}
      <aside className="hq-sidebar">
        <div className="hq-logo">
          YÖNETİM<span>PANELİ</span>
        </div>
        <nav style={{display:'flex', flexDirection:'column', flex:1}}>
          <button className={`hq-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={22} /> Sistem Özeti
          </button>
          <button className={`hq-nav-btn ${activeTab === 'movies' ? 'active' : ''}`} onClick={() => setActiveTab('movies')}>
            <Film size={22} /> MongoDB Veritabanı
          </button>
          <button className={`hq-nav-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <Users size={22} /> Kullanıcı Yönetimi
          </button>
          <button className={`hq-nav-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
            <Terminal size={22} /> Canlı Log Terminali
          </button>
          <button className={`hq-nav-btn ${activeTab === 'check' ? 'active' : ''}`} onClick={() => { setActiveTab('check'); fetchDefectMovies(); }}>
            <Radar size={22} /> Veri Kontrol Mercisi
            {defectMovies.length > 0 && <span style={{marginLeft:'auto', background:'#fff', color:'#FF2B5E', fontSize:'10px', padding:'2px 6px', borderRadius:'10px'}}>{defectMovies.length}</span>}
          </button>
          <button className={`hq-nav-btn ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => setActiveTab('inbox')}>
            <Inbox size={22} /> Gelen Mesajlar
            {messages.length > 0 && <span style={{marginLeft:'auto', background:'#fff', color:'#FF2B5E', fontSize:'10px', padding:'2px 6px', borderRadius:'10px'}}>{messages.length}</span>}
          </button>
          <div style={{flex:1}}></div>
          <button className="hq-nav-btn" style={{color:'#FF2B5E'}} onClick={handleLogout}>
            <LogOut size={22} /> Oturumu Sonlandır
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="hq-main">
        <header className="hq-header">
          <h3 className="hq-title">
            {activeTab === 'dashboard' ? 'Komuta Merkezi' : 
             activeTab === 'movies' ? 'Film Arşivi (Mongoose)' : 
             activeTab === 'users' ? 'Kullanıcı Listesi' :
             activeTab === 'check' ? 'Veri Kontrol Mercisi' :
             activeTab === 'logs' ? 'Sistem Günlükleri' : 'Mesaj Gelen Kutusu'}
          </h3>
          <button onClick={() => navigate('/')} style={{display:'flex', alignItems:'center', gap:'8px', padding:'12px 24px', background:'rgba(255,255,255,0.05)', color:'#fff', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', cursor:'pointer'}}>
             Arayüze Geç
          </button>
        </header>
        
        {activeTab === 'dashboard' && (
          <div>
            <div className="hq-grid">
              <div className="hq-card">
                <div className="hq-stat-title">Toplam İçerik <Database size={20} color="#3b82f6"/></div>
                <div className="hq-stat-value">{movies.length}</div>
                <div className="hq-stat-subtitle">Film ve Dizi indexlendi</div>
              </div>
              <div className="hq-card">
                <div className="hq-stat-title">Toplam Üye <Users size={20} color="#FF2B5E"/></div>
                <div className="hq-stat-value">{users.length}</div>
                <div className="hq-stat-subtitle">Kayıtlı kullanıcı sayısı</div>
              </div>
              <div className="hq-card">
                <div className="hq-stat-title">Zamanlayıcı Durumu <Bot size={20} color="#22c55e"/></div>
                <div className="hq-stat-value" style={{color:'#22c55e'}}>AKTİF</div>
                <div className="hq-stat-subtitle">node-cron arka planda çalışıyor</div>
              </div>
              <div className="hq-card" onClick={() => setActiveTab('check')} style={{cursor:'pointer', border: defectMovies.length > 0 ? '1px solid rgba(255,43,94,0.3)' : '1px solid #1a1a1a'}}>
                <div className="hq-stat-title">Kusurlu Kayıt <Radar size={20} color={defectMovies.length > 0 ? '#FF2B5E' : '#888'}/></div>
                <div className="hq-stat-value" style={{color: defectMovies.length > 0 ? '#FF2B5E' : '#fff'}}>{defectMovies.length}</div>
                <div className="hq-stat-subtitle">{defectMovies.length > 0 ? 'Onarılması gereken veri var' : 'Sistem verileri sağlıklı'}</div>
              </div>
            </div>
            
            <div className="hq-card" style={{padding:'50px'}}>
               <h3 style={{fontSize:'24px', fontWeight:'800', marginBottom:'15px', display:'flex', alignItems:'center', gap:'12px'}}>
                  <Bot size={32} color="#FF2B5E"/> Otomatik Taramayı Başlat
               </h3>
               <p style={{color:'#888', marginBottom:'40px', fontSize:'16px', lineHeight:'1.7', maxWidth:'800px'}}>
                  Her 60 dakikada bir otomatik çalışan veri kazıma (scraping) ve kod çözme süreçlerini beklemeden 
                  şimdi tetikleyebilirsiniz. Orijinal kaynak tarayıcı, yeni filmleri algılar ve TMDB API ile birleştirip 
                  kesintisiz sunucuya yazar.
               </p>
               <button onClick={handleScrape} disabled={isScraping} className="hq-action-btn">
                  {isScraping ? (
                    <><span style={{width:'20px', height:'20px', border:'3px solid #fff', borderTopColor:'transparent', borderRadius:'50%', animation:'pulse 1s linear infinite'}}></span> Otonom Algoritma Çalışıyor, Bekleyin...</>
                  ) : '🚀 Manuel Tam Taramayı Başlat'}
               </button>
            </div>
          </div>
        )}

        {activeTab === 'movies' && (
          <div className="hq-table-wrap">
            <table className="hq-table">
              <thead>
                <tr>
                  <th>Afiş</th>
                  <th>Film / Dizi Adı</th>
                  <th>Yıl / Puan</th>
                  <th>Oynatıcılar</th>
                  <th style={{textAlign:'right'}}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {movies.map(movie => (
                  <tr key={movie.id}>
                    <td>
                      <img src={movie.image || movie.poster} alt="" style={{width:'60px', height:'85px', objectFit:'cover', borderRadius:'6px', boxShadow:'0 5px 15px rgba(0,0,0,0.4)'}} onError={e=>e.target.src='https://via.placeholder.com/60x85'} />
                    </td>
                    <td>
                       <div style={{fontSize:'16px', fontWeight:'700', color:'#fff', marginBottom:'5px'}}>{movie.title}</div>
                       <div style={{fontSize:'12px', color:'#777'}}>{movie.genre}</div>
                    </td>
                    <td>
                       <span style={{background:'#222', padding:'4px 10px', borderRadius:'15px', fontSize:'12px', color:'#ccc'}}>{movie.year}</span>
                       <span style={{background:'rgba(234, 179, 8, 0.1)', color:'#eab308', padding:'4px 10px', borderRadius:'15px', fontSize:'12px', marginLeft:'8px'}}>{movie.rating}</span>
                    </td>
                    <td>
                        <span style={{color:'#FF2B5E', fontWeight:'700'}}>{movie.players?.length || 1} Kaynak</span>
                    </td>
                    <td style={{textAlign:'right'}}>
                      <button onClick={() => handleDelete(movie.id)} style={{background:'rgba(255,0,0,0.1)', color:'#ef4444', border:'none', padding:'12px', borderRadius:'10px', cursor:'pointer', transition:'all 0.2s'}}>
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="hq-table-wrap">
            <table className="hq-table">
              <thead>
                <tr>
                  <th>Kullanıcı Adı</th>
                  <th>E-posta</th>
                  <th>Rol</th>
                  <th>Kayıt Tarihi</th>
                  <th style={{textAlign:'right'}}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td><div style={{fontWeight:'bold', color:'#fff'}}>{u.username}</div></td>
                    <td>{u.email}</td>
                    <td>
                        <span style={{
                          background: u.role === 'admin' ? 'rgba(255,43,94,0.1)' : 'rgba(255,255,255,0.05)',
                          color: u.role === 'admin' ? '#FF2B5E' : '#888',
                          padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800'
                        }}>
                          {u.role.toUpperCase()}
                        </span>
                    </td>
                    <td style={{fontSize:'13px', color:'#666'}}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{textAlign:'right'}}>
                      <button 
                        onClick={() => deleteUser(u._id)} 
                        disabled={u.role === 'admin'}
                        style={{background:'rgba(255,0,0,0.1)', color:'#ef4444', border:'none', padding:'12px', borderRadius:'10px', cursor: u.role === 'admin' ? 'not-allowed' : 'pointer', opacity: u.role === 'admin' ? 0.3 : 1}}
                      >
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="hq-card" style={{padding:'0', overflow:'hidden', borderRadius:'16px'}}>
            <div style={{padding:'24px 30px', borderBottom:'1px solid #1a1d24', background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h3 style={{fontSize:'18px', display:'flex', alignItems:'center', gap:'10px', fontFamily:'monospace', color:'#4ADE80'}}>
                  <Terminal size={22}/> root@system-hq:~# tail -f logs
               </h3>
               <span style={{fontSize:'12px', color:'#4ADE80', background:'rgba(74, 222, 128, 0.1)', padding:'4px 10px', borderRadius:'4px', border:'1px solid rgba(74, 222, 128, 0.2)'}}>LIVE TAIL AKTİF</span>
            </div>
            <div className="terminal-box">
                {logs.map(log => (
                    <div key={log._id || Math.random()} style={{marginBottom:'15px', display:'flex', gap:'15px'}}>
                        <span style={{color:'#666', minWidth:'175px'}}>[{new Date(log.createdAt).toLocaleString()}]</span>
                        <span style={{color: log.type === 'error' ? '#ef4444' : log.type === 'warning' ? '#f59e0b' : log.type==='success' ? '#22c55e' : '#3b82f6', minWidth:'90px', fontWeight:'bold'}}>
                            [{log.module}]
                        </span>
                        <span style={{color:'#ddd'}}>{log.message}</span>
                    </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'check' && (
          <div>
            <div className="hq-card" style={{padding:'40px', marginBottom:'30px', border:'1px solid rgba(255,43,94,0.1)'}}>
               <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <h3 style={{fontSize:'22px', fontWeight:'800', marginBottom:'10px'}}>Kusurlu Veri Onarım Modülü (Radar 4.0)</h3>
                    <p style={{color:'#888', maxWidth:'600px'}}>Açıklaması eksik, bozuk linkli veya henüz vizyona girmemiş içerikleri onarın. "Derin Tarama" ile linklerin çalışıp çalışmadığını kontrol edebilirsiniz.</p>
                  </div>
                  <div style={{display:'flex', gap:'10px'}}>
                    <button 
                      onClick={handleDeepScan} 
                      disabled={isRepairing} 
                      className="hq-action-btn"
                      style={{background:'rgba(59,130,246,0.1)', color:'#3b82f6', border:'1px solid rgba(59,130,246,0.2)'}}
                    >
                      <Zap size={20} />
                      Derin Tarama Başlat
                    </button>
                    <button 
                      onClick={handleAutoRepair} 
                      disabled={isRepairing || defectMovies.length === 0} 
                      className="hq-action-btn"
                    >
                      {isRepairing ? <RefreshCw size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                      {isRepairing ? 'İşlem Yapılıyor...' : 'Tümünü Otomatik Onar'}
                    </button>
                  </div>
               </div>
            </div>

            <div className="hq-table-wrap">
              <table className="hq-table">
                <thead>
                  <tr>
                    <th>Durum</th>
                    <th>Film Adı</th>
                    <th>Eksik Olanlar</th>
                    <th>TMDB ID (Manuel)</th>
                    <th style={{textAlign:'right'}}>Onarım</th>
                  </tr>
                </thead>
                <tbody>
                  {defectMovies.map(movie => (
                    <tr key={movie._id}>
                      <td>
                        <div style={{width:'10px', height:'10px', background: movie.status === 'broken' ? '#FF2B5E' : '#eab308', borderRadius:'50%', boxShadow: `0 0 10px ${movie.status === 'broken' ? '#FF2B5E' : '#eab308'}`}}></div>
                      </td>
                      <td>
                         <div style={{fontWeight:'700', color:'#fff'}}>{movie.title}</div>
                         <div style={{fontSize:'11px', color:'#555'}}>{movie.sourceUrl?.substring(0, 40)}...</div>
                      </td>
                      <td>
                         <div style={{display:'flex', gap:'5px', flexWrap:'wrap'}}>
                            {(!movie.tmdbId) && <span style={{fontSize:'10px', background:'rgba(255,255,255,0.05)', padding:'2px 6px', borderRadius:'4px'}}>TMDB ID</span>}
                            {(movie.description === 'Açıklama bulunamadı.' || !movie.description) && <span style={{fontSize:'10px', background:'rgba(255,255,255,0.05)', padding:'2px 6px', borderRadius:'4px'}}>Açıklama</span>}
                            {(!movie.directSource || movie.status === 'broken') && <span style={{fontSize:'10px', background:'rgba(255,43,94,0.1)', color:'#FF2B5E', padding:'2px 6px', borderRadius:'4px', border:'1px solid rgba(255,43,94,0.2)'}}>Bozuk Link</span>}
                            {(movie.year > new Date().getFullYear()) && <span style={{fontSize:'10px', background:'rgba(59,130,246,0.1)', color:'#3b82f6', padding:'2px 6px', borderRadius:'4px', border:'1px solid rgba(59,130,246,0.2)'}}>Vizyona Girmemiş</span>}
                         </div>
                      </td>
                      <td>
                         <input 
                           type="text" 
                           placeholder="Örn: 550" 
                           value={manualIds[movie._id] || ''} 
                           onChange={(e) => setManualIds({...manualIds, [movie._id]: e.target.value})}
                           style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', padding:'5px 10px', borderRadius:'6px', width:'100px', fontSize:'12px'}}
                         />
                      </td>
                      <td style={{textAlign:'right'}}>
                        <button 
                          onClick={() => handleReSync(movie._id, manualIds[movie._id])} 
                          style={{
                            background: manualIds[movie._id] ? '#FF2B5E' : 'rgba(255,255,255,0.05)', 
                            color:'#fff', border:'none', padding:'8px 15px', borderRadius:'8px', cursor:'pointer', fontSize:'12px', display:'inline-flex', alignItems:'center', gap:'5px'
                          }}
                        >
                          <RefreshCw size={14} /> {manualIds[movie._id] ? 'ID ile Zorla' : 'Şimdi Onar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {defectMovies.length === 0 && (
                    <tr>
                        <td colSpan="4" style={{textAlign:'center', padding:'40px', color:'#555'}}>Kusurlu kayıt bulunamadı. Tüm veriler sağlıklı! ✨</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'inbox' && (
           <div style={{maxWidth:'1000px'}}>
             {messages.length === 0 ? (
                <div className="hq-card" style={{textAlign:'center', padding:'60px', color:'#555'}}>Gelen kutunuzda henüz mesaj bulunmuyor.</div>
             ) : (
                messages.map(msg => (
                  <div className="hq-message-card" key={msg._id}>
                    <div className="hq-message-header">
                       <span className={`hq-message-badge ${msg.type}`}>
                          {msg.type === 'request' ? 'FİLM İSTEĞİ' : 'İLETİŞİM'}
                       </span>
                       <span style={{fontSize:'12px', color:'#555'}}>{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="hq-message-info">
                       <div style={{marginBottom:'5px'}}>Gönderen: <strong>{msg.name}</strong></div>
                       <div style={{marginBottom:'5px'}}>E-posta: <strong>{msg.email}</strong></div>
                       <div>Konu: <strong style={{color:'#FF2B5E'}}>{msg.subject}</strong></div>
                    </div>
                    <div className="hq-message-body">
                       {msg.message}
                    </div>
                    <div style={{marginTop:'15px', display:'flex', justifyContent:'flex-end'}}>
                       <button onClick={() => deleteMessage(msg._id)} style={{background:'none', border:'none', color:'#777', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px', fontSize:'13px'}}>
                          <Trash2 size={16} /> Mesajı Sil
                       </button>
                    </div>
                  </div>
                ))
             )}
           </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
