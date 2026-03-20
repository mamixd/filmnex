const cron = require('node-cron');
const { runScraper } = require('../scrapers/engine');
const Log = require('../models/Log');

const initScheduler = () => {
    // 7/24 Otonom çalışması için her 60 dakikada bir çalıştır.
    cron.schedule('0 * * * *', async () => {
        console.log('[CRON] Otonom Bot Tetiklendi:', new Date().toLocaleString());
        await Log.create({ type: 'info', module: 'Cron', message: 'Zamanlanmış tarama tetiklendi.' });
        await runScraper();
    });
    console.log('Zamanlanmış görev (Cron) aktif. Sistem her saat başı kendi kendine film arayacak.');
};

module.exports = { initScheduler };
