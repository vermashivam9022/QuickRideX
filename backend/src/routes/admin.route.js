import express from 'express'
import adminController from '../controllers/admin.controller.js'
import authMiddelware, { requireRoles } from '../middelware/auth.middleware.js'

const adminRoutes = express.Router()

adminRoutes.get('/students/pending', authMiddelware, requireRoles('admin'), adminController.listPendingStudents)
adminRoutes.patch('/students/:id/approve', authMiddelware, requireRoles('admin'), adminController.approveStudent)
adminRoutes.patch('/students/:id/verification', authMiddelware, requireRoles('admin'), adminController.updateStudentVerification)
adminRoutes.get('/shop-status', authMiddelware, requireRoles('admin'), adminController.getShopStatus)
adminRoutes.patch('/shop-status', authMiddelware, requireRoles('admin'), adminController.updateShopStatus)

export default adminRoutes