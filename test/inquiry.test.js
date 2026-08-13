const test = require('node:test');
const assert = require('node:assert/strict');
const { validateInquiry } = require('../lib/inquiry');
const { getMongoUri } = require('../lib/mongodb');
const handler = require('../api/inquiry');

test('normalizes the quick inquiry form', () => {
    const { inquiry, errors } = validateInquiry({
        name: '  Jane   Seller  ',
        email: 'JANE@EXAMPLE.COM',
        phone: '(555) 123-4567',
        address: '123 Main Street',
        source: 'homepage_quick_form'
    });

    assert.deepEqual(errors, []);
    assert.equal(inquiry.fullName, 'Jane Seller');
    assert.equal(inquiry.email, 'jane@example.com');
    assert.equal(inquiry.phone, '5551234567');
    assert.equal(inquiry.propertyAddress, '123 Main Street');
});

test('rejects malformed inquiry fields before database access', async () => {
    const req = {
        method: 'POST',
        headers: { 'content-length': '20', 'content-type': 'application/json' },
        body: { name: 'X', email: 'bad', phone: '123', address: '' }
    };
    const result = { statusCode: 0, headers: {}, payload: null };
    const res = {
        status(code) { result.statusCode = code; return this; },
        setHeader(name, value) { result.headers[name] = value; return this; },
        json(payload) { result.payload = payload; return this; }
    };

    await handler(req, res);
    assert.equal(result.statusCode, 400);
    assert.equal(result.payload.success, false);
    assert.ok(Array.isArray(result.payload.errors));
});

test('rejects non-POST requests', async () => {
    const req = { method: 'GET', headers: {}, body: {} };
    const result = {};
    const res = {
        status(code) { result.statusCode = code; return this; },
        setHeader() { return this; },
        json(payload) { result.payload = payload; return this; }
    };

    await handler(req, res);
    assert.equal(result.statusCode, 405);
    assert.equal(result.payload.success, false);
});

test('rejects placeholder MongoDB configuration without exposing it', () => {
    const original = process.env.MONGODB_URI;
    process.env.MONGODB_URI = 'mongodb+srv://<username>:<password>@cluster.example.net/database';
    try {
        assert.throws(() => getMongoUri(), /placeholder angle brackets/);
    } finally {
        if (original === undefined) delete process.env.MONGODB_URI;
        else process.env.MONGODB_URI = original;
    }
});
