# TaxiLik.ma — Azure Architecture, Security, DevOps & CI/CD

Production design for a high‑traffic, attack‑resilient deployment of TaxiLik.ma on
Microsoft Azure. The stack is **Node/Express + Socket.IO + MongoDB** (API),
**React Native / Expo** (mobile), with realtime ride matching, geospatial queries,
email OTP, file uploads, and WebRTC signaling.

> This is the blueprint + the artifacts to implement it (`backend/Dockerfile`,
> `.github/workflows/backend-cicd.yml`, `infra/*.bicep`). Provisioning runs under
> your subscription via the CI/CD pipeline or `az`/`bicep` locally.

---

## 1. Target architecture (high level)

```
                         ┌─────────────────────────────────────────────┐
   Mobile apps  ─────────►            Azure Front Door (Premium)        │
   (iOS/Android/Web)     │   Global anycast · TLS · CDN · caching       │
                         │   WAF (OWASP CRS + bot + rate limit + geo)   │
                         │   DDoS Protection Standard                   │
                         └───────────────────┬─────────────────────────┘
                                             │ private origin
                                   ┌─────────▼──────────┐
                                   │  Azure Container    │  autoscale (KEDA)
                                   │  Apps  — API + WS   │  HTTP + WebSocket
                                   │  (min 2 … N replicas)│  sticky sessions
                                   └───┬───────┬─────┬───┘
              managed identity (no secrets in code)  │
        ┌────────────────┬───────────┘       │       └─────────────┐
        ▼                ▼                    ▼                     ▼
 Azure Cosmos DB    Azure Cache        Azure Blob Storage     Azure Key Vault
 for MongoDB vCore  for Redis          (driver docs,          (JWT secret, DB
 (geo 2dsphere,     (Socket.IO         avatars) + Defender    conn, SMTP, …)
 PITR backups,      adapter, rate      for Storage scan
 priv. endpoint)    limits, OTP,
                    sessions)
        │                                     ▲
        │                              Azure Communication
        └─ App Insights / Log Analytics       Services (Email OTP)
           Azure Monitor · Defender for Cloud
```

**Why these choices**

| Concern | Service | Rationale |
|--------|---------|-----------|
| Compute | **Azure Container Apps (ACA)** | Container‑native, KEDA autoscale on HTTP concurrency, first‑class **WebSocket** support + session affinity, revisions for blue/green, far less ops than AKS. Move to **AKS** only if you outgrow ACA (custom networking, sidecars, >mega scale). |
| Database | **Cosmos DB for MongoDB (vCore)** | Managed, MongoDB wire‑compatible, supports **2dsphere geospatial** (`$near`) which the matching engine needs, PITR backups, HA, private endpoint. *Alt:* MongoDB Atlas on Azure (100% Mongo, multi‑cloud) if you want vendor‑neutral. |
| Realtime fan‑out | **Azure Cache for Redis** | Socket.IO **horizontal scaling** needs a shared pub/sub adapter; also backs distributed rate‑limiting, OTP store, and the `rideViewers` set. |
| Files | **Azure Blob Storage** | Ephemeral container disks can't hold uploads; Blob is durable, cheap, CDN‑frontable, virus‑scanned by Defender for Storage. |
| Secrets | **Azure Key Vault** | No secrets in images/repo; ACA pulls via **Managed Identity**; rotation + audit. |
| Email/OTP | **Azure Communication Services Email** | Native, high deliverability; *alt:* keep SMTP (SendGrid) via Key Vault creds. |
| Edge/security | **Front Door Premium + WAF + DDoS Std** | Global TLS, caching, OWASP rules, bot protection, per‑IP rate limits, geo‑filtering, L3/4 + L7 DDoS. |
| Registry | **Azure Container Registry (ACR)** | Private images, Defender vuln scanning, ACR Tasks. |
| Observability | **App Insights + Log Analytics + Azure Monitor** | APM, distributed tracing, live metrics, alerts, dashboards. |
| Mobile delivery | **EAS Build + EAS Update** | Store builds (iOS/Android) + OTA JS updates; web build served by Front Door / Static Web Apps. |

---

## 2. Environments & topology

