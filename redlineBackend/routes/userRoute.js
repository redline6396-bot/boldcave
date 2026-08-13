import express from 'express';
import {loginUser,registerUser,adminLogin,getUserProfile,updateProfile,reverseGeocodeLocation} from '../controllers/userController.js';
import authUser from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
const userRouter=express.Router();

userRouter.post('/register', validateBody(['name','email','password']), registerUser)
userRouter.post('/login', validateBody(['email','password']), loginUser)
userRouter.post('/admin', validateBody(['email','password']), adminLogin)
userRouter.get('/profile', authUser, getUserProfile)
userRouter.put('/update-profile', authUser, updateProfile)
userRouter.get('/reverse-geocode', reverseGeocodeLocation)

export default userRouter;