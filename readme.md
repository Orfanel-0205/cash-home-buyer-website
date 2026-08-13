# Home Sell Direct

A Vanilla HTML/CSS/JavaScript lead-generation site with a Vercel serverless inquiry endpoint and MongoDB Atlas storage. A custom domain and SMS provider are not required to launch.

## How inquiries work

The public forms submit JSON to `POST /api/inquiry`. The server validates and normalizes the property/contact fields, stores a document in the existing MongoDB `leads` collection, and only then calls the optional notification boundary in `lib/notifications.js`. Missing notification credentials—or a future notification failure—do not discard a saved inquiry.

Secrets are read only by server-side code. Never put `MONGODB_URI` or notification credentials in HTML or browser JavaScript.

## Local development

Requirements: Node.js 20 or newer and a MongoDB Atlas database.

1. Install both sets of dependencies:

   ```powershell
   npm.cmd install
   npm.cmd --prefix backend install
   ```

2. Copy `backend/.env.example` to `backend/.env`.
3. In MongoDB Atlas, create a database user, note its password, and add your current public IP under Network Access. In Atlas, choose Connect > Drivers and copy the Node.js connection string.
4. Replace the connection string placeholders in `backend/.env`. Include a database name after `.net/`:

   ```dotenv
   MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/YOUR_DATABASE?retryWrites=true&w=majority
   ```

   Do not keep `<username>`, `<password>`, or other angle brackets in the real value. URL-encode reserved characters in credentials (for example `@` becomes `%40`, `:` becomes `%3A`, `/` becomes `%2F`, `?` becomes `%3F`, `#` becomes `%23`, `[` becomes `%5B`, `]` becomes `%5D`, and `%` becomes `%25`). Atlas can generate the host portion, but only you can supply the database user password.

5. Start the local Express development server:

   ```powershell
   npm.cmd run dev
   ```

6. Open `http://localhost:5000`. The local server exposes the same `/api/inquiry` handler used by Vercel.

An absent, placeholder, incorrectly encoded, or unauthorized `MONGODB_URI` produces a configuration/connection error. The application cannot complete a real database write until valid Atlas credentials and Network Access are configured.

## API example

```powershell
$body = @{
  name = 'Test Seller'
  phone = '5551234567'
  email = 'seller@example.com'
  address = '123 Main Street'
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri 'http://localhost:5000/api/inquiry' -ContentType 'application/json' -Body $body
```

The full sell-your-house form also sends its property type, condition, bedroom/bathroom counts, selling reason, timeframe, mortgage response, notes, contact preference, consent, and campaign tracking fields.

## Deploy to Vercel

1. Commit the source (never `backend/.env` or any other `.env` file) and push it to a GitHub repository.
2. In Vercel, select Add New > Project, import the repository, and leave the framework preset as Other.
3. In Project Settings > Environment Variables, add `MONGODB_URI` with the valid Atlas string. Select Production and any Preview/Development environments that should write to the database.
4. Ensure Atlas Network Access permits Vercel connections. For serverless deployments, use an Atlas-supported access strategy appropriate to your security requirements; narrowly scoped access is preferable when available.
5. Deploy. Vercel serves the static site and `api/inquiry.js` as a serverless function.
6. Visit the generated `https://project-name.vercel.app` address and submit a test inquiry. Confirm the record in Atlas (the `leads` collection), and test the endpoint directly at `https://project-name.vercel.app/api/inquiry`.

No domain is needed for this workflow. Later, add the client's domain under Vercel Project Settings > Domains and follow Vercel's DNS instructions; the relative `/api/inquiry` URL continues to work unchanged.

The pre-existing Express/Socket.IO admin system remains available during local development but is not part of this serverless deployment. `backend` and `pages/admin` are excluded from the Vercel upload; the public inquiry flow and Atlas storage do not depend on them.

## Security and abuse prevention

The endpoint has a 12 KB request limit, field allowlists, length limits, normalization, safe visitor errors, and support for a hidden `website` honeypot field. Database errors and secrets are not returned to visitors.

An in-memory rate limiter is intentionally not used for the serverless endpoint because separate function instances do not share reliable state. Before high-volume promotion, configure Vercel Firewall/rate limiting or add a shared service such as a Redis-backed limiter. `TURNSTILE_SECRET_KEY`, `RATE_LIMIT_API_URL`, and `RATE_LIMIT_API_TOKEN` are reserved in `.env.example` for a future server-side bot/rate-limit integration; none is mandatory now.

## Adding SMS later

SMS is intentionally disabled. `lib/notifications.js` is the single provider boundary. After choosing a provider:

1. Implement a provider adapter there (or call a new provider-specific module from it).
2. Add `SMS_API_KEY`, `SMS_API_SECRET`, `SMS_SENDER`, and `CLIENT_PHONE` in Vercel Environment Variables and locally if needed.
3. Redeploy.

The frontend, `/api/inquiry`, MongoDB database, Vercel domain, and saved leads do not need to be recreated. Keep notification errors isolated so the inquiry save remains the source of submission success.

## Relevant files

- `api/inquiry.js` — Vercel-compatible HTTP function
- `lib/inquiry.js` — validation and normalization
- `lib/mongodb.js` — cached MongoDB connection for warm serverless invocations
- `lib/notifications.js` — optional future provider boundary
- `backend/Server.js` — local Express/admin server
- `.env.example` and `backend/.env.example` — safe configuration templates
