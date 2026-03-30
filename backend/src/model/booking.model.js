import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true,
    },
    bikeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bikes',
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    ratedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
)

bookingSchema.index({ bikeId: 1, startTime: 1, endTime: 1 })

const bookingModel = mongoose.model('Bookings', bookingSchema)

export default bookingModel
