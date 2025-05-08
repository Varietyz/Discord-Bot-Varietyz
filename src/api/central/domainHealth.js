const https = require('https');
const db = require('../../modules/utils/essentials/dbUtils');
const puppeteer = require('puppeteer');
const os = require('os');
const dns = require('dns').promises;
const process = require('process');
const fetchPageSpeedInsights = require('../../modules/collection/pageSpeedInsights');

const DOMAIN = 'banes-lab.com';
const CACHE_DURATION = 12 * 60 * 60 * 1000;
const READ_CACHE_DURATION = 5 * 60 * 1000;

let _domainHealthCache = null;
let _lastDomainHealthCheck = 0;

async function getCachedDomainHealth() {
    const now = Date.now();

    if (
        _domainHealthCache &&
    now - _lastDomainHealthCheck < READ_CACHE_DURATION
    ) {
        return _domainHealthCache;
    }

    const latest = await db.getOne(
        'SELECT * FROM domain_health WHERE domain = ? ORDER BY last_checked DESC LIMIT 1',
        [DOMAIN]
    );

    if (latest) {
        _domainHealthCache = latest;
        _lastDomainHealthCheck = now;
        return latest;
    }

    return null;
}

async function runLighthouse(url = `https://${DOMAIN}`) {
    try {

        const lighthouse = require('lighthouse');

        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--no-zygote',
                '--disable-dev-shm-usage',
            ],
        });

        const { lhr } = await lighthouse(url, {
            port: new URL(browser.wsEndpoint()).port,
            output: 'json',
            logLevel: 'info',
        });

        console.log('⚙️ Lighthouse categories:', Object.keys(lhr.categories || {}));
        console.log('📊 Performance raw:', lhr.categories?.performance?.score);

        const score = Math.round((lhr.categories.performance?.score ?? 0) * 100);
        await browser.close();
        return score;
    } catch (err) {
        console.warn(`⚠️ Lighthouse failed: ${err.message}`);
        return -1;
    }
}

async function fetchSslLabsData(domain = DOMAIN, maxAttempts = 10) {
    const apiUrl = (base) =>
        `https://api.ssllabs.com/api/v3/${base}?host=${domain}&all=done`;

    let attempts = 0;
    while (attempts < maxAttempts) {
        const json = await new Promise((resolve, reject) => {
            https
                .get(apiUrl('analyze'), (res) => {
                    let data = '';
                    res.on('data', (chunk) => (data += chunk));
                    res.on('end', () => {
                        try {
                            resolve(JSON.parse(data));
                        } catch {
                            reject(new Error('❌ Failed to parse SSL Labs response'));
                        }
                    });
                })
                .on('error', reject);
        });

        if (json.status === 'READY') {
            const endpoint = json.endpoints?.[0] || {};
            const cert = json.certs?.[0] || {};
            const details = endpoint.details || {};

            const ocsp_stapling = details.ocspStapling ? 1 : 0;
            const hsts_max_age = json.hstsPolicy?.maxAge || 0;
            const ssl_key_alg = cert.keyAlg || 'Unknown';
            const ssl_key_size = cert.keySize || null;

            const headers = details.httpTransactions?.[0]?.responseHeaders || [];
            const headers_summary = headers
                .filter((h) =>
                    [
                        'strict-transport-security',
                        'x-content-type-options',
                        'content-security-policy',
                        'x-frame-options',
                        'referrer-policy',
                        'permissions-policy',
                    ].includes(h.name.toLowerCase())
                )
                .map((h) => `${h.name}: ${h.value}`)
                .join('\n');

            const expectedHeaders = [
                'strict-transport-security',
                'x-content-type-options',
                'content-security-policy',
                'x-frame-options',
                'referrer-policy',
                'permissions-policy',
            ];

            const headerMap = headers_summary
                .split('\n')
                .map((line) => line.trim().toLowerCase())
                .filter(Boolean)
                .reduce((acc, line) => {
                    const [key] = line.split(':');
                    acc[key.trim()] = true;
                    return acc;
                }, {});

            const foundHeaders = expectedHeaders.filter((h) => headerMap[h]);
            const headers_score = foundHeaders.length;
            const hsts_enabled = headerMap['strict-transport-security'] ? 1 : 0;

            return {
                ssl_grade: endpoint.grade || 'Unavailable',
                tls_versions:
          details.protocols?.map((p) => p.version).join(', ') || 'Unknown',
                tls_expiry: cert.notAfter || null,
                ocsp_stapling,
                hsts_max_age,
                hsts_enabled,
                ssl_key_alg,
                ssl_key_size,
                headers_summary,
                headers_score,
            };
        }

        if (json.status === 'ERROR') {
            throw new Error(
                `SSL Labs error: ${json.statusMessage || 'Unknown failure'}`
            );
        }

        attempts++;
        await new Promise((r) => setTimeout(r, 5000));
    }

    throw new Error('SSL Labs scan timed out after polling.');
}

