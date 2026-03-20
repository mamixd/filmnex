import React from 'react';
import { ShieldCheck, Info, FileText, Scale, Lock, Users, AlertTriangle, Globe } from 'lucide-react';

const TermsOfUse = () => {
  return (
    <div className="container py-12">
      <div className="main-layout">
        <div className="primary-content">
          <div className="hd-contact-card">
            <h1 className="hd-page-title">
              <Scale className="text-primary" size={32} /> Kullanım Koşulları (Terms of Service)
            </h1>
            
            <div className="hd-legal-text" style={{ marginBottom: '40px' }}>
              <section style={{ marginBottom: '30px' }}>
                <h3 style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '15px', marginBottom: '15px', color: '#fff' }}>
                  1. Genel Kabul
                </h3>
                <p>
                  <strong>HDFilmLimani</strong> web sitesini ziyaret ederek veya sitemiz üzerinden sunulan hizmetleri kullanarak, aşağıda belirtilen kullanım koşullarını, gizlilik politikasını ve yasal uyarıları kabul etmiş sayılırsınız. Eğer bu koşullardan herhangi birini kabul etmiyorsanız, lütfen sitemizi kullanmayınız.
                </p>
              </section>

              <section style={{ marginBottom: '30px' }}>
                <h3 style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '15px', marginBottom: '15px', color: '#fff' }}>
                  2. Yer Sağlayıcı Bildirimi (Yasal Statü)
                </h3>
                <p>
                  Sitemiz, 5651 sayılı "İnternet Ortamında Yapılan Yayınların Düzenlenmesi ve Bu Yayınlar Yoluyla İşlenen Suçlarla Mücadele Edilmesi Hakkında Kanun" kapsamında <strong>"Yer Sağlayıcı"</strong> olarak hizmet vermektedir. 
                </p>
                <p style={{ marginTop: '10px' }}>
                  İlgili kanunun 5. maddesi uyarınca; sitemiz yer sağladığı içeriği kontrol etmek veya hukuka aykırı bir faaliyetin söz konusu olup olmadığını araştırmakla yükümlü değildir. Sitemizde yer alan tüm videolar, görseller ve metaryeller üçüncü taraf video paylaşım sitelerinden (ok.ru, veoh.com, vk.com vb.) embed kodları ile çekilmektedir. <strong>Sitemiz sunucularında hiçbir video dosyası barındırılmamaktadır.</strong>
                </p>
              </section>

              <section style={{ marginBottom: '30px' }}>
                <h3 style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '15px', marginBottom: '15px', color: '#fff' }}>
                  3. Uyar-Kaldır Prensibi (Telif Hakları)
                </h3>
                <p>
                  HDFilmLimani, telif haklarına saygılı olmayı temel ilke edinmiştir. Telif hakkı sahibi olduğunuz bir içeriğin sitemizde izinsiz paylaşıldığını düşünüyorsanız, lütfen "İletişim" sayfamızdaki formu kullanarak veya doğrudan <strong>HDFilmLimani@proton.me</strong> adresine e-posta göndererek bize bildiriniz. Talebiniz ve hak sahipliği kanıtınız incelendikten sonra, ilgili içerik en geç 72 saat içerisinde sitemizden kaldırılacaktır.
                </p>
              </section>

              <section style={{ marginBottom: '30px' }}>
                <h3 style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '15px', marginBottom: '15px', color: '#fff' }}>
                  4. Kullanıcı Yükümlülükleri
                </h3>
                <ul style={{ listStyleType: 'disc', paddingLeft: '20px', color: '#888', lineHeight: '1.8' }}>
                  <li>Sitenin güvenliğini bozmaya yönelik girişimlerde bulunmamak.</li>
                  <li>Yorum alanlarında küfür, hakaret, siyasi propaganda veya reklam içerikli mesajlar paylaşmamak.</li>
                  <li>Diğer kullanıcıların deneyimini olumsuz etkileyecek bot veya otomatik yazılımlar kullanmamak.</li>
                  <li>Sitemizdeki içerikleri ticari amaçlarla kopyalamamak veya izinsiz dağıtmamak.</li>
                </ul>
              </section>

              <section style={{ marginBottom: '30px' }}>
                <h3 style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '15px', marginBottom: '15px', color: '#fff' }}>
                  5. Sorumluluk Sınırları
                </h3>
                <p>
                  HDFilmLimani, sitemiz üzerinden erişilen dış bağlantıların (reklamlar, dış video playerlar vb.) içeriğinden sorumlu tutulamaz. Dış kaynaklı sitelerin kullanım koşulları ve gizlilik politikaları kendilerine aittir. Sitemizi kullanırken karşılaşılabilecek teknik aksaklıklardan veya veri kayıplarından platformumuz sorumlu değildir.
                </p>
              </section>

              <div style={{ padding: '25px', background: 'rgba(255,43,94,0.05)', borderRadius: '12px', border: '1px solid rgba(255,43,94,0.1)', marginTop: '40px' }}>
                <h4 style={{ color: 'var(--primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertTriangle size={20} /> Son Güncelleme Notu
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#aaa italic' }}>
                  Bu metin en son 20 Mart 2026 tarihinde güncellenmiştir. HDFilmLimani, kullanım koşullarını dilediği zaman önceden haber vermeksizin değiştirme hakkını saklı tutar.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="sidebar-content">
          <div className="hd-contact-sidebar">
            <h3 className="hd-card-title">Hukuki Rehber</h3>
            <div className="hd-contact-info-list">
              <div className="hd-info-item">
                <div className="item-icon security"><FileText size={20} /></div>
                <div className="item-text">
                  <label>Doküman</label>
                  <span>Kullanım Şartları v1.2</span>
                </div>
              </div>
              <div className="hd-info-item">
                <div className="item-icon mail"><Users size={20} /></div>
                <div className="item-text">
                  <label>Kitle</label>
                  <span>Tüm Ziyaretçiler</span>
                </div>
              </div>
              <div className="hd-info-item">
                <div className="item-icon clock"><Lock size={20} /></div>
                <div className="item-text">
                  <label>Gizlilik</label>
                  <span>SSL Korumalı Bağlantı</span>
                </div>
              </div>
              <div className="hd-info-item">
                <div className="item-icon globe"><Globe size={20} /></div>
                <div className="item-text">
                  <label>Geçerlilik</label>
                  <span>Global (Dünya Geneli)</span>
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', fontSize: '13px', color: '#666' }}>
               <Info size={16} style={{ marginBottom: '5px' }} />
               Bu metin hukuki bir danışmanlık değil, site kullanım kurallarının beyanıdır.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
