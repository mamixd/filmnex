const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    source: { type: String, required: true }, // e.g., 'vidmoly', 'doodstream', 'm3u8'
    url: { type: String, required: true },
    type: { type: String, enum: ['iframe', 'm3u8', 'mp4'], default: 'iframe' },
    status: { type: String, enum: ['active', 'broken'], default: 'active' }
});

const movieSchema = new mongoose.Schema({
    title: { type: String, required: true, index: true },
    original_title: { type: String },
    tmdbId: { type: String, sparse: true },
    description: { type: String },
    poster: { type: String }, 
    backdrop: { type: String },
    rating: { type: String, default: '0.0' },
    year: { type: Number },
    releaseDate: { type: String }, // YYYY-MM-DD
    genres: [{ type: String }],
    lang: { type: String, default: 'TR Dublaj' },
    label: { type: String },
    status: { type: String, enum: ['active', 'broken'], default: 'active' },
    players: [playerSchema], 
    
    // Gelişmiş Bot Verileri (Kullanıcının Orijinal Scraper'ı)
    type: { type: String, default: 'movie' },
    sourceUrl: { type: String },
    directSource: { type: String },
    directSourceAlt: { type: String },
    directSourceOriginal: { type: String },
    isBot: { type: Boolean, default: false },
    subtitles: [{
        label: String,
        srclang: String,
        src: String,
        default: Boolean
    }],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    views: { type: Number, default: 0 },

    // Site Özel Puanlama
    siteRating: { type: Number, default: 0 },
    siteVoteCount: { type: Number, default: 0 },
    ratings: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        score: { type: Number, min: 1, max: 10 },
        createdAt: { type: Date, default: Date.now }
    }]
});

movieSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

module.exports = mongoose.model('Movie', movieSchema);
