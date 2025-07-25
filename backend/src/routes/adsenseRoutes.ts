import express from 'express';
import { getAdsenseConfig } from '../controllers/adsenseController.js';

const router = express.Router();

router.get('/', getAdsenseConfig);

export default router;
