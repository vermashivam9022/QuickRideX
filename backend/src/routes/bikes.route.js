import express from 'express'
import bikesController from '../controllers/bikes.controller.js'
import authMiddelware, { requireRoles } from '../middelware/auth.middleware.js'
import upload from '../middelware/upload.middleware.js'

const bikesRoutes = express.Router()

bikesRoutes.get('/', authMiddelware, bikesController.listBikes)
bikesRoutes.get('/shop-status', authMiddelware, bikesController.getShopStatus)
bikesRoutes.post(
	'/upload-photo',
	authMiddelware,
	requireRoles('admin'),
	upload.single('bikePhoto'),
	bikesController.uploadBikePhoto,
)
bikesRoutes.post(
	'/',
	authMiddelware,
	requireRoles('admin'),
	upload.single('bikePhoto'),
	bikesController.createBike,
)
bikesRoutes.patch(
	'/:id',
	authMiddelware,
	requireRoles('admin'),
	upload.single('bikePhoto'),
	bikesController.updateBike,
)
bikesRoutes.delete('/:id', authMiddelware, requireRoles('admin'), bikesController.deleteBike)

export default bikesRoutes
