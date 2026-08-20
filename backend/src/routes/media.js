import express from 'express';
import { listMediaFromFolder, deleteMedia, checkCloudinaryConnection, resetMockMedia } from '../services/cloudinaryService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { folder } = req.query;
    const media = await listMediaFromFolder(folder);
    res.json(media);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/check', async (req, res) => {
  try {
    const status = await checkCloudinaryConnection();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:publicId(*)', async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType } = req.query;
    const result = await deleteMedia(publicId, resourceType || 'image');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/reset-demo', (req, res) => {
  const media = resetMockMedia();
  res.json({ success: true, count: media.length, resources: media });
});

export default router;
