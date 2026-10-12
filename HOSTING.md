# Running and hosting HMS

## Local network

Start the backend:

```powershell
cd server
npm start
```

Start the frontend:

```powershell
cd client
npm run dev
```

Vite now listens on all network interfaces. Open the `Network` URL printed by
Vite from another device on the same LAN. Windows Firewall must allow Node.js
on the private network.

The local client setting is:

```env
VITE_APP_API=/api
```

Vite proxies that path to `http://127.0.0.1:5000` and removes `/api` before the
request reaches Express.

## Production

Deploy `client` and `server` as separate applications. Configure the frontend
environment before running `npm run build`:

```env
VITE_APP_API=https://your-backend.example.com
```

Do not add `/api` unless the production reverse proxy deliberately exposes the
Express application under that prefix. Vite embeds this value at build time, so
rebuild the client whenever it changes.

Configure the backend host with the variables used by `server/.env`, especially
`MONGO_URI`, `JWT_SECRET`, `PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `APP_PROTOCOL`,
and `APP_HOST`. `MONGO_URI` must point to a database reachable from the backend
host; a localhost MongoDB address only works when MongoDB runs on that same host.

Use HTTPS for both applications. Set `APP_HOST` to the public frontend host so
email verification and password-reset links do not point to localhost.

If the frontend is deployed as a static single-page application, configure the
host to fall back to `index.html` for unknown frontend routes.
