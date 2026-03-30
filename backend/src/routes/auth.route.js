import express from 'express';
import authController from '../controllers/auth.controller.js';
import authMiddelware from '../middelware/auth.middleware.js';
import upload from '../middelware/upload.middleware.js';

const authRouter=express.Router();


authRouter.post(
	'/register',
	upload.fields([
		{ name: 'drivingLicenseFile', maxCount: 1 },
		{ name: 'collegeIdFile', maxCount: 1 }
	]),
	authController.register
);

authRouter.post('/login',authController.login);

authRouter.post('/logout',authMiddelware,authController.logout);

authRouter.post('/logout-all',authMiddelware,authController.logoutAll);

authRouter.get('/dashboard',authMiddelware,authController.dashboard);

authRouter.post('/refresh-token',authController.refreshToken);


export default authRouter;