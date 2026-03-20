import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, Info, Send, Clock, Globe, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const Contact = ({ user }) => {
  const [searchParams] = useSearchParams();
  const isRequest = searchParams.get('type') === 'request';
  
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    subject: isRequest ? 'Film İsteği' : '', 
    message: '',
    type: isRequest ? 'request' : 'contact'
  });
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  useEffect(() => {
    if (isRequest) {
      setFormData(prev => ({ ...prev, type: 'request', subject: 'Film İsteği' }));
    } else {
      setFormData(prev => ({ ...prev, type: 'contact', subject: '' }));
    }
  }, [isRequest]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', msg: '' });

    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      };
      
      const response = await axios.post('http://localhost:5000/api/support', formData, config);
      setStatus({ type: 'success', msg: response.data.message });
      setFormData({ name: '', email: '', subject: isRequest ? 'Film İsteği' : '', message: '', type: isRequest ? 'request' : 'contact' });
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.error || 'Gönderim sırasında bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-12">
      <div className="main-layout">
        {/* Sol Taraf: Form ve Yasal Metin */}
        <div className="primary-content">
          <div className="hd-contact-card">
            {isRequest ? (
               <div className="hd-request-info-banner">
                  <Info size={20} />
                  <span><strong>Film İsteği Modu:</strong> Lütfen isteyeceğiniz filmin tam adını ve varsa IMDB linkini mesaj kısmına yazınız.</span>
               </div>
            ) : (
                <h1 className="hd-page-title">
                  <ShieldCheck className="text-primary" size={32} /> Yasal Bildirim & Telif (DMCA)
                </h1>
            )}
            
            {!isRequest && (
              <div className="hd-legal-text" style={{ marginBottom: '40px' }}>
                <p style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '15px' }}>
                  Telif hakları bildirimi için lütfen <strong>HDFilmLimani@proton.me</strong> adresini kullanınız.
                </p>
                <p>
                  <strong>HDFilmLimani</strong> (HDFilmizle.to), 5651 sayılı yasanın 5. maddesinde tanımlanan yer sağlayıcı olarak hizmet vermektedir. Mevcut yasaya göre, web site yönetiminin hukuka aykırı içerikleri kontrol etme yükümlülüğü yoktur. Bu sebeple, sitemiz uyar ve kaldır prensibini ilke edinmiştir. Telif hakkına konu olan eserlerin yasal olmayan bir biçimde paylaşıldığını ve yasal haklarının çiğnendiğini düşünen hak sahipleri veya meslek birlikleri, yukarıdaki mail adresimizden bize ulaşabilirler. Buraya ulaşan talep ve şikayetler hukuksal olarak incelenecek, şikayet yerinde görüldüğü takdirde, ihlal olduğu düşünülen içerikler sitemizden kaldırılacaktır.
                </p>
                
                <div style={{ marginTop: '20px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid var(--primary)' }}>
                    <p style={{ marginBottom: '10px', color: '#fff' }}><strong>İlgili Yasa Maddeleri:</strong></p>
                    <p style={{ marginBottom: '10px', fontSize: '0.85rem' }}><strong>MADDE 5- (1)</strong> Yer sağlayıcı, yer sağladığı içeriği kontrol etmek veya hukuka aykırı bir faaliyetin söz konusu olup olmadığını araştırmakla yükümlü değildir.</p>
                    <p style={{ fontSize: '0.85rem' }}><strong>(2)</strong> Yer sağlayıcı, yer sağladığı hukuka aykırı içerikten, ceza sorumluluğu ile ilgili hükümler saklı kalmak kaydıyla, bu Kanunun 8 inci ve 9 uncu maddelerine göre haberdar edilmesi halinde ve teknik olarak imkân bulunduğu ölçüde hukuka aykırı içeriği yayından kaldırmakla yükümlüdür.</p>
                </div>

                <div className="hd-english-notice" style={{ marginTop: '30px' }}>
                  <strong>English Notice:</strong> For copyright matters, contact us at <strong>HDFilmLimani@proton.me</strong>. 
                  We operate under the "Notice and Takedown" principle as defined by Law No. 5651. Takedown requests will be processed within 72 hours.
                </div>
              </div>
            )}

            {!isRequest && <hr style={{ border: '0', borderTop: '1px solid #1a1d24', margin: '50px 0' }} />}

            <h2 className="hd-section-title">
              <Mail className="text-primary" size={24} /> {isRequest ? 'Film İsteği Formu' : 'İletişim Formu'}
            </h2>
            <p className="hd-page-subtitle">
              {isRequest ? 'Hangi filmi izlemek istersiniz? Bize bildirin, en kısa sürede ekleyelim.' : 'Genel sorularınız, hata bildirimleri veya reklam teklifleriniz için bu formu kullanabilirsiniz.'}
            </p>

            {isRequest && !user?.token ? (
              <div className="hd-status-msg error" style={{ textAlign: 'center', padding: '60px' }}>
                <Info size={40} style={{ marginBottom: '15px', display: 'block', margin: '0 auto 15px' }} />
                <h3 style={{ color: '#fff', marginBottom: '10px' }}>Oturum Açmanız Gerekiyor</h3>
                <p style={{ color: '#888', marginBottom: '20px' }}>Film isteği yapabilmek için lütfen önce giriş yapın veya kayıt olun.</p>
                <p style={{fontSize: '14px', color: 'var(--primary)', fontWeight: 'bold'}}>Navigasyon çubuğundaki <strong>Giriş Yap</strong> butonunu kullanabilirsiniz.</p>
              </div>
            ) : (
              <>
                {status.msg && (
                  <div className={`hd-status-msg ${status.type}`}>
                    {status.msg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="hd-contact-form">
                  <div className="hd-form-row">
                    <div className="hd-input-group">
                      <label>Adınız Soyadınız</label>
                      <input 
                        type="text" 
                        placeholder="Örn: Ahmet Yılmaz" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="hd-input-group">
                      <label>E-posta Adresiniz</label>
                      <input 
                        type="email" 
                        placeholder="Örn: ahmet@gmail.com" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="hd-input-group">
                    <label>Konu</label>
                    <input 
                      type="text" 
                      placeholder="Konu başlığı..." 
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      required
                    />
                  </div>

                  <div className="hd-input-group">
                    <label>Mesajınız / İstediğiniz Film</label>
                    <textarea 
                      placeholder={isRequest ? "Film Adı, Yılı ve IMDB linki..." : "Mesajınızı buraya yazınız..."}
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      required
                    ></textarea>
                  </div>
                  
                  <button type="submit" className={`hd-submit-btn ${status.type === 'success' ? 'success' : ''}`} disabled={loading}>
                    {loading ? <Loader2 size={20} className="animate-spin" /> : (status.type === 'success' ? <ShieldCheck size={20} /> : <Send size={20} />)}
                    {loading ? 'Gönderiliyor...' : (status.type === 'success' ? 'Başarıyla İletildi!' : (isRequest ? 'İsteği Gönder' : 'Mesajı Gönder'))}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Sağ Taraf: Hızlı İletişim Bilgileri */}
        <div className="sidebar-content">
          <div className="hd-contact-sidebar">
            <h3 className="hd-card-title">Hızlı İletişim</h3>
            
            <div className="hd-contact-info-list">
              <div className="hd-info-item">
                <div className="item-icon mail"><Mail size={20} /></div>
                <div className="item-text">
                  <label>E-posta</label>
                  <span>HDFilmLimani@proton.me</span>
                </div>
              </div>

              <div className="hd-info-item">
                <div className="item-icon security"><ShieldCheck size={20} /></div>
                <div className="item-text">
                  <label>Hukuki Durum</label>
                  <span>Yer Sağlayıcı (Kanun: 5651)</span>
                </div>
              </div>

              <div className="hd-info-item">
                <div className="item-icon clock"><Clock size={20} /></div>
                <div className="item-text">
                  <label>Yanıt Süresi</label>
                  <span>48-72 Saat (En Geç)</span>
                </div>
              </div>

              <div className="hd-info-item">
                <div className="item-icon globe"><Globe size={20} /></div>
                <div className="item-text">
                  <label>Çalışma Prensibi</label>
                  <span>Uyar - Kaldır Sistemi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
