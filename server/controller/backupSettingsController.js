const path = require('path');
const fsp = require('fs/promises');
const AdmZip = require('adm-zip');
const BackupSetting = require('../model/BackupSetting');
const Student = require('../model/Student');
const Allocation = require('../model/Allocation');
const Hostel = require('../model/Hostel');
const Room = require('../model/Room');
const SpecialNeeds = require('../model/SpecialNeeds');
const EmergencyContact = require('../model/EmergencyContact');
const User = require('../model/User');
const UserOTP = require('../model/UserOTP');
const Warden = require('../model/Warden');
const Damage = require('../model/Damage');
const Eligibility = require('../model/Eligibility');
const StudentInfo = require('../model/StudentInfo');
const StudentLastUpdate = require('../model/StudentLastUpdate');
const Role = require('../model/Role');
const Payment = require('../model/Payment');
const BackupSetting2 = require('../model/BackupSetting');

const COLLECTIONS = [
    { key: 'students', model: Student },
    { key: 'allocations', model: Allocation },
    { key: 'hostels', model: Hostel },
    { key: 'rooms', model: Room },
    { key: 'specialNeeds', model: SpecialNeeds },
    { key: 'emergencyContacts', model: EmergencyContact },
    { key: 'users', model: User },
    { key: 'userOTPs', model: UserOTP },
    { key: 'wardens', model: Warden },
    { key: 'damages', model: Damage },
    { key: 'eligibility', model: Eligibility },
    { key: 'studentInfo', model: StudentInfo },
    { key: 'studentLastUpdate', model: StudentLastUpdate },
    { key: 'roles', model: Role },
    { key: 'payments', model: Payment },
    { key: 'backupSettings', model: BackupSetting2 },
];

const COLLECTION_MAP = new Map(COLLECTIONS.map((entry) => [entry.key.toLowerCase(), entry.model]));

function resolveCollection(name) {
    if (!name) return null;
    return COLLECTION_MAP.get(String(name).trim().toLowerCase()) || null;
}

async function safeUnlink(filePath) {
    if (!filePath) return;
    try {
        await fsp.unlink(filePath);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.warn('[restoreBackup] Failed to remove temp file:', err.message || err);
        }
    }
}

function ensureArrayPayload(payload) {
    if (!Array.isArray(payload)) {
        throw new Error('Expected a JSON array of documents.');
    }
    return payload;
}

async function importDocuments(model, docs) {
    const ops = [];
    let skipped = 0;

    for (const doc of docs) {
        if (!doc || typeof doc !== 'object') {
            skipped += 1;
            continue;
        }

        if (doc._id) {
            const { _id, ...rest } = doc;
            ops.push({
                updateOne: {
                    filter: { _id },
                    update: { $set: rest },
                    upsert: true,
                },
            });
        } else {
            ops.push({ insertOne: { document: doc } });
        }
    }

    if (!ops.length) {
        return { inserted: 0, upserted: 0, modified: 0, skipped };
    }

    const result = await model.bulkWrite(ops, { ordered: false });
    return {
        inserted: result.insertedCount || 0,
        upserted: result.upsertedCount || 0,
        modified: result.modifiedCount || 0,
        skipped,
    };
}

function parseBoolean(value, defaultValue) {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
    return defaultValue;
}

