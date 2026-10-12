const path = require('path');
const cron = require('node-cron');
const mongoose = require('mongoose');
const BackupSetting = require('../model/BackupSetting');
const { runMongoBackup } = require('./backup/mongoBackup');

let currentTask = null;
let currentCronExpression = null;
let running = false;
let initCalled = false;

function isValidTimeHHmm(value) {
    if (typeof value !== 'string') return false;
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim());
}

function parseBoolean(value, defaultValue) {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
    return defaultValue;
}

function getEnvDefaults() {
    const enabled = parseBoolean(process.env.BACKUP_ENABLED, false);

    const frequencyRaw = (process.env.BACKUP_FREQUENCY || 'daily').toLowerCase();
    const frequency = frequencyRaw === 'weekly' ? 'weekly' : 'daily';

    const time = isValidTimeHHmm(process.env.BACKUP_TIME) ? process.env.BACKUP_TIME : '02:00';

    const dayOfWeekNum = Number.parseInt(process.env.BACKUP_DAY_OF_WEEK ?? '0', 10);
    const dayOfWeek = Number.isFinite(dayOfWeekNum) && dayOfWeekNum >= 0 && dayOfWeekNum <= 6 ? dayOfWeekNum : 0;

    const backupDir = (process.env.BACKUP_DIR || '').trim();

    return { enabled, frequency, time, dayOfWeek, backupDir };
}

async function getOrCreateBackupSettings() {
    let doc = await BackupSetting.findOne();
    if (doc) return doc;

    const defaults = getEnvDefaults();
    doc = await BackupSetting.create(defaults);
    return doc;
}

function buildCronExpression({ frequency, time, dayOfWeek }) {
    const [hh, mm] = String(time || '02:00').split(':');
    const hour = Number.parseInt(hh, 10);
    const minute = Number.parseInt(mm, 10);

    if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
        return '0 2 * * *';
    }

    if (frequency === 'weekly') {
        const dow = Number.isInteger(dayOfWeek) ? dayOfWeek : 0;
        return `${minute} ${hour} * * ${dow}`;
    }

    return `${minute} ${hour} * * *`;
}

function stopCurrentTask() {
    if (currentTask) {
        try {
            currentTask.stop();
        } catch {
            // ignore
        }
        currentTask = null;
        currentCronExpression = null;
    }
}

async function runScheduledBackup({ backupRootDir }) {
    if (running) {
        console.warn('[BackupScheduler] Previous backup still running; skipping this run.');
        return;
    }

    running = true;
    try {
        const result = await runMongoBackup({ backupRootDir });
        console.log('[BackupScheduler] Backup completed:', result.backupDir);
    } catch (err) {
        console.error('[BackupScheduler] Backup failed:', err);
    } finally {
        running = false;
    }
}

async function reconfigureBackupScheduler() {
    const doc = await getOrCreateBackupSettings();

    const enabled = !!doc.enabled;
    const frequency = doc.frequency === 'weekly' ? 'weekly' : 'daily';
    const time = isValidTimeHHmm(doc.time) ? doc.time : '02:00';
    const dayOfWeek = Number.isInteger(doc.dayOfWeek) ? doc.dayOfWeek : 0;

    const backupRootDir = doc.backupDir || process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');

    if (!enabled) {
        stopCurrentTask();
        console.log('[BackupScheduler] Backups disabled.');
        return { enabled: false };
    }

    const cronExpr = buildCronExpression({ frequency, time, dayOfWeek });

    if (currentTask && currentCronExpression === cronExpr) {
        // No schedule change; keep existing task.
        return { enabled: true, cron: cronExpr };
    }

    stopCurrentTask();

    const timezone = (process.env.BACKUP_TIMEZONE || '').trim();

    currentTask = cron.schedule(
        cronExpr,
        () => runScheduledBackup({ backupRootDir }),
        timezone ? { timezone } : undefined
    );

    currentCronExpression = cronExpr;
    console.log('[BackupScheduler] Scheduled backups:', cronExpr, timezone ? `tz=${timezone}` : '(server local time)');

    return { enabled: true, cron: cronExpr, backupRootDir };
}

function initBackupScheduler() {
    if (initCalled) return;
    initCalled = true;

    const start = () => {
        reconfigureBackupScheduler().catch((err) => {
            console.error('[BackupScheduler] Failed to initialize:', err);
        });
    };

    if (mongoose.connection.readyState === 1) {
        start();
        return;
    }

    mongoose.connection.once('open', start);
}

module.exports = {
    initBackupScheduler,
    reconfigureBackupScheduler,
};
