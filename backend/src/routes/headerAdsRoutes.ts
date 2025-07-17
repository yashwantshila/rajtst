import express from 'express';
import { getHeaderAds, createHeaderAd, updateHeaderAd, deleteHeaderAd } from '../controllers/headerAdsController.js';
import { verifyFirebaseAdmin } from '../middleware/firebaseAdminAuth.js';

const router = express.Router();

router.get('/', getHeaderAds);
router.post('/', verifyFirebaseAdmin, createHeaderAd);
router.put('/:id', verifyFirebaseAdmin, updateHeaderAd);
router.delete('/:id', verifyFirebaseAdmin, deleteHeaderAd);

export default router;
