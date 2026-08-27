import express from 'express';
import { getClientProductsList } from '../services/clientProductsService.js';
import { getLocalClientMedia } from '../services/localMediaService.js';
import { listMediaFromFolder, deleteMedia } from '../services/cloudinaryService.js';

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
    const localMedia = getLocalClientMedia();

    let cloudinaryMedia = [];
    try {
      cloudinaryMedia = (await listMediaFromFolder()).resources || [];
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
    const result = await deleteMedia(publicId, req.query.resourceType || 'image');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
