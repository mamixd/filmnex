const { extractAllSources } = require('./src/scrapers/extractor.js');

(async () => {
    console.log("Testing Greyhound...");
    const res = await extractAllSources('https://www.hdfilmizle.life/atlantik-savasi-izle-hd/');
    console.log("Result:", JSON.stringify(res, null, 2));
})();
