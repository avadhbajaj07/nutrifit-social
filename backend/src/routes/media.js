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

// Use the configured Cloudinary review folder whenever it is available.
// Bundled assets are only a local-development fallback, so they never get
// mixed into a client's real production media library.
router.get('/', async (req, res) => {
  try {
    const products = getClientProductsList();
    const localMedia = getLocalClientMedia();

    let cloudinaryResult = null;
    try {
      cloudinaryResult = await listMediaFromFolder();
    } catch (e) {}

    const cloudinaryMedia = cloudinaryResult?.isLocal
      ? []
      : cloudinaryResult?.resources || [];
    const usingCloudinary = cloudinaryMedia.length > 0;
    const resources = usingCloudinary
      ? cloudinaryMedia
      : [...products, ...localMedia];

    res.json({
      total: resources.length,
      source: usingCloudinary ? 'cloudinary' : 'local-fallback',
      folder: usingCloudinary ? cloudinaryResult.folder : null,
      productsCount: usingCloudinary ? 0 : products.length,
      localCount: usingCloudinary ? 0 : localMedia.length,
      cloudinaryCount: cloudinaryMedia.length,
      resources
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
