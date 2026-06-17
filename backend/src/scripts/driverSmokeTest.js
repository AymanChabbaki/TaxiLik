// Verifies the driver onboarding path: upload -> submit 5 docs -> auto-pending
// -> admin approves docs + driver -> go online -> accept a passenger ride.
const { connectDB } = require('../config/db');
const mongoose = require('mongoose');
const User = require('../models/User');
const Ride = require('../models/Ride');
const { signToken } = require('../utils/jwt');

const BASE = 'http://localhost:5000';
const DOC_TYPES = ['cin', 'permis', 'carte_grise', 'assurance', 'permis_confiance'];

// Minimal valid 1x1 PNG.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}
const log = (l, r) => console.log(l, r.status, JSON.stringify(r.json).slice(0, 180));

async function main() {
  await connectDB();
  await User.deleteMany({ email: /dsmoke-/ });
  await Ride.deleteMany({ 'pickup.address': /DSMOKE/ });

  const driver = await User.create({ email: 'dsmoke-driver@test.dev', role: 'driver', emailVerified: true, fullName: 'Doc Driver' });
  const admin = await User.findOne({ role: 'admin' });
  const dToken = signToken(driver);
  const aToken = admin ? signToken(admin) : null;

  console.log('\n--- UPLOAD + SUBMIT 5 DOCS ---');
  for (const type of DOC_TYPES) {
    const form = new FormData();
    form.append('file', new Blob([PNG_1x1], { type: 'image/png' }), `${type}.png`);
    const up = await fetch(`${BASE}/api/driver/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${dToken}` },
      body: form,
    });
    const { url } = await up.json();
    const sub = await api('/api/driver/documents', { method: 'PUT', token: dToken, body: { type, url } });
    console.log(`  ${type}: upload ${up.status}, submit ${sub.status}`);
  }

  let me = await api('/api/auth/me', { token: dToken });
  console.log('approvalStatus after 5 docs (expect pending):', me.json.user?.driver?.approvalStatus);
  // sanity: a served upload URL is reachable
  const firstUrl = me.json.user?.driver?.documents?.[0]?.url;
  const fileRes = await fetch(firstUrl);
  console.log('uploaded file reachable:', fileRes.status, firstUrl);

  if (aToken) {
    console.log('\n--- ADMIN APPROVES DOCS + DRIVER ---');
    for (const type of DOC_TYPES) {
      await api(`/api/admin/drivers/${driver._id}/documents/${type}`, {
        method: 'PATCH', token: aToken, body: { status: 'approved' },
      });
    }
    const appr = await api(`/api/admin/drivers/${driver._id}/approval`, {
      method: 'PATCH', token: aToken, body: { status: 'approved' },
    });
    log('approval:', appr);
  }

  console.log('\n--- DRIVER GOES ONLINE ---');
  log('status:', await api('/api/driver/status', {
    method: 'POST', token: dToken, body: { isOnline: true, lng: -7.6038, lat: 33.5895 },
  }));

  console.log('\n--- PASSENGER REQUESTS A RIDE NEARBY ---');
  const passenger = await User.create({ email: 'dsmoke-pass@test.dev', role: 'passenger', emailVerified: true });
  const created = await api('/api/rides', {
    method: 'POST', token: signToken(passenger),
    body: {
      pickup: { address: 'DSMOKE pickup', lng: -7.6040, lat: 33.5897 },
      destination: { address: 'DSMOKE dest', lng: -7.6562, lat: 33.5239 },
    },
  });
  console.log('  driversNotified:', created.json.driversNotified);
  const rideId = created.json.ride?._id;

  console.log('\n--- DRIVER ACCEPTS ---');
  log('available:', await api('/api/driver/rides/available', { token: dToken }));
  log('accept:', await api(`/api/driver/rides/${rideId}/accept`, { method: 'POST', token: dToken }));

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
