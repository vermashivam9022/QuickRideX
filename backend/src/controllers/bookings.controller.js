import bookingModel from '../model/booking.model.js'
import bikeModel from '../model/bike.model.js'
import userModel from '../model/users.model.js'
import shopStatusModel from '../model/shop-status.model.js'

async function getShopOpenFlag() {
  const status = await shopStatusModel.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { isOpen: true } },
    { new: true, upsert: true },
  )

  return Boolean(status?.isOpen)
}

function calculateTotalPrice({ bike, startTime, endTime }) {
  const durationMs = Math.max(0, endTime.getTime() - startTime.getTime())
  const hourMs = 1000 * 60 * 60
  const dayMs = hourMs * 24

  const hours = Math.ceil(durationMs / hourMs)
  const days = Math.ceil(durationMs / dayMs)

  if (durationMs >= dayMs) {
    return days * bike.pricePerDay
  }
  return hours * bike.pricePerHour
}

const MAX_STUDENT_BOOKING_MS = 7 * 24 * 60 * 60 * 1000

function isBeforeNow(date) {
  const d = new Date(date)
  return d.getTime() < Date.now()
}

function exceedsOneWeek(start, end) {
  return end.getTime() - start.getTime() > MAX_STUDENT_BOOKING_MS
}

async function checkAvailability(req, res) {
  const { bikeId } = req.params
  const { startTime, endTime } = req.query

  const start = new Date(startTime)
  const end = new Date(endTime)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return res.status(400).json({ message: 'Invalid startTime/endTime' })
  }

  if (isBeforeNow(start)) {
    return res.status(400).json({ message: 'Start time cannot be before current time for students' })
  }

  if (exceedsOneWeek(start, end)) {
    return res.status(400).json({ message: 'Booking duration cannot exceed 1 week' })
  }

  const isShopOpen = await getShopOpenFlag()
  if (!isShopOpen) {
    return res.status(200).json({ available: false })
  }

  const bike = await bikeModel.findById(bikeId)
  if (!bike) {
    return res.status(404).json({ message: 'Bike not found' })
  }

  if (!bike.isAvailable) {
    return res.status(200).json({ available: false })
  }

  const conflicts = await bookingModel.find({
    bikeId,
    status: { $in: ['pending', 'confirmed'] },
    startTime: { $lt: end },
    endTime: { $gt: start },
  })

  return res.status(200).json({ available: conflicts.length === 0 })
}

async function createBooking(req, res) {
  const { bikeId, startTime, endTime } = req.body

  const start = new Date(startTime)
  const end = new Date(endTime)

  if (!bikeId || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return res.status(400).json({ message: 'Invalid booking payload' })
  }

  const isShopOpen = await getShopOpenFlag()
  if (!isShopOpen) {
    return res.status(400).json({ message: 'Shop is currently closed' })
  }

  const user = await userModel.findById(req.userId)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  if (user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can create bookings' })
  }

  if (isBeforeNow(start)) {
    return res.status(400).json({ message: 'Start time cannot be before current time for students' })
  }

  if (exceedsOneWeek(start, end)) {
    return res.status(400).json({ message: 'Booking duration cannot exceed 1 week' })
  }

  if (!user.isApproved) {
    return res.status(403).json({ message: 'Your account is pending approval' })
  }

  const bike = await bikeModel.findById(bikeId)
  if (!bike) {
    return res.status(404).json({ message: 'Bike not found' })
  }

  if (!bike.isAvailable) {
    return res.status(400).json({ message: 'Bike is currently unavailable' })
  }

  const conflicting = await bookingModel.findOne({
    bikeId,
    status: { $in: ['pending', 'confirmed'] },
    startTime: { $lt: end },
    endTime: { $gt: start },
  })

  if (conflicting) {
    return res.status(409).json({ message: 'Bike is not available for selected time' })
  }

  const totalPrice = calculateTotalPrice({ bike, startTime: start, endTime: end })

  const booking = await bookingModel.create({
    userId: user._id,
    bikeId: bike._id,
    startTime: start,
    endTime: end,
    totalPrice,
    status: 'pending',
  })

  return res.status(201).json(booking)
}

async function myBookings(req, res) {
  const bookings = await bookingModel
    .find({ userId: req.userId })
    .populate('bikeId', 'name numberPlate')
    .sort({ createdAt: -1 })

  return res.status(200).json(bookings)
}

