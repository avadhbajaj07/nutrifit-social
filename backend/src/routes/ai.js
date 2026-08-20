import express from 'express';
import { 
  generateViralPostContent, 
  sanitizeInstagramCaption, 
  generateHashtags, 
  getVisualPrompts 
} from '../services/aiCaptionService.js';
import { 
  generateAIVisualWithDalle, 
  getProductConcepts 
} from '../services/dalleGenerationService.js';

const router = express.Router();

// Generate viral French caption (Strictly 5 hashtags & 0 links)
router.post('/generate-caption', async (req, res) => {
  try {
    const { theme = 'motivation', customPrompt = '', mediaTitle = '' } = req.body;
    const content = await generateViralPostContent({ theme, customPrompt, mediaTitle });
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate fresh trending AI visual with DALL-E 3
router.post('/generate-ai-image', async (req, res) => {
  try {
    const { theme = 'whey_isolate', customPrompt = '' } = req.body;
    const result = await generateAIVisualWithDalle(theme, customPrompt);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get product concepts
router.get('/product-concepts', (req, res) => {
  try {
    const concepts = getProductConcepts();
    res.json({ concepts });
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
    const { theme = 'motivation' } = req.query;
    const tags = generateHashtags(theme);
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
