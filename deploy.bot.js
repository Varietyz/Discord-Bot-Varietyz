require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
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

async function sendDiscordWebhook() {
    const content = `🛰️ **varietyz_bot Deployed & Restarted**\n✅ Deployment completed successfully.\n⏱️ Timestamp: <t:${Math.floor(Date.now() / 1000)}:F>`;
    const embed = {
        color: 0x00ff99,
        title: '🤖 Bot Deployment Success',
        description: stepLog.join('\n'),
        timestamp: new Date().toISOString()
    };
    await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, embeds: [embed] })
    });
}

async function main() {
    if (!SSH_HOST || !SSH_USER || !SSH_KEY_PATH || !DISCORD_WEBHOOK_URL) {
        console.error('Missing required environment variables.');
        process.exit(1);
    }

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
    if (tarResult.stderr) {
        throw new Error(`Remote backup failed: ${tarResult.stderr}`);
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

    logStep(`🧹 Removing remote: ${REMOTE_PATH}/*`);
    await ssh.execCommand(`rm -rf ${REMOTE_PATH}/*`);

    await ssh.putDirectory(TMP_DEPLOY, REMOTE_PATH, {
        recursive: true,
        concurrency: 5,
        tick: (local, remote, error) => {
            if (error) console.error(`❌ ${local} → ${remote}`);
        }
    });
    logStep(`📤 Deployed stripped package to ${REMOTE_PATH}`);

    logStep('📦 Running npm install...');
    const install = await ssh.execCommand(`cd ${REMOTE_PATH} && npm install`);
    if (install.stderr) {
        console.error('npm install failed:', install.stderr);
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

    await sendDiscordWebhook();
    ssh.dispose();
    logStep('✅ Done. SSH connection closed.');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
