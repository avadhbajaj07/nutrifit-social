import express from 'express';
import { getClientProductsList } from '../services/clientProductsService.js';
import { getLocalMediaList } from '../services/localMediaService.js';
import { fetchCloudinaryMedia, deleteMediaFromCloudinary } from '../services/cloudinaryService.js';

const router = express.Router();

// Get real client products from /products folder
router.get('/products', (req, res) => {
  try {
    const products = getClientProductsList();
    res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all media (products prioritized)
router.get('/', async (req, res) => {
  try {
    const products = getClientProductsList();
    const localMedia = getLocalMediaList();

    let cloudinaryMedia = [];
    try {
      cloudinaryMedia = await fetchCloudinaryMedia();
    } catch (e) {}

    const all = [...products, ...localMedia, ...cloudinaryMedia];

    res.json({
      total: all.length,
      productsCount: products.length,
      localCount: localMedia.length,
      cloudinaryCount: cloudinaryMedia.length,
      resources: all
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete media
router.delete('/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    const result = await deleteMediaFromCloudinary(publicId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
