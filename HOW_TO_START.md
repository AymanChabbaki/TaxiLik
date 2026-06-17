# TaxiLik.ma — How to Start & Test

A legal taxi‑booking platform for Casablanca (regulated fares, no negotiation).
This guide gets the backend + mobile app running locally and walks through every
flow to test.

---

## 1. Architecture

| Part | Stack | Where | Port |
|------|-------|-------|------|
| **Backend API** | Node.js + Express + MongoDB + Socket.IO + Nodemailer | `backend/` | `5000` |
| **Mobile app** | React Native (Expo SDK 56, expo-router) | `frontend/` | `8081` (Metro) |
| Database | MongoDB (geospatial) | local Windows service | `27017` |

One app serves **three roles** — the role chosen at registration decides which
experience loads: **passenger**, **driver**, or **admin** (admins are routed to a
simple in‑app landing; full management is intended for a separate web panel).

---

## 2. Prerequisites

- **Node.js 18+** (`node -v`)
- **MongoDB Community Server** running on `127.0.0.1:27017`
  - It was installed as a **Windows service named `MongoDB`** that auto‑starts.
  - Check it: `sc query MongoDB` (should say `RUNNING`).
  - If stopped: `net start MongoDB` (run terminal as admin).
- **SMTP credentials** for sending OTP emails — already set in `backend/.env`.
- **Expo Go** app on your phone (optional) to test on a real device, or just use a
  browser for the web build.

---

## 3. Run the backend

```bash
cd backend
npm install            # first time only
npm run dev            # nodemon, auto-restarts on changes
# or: npm start
```

You should see:

```
[db] MongoDB connected
[smtp] SMTP connection verified
[server] TaxiLik API listening on http://localhost:5000 (development)
```

Quick check: open <http://localhost:5000/health> → `{"status":"ok","service":"taxilik-api"}`

> **Env**: `backend/.env` already holds `MONGO_URI`, `JWT_SECRET`, `SMTP_*`, and the
> legal fare settings. See `backend/.env.example` for the full list.

---

## 4. Run the mobile app

```bash
cd frontend
npm install            # first time only
npx expo start         # then press 'w' for web, or scan the QR with Expo Go
# shortcuts: npx expo start --web   |   --android   |   --ios
```

- **Web**: opens <http://localhost:8081>.
- **Phone (Expo Go)**: scan the QR. The app auto‑detects the backend at your
  machine's LAN IP on port `5000` (no config needed). To override, set
  `EXPO_PUBLIC_API_URL` before starting Expo.

---

## 4b. Test on a physical iPhone / Android (Expo Go)

The phone runs the JS bundle from your computer over Wi‑Fi and talks to the same
backend. No build or store account needed.

**Prerequisites**
- Your **phone and computer are on the same Wi‑Fi network** (and the network
  isn't "client‑isolated" — most home Wi‑Fi is fine; some hotels/offices block it).
- Install **Expo Go**: iPhone → App Store, Android → Google Play.

**Steps**
1. Start the backend: `cd backend && npm run dev`.
2. Start Metro in LAN mode (the default): `cd frontend && npx expo start`.
3. Connect the phone:
   - **iPhone**: open the **Camera** app, point it at the QR in the terminal →
     tap the banner → it opens in **Expo Go**.
   - **Android**: open **Expo Go** → **Scan QR code** → scan the terminal QR.
4. The app loads on your phone and auto‑targets the backend at
   `http://<your‑computer‑LAN‑IP>:5000` (derived from the Metro host).

**Windows firewall (first run)**
The first time, Windows may pop up a **"Allow Node.js to communicate on this
network"** prompt — click **Allow** (check Private networks). If the phone can't
reach the app/backend, that prompt was likely dismissed; allow Node through ports
**8081** (Metro) and **5000** (API) in Windows Defender Firewall.

**What works in Expo Go vs. not**

| Feature | In Expo Go (phone) |
|--------|--------------------|
| Auth (register/login/password/OTP email) | ✅ |
| Booking, fare, ride flow, realtime tracking | ✅ |
| In‑app **chat** | ✅ |
| GPS location, photo/avatar upload, themes, languages | ✅ |
| **Interactive map** | ⚠️ Shows the styled placeholder (the Leaflet map is web‑only) |
| **Voice calls (WebRTC)** | ❌ Disabled (needs a dev build, see below) |

**If the phone can't connect**
- Confirm same Wi‑Fi; toggle the firewall allow‑rule above.
- Try a tunnel: `npx expo start --tunnel` (installs `@expo/ngrok`). Note: the
  tunnel only exposes **Metro**, not the backend — so also set
  `EXPO_PUBLIC_API_URL` to a publicly reachable backend URL, or stay on LAN.
- Make sure Expo Go's SDK matches (this project is **SDK 56**; update Expo Go from
  the store if it complains about an unsupported version).

**Full native build (real map + voice calls on phone)**
Expo Go can't load the native map or WebRTC modules. To get those on a real
device you need a **development build** (`npx expo install expo-dev-client` then
`eas build --profile development`, or a local `npx expo run:ios` / `run:android`).
That's a larger setup — ask if you want it wired up.

---

## 5. Create test accounts

Sign‑up uses **email + password**; an **OTP email** only confirms the address at
registration (login is password‑only afterward). Use **Gmail “+aliases”** so every
test account lands in the same inbox:

| Role | Example email | How |
|------|---------------|-----|
| Passenger | `you+passenger@gmail.com` | Register in app → role **Passager** |
| Driver | `you+driver@gmail.com` | Register in app → role **Chauffeur** |
| Admin | `you@gmail.com` | Promote via script (below) |