function isValidTimeHHmm(value) {
    if (typeof value !== 'string') return false;
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
    return !!match;
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

const BackupSettingsController = {
    // GET /admin/backup-settings
    async getBackupSettings(req, res) {
        try {
            const doc = await getOrCreateBackupSettings();

            const effectiveBackupDir = doc.backupDir || process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');

            return res.json({
                enabled: !!doc.enabled,
                frequency: doc.frequency,
                time: doc.time,
                dayOfWeek: doc.dayOfWeek,
                backupDir: doc.backupDir || '',
                effectiveBackupDir,
            });
        } catch (err) {
            console.error('getBackupSettings error:', err);
            return res.status(500).json({ message: 'Failed to load backup settings.' });
        }
    },

    // PUT /admin/backup-settings
    async updateBackupSettings(req, res) {
        try {
            const { enabled, frequency, time, dayOfWeek, backupDir } = req.body || {};

            const update = {};

            if (enabled !== undefined) {
                update.enabled = !!enabled;
            }

            if (frequency !== undefined) {
                const f = String(frequency).toLowerCase();
                if (f !== 'daily' && f !== 'weekly') {
                    return res.status(400).json({ message: 'Invalid frequency. Use daily or weekly.' });
                }
                update.frequency = f;
            }

            if (time !== undefined) {
                if (!isValidTimeHHmm(time)) {
                    return res.status(400).json({ message: 'Invalid time. Expected HH:mm (00:00 - 23:59).' });
                }
                update.time = time;
            }

            if (dayOfWeek !== undefined) {
                const n = Number(dayOfWeek);
                if (!Number.isInteger(n) || n < 0 || n > 6) {
                    return res.status(400).json({ message: 'Invalid dayOfWeek. Expected 0 (Sun) - 6 (Sat).' });
                }
                update.dayOfWeek = n;
            }

            if (backupDir !== undefined) {
                if (backupDir === null) {
                    update.backupDir = '';
                } else if (typeof backupDir !== 'string') {
                    return res.status(400).json({ message: 'Invalid backupDir. Expected a string.' });
                } else {
                    update.backupDir = backupDir.trim();
                }
            }

            const doc = await getOrCreateBackupSettings();
            Object.assign(doc, update);
            await doc.save();

            // Scheduler is optional here; wired in server startup.
            try {
                // Lazy require to avoid hard dependency cycles.
                // eslint-disable-next-line global-require
                const { reconfigureBackupScheduler } = require('../utils/backupScheduler');
                if (typeof reconfigureBackupScheduler === 'function') {
                    await reconfigureBackupScheduler();
                }
            } catch (e) {
                // If scheduler module isn't available yet, settings still save correctly.
                console.warn('Backup scheduler reconfigure skipped:', e?.message || e);
            }

            const effectiveBackupDir = doc.backupDir || process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');

            return res.json({
                message: 'Backup settings updated.',
                settings: {
                    enabled: !!doc.enabled,
                    frequency: doc.frequency,
                    time: doc.time,
                    dayOfWeek: doc.dayOfWeek,
                    backupDir: doc.backupDir || '',
                    effectiveBackupDir,
                },
            });
        } catch (err) {
            console.error('updateBackupSettings error:', err);
            return res.status(500).json({ message: 'Failed to update backup settings.' });
        }
    },

    // GET /admin/download-database
    async downloadFullDatabase(req, res) {
        try {
            // Set response headers for download
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `database_backup_${timestamp}.zip`;
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

            // Create archiver instance (ESM-only module)
            const archiverModule = await import('archiver');
            const ZipArchive = archiverModule.ZipArchive;
            if (!ZipArchive) {
                throw new Error('Archiver ZipArchive export not available');
            }
            const archive = new ZipArchive({ zlib: { level: 9 } });

            // Handle archive errors
            archive.on('error', (err) => {
                console.error('Archive error:', err);
                res.status(500).end('Failed to create backup archive');
            });

            // Pipe archive data to response
            archive.pipe(res);

            // Fetch and add each collection as a JSON file
            for (const collection of COLLECTIONS) {
                try {
                    const data = await collection.model.find().lean();
                    const jsonData = JSON.stringify(data, null, 2);
                    archive.append(jsonData, { name: `${collection.key}.json` });
                } catch (err) {
                    console.warn(`Warning: Could not fetch collection ${collection.key}:`, err.message);
                    // Continue with other collections even if one fails
                    const emptyData = JSON.stringify([], null, 2);
                    archive.append(emptyData, { name: `${collection.key}_ERROR.json` });
                }
            }

            // Add metadata
            const metadata = {
                exportedAt: new Date().toISOString(),
                totalCollections: COLLECTIONS.length,
                description: 'Full HMS database backup - each collection as separate JSON file',
            };
            archive.append(JSON.stringify(metadata, null, 2), { name: 'METADATA.json' });

            // Finalize archive - this completes the stream
            archive.finalize();

            console.log(`[downloadFullDatabase] Database backup initiated: ${filename}`);
        } catch (err) {
            console.error('downloadFullDatabase error:', err);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Failed to download database backup.' });
            } else {
                res.end();
            }
        }
    },

    // POST /admin/restore-backup
    async restoreBackup(req, res) {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'Backup file is required.' });
        }

        const filePath = file.path;
        const ext = path.extname(file.originalname).toLowerCase();

        try {
            if (ext === '.json') {
                const collectionName = req.body?.collection || path.basename(file.originalname, ext);
                const model = resolveCollection(collectionName);
                if (!model) {
                    return res.status(400).json({
                        message: `Unknown collection "${collectionName}".`,
                        allowedCollections: COLLECTIONS.map((c) => c.key),
                    });
                }

                const raw = await fsp.readFile(filePath, 'utf8');
                const payload = JSON.parse(raw);
                const docs = ensureArrayPayload(payload);
                const result = await importDocuments(model, docs);

                return res.json({
                    message: 'Backup imported successfully.',
                    mode: 'json',
                    collection: collectionName,
                    result,
                });
            }

            if (ext === '.zip') {
                const zip = new AdmZip(filePath);
                const entries = zip.getEntries();
                const results = [];

                for (const entry of entries) {
                    if (entry.isDirectory) continue;
                    if (path.extname(entry.entryName).toLowerCase() !== '.json') continue;

                    const baseName = path.basename(entry.entryName, '.json');
                    if (baseName.toLowerCase() === 'metadata') continue;

                    const model = resolveCollection(baseName);
                    if (!model) {
                        results.push({
                            collection: baseName,
                            status: 'skipped',
                            reason: 'Unknown collection',
                        });
                        continue;
                    }

                    try {
                        const jsonText = entry.getData().toString('utf8');
                        const payload = JSON.parse(jsonText);
                        const docs = ensureArrayPayload(payload);
                        const result = await importDocuments(model, docs);
                        results.push({ collection: baseName, status: 'ok', result });
                    } catch (err) {
                        results.push({
                            collection: baseName,
                            status: 'error',
                            error: err.message || String(err),
                        });
                    }
                }

                return res.json({
                    message: 'Backup imported successfully.',
                    mode: 'zip',
                    results,
                });
            }

            return res.status(400).json({ message: 'Unsupported file type. Use .json or .zip.' });
        } catch (err) {
            console.error('restoreBackup error:', err);
            return res.status(500).json({ message: 'Failed to import backup file.' });
        } finally {
            await safeUnlink(filePath);
        }
    },
};

module.exports = BackupSettingsController;
