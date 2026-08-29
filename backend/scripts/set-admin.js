// ===========================
// SET ADMIN CREDENTIALS
// ===========================
// Creates the admin account, or updates it if the username already exists.
//
// Server.js only creates an admin when the collection is empty, so changing
// ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD in a hosting dashboard has no
// effect once an account exists. This script is how you actually change them.
//
// Usage, from backend/:
//   node scripts/set-admin.js <username> <email> <password>
//
// Or set ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD and run with no args.
// The password is hashed by the model's pre-save hook; it is never stored raw.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const {
    configureMongoDns,
    getMongooseConnectOptions,
    validateMongoUri
} = require('../config/database');

const [argUser, argEmail, argPass] = process.argv.slice(2);

const username = (argUser || process.env.ADMIN_USERNAME || '').trim();
const email = (argEmail || process.env.ADMIN_EMAIL || '').trim();
const password = argPass || process.env.ADMIN_PASSWORD || '';

function fail(message) {
    console.error('ERROR: ' + message);
    console.error('\nUsage: node scripts/set-admin.js <username> <email> <password>');
    process.exit(1);
}

if (!username || !email || !password) {
    fail('username, email, and password are all required.');
}

// routes/admin.js rejects any other domain at login, so refuse it here rather
// than creating an account that can never sign in.
if (!/^[^\s@]+@(gmail\.com|yahoo\.com)$/.test(email.toLowerCase())) {
    fail(`"${email}" will be rejected at login. Only @gmail.com and @yahoo.com are accepted.`);
}

if (password.length < 8) {
    fail('password must be at least 8 characters.');
}

(async () => {
    try {
        const cfg = validateMongoUri(process.env.MONGODB_URI);
        configureMongoDns(cfg.isSrv);

        console.log('Connecting to MongoDB...');
        await mongoose.connect(cfg.uri, getMongooseConnectOptions());
        console.log('Connected to', mongoose.connection.name);

        // The model lowercases username on save, so match on the same form.
        const key = username.toLowerCase();
        let admin = await Admin.findOne({ username: key });

        // email carries a unique index, so refuse early with a useful message
        // rather than surfacing a raw E11000 from Mongo.
        const emailOwner = await Admin.findOne({ email: email.toLowerCase() });
        if (emailOwner && emailOwner.username !== key) {
            console.error(`\nERROR: ${email} is already used by admin "${emailOwner.username}".`);
            console.error('Emails must be unique. Either use a different email, or set that account instead:');
            console.error(`  node scripts/set-admin.js ${emailOwner.username} ${email} <password>`);
            await mongoose.disconnect();
            process.exit(1);
        }

        if (admin) {
            admin.email = email;
            admin.password = password;   // pre-save hook hashes it
            admin.isActive = true;
            await admin.save();
            console.log(`\nUpdated existing admin "${key}".`);
        } else {
            admin = await Admin.create({
                username: key,
                email,
                password,
                fullName: process.env.ADMIN_FULL_NAME || 'System Administrator',
                role: 'admin',
                isActive: true
            });
            console.log(`\nCreated new admin "${key}".`);
        }

        // Prove the stored hash actually matches what was passed in.
        const check = await Admin.findOne({ username: key });
        const ok = await check.comparePassword(password);
        console.log('Password verifies against the stored hash:', ok ? 'yes' : 'NO');

        const all = await Admin.find().select('username email isActive').lean();
        console.log('\nAdmin accounts now in the database:');
        all.forEach((a) => {
            console.log(`  username=${String(a.username).padEnd(16)} email=${String(a.email).padEnd(30)} active=${a.isActive}`);
        });

        console.log('\nLog in with the username and email above, exactly as shown.');

        await mongoose.disconnect();
        process.exit(ok ? 0 : 1);

    } catch (error) {
        console.error('Failed:', error.message);
        process.exit(1);
    }
})();
