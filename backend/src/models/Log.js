const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    type: { type: String, enum: ['info', 'warning', 'error', 'success'], required: true },
    module: { type: String, required: true }, // e.g., 'Scraper', 'TMDB', 'Cron'
    message: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', logSchema);
