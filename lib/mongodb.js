const { MongoClient } = require('mongodb');

const connectionCache = globalThis.__mongoConnectionCache || {
    client: null,
    promise: null,
    uri: null
};

globalThis.__mongoConnectionCache = connectionCache;

function getMongoUri() {
    const uri = String(process.env.MONGODB_URI || '').trim();

    if (!uri) {
        throw new Error('MONGODB_URI is not configured.');
    }
    if (/[<>]/.test(uri)) {
        throw new Error('MONGODB_URI still contains placeholder angle brackets.');
    }
    if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
        throw new Error('MONGODB_URI is not a MongoDB connection string.');
    }

    let parsed;
    try {
        parsed = new URL(uri);
    } catch {
        throw new Error('MONGODB_URI is malformed.');
    }
    if (!parsed.username || !parsed.password) {
        throw new Error('MONGODB_URI must include database-user credentials.');
    }
    if (!decodeURIComponent(parsed.pathname.replace(/^\//, ''))) {
        throw new Error('MONGODB_URI must include a database name.');
    }

    return uri;
}

async function getDatabase() {
    const uri = getMongoUri();

    if (connectionCache.uri !== uri) {
        connectionCache.client = null;
        connectionCache.promise = null;
        connectionCache.uri = uri;
    }

    if (!connectionCache.promise) {
        const client = new MongoClient(uri, {
            maxPoolSize: 10,
            minPoolSize: 0,
            serverSelectionTimeoutMS: 10000
        });
        connectionCache.promise = client.connect().then((connectedClient) => {
            connectionCache.client = connectedClient;
            return connectedClient;
        }).catch((error) => {
            connectionCache.promise = null;
            throw error;
        });
    }

    const client = connectionCache.client || await connectionCache.promise;
    return client.db();
}

module.exports = { getDatabase, getMongoUri };
