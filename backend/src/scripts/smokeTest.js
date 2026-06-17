// End-to-end smoke test against the running API (no email needed).
// Seeds a passenger + an approved/online driver, then exercises the ride flow.
const { connectDB } = require('../config/db');
const mongoose = require('mongoose');
const User = require('../models/User');
const Ride = require('../models/Ride');
const { signToken } = require('../utils/jwt');

const BASE = 'http://localhost:5000';

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

const log = (label, r) => console.log(label, r.status, JSON.stringify(r.json).slice(0, 240));

async function main() {
  await connectDB();

  // Clean prior test data
  await User.deleteMany({ email: /smoke-/ });
  await Ride.deleteMany({});

  // Passenger near Casablanca center
  const passenger = await User.create({
    email: 'smoke-passenger@test.dev',
    role: 'passenger',
    emailVerified: true,
    fullName: 'Smoke Passenger',
  });
  // Approved, online driver ~300m away
  const driver = await User.create({
    email: 'smoke-driver@test.dev',
    role: 'driver',
    emailVerified: true,
    fullName: 'Smoke Driver',
    phone: '+212600000000',
    driver: {
      approvalStatus: 'approved',
      isOnline: true,
      vehicle: { plate: 'A-12345', licenseNumber: 'CASA-001' },
      lastLocation: { type: 'Point', coordinates: [-7.6038, 33.5895] },
      documents: ['cin', 'permis', 'carte_grise', 'assurance', 'permis_confiance'].map(
        (type) => ({ type, url: `https://x/${type}.jpg`, status: 'approved' })
      ),
    },
  });

  const pToken = signToken(passenger);
  const dToken = signToken(driver);

  console.log('\n--- AUTH ---');
  log('me(passenger):', await api('/api/auth/me', { token: pToken }));

  console.log('\n--- FARE ESTIMATE ---');
  log(
    'estimate:',
    await api('/api/rides/estimate', {
      method: 'POST',
      token: pToken,
      body: {
        pickup: { lng: -7.6038, lat: 33.5731 },
        destination: { lng: -7.6325, lat: 33.5403 },
      },
    })
  );

  console.log('\n--- CREATE RIDE (passenger) ---');
  const created = await api('/api/rides', {
    method: 'POST',
    token: pToken,
    body: {
      pickup: { address: 'Bd Bir Anzarane, Casablanca', lng: -7.6038, lat: 33.5895 },
      destination: { address: 'Technopark, Sidi Maarouf', lng: -7.6562, lat: 33.5239 },
    },
  });
  log('create:', created);
  const rideId = created.json.ride?._id;
  console.log('   driversNotified:', created.json.driversNotified);

  console.log('\n--- DRIVER sees available ride ---');
  log('available:', await api('/api/driver/rides/available', { token: dToken }));

  console.log('\n--- DRIVER accepts ---');
  log('accept:', await api(`/api/driver/rides/${rideId}/accept`, { method: 'POST', token: dToken }));

  console.log('\n--- DRIVER lifecycle: arrive -> start -> complete ---');
  log('arrive:', await api(`/api/driver/rides/${rideId}/arrive`, { method: 'POST', token: dToken }));
  log('start:', await api(`/api/driver/rides/${rideId}/start`, { method: 'POST', token: dToken }));
  log('complete:', await api(`/api/driver/rides/${rideId}/complete`, { method: 'POST', token: dToken }));

  console.log('\n--- ADMIN stats ---');
  const admin = await User.findOne({ role: 'admin' });
  if (admin) log('stats:', await api('/api/admin/stats', { token: signToken(admin) }));

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
