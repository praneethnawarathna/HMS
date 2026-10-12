const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const { once } = require('events');
const { finished } = require('stream/promises');

function pad2(n) {
    return String(n).padStart(2, '0');
}

function formatTimestampForFolder(date) {
    const yyyy = date.getFullYear();
    const mm = pad2(date.getMonth() + 1);
    const dd = pad2(date.getDate());
    const hh = pad2(date.getHours());
    const mi = pad2(date.getMinutes());
    const ss = pad2(date.getSeconds());
    // Windows-safe (no ':' chars)
    return `${yyyy}-${mm}-${dd}_${hh}-${mi}-${ss}`;
}

function safeFilename(name) {
    return String(name).replace(/[<>:"/\\|?*]/g, '_');
}

async function writeChunk(stream, chunk) {
    const ok = stream.write(chunk);
    if (!ok) {
        await once(stream, 'drain');
    }
}

async function writeCursorAsJsonArray(filePath, cursor) {
    const stream = fs.createWriteStream(filePath, { encoding: 'utf8' });

    try {
        await writeChunk(stream, '[\n');
        let first = true;

        for await (const doc of cursor) {
            const json = JSON.stringify(doc);
            if (!first) {
                await writeChunk(stream, ',\n');
            }
            await writeChunk(stream, json);
            first = false;
        }

        await writeChunk(stream, '\n]\n');
        stream.end();
        await finished(stream);
    } catch (err) {
        stream.destroy();
        throw err;
    }
}

async function runMongoBackup({ backupRootDir }) {
    if (!backupRootDir || typeof backupRootDir !== 'string') {
        throw new Error('backupRootDir is required');
    }

    const db = mongoose.connection?.db;
    if (!db) {
        throw new Error('MongoDB connection is not ready');
    }

    const now = new Date();
    const timestamp = formatTimestampForFolder(now);

    await fsp.mkdir(backupRootDir, { recursive: true });

    const backupDir = path.join(backupRootDir, `mongo_backup_${timestamp}`);
    await fsp.mkdir(backupDir, { recursive: true });

    const collectionsInfo = await db.listCollections().toArray();
    const collectionNames = collectionsInfo
        .map((c) => c?.name)
        .filter((name) => typeof name === 'string' && name.length > 0)
        .filter((name) => !name.startsWith('system.'));

    for (const name of collectionNames) {
        const cursor = db.collection(name).find({});
        const fileName = `${safeFilename(name)}.json`;
        const outPath = path.join(backupDir, fileName);
        await writeCursorAsJsonArray(outPath, cursor);
    }

    const metadata = {
        createdAt: now.toISOString(),
        database: db.databaseName,
        collections: collectionNames,
    };

    await fsp.writeFile(path.join(backupDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

    return {
        backupDir,
        createdAt: metadata.createdAt,
        collectionCount: collectionNames.length,
    };
}

module.exports = {
    runMongoBackup,
};
