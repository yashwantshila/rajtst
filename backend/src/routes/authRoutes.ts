import express from 'express';
import { register, login, resetPassword, adminLogin } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/reset-password', resetPassword);
router.post('/admin/login', adminLogin);

export default router; 