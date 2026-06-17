// Dev helper: force-approve a driver so you can test the driver dashboard
// without the admin panel. Marks all 5 legal docs approved and the driver
// account approved.
//   Usage: node src/scripts/approveDriver.js driver@example.ma
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const User = require('../models/User');

const DOC_TYPES = ['cin', 'permis', 'carte_grise', 'assurance', 'permis_confiance'];

async function main() {
  const email = (process.argv[2] || '').toLowerCase().trim();
  if (!email) {
    console.error('Usage: node src/scripts/approveDriver.js <driver-email>');
    process.exit(1);
  }

  await connectDB();
  const driver = await User.findOne({ email, role: 'driver' });
  if (!driver) {
    console.error(`No driver found with email ${email}. Register as a driver first.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // Ensure each required document exists and is approved.
  for (const type of DOC_TYPES) {
    const existing = driver.driver.documents.find((d) => d.type === type);
    if (existing) {
      existing.status = 'approved';
    } else {
      driver.driver.documents.push({ type, url: `https://example.com/${type}.jpg`, status: 'approved' });
    }
  }
  driver.driver.approvalStatus = 'approved';
  if (!driver.driver.vehicle?.plate) {
    driver.driver.vehicle = { plate: '12345-A-6', licenseNumber: 'CASA-0001' };
  }
  await driver.save();

  console.log(`✅ Driver ${email} approved. They can now go online in the app.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
