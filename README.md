# Cricket Fund Tracker (Strict Client-Server)

This project is split into two independent apps:

- `client/` - React + Vite frontend
- `server/` - Node.js + Express backend

## Project Structure

- `client/src` - Frontend source
- `client/public` - Frontend static assets (if present)
- `client/vite.config.js` - Vite config
- `server/index.js` - Express entry point
- `server/supabaseAdmin.js` - Server Supabase client
- `package.json` - Root orchestration scripts only

## Setup

1. Install root tooling:

```bash
npm install
```

2. Install app dependencies:

```bash
npm run install:all
```

3. Configure environment variables for client and server.

4. Start both apps:

```bash
npm run dev
```

## Scripts

- `npm run dev` - Runs client and server together using `concurrently`
- `npm run build` - Builds client app
- `npm run install:all` - Installs dependencies for both `client` and `server`

## API Routes

- `GET /api/health`
- `GET /api/public-dashboard?week=<number>`
- `GET /api/admin-dashboard?week=<number>`
- `POST /api/admin/players`
- `POST /api/admin/payments/upsert`

## Notes

- In local development, Vite proxies `/api` requests to `http://localhost:4000`.
- For safer server-side operations, prefer `SUPABASE_SERVICE_ROLE_KEY` on the server.
