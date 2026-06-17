// Usage: node src/scripts/createAdmin.js admin@taxilik.ma <password>
// Creates (or promotes) a user to the admin role with a password for login.
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const User = require('../models/User');
const { hashPassword } = require('../utils/password');

async function main() {
  const email = (process.argv[2] || '').toLowerCase().trim();
  const password = process.argv[3];
  if (!email) {
    console.error('Usage: node src/scripts/createAdmin.js <email> <password>');
    process.exit(1);
  }

  await connectDB();
  let user = await User.findOne({ email });
  if (user) {
    user.role = 'admin';
    user.emailVerified = true;
    if (password) user.passwordHash = hashPassword(password);
    await user.save();
    console.log(`Promoted ${email} to admin${password ? ' and set password' : ''}.`);
  } else {
    if (!password) {
      console.error('A password is required when creating a new admin.');
      process.exit(1);
    }
    user = await User.create({
      email,
      role: 'admin',
      emailVerified: true,
      passwordHash: hashPassword(password),
    });
    console.log(`Created admin ${email}.`);
  }
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