- **Three environments**: `dev`, `staging`, `prod` — each its own resource group,
  Container Apps environment, Cosmos DB, Redis, Key Vault, Blob. Identical Bicep,
  different parameter files.
- **Region**: primary in **France Central** (close to Morocco / good latency),
  paired region **France South** for DR. Front Door is global.
- **High availability**: ACA min 2–3 replicas across zones; Cosmos zone‑redundant;
  Redis Standard/Premium with replication.
- **Disaster recovery**: Cosmos continuous backup (PITR, 7–30 days) + geo‑restore;
  Blob **RA‑GRS**; IaC means the whole stack is reproducible in the paired region.
  Target **RPO ≤ 5 min, RTO ≤ 1 h**.

---

## 3. Scaling for high traffic

1. **Stateless API** — the app must hold no local state (see §6 code changes):
   uploads → Blob, Socket.IO fan‑out → Redis, sessions/counters → Redis.
2. **ACA autoscale** — scale rule on concurrent HTTP requests (e.g., 80/replica)
   and a separate rule for WebSocket connections; `minReplicas: 2`,
   `maxReplicas: 30+`. Scale‑to‑zero **disabled** in prod (cold starts hurt WS).
3. **Socket.IO at scale** — `@socket.io/redis-adapter` so any replica can deliver
   to a socket on any other; ACA ingress **session affinity** keeps a socket on
   one replica.
4. **Database** — Cosmos vCore: start M30‑class, scale tier up; add **read
   replicas** for read‑heavy endpoints (nearby drivers, history); ensure the
   `2dsphere` index on `driver.lastLocation` and `pickup.location`; shard later by
   city/region if needed.
5. **Hot paths in Redis** — cache nearby‑driver lookups (short TTL), online‑driver
   presence, fare config; cuts DB load dramatically under load.
6. **Front Door caching** — cache static/web assets and the served `/uploads`
   (Blob) at edge; offloads origin.
7. **Driver location writes** — high write volume (`driver:location` every few
   seconds). Throttle persistence (e.g., write at most every 10 s/driver), keep
   live position in Redis, and broadcast via Redis pub/sub instead of DB.
8. **Load testing** — Azure Load Testing (JMeter) in the pipeline against staging;
   validate p95 latency and WS soak before prod.

---

## 4. Security (defense in depth)

**Edge / network**
- **WAF** (OWASP CRS 3.2) on Front Door: blocks common L7 attacks; custom rules for
  **per‑IP rate limiting**, **geo‑filtering**, and **bot** mitigation.
- **DDoS Protection Standard** on the VNet.
- **Private endpoints** for Cosmos, Redis, Key Vault, Blob — origins are **not
  publicly reachable**; ACA integrated into the VNet; NSGs least‑privilege.
- **TLS 1.2+ only**, HSTS, automatic certs via Front Door.

**Application**
- **Managed Identity** everywhere → zero secrets in code/images; Key Vault for the
  rest, with rotation.
- **JWT**: short‑lived access token (15 min) + **refresh‑token rotation** (replace
  the current single 30‑day token); revocation list in Redis. Passwords already
  hashed with scrypt.
- **Rate limiting & lockout** on `auth/login`, `auth/register`, `auth/resend-otp`
  (Redis‑backed, per‑IP **and** per‑account) to stop brute force / OTP abuse;
  optional CAPTCHA after N failures.
- **Input validation** on every endpoint (`zod`), **NoSQL‑injection** guard
  (`express-mongo-sanitize`), **`helmet`** security headers, strict **CORS**
  allow‑list, body size limits.
- **File uploads**: already type/size limited; store in **private** Blob,
  **Defender for Storage** malware scan, serve via short‑lived SAS or through the
  API — never world‑writable.
- **WebRTC/chat**: signaling is authenticated (JWT handshake) and scoped to the
  ride room; validate membership before relaying.
- **Secrets hygiene**: `.env` is git‑ignored; rotate the JWT secret + SMTP creds
  that have been in local `.env`.

**Platform / governance**
- **Microsoft Defender for Cloud** (CSPM + workload protection for Containers,
  Storage, Key Vault, DBs) — continuous posture + threat alerts.
- **RBAC least privilege**, PIM for admin roles, **Azure Policy** to enforce
  (no public storage, TLS min, tags, allowed regions, private endpoints).
