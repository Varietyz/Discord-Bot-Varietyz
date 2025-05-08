const https = require('https');
require('dotenv').config();

const API_KEY = process.env.GOOGLE_PAGESPEED_API;

async function fetchPageSpeedInsights(domain) {
    const apiUrl = new URL(
        'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
    );
    apiUrl.searchParams.set('url', `https://${domain}`);
    apiUrl.searchParams.set('key', API_KEY);
    apiUrl.searchParams.set('strategy', 'desktop');

    return new Promise((resolve, reject) => {
        https
            .get(apiUrl, (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        const score = Math.round(
                            (json.lighthouseResult?.categories?.performance?.score || 0) * 100
                        );
                        resolve({
                            score,
                            fcp:
                json.lighthouseResult?.audits['first-contentful-paint']
                    ?.displayValue || 'n/a',
                            tti:
                json.lighthouseResult?.audits['interactive']?.displayValue ||
                'n/a',
                        });
                    } catch {
                        reject(new Error('Failed to parse PageSpeed response'));
                    }
                });
            })
            .on('error', reject);
    });
}

module.exports = fetchPageSpeedInsights;
