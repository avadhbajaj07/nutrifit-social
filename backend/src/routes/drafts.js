import express from 'express';
import { 
  getDrafts, 
  createDraft, 
  updateDraft, 
  deleteDraft, 
  addLog,
  getSettings 
} from '../services/storageService.js';
import { listMediaFromFolder, deleteMedia } from '../services/cloudinaryService.js';
import { generateViralPostContent } from '../services/aiCaptionService.js';
import { publishToPlatforms } from '../services/blotatoService.js';
import { addPostHistory } from '../services/storageService.js';

const router = express.Router();

// Get all drafts
router.get('/', (req, res) => {
  try {
    const drafts = getDrafts();
    res.json({ drafts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create single draft
router.post('/', (req, res) => {
  try {
    const draft = createDraft(req.body);
    addLog('info', `Nouveau brouillon créé pour validation client (${draft.id})`);
    res.json({ success: true, draft });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Automatically generate 3 daily drafts (Morning, Noon, Evening) for client review
router.post('/generate-daily-batch', async (req, res) => {
  try {
    const settings = getSettings();
    const mediaResult = await listMediaFromFolder(settings.cloudinary.folder);
    const mediaList = mediaResult.resources || [];

    if (mediaList.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Aucun média disponible dans le dossier pour générer des brouillons.' 
      });
    }

    const slots = [
      { theme: 'motivation', time: '08:30', label: 'Matin (Motivation & Réveil)' },
      { theme: 'nutrition', time: '12:30', label: 'Midi (Nutrition & Recette Saine)' },
      { theme: 'workout', time: '18:30', label: 'Soir (Workout & Engagement)' }
    ];

    const createdDrafts = [];

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const selectedMedia = mediaList[i % mediaList.length];

      const content = await generateViralPostContent({
        theme: slot.theme,
        mediaTitle: selectedMedia.title || selectedMedia.filename || 'NutriFitness Model'
      });

      const draft = createDraft({
        theme: slot.theme,
        slotTime: slot.time,
        media: {
          public_id: selectedMedia.public_id,
          secure_url: selectedMedia.secure_url,
          format: selectedMedia.format,
          resource_type: selectedMedia.resource_type || 'image',
          aspect_ratio: selectedMedia.aspect_ratio || '4:5',
          title: selectedMedia.title || selectedMedia.filename
        },
        captions: {
          instagramCaption: content.instagramCaption,
          pinterestTitle: content.pinterestTitle,
          pinterestDescription: content.pinterestDescription
        }
      });

      createdDrafts.push(draft);
    }

    addLog('success', `Lot de ${createdDrafts.length} posts généré pour validation client.`);
    res.json({ success: true, count: createdDrafts.length, drafts: createdDrafts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update draft (edit caption, change image, or add feedback)
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updated = updateDraft(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Draft not found' });
    res.json({ success: true, draft: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve draft
router.post('/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const updated = updateDraft(id, {
      status: 'APPROVED',
      approvedAt: new Date().toISOString()
    });
    addLog('success', `Brouillon ${id} approuvé par le client pour publication ✅`);
    res.json({ success: true, draft: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request changes
router.post('/:id/request-changes', (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;
    const updated = updateDraft(id, {
      status: 'CHANGES_REQUESTED',
      clientFeedback: feedback || 'Modifications demandées par le client'
    });
    addLog('warn', `Brouillon ${id} : Modifications demandées par le client (${feedback})`);
    res.json({ success: true, draft: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Publish approved draft immediately + auto-delete media from Cloudinary
router.post('/:id/publish-now', async (req, res) => {
  try {
    const { id } = req.params;
    const drafts = getDrafts();
    const draft = drafts.find(d => d.id === id);

    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    const settings = getSettings();
    const mediaUrl = draft.media?.secure_url;
    const publicId = draft.media?.public_id;

    addLog('info', `Publication du brouillon approuvé (${id}) sur Instagram & Pinterest...`);

    // 1. Publish to Blotato
    const publishResult = await publishToPlatforms({
      mediaUrl,
      captionInstagram: draft.captions.instagramCaption,
      captionPinterest: draft.captions.pinterestDescription,
      pinterestTitle: draft.captions.pinterestTitle,
      platforms: {
        instagram: settings.scheduling.postToInstagram !== false,
        pinterest: settings.scheduling.postToPinterest !== false
      },
      resourceType: draft.media?.resource_type || 'image'
    });

    const isPublishedOk =
      (publishResult.instagram?.success || !settings.scheduling.postToInstagram) &&
      (publishResult.pinterest?.success || !settings.scheduling.postToPinterest);

    // 2. Auto-delete from Cloudinary
    let deleteResult = null;
    if (isPublishedOk && settings.scheduling.autoDeleteMediaOnSuccess !== false && publicId) {
      deleteResult = await deleteMedia(publicId, draft.media?.resource_type || 'image');
    }

    // 3. Mark draft as posted
    updateDraft(id, {
      status: 'POSTED',
      publishedAt: new Date().toISOString()
    });

    // 4. Record to history
    addPostHistory({
      draftId: id,
      media: draft.media,
      captions: draft.captions,
      platforms: publishResult,
      autoDeleted: deleteResult?.success || false,
      slotTheme: draft.theme,
      status: 'COMPLETED'
    });

    addLog('success', `Brouillon ${id} publié avec succès et média supprimé de Cloudinary !`);

    res.json({
      success: isPublishedOk,
      publishResult,
      deleteResult
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete draft
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    deleteDraft(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
