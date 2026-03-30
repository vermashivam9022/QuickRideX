import mongoose from 'mongoose'

const shopStatusSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'main',
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
)

const shopStatusModel = mongoose.model('ShopStatus', shopStatusSchema)

export default shopStatusModel
