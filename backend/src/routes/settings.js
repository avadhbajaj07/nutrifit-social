import express from 'express';
import { getSettings, updateSettings, getLogs, addLog } from '../services/storageService.js';
import { testBlotatoConnection, getBlotatoAccounts } from '../services/blotatoService.js';
import { checkCloudinaryConnection } from '../services/cloudinaryService.js';
import { initScheduler } from '../services/schedulerService.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/', (req, res) => {
  try {
    const updated = updateSettings(req.body);
    // Restart scheduler with new configuration
    initScheduler();
    addLog('info', 'Paramètres mis à jour et planificateur réinitialisé.');
    res.json({ success: true, settings: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/test-blotato', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const result = await testBlotatoConnection(apiKey);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/blotato-accounts', async (req, res) => {
  try {
    const result = await getBlotatoAccounts();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/test-cloudinary', async (req, res) => {
  try {
    const result = await checkCloudinaryConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const logs = await getLogs(parseInt(limit));
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
