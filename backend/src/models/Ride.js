const mongoose = require('mongoose');

const { Schema } = mongoose;

const ratingSchema = new Schema(
  {
    stars: { type: Number, min: 1, max: 5 },
    comment: { type: String, maxlength: 300 },
    ratedAt: { type: Date },
  },
  { _id: false }
);

const placeSchema = new Schema(
  {
    address: { type: String, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
  },
  { _id: false }
);

// Legal fare breakdown — stored so the price is auditable and never negotiable.
const fareSchema = new Schema(
  {
    distanceKm: { type: Number, required: true },
    perKm: { type: Number, required: true },
    distanceCharge: { type: Number, required: true },
    pickupCharge: { type: Number, required: true },
    period: { type: String, enum: ['day', 'night'], required: true },
    total: { type: Number, required: true },
    currency: { type: String, default: 'MAD' },
  },
  { _id: false }
);

const rideSchema = new Schema(
  {
    passenger: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    driver: { type: Schema.Types.ObjectId, ref: 'User', index: true },

    pickup: { type: placeSchema, required: true },
    destination: { type: placeSchema, required: true },
    fare: { type: fareSchema, required: true },

    // Petit taxi: 1 to 3 passengers (legal capacity).
    passengers: { type: Number, default: 1, min: 1, max: 3 },

    status: {
      type: String,
      enum: [
        'requested', // created, broadcasting to drivers
        'accepted', // a driver accepted, en route to pickup
        'arrived', // driver at pickup
        'started', // trip in progress
        'completed',
        'cancelled',
        'expired', // no driver accepted in time
      ],
      default: 'requested',
      index: true,
    },

    // Drivers who ignored/declined — excluded from re-broadcast.
    declinedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    cancelledBy: { type: String, enum: ['passenger', 'driver', 'system'] },
    cancelReason: { type: String },

    // Ratings: passenger rates the driver, driver rates the passenger.
    passengerRating: { type: ratingSchema },
    driverRating: { type: ratingSchema },

    acceptedAt: { type: Date },
    arrivedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

rideSchema.index({ 'pickup.location': '2dsphere' });

module.exports = mongoose.model('Ride', rideSchema);
