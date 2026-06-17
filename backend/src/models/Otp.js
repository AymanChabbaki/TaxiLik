const mongoose = require('mongoose');

const { Schema } = mongoose;

const otpSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    codeHash: { type: String, required: true }, // hashed, never store plaintext
    role: { type: String, enum: ['passenger', 'driver', 'admin'], default: 'passenger' },
    attempts: { type: Number, default: 0 },
    consumedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index: documents auto-delete once expired.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