async function myBookingById(req, res) {
  const { id } = req.params
  const booking = await bookingModel
    .findOne({ _id: id, userId: req.userId })
    .populate('bikeId', 'name numberPlate category pricePerHour pricePerDay')

  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' })
  }

  return res.status(200).json(booking)
}

async function bookingByIdForAdmin(req, res) {
  const { id } = req.params
  const booking = await bookingModel
    .findById(id)
    .populate('bikeId', 'name numberPlate category pricePerHour pricePerDay isAvailable bikePhotoUrl')
    .populate('userId', 'name email mobileNo isApproved licenseUrl collegeIdUrl')

  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' })
  }

  return res.status(200).json(booking)
}

async function allBookings(_req, res) {
  const bookings = await bookingModel
    .find()
    .populate('bikeId', 'name numberPlate category pricePerHour pricePerDay isAvailable bikePhotoUrl')
    .populate('userId', 'name email mobileNo isApproved licenseUrl collegeIdUrl')
    .sort({ createdAt: -1 })

  return res.status(200).json(bookings)
}

async function updateBookingStatus(req, res) {
  const { id } = req.params
  const { status } = req.body

  if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' })
  }

  const booking = await bookingModel.findById(id)
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' })
  }

  booking.status = status
  await booking.save()

  return res.status(200).json(booking)
}

async function updateBookingTimeAndPrice(req, res) {
  const { id } = req.params
  const { startTime, endTime } = req.body ?? {}

  const start = new Date(startTime)
  const end = new Date(endTime)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return res.status(400).json({ message: 'Invalid startTime/endTime' })
  }

  const booking = await bookingModel.findById(id)
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' })
  }

  if (booking.status === 'cancelled') {
    return res.status(400).json({ message: 'Cancelled booking time cannot be edited' })
  }

  const bike = await bikeModel.findById(booking.bikeId)
  if (!bike) {
    return res.status(404).json({ message: 'Bike not found' })
  }

  const conflict = await bookingModel.findOne({
    _id: { $ne: booking._id },
    bikeId: booking.bikeId,
    status: { $in: ['pending', 'confirmed'] },
    startTime: { $lt: end },
    endTime: { $gt: start },
  })

  if (conflict) {
    return res.status(409).json({ message: 'Bike is not available for selected time' })
  }

  booking.startTime = start
  booking.endTime = end
  booking.totalPrice = calculateTotalPrice({ bike, startTime: start, endTime: end })
  await booking.save()

  const updated = await bookingModel
    .findById(booking._id)
    .populate('bikeId', 'name numberPlate category pricePerHour pricePerDay isAvailable bikePhotoUrl')
    .populate('userId', 'name email mobileNo isApproved licenseUrl collegeIdUrl')

  return res.status(200).json(updated)
}

async function rateMyBooking(req, res) {
  const { id } = req.params
  const { rating } = req.body ?? {}

  const parsedRating = Number(rating)
  if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return res.status(400).json({ message: 'Rating must be an integer from 1 to 5' })
  }

  const booking = await bookingModel
    .findOne({ _id: id, userId: req.userId })
    .populate('bikeId', 'name numberPlate category pricePerHour pricePerDay bikePhotoUrl isAvailable')

  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' })
  }

  if (booking.status !== 'confirmed') {
    return res.status(400).json({ message: 'You can rate only confirmed bookings' })
  }

  const now = new Date()
  const bookingEnd = booking.endTime ? new Date(booking.endTime) : null
  if (!bookingEnd || Number.isNaN(bookingEnd.getTime()) || bookingEnd.getTime() > now.getTime()) {
    return res.status(400).json({
      message: 'You can rate only after the ride is completed',
    })
  }

  booking.rating = parsedRating
  booking.ratedAt = new Date()
  await booking.save()

  return res.status(200).json(booking)
}

async function cancelMyBooking(req, res) {
  const { id } = req.params

  const booking = await bookingModel.findOne({ _id: id, userId: req.userId })
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' })
  }

  if (booking.status !== 'pending') {
    return res.status(400).json({ message: 'Only pending bookings can be cancelled' })
  }

  booking.status = 'cancelled'
  await booking.save()

  return res.status(200).json(booking)
}

export default {
  checkAvailability,
  createBooking,
  myBookings,
  myBookingById,
  bookingByIdForAdmin,
  allBookings,
  updateBookingStatus,
  updateBookingTimeAndPrice,
  rateMyBooking,
  cancelMyBooking,
}