### Admin
Admins can't self‑register. Create/promote one **with a password**:

```bash
cd backend
node src/scripts/createAdmin.js you@gmail.com YourPassword
```

Then sign in with that email + password in the app → you'll land on the
**Espace Administrateur** screen.

### Approve a driver (dev shortcut)
A driver must be **approved** before going online. Until the admin web panel exists,
force‑approve a registered driver:

```bash
cd backend
node src/scripts/approveDriver.js you+driver@gmail.com
```

In the app, the driver moves from onboarding to the **dashboard** (you may need to
re‑open the driver app / pull state — toggling online refreshes it).

---

## 6. Test the passenger flow

1. **Register** as Passager (`you+passenger@gmail.com`) → enter the OTP from your email.
2. On **Booking**: allow location (sets your pickup), tap **Destination** → pick a
   Casablanca preset (e.g. Technopark).
3. See the **Tarif Estimé** update live (0.50 DH/km + 2 DH day / 4 DH night pickup).
4. Tap **Demander un taxi** → status becomes “Recherche d'un chauffeur…”.
5. (Have a driver online — see §7) → you'll see the assigned driver appear in real time.
6. Explore the tabs: **Activity** (ride history), **Wallet**, **Profile**.

---

## 7. Test the driver flow

1. **Register** as Chauffeur (`you+driver@gmail.com`) → verify OTP.
2. **Onboarding**: upload the 5 legal documents (any photo works in dev), fill the
   vehicle fields, **Soumettre pour validation** → status becomes *pending*.
3. **Approve** the driver: `node src/scripts/approveDriver.js you+driver@gmail.com`.
4. On the **dashboard**, tap **Hors Ligne → En Ligne** (allow location).
5. From the passenger account, request a ride nearby → the driver sees a
   **NOUVELLE COURSE** card → **Accepter**.
6. Walk the lifecycle: **Je suis arrivé → Démarrer la course → Terminer la course**.
   Use **Naviguer** to open Google Maps directions.

> Tip: run the passenger (browser) and driver (phone or a second browser profile)
> side by side to watch the realtime matching + tracking.

---

## 8. Test the menu, settings & safety

Open the **☰ menu** (top‑left on Booking, or via Profile):

- **Notifications** — placeholder list.
- **Safety** — **Appeler le 15** (emergency dial), add an **emergency contact**
  (saved on device), safety tips.
- **Help** — FAQ accordion.
- **Support** — email/phone/hours with one‑tap actions.
- **Settings**:
  - **Apparence** — Système / Clair / Sombre (live theme switch, persists).
  - **Langue** — Français / English / العربية (live, persists).
  - **Documents légaux** — Terms, Privacy, Licences.
  - **Version de l'application**.
  - **Se déconnecter** and **Supprimer mon compte** (irreversible — deletes the
    account and ride history).

---

## 9. Handy backend scripts

```bash
cd backend
node src/scripts/createAdmin.js <email>        # create/promote an admin
node src/scripts/approveDriver.js <email>      # force-approve a driver (dev)
node src/scripts/smokeTest.js                  # full passenger+driver ride flow
node src/scripts/driverSmokeTest.js            # upload→approve→online→accept flow
```

The smoke tests require the server to be running.

---

## 10. Key API endpoints (reference)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/auth/register` | `{ email, password, role?, fullName?, phone? }` → sends OTP email |
| POST | `/api/auth/verify-email` | `{ email, code }` → `{ token, user }` (auto sign‑in) |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, user }` |
| GET/PATCH/DELETE | `/api/auth/me` | profile / delete account |
| POST | `/api/auth/avatar` | multipart profile‑photo upload |
| POST | `/api/rides/estimate` | legal fare estimate (rounded to 0.5 DH) |
| POST | `/api/rides` | create a ride (passenger) `{ pickup, destination, passengers }` |
| GET | `/api/rides/nearby-drivers` | online drivers near a point (map) |
| POST | `/api/driver/status` | go online/offline + location |
| POST | `/api/driver/rides/:id/accept` | accept a ride |
| PATCH | `/api/admin/drivers/:id/approval` | approve a driver (admin) |

Realtime (Socket.IO, JWT in handshake): `ride:new`, `ride:accepted`,
`ride:updated`, `driver:location`, `ride:viewers`, `chat:message`, and the
WebRTC call signaling (`call:invite/offer/answer/ice/end/decline`).

---

## 11. Troubleshooting

| Symptom | Fix |
|--------|-----|
| Server hangs / `MongoServerError` at boot | MongoDB isn't running → `net start MongoDB` (admin), confirm `sc query MongoDB`. |
| `EADDRINUSE :::5000` | An old server is still running. Find & kill: `netstat -ano | findstr :5000` then `taskkill /PID <pid> /F`. |
| No OTP email | Check spam; verify `SMTP_*` in `backend/.env`; the server logs `SMTP connection verified` at boot. |
| Passenger calls return **403** | You're logged in as **admin** (admins can't book). Use a `+passenger` account. |
| Driver can't go online | Account not approved → run `approveDriver.js`. |
| Map shows a styled placeholder | Expected. A real interactive map needs a Google Maps key + a dev build (doesn't run in Expo Go). |
| Arabic layout stays left‑to‑right | Text is translated; full RTL mirroring isn't enabled yet. |
| Web port busy | `npx expo start --web --port 8082`. |

---

## 12. Notes

- **Fares are non‑negotiable by design** — the price is the official regulated tariff.
- **Languages**: FR (default) / EN / AR, switchable in Settings, persisted per device.
- **Themes**: follow the system by default; override in Settings.
- `backend/uploads/` (driver documents) and `.env` are git‑ignored.
