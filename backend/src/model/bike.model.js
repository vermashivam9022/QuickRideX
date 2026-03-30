import mongoose from 'mongoose'

const bikeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    numberPlate: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    pricePerHour: {
      type: Number,
      required: true,
      min: 0,
    },
    pricePerDay: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: ['bike', 'scooty'],
      default: 'bike',
      lowercase: true,
      trim: true,
    },
    bikePhotoUrl: {
      type: String,
      trim: true,
      default: '',
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
)

const bikeModel = mongoose.model('Bikes', bikeSchema)

export default bikeModel