async function fetchAndCacheDomainHealth() {
    const now = Date.now();
    const cached = await db.getOne(
        'SELECT * FROM domain_health WHERE domain = ?',
        [DOMAIN]
    );
    if (cached && now - cached.last_checked < CACHE_DURATION) return cached;

    let sslData = {
        ssl_grade: 'Unavailable',
        tls_versions: 'Unknown',
        tls_expiry: null,
        ocsp_stapling: 0,
        hsts_max_age: 0,
        hsts_enabled: 0,
        ssl_key_alg: 'Unknown',
        ssl_key_size: null,
        headers_summary: '',
        headers_score: 0,
    };

    try {
        sslData = await fetchSslLabsData(DOMAIN);
        console.log('✅ SSL Labs fetched');
    } catch (err) {
        console.warn(`⚠️ SSL Labs fetch failed: ${err.message}`);
    }

    let pagespeed = { score: -1, fcp: 'n/a', tti: 'n/a' };
    try {
        pagespeed = await fetchPageSpeedInsights(DOMAIN);
        console.log('✅ PageSpeed fetched');
    } catch (e) {
        console.warn('⚠️ PageSpeed fetch failed:', e.message);
    }

    const nodeVersion = process.version;
    const serverUptime = os.uptime();
    const memoryUsageMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const cpuLoadPercent = Math.round(os.loadavg()[0] * 25);
    const [ipv4] = await dns.resolve4(DOMAIN).catch(() => ['Unavailable']);
    const [ipv6] = await dns.resolve6(DOMAIN).catch(() => ['Unavailable']);
    const mxRecords = await dns.resolveMx(DOMAIN).catch(() => []);
    const lighthouse_score = await runLighthouse();

    const headers_grade =
    sslData.headers_score === 6
        ? 'A+'
        : sslData.headers_score >= 5
            ? 'A'
            : sslData.headers_score >= 4
                ? 'B'
                : sslData.headers_score >= 3
                    ? 'C'
                    : sslData.headers_score >= 2
                        ? 'D'
                        : 'F';

    const lighthouse_grade =
    lighthouse_score >= 90
        ? 'A+'
        : lighthouse_score >= 80
            ? 'A'
            : lighthouse_score >= 70
                ? 'B'
                : lighthouse_score >= 60
                    ? 'C'
                    : lighthouse_score >= 50
                        ? 'D'
                        : 'F';

    const allDefaults =
    sslData.ssl_grade === 'Unavailable' &&
    pagespeed.score < 0 &&
    lighthouse_score < 0;

    if (allDefaults && cached) {
        _domainHealthCache = cached;
        _lastDomainHealthCheck = now;
        console.warn('⚠️ All external fetches failed—skipping update');
        return cached;
    }

    const payload = {
        domain: DOMAIN,
        ssl_score: sslData.ssl_grade,
        tls_versions: sslData.tls_versions,
        tls_expiry: sslData.tls_expiry,
        last_checked: now,
        ipv4,
        ipv6,
        mx_records: JSON.stringify(mxRecords),
        node_version: nodeVersion,
        server_uptime: serverUptime,
        lighthouse_score,
        lighthouse_grade,
        memory_usage_mb: memoryUsageMb,
        cpu_load_percent: cpuLoadPercent,
        pagespeed_score: pagespeed.score,
        pagespeed_fcp: pagespeed.fcp,
        pagespeed_tti: pagespeed.tti,
        ocsp_stapling: sslData.ocsp_stapling,
        hsts_max_age: sslData.hsts_max_age,
        hsts_enabled: sslData.hsts_enabled,
        headers_summary: sslData.headers_summary,
        headers_score: sslData.headers_score,
        headers_grade,
        ssl_key_alg: sslData.ssl_key_alg,
        ssl_key_size: sslData.ssl_key_size,
    };

    await db.runQuery(
        `INSERT OR REPLACE INTO domain_health (
      domain, ssl_score, tls_versions, tls_expiry, last_checked,
      ipv4, ipv6, mx_records, node_version, server_uptime,
      lighthouse_score, lighthouse_grade, memory_usage_mb, cpu_load_percent,
      pagespeed_score, pagespeed_fcp, pagespeed_tti,
      ocsp_stapling, hsts_max_age, hsts_enabled,
      headers_summary, headers_score, headers_grade,
      ssl_key_alg, ssl_key_size
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.domain,
            payload.ssl_score,
            payload.tls_versions,
            payload.tls_expiry,
            payload.last_checked,
            payload.ipv4,
            payload.ipv6,
            payload.mx_records,
            payload.node_version,
            payload.server_uptime,
            payload.lighthouse_score,
            payload.lighthouse_grade,
            payload.memory_usage_mb,
            payload.cpu_load_percent,
            payload.pagespeed_score,
            payload.pagespeed_fcp,
            payload.pagespeed_tti,
            payload.ocsp_stapling,
            payload.hsts_max_age,
            payload.hsts_enabled,
            payload.headers_summary,
            payload.headers_score,
            payload.headers_grade,
            payload.ssl_key_alg,
            payload.ssl_key_size,
        ]
    );

    return payload;
}

module.exports = {
    fetchAndCacheDomainHealth,
    getCachedDomainHealth,
};
