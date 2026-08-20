import express from 'express';
import { generateViralPostContent, sanitizeInstagramCaption, generateHashtags, getVisualPrompts } from '../services/aiCaptionService.js';

const router = express.Router();

router.post('/generate-caption', async (req, res) => {
  try {
    const { theme = 'motivation', customPrompt = '', mediaTitle = '' } = req.body;
    const content = await generateViralPostContent({ theme, customPrompt, mediaTitle });
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/validate-caption', (req, res) => {
  try {
    const { caption } = req.body;
    const result = sanitizeInstagramCaption(caption || '');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/hashtags', (req, res) => {
  try {
    const { theme = 'motivation', count = 12 } = req.query;
    const tags = generateHashtags(theme, parseInt(count));
    res.json({ hashtags: tags });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/visual-prompts', (req, res) => {
  try {
    const prompts = getVisualPrompts();
    res.json({ prompts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
