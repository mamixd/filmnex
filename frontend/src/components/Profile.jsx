import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Calendar, Settings, Film, Heart, Clock, Star, Play } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';

const Profile = ({ user: initialUser }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    axios.get(`${API_URL}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      setProfileData(res.data);
      setIsLoading(false);
    })
    .catch(err => {
      console.error("Profil yükleme hatası:", err);
      setIsLoading(false);
    });
  }, []);

  const generateSlug = (text) => text?.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '100px 20px', textAlign: 'center' }}>
        <div className="loader" style={{ margin: '0 auto 20px' }}></div>
        <p style={{ color: '#888' }}>Profil Bilgileri Yükleniyor...</p>
      </div>
    );
  }

  if (!localStorage.getItem('token')) {
    return (
      <div className="container" style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h2 style={{ color: '#fff', marginBottom: '20px' }}>Oturum Açmanız Gerekiyor</h2>
        <p style={{ color: '#888' }}>Profilinizi görüntülemek için lütfen giriş yapın.</p>
      </div>
    );
  }

  const user = profileData || initialUser;

  return (
    <div className="container" style={{ padding: '40px 20px', minHeight: '80vh' }}>
      <div className="profile-header" style={{ 
        background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
        borderRadius: '24px',
        padding: '40px',
        border: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '30px',
        marginBottom: '30px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ 
          position: 'absolute', top: '-100px', right: '-100px', 
          width: '300px', height: '300px', 
          background: 'rgba(229, 9, 20, 0.1)', 
          filter: 'blur(100px)', borderRadius: '50%' 
        }}></div>

        <div className="profile-avatar-large" style={{ 
          width: '120px', height: '120px', 
          borderRadius: '50%', 
          background: 'linear-gradient(45deg, #FF2B5E, #E50914)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '48px', fontWeight: '800', color: '#fff',
          boxShadow: '0 10px 30px rgba(229, 9, 20, 0.3)',
          zIndex: 2
        }}>
          {user.username?.charAt(0).toUpperCase()}
        </div>

        <div style={{ zIndex: 2 }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
            {user.username}
          </h1>
          <div style={{ display: 'flex', gap: '15px' }}>
            <span style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              color: '#888', fontSize: '14px' 
            }}>
              <Shield size={14} color="var(--primary)" /> 
              {user.role === 'admin' ? 'Sistem Yöneticisi' : 'Premium Üye'}
            </span>
            <span style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              color: '#888', fontSize: '14px' 
            }}>
              <Calendar size={14} /> 
              Üyelik: 2026
            </span>
          </div>
        </div>

        <button style={{ 
          marginLeft: 'auto', 
          background: 'rgba(255,255,255,0.05)', 
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff', padding: '12px 24px', borderRadius: '50px',
          fontSize: '14px', fontWeight: '600', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '8px',
          transition: 'all 0.3s',
          zIndex: 2
        }}>
          <Settings size={16} /> Ayarlar
        </button>
      </div>

      <div className="profile-content-grid" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { id: 'overview', label: 'Genel Bakış', icon: <User size={18} /> },
            { id: 'favorites', label: 'Favorilerim', icon: <Heart size={18} /> },
            { id: 'history', label: 'İzleme Geçmişi', icon: <Clock size={18} />, count: user.watchHistory?.length },
            { id: 'requests', label: 'İsteklerim', icon: <Film size={18} /> }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '15px 20px', borderRadius: '16px',
                background: activeTab === tab.id ? 'rgba(229, 9, 20, 0.1)' : 'transparent',
                border: 'none',
                color: activeTab === tab.id ? 'var(--primary)' : '#666',
                fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.2s',
                position: 'relative'
              }}
            >
              {tab.icon} {tab.label}
              {tab.count > 0 && (
                <span style={{ 
                  marginLeft: 'auto', background: 'var(--primary)', 
                  color: '#fff', fontSize: '10px', padding: '2px 8px', 
                  borderRadius: '10px' 
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ 
          background: '#0f0f0f', 
          borderRadius: '24px', 
          padding: '40px',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          {activeTab === 'overview' && (
            <div>
              <h3 style={{ color: '#fff', marginBottom: '25px', fontSize: '20px' }}>Hesap Özeti</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                  <div style={{ color: '#555', fontSize: '12px', marginBottom: '5px', textTransform: 'uppercase' }}>Kullanıcı Adı</div>
                  <div style={{ color: '#fff', fontWeight: '600' }}>{user.username}</div>
                </div>
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                  <div style={{ color: '#555', fontSize: '12px', marginBottom: '5px', textTransform: 'uppercase' }}>E-posta</div>
                  <div style={{ color: '#fff', fontWeight: '600' }}>{user.email || `${user.username}@hdfilm.com`}</div>
                </div>
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                  <div style={{ color: '#555', fontSize: '12px', marginBottom: '5px', textTransform: 'uppercase' }}>İzlenen Film</div>
                  <div style={{ color: 'var(--primary)', fontWeight: '600' }}>{user.watchHistory?.length || 0} İçerik</div>
                </div>
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                  <div style={{ color: '#555', fontSize: '12px', marginBottom: '5px', textTransform: 'uppercase' }}>Hesap Durumu</div>
                  <div style={{ color: '#4caf50', fontWeight: '600' }}>Aktif</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h3 style={{ color: '#fff', marginBottom: '25px', fontSize: '20px' }}>İzleme Geçmişi</h3>
              {user.watchHistory && user.watchHistory.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {user.watchHistory.map((item, idx) => (
                    <div 
                      key={idx}
                      onClick={() => navigate(`/${generateSlug(item.title)}`)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '20px', 
                        padding: '15px', background: 'rgba(255,255,255,0.02)', 
                        borderRadius: '16px', cursor: 'pointer', transition: 'all 0.3s',
                        border: '1px solid transparent'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.borderColor = 'rgba(229, 9, 20, 0.2)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      <img 
                        src={item.poster} 
                        alt={item.title} 
                        style={{ width: '60px', height: '90px', borderRadius: '8px', objectFit: 'cover' }} 
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>{item.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#666', fontSize: '13px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={12} color="#eab308" fill="#eab308" /> {item.rating}</span>
                          <span>{item.year}</span>
                          <span style={{ color: '#444' }}>•</span>
                          <span>{new Date(item.watchedAt).toLocaleDateString('tr-TR')}</span>
                        </div>
                      </div>
                      <div className="play-icon-circle" style={{ 
                        width: '40px', height: '40px', borderRadius: '50%', 
                        background: 'rgba(229, 9, 20, 0.1)', color: 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Play size={18} fill="currentColor" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <Clock size={48} color="#222" style={{ marginBottom: '15px' }} />
                  <h4 style={{ color: '#fff' }}>Henüz Bir Şey İzlemediniz</h4>
                  <p style={{ color: '#666' }}>İzlediğiniz filmler burada otomatik olarak listelenir.</p>
                </div>
              )}
            </div>
          )}

          {(activeTab === 'favorites' || activeTab === 'requests') && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ color: '#222', marginBottom: '15px' }}>
                {activeTab === 'favorites' ? <Heart size={48} /> : <Film size={48} />}
              </div>
              <h4 style={{ color: '#fff', marginBottom: '10px' }}>Henüz Bir Veri Yok</h4>
              <p style={{ color: '#666', fontSize: '14px' }}>Burada görünecek bir içerik henüz bulunmuyor.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
