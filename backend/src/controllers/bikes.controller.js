import bikeModel from '../model/bike.model.js'
import bookingModel from '../model/booking.model.js'
import shopStatusModel from '../model/shop-status.model.js'
import { uploadFile } from '../utils/cloudinary.js'

function parseOptionalBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return undefined
}

function parseCategory(value) {
  const normalized = String(value || 'bike').trim().toLowerCase()
  if (normalized === 'bike' || normalized === 'scooty') return normalized
  return null
}

function normalizeBike(bike, ratingStats) {
  return {
    _id: bike._id,
    id: bike._id,
    name: bike.name,
    numberPlate: bike.numberPlate,
    pricePerHour: bike.pricePerHour,
    pricePerDay: bike.pricePerDay,
    category: bike.category || 'bike',
    bikePhotoUrl: bike.bikePhotoUrl,
    isAvailable: bike.isAvailable,
    averageRating: ratingStats?.averageRating ?? 0,
    ratingCount: ratingStats?.ratingCount ?? 0,
    createdAt: bike.createdAt,
    updatedAt: bike.updatedAt,
  }
}

async function getBikeRatingsMap(bikeIds) {
  if (!bikeIds.length) return new Map()

  const grouped = await bookingModel.aggregate([
    {
      $match: {
        bikeId: { $in: bikeIds },
        status: 'confirmed',
        rating: { $gte: 1, $lte: 5 },
      },
    },
    {
      $group: {
        _id: '$bikeId',
        averageRating: { $avg: '$rating' },
        ratingCount: { $sum: 1 },
      },
    },
  ])

  const map = new Map()
  for (const item of grouped) {
    map.set(String(item._id), {
      averageRating: Number(item.averageRating?.toFixed?.(1) ?? item.averageRating ?? 0),
      ratingCount: Number(item.ratingCount ?? 0),
    })
  }
  return map
}

async function getShopOpenFlag() {
  const status = await shopStatusModel.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { isOpen: true } },
    { new: true, upsert: true },
  )

  return Boolean(status?.isOpen)
}

async function getShopStatus(_req, res) {
  const isOpen = await getShopOpenFlag()
  return res.status(200).json({ isOpen })
}

async function listBikes(req, res) {
  const bikes = await bikeModel.find().sort({ createdAt: -1 })
  const isShopOpen = await getShopOpenFlag()
  const bikeIds = bikes.map((bike) => bike._id)
  const ratingsMap = await getBikeRatingsMap(bikeIds)

  // Students should see all vehicles unavailable when shop is closed.
  if (req.userRole === 'student' && !isShopOpen) {
    return res.status(200).json(
      bikes.map((bike) => ({
        ...normalizeBike(bike, ratingsMap.get(String(bike._id))),
        isAvailable: false,
      })),
    )
  }

  return res.status(200).json(
    bikes.map((bike) => normalizeBike(bike, ratingsMap.get(String(bike._id)))),
  )
}

async function createBike(req, res) {
  const {
    name,
    numberPlate,
    pricePerHour,
    pricePerDay,
    category,
    bikePhotoUrl,
    isAvailable,
  } = req.body ?? {}
  let uploadedPhotoUrl = ''

  if (req.file?.path) {
    const uploaded = await uploadFile(req.file.path)
    if (!uploaded?.success || !uploaded?.data?.secure_url) {
      return res.status(500).json({ message: uploaded?.error || 'Failed to upload bike photo' })
    }
    uploadedPhotoUrl = uploaded.data.secure_url
  }

  if (!name || !numberPlate) {
    return res.status(400).json({ message: 'Name and numberPlate are required' })
  }

  const pHour = Number(pricePerHour)
  const pDay = Number(pricePerDay)
  if (!Number.isFinite(pHour) || pHour < 0 || !Number.isFinite(pDay) || pDay < 0) {
    return res.status(400).json({ message: 'Invalid price values' })
  }

  const parsedCategory = parseCategory(category)
  if (!parsedCategory) {
    return res.status(400).json({ message: 'Category must be bike or scooty' })
  }

  const exists = await bikeModel.findOne({ numberPlate: numberPlate.toUpperCase() })
  if (exists) {
    return res.status(409).json({ message: 'Bike with this number plate already exists' })
  }

  const bike = await bikeModel.create({
    name,
    numberPlate,
    pricePerHour: pHour,
    pricePerDay: pDay,
    category: parsedCategory,
    bikePhotoUrl:
      uploadedPhotoUrl || (typeof bikePhotoUrl === 'string' ? bikePhotoUrl.trim() : ''),
    isAvailable: parseOptionalBoolean(isAvailable) ?? true,
  })

  return res.status(201).json(normalizeBike(bike))
}

