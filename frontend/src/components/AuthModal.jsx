import React, { useState, useEffect } from 'react';
import { X, User, Lock, Mail, ShieldCheck, RefreshCcw } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const AuthModal = ({ isOpen, onClose, initialMode = 'login', onAuthSuccess }) => {
  const [mode, setMode] = useState(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError('');
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (mode === 'register' && password !== confirmPassword) {
      setError('Şifreler eşleşmiyor!');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await axios.post(`${API_URL}/auth/login`, { username, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('username', res.data.username);
        localStorage.setItem('role', res.data.role);
        onAuthSuccess(res.data);
        onClose();
      } else {
        await axios.post(`${API_URL}/auth/register`, { username, email, password });
        setMode('login');
        setError('Hesap oluşturuldu! Şimdi giriş yapabilirsiniz.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Beklenmeyen hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        <h2 className="auth-title">
          {mode === 'login' ? 'Tekrar Hoş Geldiniz' : 'Hesabınızı Oluşturun'}
        </h2>
        <p className="auth-subtitle">
          {mode === 'login' ? 'Film dünyasına bağlanmak için giriş yapın' : 'Binlerce HD içerik için aramıza katılın'}
        </p>

        {error && (
          <div style={{ background: error.includes('oluşturuldu') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: error.includes('oluşturuldu') ? '#22c55e' : '#ef4444', padding: '15px', borderRadius: '15px', marginBottom: '25px', fontSize: '14px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="auth-input-group">
              <label className="auth-label">E-Posta Adresiniz</label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="auth-input-pill" 
                placeholder="ornek@mail.com"
              />
            </div>
          )}

          <div className="auth-input-group">
            <label className="auth-label">Kullanıcı Adı</label>
            <input 
              type="text" 
              required 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              className="auth-input-pill" 
              placeholder="Kullanıcı adınızı girin"
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Şifre</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="auth-input-pill" 
              placeholder="••••••••"
            />
          </div>

          {mode === 'register' && (
            <div className="auth-input-group">
              <label className="auth-label">Şifre (Tekrar)</label>
              <input 
                type="password" 
                required 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                className="auth-input-pill" 
                placeholder="••••••••"
              />
            </div>
          )}

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? 'İşleniyor...' : (mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol')}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? 'Henüz hesabınız yok mu?' : 'Zaten üye misiniz?'}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Hemen Kayıt Ol' : 'Giriş Yap'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
