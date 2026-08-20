import express from 'express';
import { executePostWorkflow, getScheduleStatus } from '../services/schedulerService.js';
import { getPostHistory } from '../services/storageService.js';

const router = express.Router();

router.post('/trigger-now', async (req, res) => {
  try {
    const { slotTheme = 'motivation', selectedMediaId, customCaption, customPrompt } = req.body;
    const result = await executePostWorkflow(slotTheme, {
      selectedMediaId,
      customCaption,
      customPrompt
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history', (req, res) => {
  try {
    const history = getPostHistory();
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/schedule', (req, res) => {
  try {
    const status = getScheduleStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
