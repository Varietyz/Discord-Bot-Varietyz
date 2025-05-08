require('dotenv').config();
const fs = require('fs');
const { fetch } = globalThis;

const { NodeSSH } = require('node-ssh');
const path = require('path');

const {
    SSH_HOST,
    SSH_USER,
    SSH_KEY_PATH,
    DISCORD_WEBHOOK_URL
} = process.env;

const REMOTE_PATH = '/root/discord_bots/varietyz_bot';
const TMP_DEPLOY = './.tmp_deploy';
const ssh = new NodeSSH();
const stepLog = [];

function logStep(msg) {
    const ts = new Date().toLocaleTimeString();
    const line = `[${ts}] ${msg}`;
    stepLog.push(line);
    console.log(line);
}

async function sendDiscordWebhook(success, backupFilename, startTime) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    const color = success ? 0x33cc33 : 0xff0000;
    const finishedTimestamp = Math.floor(endTime / 1000);
    const finishedRelative = `<t:${finishedTimestamp}:R>`;

    const embed = {
        color,
        thumbnail: { url: 'https://banes-lab.com/assets/images/Logo.png' },
        fields: [
            {
                name: 'Backup File 📁',
                value: backupFilename || 'N/A',
                inline: true
            },
            {
                name: 'Duration (s) ⏱️',
                value: `\`${duration}\``,
                inline: true
            },
            {
                name: 'Finished 🕓',
                value: finishedRelative,
                inline: true
            },
            {
                name: 'Key Steps 👟',
                value: `\`\`\`${stepLog.join('\n').slice(0, 900)}\`\`\``,
                inline: false
            }
        ],
        timestamp: new Date().toISOString()
    };

    try {
        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: success
                    ? '<@406828985696387081>\n# ✅ Deployment Successful'
                    : '<@406828985696387081>\n# ❌ Deployment Failed',
                embeds: [embed]
            })
        });
    } catch (err) {
        console.warn('⚠️ Discord notification failed:', err.message);
    }
}



async function main() {
    if (!SSH_HOST || !SSH_USER || !SSH_KEY_PATH || !DISCORD_WEBHOOK_URL) {
        console.error('Missing required environment variables.');
        process.exit(1);
    }

    const startTime = Date.now();

    if (fs.existsSync(TMP_DEPLOY)) fs.rmSync(TMP_DEPLOY, { recursive: true });
    fs.mkdirSync(`${TMP_DEPLOY}/src`, { recursive: true });

    function copyFiltered(srcDir, destDir) {
        const entries = fs.readdirSync(srcDir, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(srcDir, entry.name);
            const destPath = path.join(destDir, entry.name);

            const isExcluded =
      srcPath.includes('data/Backup Data') ||
      entry.name.endsWith('.db') ||
      entry.name.endsWith('.sqlite') ||
      entry.name === 'cache.js';

            if (isExcluded) continue;

            if (entry.isDirectory()) {
                fs.mkdirSync(destPath, { recursive: true });
                copyFiltered(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    copyFiltered('src', `${TMP_DEPLOY}/src`);
    fs.copyFileSync('package.json', `${TMP_DEPLOY}/package.json`);
    fs.copyFileSync('package-lock.json', `${TMP_DEPLOY}/package-lock.json`);
    if (fs.existsSync('.env')) {
    fs.copyFileSync('.env', `${TMP_DEPLOY}/.env`);
    logStep('🔐 Copied .env into deployment package.');
}

    logStep('📦 Prepared stripped bot deployment package.');

    const keyPath = path.resolve(SSH_KEY_PATH);
    await ssh.connect({
        host: SSH_HOST,
        username: SSH_USER,
        privateKey: fs.readFileSync(keyPath, 'utf8')
    });
    logStep(`✅ Connected via SSH: ${SSH_USER}@${SSH_HOST}`);

    logStep('🛑 Stopping PM2 process: varietyz...');
    await ssh.execCommand('pm2 stop varietyz');
    logStep('⛔ PM2 process stopped.');

    const backupFilename = `varietyz_backup_${Date.now()}.tar.gz`;
    const remoteTmp = `/tmp/${backupFilename}`;
    logStep(`📁 Backing up remote ${REMOTE_PATH} to ${remoteTmp}...`);
    const tarResult = await ssh.execCommand(`tar -czf ${remoteTmp} ${REMOTE_PATH}`);
    if (tarResult.code !== 0) {
    throw new Error(`Remote backup failed: ${tarResult.stderr || 'Unknown error'}`);
    }

    logStep(`✅ Remote backup created: ${remoteTmp}`);

    const localBackupDir = path.join(process.cwd(), 'backups');
    fs.mkdirSync(localBackupDir, { recursive: true });
    const localPath = path.join(localBackupDir, backupFilename);
    await ssh.getFile(localPath, remoteTmp);
    logStep(`💾 Backup downloaded: ${localPath}`);

    await ssh.execCommand(`rm -f ${remoteTmp}`);

    const backups = fs
        .readdirSync(localBackupDir)
        .filter(f => f.startsWith('varietyz_backup_') && f.endsWith('.tar.gz'))
        .sort((a, b) =>
            fs.statSync(path.join(localBackupDir, b)).mtimeMs -
      fs.statSync(path.join(localBackupDir, a)).mtimeMs
        );
    if (backups.length > 5) {
        const toDelete = backups.slice(5);
        toDelete.forEach(file => {
            fs.unlinkSync(path.join(localBackupDir, file));
            logStep(`🧹 Pruned old backup: ${file}`);
        });
    }

    logStep('🧹 Removing remote src/* except data/, and deleting package.json and lock...');

    await ssh.execCommand(`
    cd ${REMOTE_PATH} && \
    find src -mindepth 1 -maxdepth 1 ! -name data -exec rm -rf {} + && \
    rm -f package.json package-lock.json
    `);

    await ssh.putDirectory(TMP_DEPLOY, REMOTE_PATH, {
    recursive: true,
    concurrency: 5,
    tick: (local, remote, error) => {
        if (error) console.error(`❌ ${local} → ${remote}`);
    },
        validate: (localPath) => {
            const relPath = path.relative(TMP_DEPLOY, localPath);
            const skip = relPath.startsWith('src/data') ||
                        relPath.endsWith('.db') ||
                        relPath.endsWith('.sqlite') ||
                        relPath.endsWith('cache.js');
            if (skip) console.log(`⏭️ Skipping ${relPath}`);
            return !skip;
        }


});

    logStep(`📤 Deployed stripped package to ${REMOTE_PATH}`);

    logStep('📦 Running npm install...');
    const install = await ssh.execCommand(`cd ${REMOTE_PATH} && npm install`);
    if (install.code !== 0 || /ERR!/i.test(install.stdout)) {
        console.error('❌ npm install failed:', install.stdout || install.stderr);
        process.exit(1);
    }
    logStep('📦 npm install complete.');

    logStep('🔁 Restarting bot using PM2...');
    const restart = await ssh.execCommand('pm2 start varietyz');
    if (restart.stderr) {
        console.error('PM2 restart error:', restart.stderr);
        process.exit(1);
    }
    logStep('✅ PM2 restarted bot.');

    await sendDiscordWebhook(true, backupFilename, startTime);
    ssh.dispose();
    logStep('✅ Done. SSH connection closed.');
    process.exit(0);
}

main().catch(async err => {
    console.error('❌ Fatal error:', err);
    await sendDiscordWebhook(false, '', Date.now());
    process.exit(1);
});
