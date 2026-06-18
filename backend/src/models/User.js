const mongoose = require('mongoose');

const { Schema } = mongoose;

// GeoJSON point used for driver live location (2dsphere indexed).
const pointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
  },
  { _id: false }
);

// A single legal document submitted by a driver for admin validation.
const documentSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['cin', 'permis', 'carte_grise', 'assurance', 'permis_confiance'],
      required: true,
    },
    url: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['passenger', 'driver', 'admin'],
      default: 'passenger',
      index: true,
    },
    fullName: { type: String, trim: true },
    phone: { type: String, trim: true },
    avatarUrl: { type: String },
    passwordHash: { type: String, select: false }, // scrypt "salt:hash"
    emailVerified: { type: Boolean, default: false },

    // --- Driver-specific fields (ignored for passengers) ---
    driver: {
      // Overall onboarding/approval status set by admin.
      approvalStatus: {
        type: String,
        enum: ['incomplete', 'pending', 'approved', 'rejected'],
        default: 'incomplete',
      },
      documents: { type: [documentSchema], default: [] },
      vehicle: {
        plate: { type: String, trim: true },
        licenseNumber: { type: String, trim: true }, // taxi license / agrément
      },
      isOnline: { type: Boolean, default: false },
      lastLocation: { type: pointSchema, default: undefined },
      lastSeenAt: { type: Date },
    },

    // Soft account controls for admin.
    isBlocked: { type: Boolean, default: false },

    // Aggregated average rating (updated after each new rating).
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },

    // Expo push token for device notifications (updated on each app launch).
    pushToken: { type: String },
  },
  { timestamps: true }
);

// Geospatial index for proximity matching of online drivers.
userSchema.index({ 'driver.lastLocation': '2dsphere' });

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id,
    email: this.email,
    role: this.role,
    fullName: this.fullName,
    phone: this.phone,
    avatarUrl: this.avatarUrl,
    emailVerified: this.emailVerified,
    isBlocked: this.isBlocked,
    driver:
      this.role === 'driver'
        ? {
            approvalStatus: this.driver?.approvalStatus,
            isOnline: this.driver?.isOnline,
            vehicle: this.driver?.vehicle,
            documents: this.driver?.documents,
          }
        : undefined,
    rating: this.rating,
    ratingCount: this.ratingCount,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