async function updateBike(req, res) {
  const { id } = req.params
  const {
    name,
    numberPlate,
    pricePerHour,
    pricePerDay,
    category,
    bikePhotoUrl,
    isAvailable,
  } = req.body ?? {}
  let uploadedPhotoUrl = ''

  if (req.file?.path) {
    const uploaded = await uploadFile(req.file.path)
    if (!uploaded?.success || !uploaded?.data?.secure_url) {
      return res.status(500).json({ message: uploaded?.error || 'Failed to upload bike photo' })
    }
    uploadedPhotoUrl = uploaded.data.secure_url
  }

  const bike = await bikeModel.findById(id)
  if (!bike) {
    return res.status(404).json({ message: 'Bike not found' })
  }

  if (typeof name === 'string') bike.name = name
  if (typeof numberPlate === 'string') bike.numberPlate = numberPlate

  if (pricePerHour !== undefined) {
    const pHour = Number(pricePerHour)
    if (!Number.isFinite(pHour) || pHour < 0) {
      return res.status(400).json({ message: 'Invalid pricePerHour' })
    }
    bike.pricePerHour = pHour
  }

  if (pricePerDay !== undefined) {
    const pDay = Number(pricePerDay)
    if (!Number.isFinite(pDay) || pDay < 0) {
      return res.status(400).json({ message: 'Invalid pricePerDay' })
    }
    bike.pricePerDay = pDay
  }

  if (category !== undefined) {
    const parsedCategory = parseCategory(category)
    if (!parsedCategory) {
      return res.status(400).json({ message: 'Category must be bike or scooty' })
    }
    bike.category = parsedCategory
  }

  const parsedAvailable = parseOptionalBoolean(isAvailable)
  if (typeof parsedAvailable === 'boolean') bike.isAvailable = parsedAvailable
  if (uploadedPhotoUrl) {
    bike.bikePhotoUrl = uploadedPhotoUrl
  } else if (typeof bikePhotoUrl === 'string') {
    bike.bikePhotoUrl = bikePhotoUrl.trim()
  }

  await bike.save()
  return res.status(200).json(normalizeBike(bike))
}

async function deleteBike(req, res) {
  const { id } = req.params
  const bike = await bikeModel.findByIdAndDelete(id)
  if (!bike) {
    return res.status(404).json({ message: 'Bike not found' })
  }

  return res.status(200).json({ message: 'Bike deleted' })
}

async function uploadBikePhoto(req, res) {
  const file = req.file
  if (!file) {
    return res.status(400).json({ message: 'Bike photo file is required' })
  }

  if (!file.mimetype?.startsWith('image/')) {
    return res.status(400).json({ message: 'Only image files are allowed' })
  }

  const uploaded = await uploadFile(file.path)
  if (!uploaded?.success || !uploaded?.data?.secure_url) {
    return res.status(500).json({ message: uploaded?.error || 'Failed to upload bike photo' })
  }

  return res.status(201).json({
    message: 'Bike photo uploaded successfully',
    bikePhotoUrl: uploaded.data.secure_url,
  })
}

export default {
  listBikes,
  getShopStatus,
  createBike,
  updateBike,
  deleteBike,
  uploadBikePhoto,
}
