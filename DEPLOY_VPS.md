# Deploy TaxiLik.ma on a VPS (self-hosted, free/OSS)

A portable Docker stack — **Nginx + Node API + MongoDB + Redis** — that runs on any
Linux VPS (and unchanged on an Azure VM). No paid managed services.

```
Internet ──► Nginx (TLS, rate-limit, WS, optional WAF) ──► API (Node, Socket.IO)
                                                            ├─ MongoDB (geo, auth)
                                                            └─ Redis (Socket.IO fan-out,
                                                               rate-limits, ride viewers)
```

## 1. Prerequisites (on the VPS)
- A domain pointing to the VPS IP (e.g. `taxilik.ma`).
- Docker + Docker Compose plugin: `curl -fsSL https://get.docker.com | sh`.
- Ports **80** and **443** open.

## 2. Get the code + configure
```bash
sudo mkdir -p /opt/taxilik && cd /opt/taxilik
git clone <your-repo> .
cp .env.example .env                 # MONGO/REDIS passwords, CORS_ORIGINS
cp backend/.env.example backend/.env # JWT_SECRET, SMTP_*, fare config…
```
Set strong values in `.env` (`MONGO_PASSWORD`, `REDIS_PASSWORD`) and `backend/.env`
(a long random `JWT_SECRET`, your SMTP creds). In `backend/.env`, **leave
`MONGO_URI`/`REDIS_URL`/`UPLOAD_DIR` unset** — compose injects the correct internal
values. Edit `nginx/nginx.conf` and replace `taxilik.ma` with your domain.

## 3. TLS certificate (Let's Encrypt)
```bash
# one-time cert issue (uses the certbot webroot mounted by compose)
docker run --rm -v $(pwd)/certbot/conf:/etc/letsencrypt -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot -w /var/www/certbot -d taxilik.ma -d www.taxilik.ma \
  --email you@taxilik.ma --agree-tos --no-eff-email
```
(Renew via a weekly cron running the same command with `renew`.)

## 4. Launch
```bash
docker compose up -d --build
docker compose logs -f api        # watch boot: Mongo + Redis adapter + SMTP
```
Health: `https://taxilik.ma/health` → `{"status":"ok"}`.

Create an admin and approve a driver (inside the api container or with Mongo URI):
```bash
docker compose exec api node src/scripts/createAdmin.js you@taxilik.ma 'StrongPass!'
docker compose exec api node src/scripts/approveDriver.js driver@example.ma
```

## 5. Point the apps at it
- Web build / mobile: set `EXPO_PUBLIC_API_URL=https://taxilik.ma`.
- Add your web origin(s) to `CORS_ORIGINS`.

## 6. CI/CD (auto-deploy on push)
`.github/workflows/vps-deploy.yml` SSHes in and runs `git pull && docker compose up -d --build`.
Add repo **secrets** `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` and **var** `DEPLOY_PATH=/opt/taxilik`.

## 7. Scaling & hardening
- **Scale the API**: `docker compose up -d --scale api=3`. The **Redis adapter** makes
  multi-instance Socket.IO correct; switch the nginx upstream to use the Docker
  resolver (`resolver 127.0.0.11; set $u http://taxilik_api; proxy_pass $u;`) so it
  load-balances across replicas.
- **WAF**: swap the `nginx` image for `owasp/modsecurity-crs:nginx` (OWASP CRS
  preloaded) to get managed WAF rules in front of the API.
- **Already built in**: Helmet headers, CORS allow-list, NoSQL-injection sanitize,
  body-size limits, **Redis-backed rate-limiting** (tight on `/api/auth/*`),
  **15-min access tokens + rotating refresh tokens**, graceful shutdown, structured
  (pino) logs, non-root container, healthcheck.
- **Backups**: `docker compose exec mongo mongodump` on a cron to off-box storage;
  snapshot the `uploads` volume.
- **Firewall**: allow only 22/80/443; Mongo/Redis stay on the internal Docker network
  (never published).

## 8. After pulling these changes (one-time)
The backend has new dependencies — install them:
```bash
cd backend && npm install   # @socket.io/redis-adapter, ioredis, helmet,
                            # express-rate-limit, rate-limit-redis, pino, pino-http
cd ../frontend && npx expo install react-native-webview   # native real map
```
Restart the backend (or `docker compose up -d --build`) and reload the app.

> Same images deploy to **Azure** unchanged: push to a registry and run on an Azure VM
> (this compose) or Azure Container Apps. See `docs/AZURE_ARCHITECTURE.md`.
