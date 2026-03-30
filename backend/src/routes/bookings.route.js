import express from 'express'
import bookingsController from '../controllers/bookings.controller.js'
import authMiddelware, { requireRoles } from '../middelware/auth.middleware.js'

const bookingsRoutes = express.Router()

bookingsRoutes.get('/', authMiddelware, requireRoles('admin'), bookingsController.allBookings)
bookingsRoutes.get('/my', authMiddelware, bookingsController.myBookings)
bookingsRoutes.get('/my/:id', authMiddelware, bookingsController.myBookingById)
bookingsRoutes.patch('/my/:id/rating', authMiddelware, bookingsController.rateMyBooking)
bookingsRoutes.patch('/my/:id/cancel', authMiddelware, bookingsController.cancelMyBooking)
bookingsRoutes.get('/:id', authMiddelware, requireRoles('admin'), bookingsController.bookingByIdForAdmin)
bookingsRoutes.get('/availability/:bikeId', authMiddelware, bookingsController.checkAvailability)
bookingsRoutes.post('/', authMiddelware, bookingsController.createBooking)
bookingsRoutes.patch('/:id/status', authMiddelware, requireRoles('admin'), bookingsController.updateBookingStatus)
bookingsRoutes.patch('/:id/time', authMiddelware, requireRoles('admin'), bookingsController.updateBookingTimeAndPrice)

export default bookingsRoutes
