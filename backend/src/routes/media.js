import express from 'express';
import { getLocalMediaList } from '../services/localMediaService.js';
import { NUTRIFITNESS_PRODUCTS } from '../services/nutrifitnessProducts.js';
import { fetchCloudinaryMedia, deleteMediaFromCloudinary } from '../services/cloudinaryService.js';

const router = express.Router();

// Get real NutriFitness.ch store products
router.get('/products', (req, res) => {
  try {
    res.json({
      success: true,
      count: NUTRIFITNESS_PRODUCTS.length,
      products: NUTRIFITNESS_PRODUCTS
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all media (local inspiration + store products + Cloudinary)
router.get('/', async (req, res) => {
  try {
    const localMedia = getLocalMediaList();
    
    // Map products to media format
    const productMedia = NUTRIFITNESS_PRODUCTS.map(p => ({
      public_id: p.id,
      secure_url: p.url,
      title: p.title,
      category: p.category,
      description: p.description,
      aspect_ratio: '1:1',
      format: 'png',
      isStoreProduct: true,
      source: 'nutrifitness.ch'
    }));

    let cloudinaryMedia = [];
    try {
      cloudinaryMedia = await fetchCloudinaryMedia();
    } catch (e) {
      console.warn('Cloudinary fetch skipped:', e.message);
    }

    const all = [...productMedia, ...localMedia, ...cloudinaryMedia];

    res.json({
      total: all.length,
      productsCount: productMedia.length,
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
