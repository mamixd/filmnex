require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mongoose Models & Services
const connectDB = require('./src/services/dbService');
const Movie = require('./src/models/Movie');
const Log = require('./src/models/Log');
const Message = require('./src/models/Message');
const { runScraper } = require('./src/scrapers/engine');
const { searchMovie, getMovieById } = require('./src/services/tmdbService');
const { fetchWithFallback, extractSources } = require('./src/scrapers/extractor');
const { initScheduler } = require('./src/jobs/scheduler');

// Kullanıcı modülü (Mongoose on-the-fly)
const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    watchHistory: [{
        movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
        watchedAt: { type: Date, default: Date.now }
    }]
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_gizli_film_anahtari_2024';

// MongoDB'ye Bağlan ve Zamanlayıcıyı (Cron) Başlat
connectDB().then(() => {
    initScheduler();
});

// =======================
// MIDDLEWARES
// =======================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') next();
    else res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
};

// =======================
// AUTH ROUTES
// =======================
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Tüm alanlar (Kullanıcı adı, E-posta, Şifre) gereklidir' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Güvenlik: Artık ilk kayıt olana admin vermiyoruz.
        const role = 'user'; 
        
        const user = new User({ username, email, password: hashedPassword, role });
        await user.save();
        res.json({ message: 'Kayıt başarılı', role });
    } catch (err) {
        res.status(400).json({ error: 'Bu kullanıcı adı veya e-posta zaten kullanımda.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: 'Hatalı giriş bilgileri' });

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ error: 'Hatalı giriş bilgileri' });

        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, role: user.role, username: user.username });
    } catch(err) {
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// =======================
// MOVIE ROUTES (PUBLIC)
// =======================
app.get('/api/movies', async (req, res) => {
    try {
        const movies = await Movie.find().sort({ createdAt: -1 });
        // Eski SQLite frontend yapısını bozmamak için veriyi formatla
        const formatted = movies.map(m => ({
            id: m._id,
            title: m.title,
            originalTitle: m.original_title,
            description: m.description,
            image: m.poster || m.backdrop || 'https://via.placeholder.com/200x300',
            backdrop: m.backdrop,
            rating: m.rating,
            year: m.year,
            genre: (m.genres && m.genres.length > 0) ? m.genres.join(', ') : m.lang,
            lang: m.lang,
            label: m.label,
            type: m.type || 'movie',
            views: m.views || 0
            // Hassas veriler (players, subtitles, directSource) güvenlik nedeniyle gizlendi.
            // Sadece detay sayfasında /sources üzerinden çekilecek.
        }));
        res.json(formatted);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// TOP MOVIES (Most viewed)
app.get('/api/movies/top', async (req, res) => {
    try {
        const topMovies = await Movie.find()
            .sort({ views: -1 })
            .limit(5);
        res.json(topMovies.map(m => ({
            id: m._id,
            title: m.title,
            views: m.views || 0,
            image: m.poster || m.backdrop
        })));
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// GİZLİ KAYNAK API (Çalınmaya karşı korumalı)
app.get('/api/movies/:id/sources', async (req, res) => {
    try {
        const m = await Movie.findById(req.params.id);
        if (!m) return res.status(404).json({ error: 'Kaynak bulunamadı' });
        
        res.json({
            players: m.players,
            subtitles: m.subtitles,
            directSource: m.directSource,
            directSourceAlt: m.directSourceAlt,
            directSourceOriginal: m.directSourceOriginal
        });
    } catch(err) {
        res.status(500).json({ error: 'Güvenlik hatası' });
    }
});

// Film Detay (ID veya Slug ile)
app.get('/api/movies/:id', async (req, res) => {
    const { id } = req.params;
    try {
        let movie;
        if (mongoose.Types.ObjectId.isValid(id)) {
            movie = await Movie.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true });
        } else {
            // Slug ile bulmayı dene
            const slugTitle = id.replace(/-/g, ' ');
            movie = await Movie.findOneAndUpdate(
                { title: new RegExp('^' + slugTitle + '$', 'i') },
                { $inc: { views: 1 } },
                { new: true }
            );
        }

        if (!movie) return res.status(404).json({ error: 'Film bulunamadı' });
        
        res.json({
            id: movie._id,
            title: movie.title,
            originalTitle: movie.original_title,
            description: movie.description,
            image: movie.poster || movie.backdrop || 'https://via.placeholder.com/300x450',
            backdrop: movie.backdrop,
            rating: movie.rating,
            year: movie.year,
            genre: (movie.genres && movie.genres.length > 0) ? movie.genres.join(', ') : movie.lang,
            lang: movie.lang,
            label: movie.label,
            type: movie.type || 'movie',
            siteRating: movie.siteRating,
            siteVoteCount: movie.siteVoteCount,
            views: movie.views
        });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// Film Puanlama (Site Puanı)
app.post('/api/movies/:id/rate', authenticateToken, async (req, res) => {
    const { score } = req.body;
    const movieId = req.params.id;
    const userId = req.user.id;

    if (!score || score < 1 || score > 10) {
        return res.status(400).json({ error: 'Geçersiz puan. (1-10 arası olmalı)' });
    }

    try {
        let movie;
        if (mongoose.Types.ObjectId.isValid(movieId)) {
            movie = await Movie.findById(movieId);
        } else {
            // Slug ile bulmayı dene (Kullanıcının "isimlerleydi" uyarısı için)
            movie = await Movie.findOne({ title: new RegExp('^' + movieId.replace(/-/g, ' ') + '$', 'i') });
        }

        if (!movie) return res.status(404).json({ error: 'Film bulunamadı.' });

        // Kullanıcı daha önce oy vermiş mi?
        const existingRatingIndex = movie.ratings.findIndex(r => r.userId.toString() === userId);

        if (existingRatingIndex !== -1) {
            movie.ratings[existingRatingIndex].score = score;
        } else {
            movie.ratings.push({ userId, score });
        }

        movie.siteVoteCount = movie.ratings.length;
        const totalScore = movie.ratings.reduce((sum, r) => sum + r.score, 0);
        movie.siteRating = (totalScore / movie.siteVoteCount).toFixed(1);

        await movie.save();
        res.json({ 
            message: 'Puanınız kaydedildi!', 
            siteRating: movie.siteRating, 
            siteVoteCount: movie.siteVoteCount 
        });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// =======================
// ADMIN ROUTES
// =======================
app.post('/api/movies', authenticateToken, isAdmin, async (req, res) => {
    const { title, description, image, rating, year, genre, lang, video_url } = req.body;
    try {
        const movie = new Movie({
            title, description, poster: image, rating, year, 
            genres: [genre], lang, 
            players: [{ source: 'Manual', url: video_url, type: 'iframe' }]
        });
        await movie.save();
        await Log.create({ type: 'info', module: 'Admin', message: `Manuel film eklendi: ${title}` });
        res.json({ id: movie._id, message: 'Film başarıyla eklendi!' });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/movies/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        await Movie.findByIdAndDelete(req.params.id);
        await Log.create({ type: 'warning', module: 'Admin', message: `Film silindi: ID ${req.params.id}` });
        res.json({ message: 'Film silindi' });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// Manual Scraper Trigger
app.post('/api/admin/scrape', authenticateToken, isAdmin, async (req, res) => {
    const result = await runScraper();
    if (result.success) {
        res.json({ message: `Otonom Bot Başarılı! Eklenen Film: ${result.added}` });
    } else {
        res.status(500).json({ error: result.error });
    }
});

// System Logs
app.get('/api/admin/logs', authenticateToken, isAdmin, async (req, res) => {
    try {
        const logs = await Log.find().sort({ createdAt: -1 }).limit(100);
        res.json(logs);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// =======================
// SUPPORT & REQUEST ROUTES
// =======================
app.post('/api/support', async (req, res) => {
    const { name, email, subject, message, type } = req.body;
    
    // İstekler (request) için giriş yapma şartı
    if (type === 'request') {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Film isteği yapabilmek için giriş yapmalısınız.' });
        
        try {
            jwt.verify(token, JWT_SECRET);
        } catch(err) {
            return res.status(403).json({ error: 'Oturumunuz geçersiz.' });
        }
    }

    try {
        const newMessage = new Message({ name, email, subject, message, type });
        await newMessage.save();
        res.json({ message: type === 'request' ? 'İsteğiniz başarıyla iletildi!' : 'Mesajınız başarıyla gönderildi!' });
    } catch(err) {
        res.status(500).json({ error: 'Gönderim sırasında bir hata oluştu.' });
    }
});

app.get('/api/admin/support', authenticateToken, isAdmin, async (req, res) => {
    try {
        const messages = await Message.find().sort({ createdAt: -1 });
        res.json(messages);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/support/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        await Message.findByIdAndDelete(req.params.id);
        res.json({ message: 'Mesaj silindi' });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// =======================
// USER MANAGEMENT ROUTES
// =======================
app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await User.find({}, '-password').sort({ createdAt: -1 });
        res.json(users);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const userToDelete = await User.findById(req.params.id);
        if (userToDelete && userToDelete.role === 'admin') {
            return res.status(403).json({ error: 'Yönetici hesapları buradan silinemez.' });
        }
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Kullanıcı silindi' });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// =======================
// ADMİN: VERİ KONTROL MERCİSİ
// =======================

// Kusurlu filmleri listele (Açıklama eksik, TMDB ID yok, Kaynak bozuk veya Henüz Vizyona Girmemiş)
app.get('/api/admin/movies/check', authenticateToken, isAdmin, async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const movies = await Movie.find({
            $or: [
                { tmdbId: { $exists: false } },
                { description: 'Açıklama bulunamadı.' },
                { description: '' },
                { status: 'broken' },
                { directSource: { $exists: false } },
                { directSource: null },
                { directSource: '' },
                { year: { $gt: currentYear } } // Gelecek yılın filmleri
            ]
        });
        res.json(movies);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// Derin Tarama: Yalnızca veritabanı alanlarının doluluğunu kontrol eden Yapısal Tarama (Cloudflare banını önlemek için Ping devre dışı bırakıldı)
app.post('/api/admin/movies/scan', authenticateToken, isAdmin, async (req, res) => {
    try {
        const movies = await Movie.find({ directSource: { $exists: true, $ne: null } }).sort({ createdAt: -1 }).limit(100);
        let brokenCount = 0;

        for (const movie of movies) {
            // Sadece boş/geçersiz string kontrolü yap (Cloudflare bot korumasını tetiklememek için karşı sunucuya ping atılmaz)
            const isAlive = movie.directSource && movie.directSource.trim().length > 5;
            
            if (isAlive) {
                if (movie.status === 'broken') {
                    movie.status = 'active';
                    await movie.save();
                }
            } else {
                movie.status = 'broken';
                await movie.save();
                brokenCount++;
            }
        }

        res.json({ message: 'Yapısal tarama tamamlandı (Ağ Pingi Devre Dışı)', scanned: movies.length, broken: brokenCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Tekil filmi TMDB ve Kaynak bazlı yeniden senkronize et
app.post('/api/admin/movies/:id/re-sync', authenticateToken, isAdmin, async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie) return res.status(404).json({ error: 'Film bulunamadı' });

        const { tmdbId: manualTmdbId } = req.body;

        let tmdbData = null;
        if (manualTmdbId) {
            console.log(`[Admin] Manuel ID ile Onarım: ${manualTmdbId}`);
            tmdbData = await getMovieById(manualTmdbId);
        } else {
            // Başlık temizleme (Bot tarafından eklenen gereksiz takıları at: "Matrix (1999) HD izle" -> "Matrix")
            const cleanSearchTitle = movie.title
                .replace(/\(\d{4}\)/g, '') // Parantez içindeki yılları sil
                .replace(/izle|hd|türkçe|dublaj|altyazılı|1080p|720p|tek parça|full|fragman/gi, '')
                .trim();

            console.log(`[Admin] Otomatik Re-sync Başlatıldı: ${movie.title} (Arama: ${cleanSearchTitle})`);
            tmdbData = await searchMovie(cleanSearchTitle, movie.year);
        }

        // 1. TMDB Metadata Güncellemesi
        if (tmdbData) {
            movie.tmdbId = tmdbData.tmdbId || movie.tmdbId;
            movie.description = tmdbData.description || movie.description;
            movie.poster = tmdbData.poster || movie.poster;
            movie.backdrop = tmdbData.backdrop || movie.backdrop;
            movie.rating = tmdbData.rating || movie.rating;
            movie.genres = tmdbData.genres || movie.genres;
            movie.releaseDate = tmdbData.releaseDate || movie.releaseDate;
            if (tmdbData.year) movie.year = tmdbData.year;
        }

        // 2. Kaynak (Video Player) Güncellemesi
        if (movie.sourceUrl) {
            const html = await fetchWithFallback(movie.sourceUrl);
            if (html) {
                const { sources, subtitles } = await extractSources(html, movie.sourceUrl);
                if (sources.dub || sources.original || sources.sub) {
                    movie.directSource = sources.dub || sources.original || sources.sub;
                    movie.directSourceAlt = sources.sub || null;
                    if (subtitles && subtitles.length > 0) {
                        movie.subtitles = subtitles;
                    }
                }
            }
        }

        await movie.save();
        res.json({ message: 'Film başarıyla güncellendi', movie });
    } catch(err) {
        console.error("Re-sync Error:", err);
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate({
                path: 'watchHistory.movieId',
                select: 'title poster rating year'
            });
        
        if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        
        // Mükerrer kayıtları temizle (movieId bazlı benzersiz yap)
        const uniqueHistory = [];
        const seenIds = new Set();
        
        // Tersten giderek (en yeni olan kalsın)
        [...user.watchHistory].reverse().forEach(h => {
             if (h.movieId && !seenIds.has(h.movieId._id.toString())) {
                 uniqueHistory.push(h);
                 seenIds.add(h.movieId._id.toString());
             }
        });

        res.json({
            username: user.username,
            email: user.email,
            role: user.role,
            watchHistory: uniqueHistory.map(h => ({
                id: h.movieId._id,
                title: h.movieId.title,
                poster: h.movieId.poster,
                rating: h.movieId.rating,
                year: h.movieId.year,
                watchedAt: h.watchedAt
            }))
        });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/user/watch', authenticateToken, async (req, res) => {
    const { movieId } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(movieId)) {
        return res.status(400).json({ error: 'Geçersiz film ID formatı.' });
    }

    try {
        const objMovieId = new mongoose.Types.ObjectId(movieId);

        // Önce varsa eski kaydı temizle (atomik işlem)
        await User.findByIdAndUpdate(req.user.id, {
            $pull: { watchHistory: { movieId: objMovieId } }
        });
        
        // Yeni kaydı en sona ekle ve son 50 kayıtla sınırla (atomik işlem)
        await User.findByIdAndUpdate(req.user.id, {
            $push: { 
                watchHistory: { 
                    $each: [{ movieId: objMovieId, watchedAt: new Date() }],
                    $slice: -50 
                } 
            }
        });

        res.json({ message: 'İzleme geçmişine eklendi' });
    } catch(err) {
        console.error("Watch History Error:", err);
        res.status(500).json({ error: 'İzleme geçmişi güncellenirken bir hata oluştu.' });
    }
});

app.listen(PORT, () => {
    console.log(`Enterprise Streaming Sunucusu ${PORT} portunda çalışıyor...`);
});