- **Audit logging** to Log Analytics; alert on auth anomalies, WAF blocks, 5xx
  spikes, Defender incidents.
- **Backups & PITR** verified by periodic restore drills.

---

## 5. CI/CD & DevOps

**Source → ACR → Container Apps**, GitHub Actions with **OIDC federation** (no
stored cloud credentials):

1. **CI (every PR)**: `npm ci` → lint → unit/integration tests (Mongo + Redis
   service containers) → `npm audit` / dependency scan → build image →
   **Trivy/Defender** image scan → fail on High/Critical.
2. **CD (merge to `main` → staging)**: `az acr build` (or buildx) push to ACR →
   `az containerapp update` new **revision** → smoke tests → shift traffic
   (canary: 10% → 100%).
3. **Prod**: manual approval (GitHub Environment protection) → same revision
   promotion with **blue/green** (two revisions, instant rollback by traffic
   weight).
4. **Infra**: `infra/*.bicep` deployed via `az deployment group` in the pipeline;
   PR‑time `what‑if` plan; environments parameterized.
5. **Mobile**: `eas build` (iOS/Android) on tags; `eas update` for OTA JS pushes;
   web build deployed behind Front Door.
6. **DevOps practices**: IaC for everything, secrets only in Key Vault/GitHub
   OIDC, environment protection rules, automated rollback, dashboards + on‑call
   alerts, cost budgets + alerts, runbooks.

See `.github/workflows/backend-cicd.yml` for a working pipeline and
`infra/main.bicep` for the IaC skeleton.

---

## 6. Required app changes before "production at scale"

These are code changes the current MVP needs to run correctly on multiple
replicas. (Happy to implement any of them.)

1. **Uploads → Blob Storage.** `backend/uploads/` on local disk breaks on
   ephemeral/scaled containers. Use `@azure/storage-blob` (managed identity) for
   `/api/driver/upload` and `/api/auth/avatar`; store the blob URL.
2. **Socket.IO Redis adapter.** Add `@socket.io/redis-adapter` so events fan out
   across replicas; move the in‑memory `rideViewers` map and call‑signaling relays
   to be replica‑agnostic (Redis or rely on session affinity + adapter).
3. **Config from Key Vault** via env injection; remove any real secrets from local
   `.env`; rotate the ones already used.
4. **Refresh tokens** (15‑min access + rotating refresh) instead of one 30‑day JWT.
5. **Hardening middleware**: `helmet`, `express-mongo-sanitize`, `zod` validation,
   Redis‑backed `express-rate-limit`, strict CORS allow‑list, JSON body limits.
6. **Observability**: App Insights SDK + structured logging (`pino`); liveness
   (`/health`, exists) + readiness probes wired to ACA.
7. **Graceful shutdown** (drain HTTP + Socket.IO on SIGTERM) and tuned Mongoose
   connection pool.
8. **Location write throttling** (Redis presence; periodic DB persist).

---

## 7. Indicative monthly cost (prod, moderate traffic)

Rough order‑of‑magnitude (USD; varies with traffic/region):

| Item | Est. |
|------|------|
| Container Apps (2–6 vCPU steady) | $80–250 |
| Cosmos DB for MongoDB vCore (M30) | $200–400 |
| Azure Cache for Redis (Standard C1) | $55–110 |
| Front Door Premium + WAF | $300+ (base) |
| Blob + bandwidth | $10–50 |
| Key Vault / ACR / Monitor / ACS | $50–120 |
| **Total** | **~$700–1,300 / mo** |

Cost levers: start Front Door **Standard** (or App Gateway WAF) to cut the base;
scale Cosmos/Redis tiers with demand; dev/staging on small tiers or scale‑to‑zero.

---

## 8. Rollout plan

1. Implement §6 code changes on a branch; keep web + Expo Go working.
2. `infra/main.bicep` → provision **dev** (ACR, ACA env, Cosmos, Redis, Key Vault,
   Blob, App Insights). Wire CI to build + deploy to dev.
3. Add Front Door + WAF + private endpoints; promote to **staging**; load‑test.
4. Defender for Cloud + Policy + alerts + budgets.
5. Manual‑approval promote to **prod**; blue/green; DR drill.
