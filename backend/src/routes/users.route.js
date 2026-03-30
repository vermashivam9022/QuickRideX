import express from 'express'
import usersController from '../controllers/users.controller.js'
import authMiddelware from '../middelware/auth.middleware.js'

const usersRoutes = express.Router()

usersRoutes.get('/me', authMiddelware, usersController.me)
usersRoutes.patch('/me', authMiddelware, usersController.updateMe)

export default usersRoutes