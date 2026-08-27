import express from 'express';
import { getDrafts, createDraft, updateDraft, deleteDraft, addLog, getSettings, addPostHistory } from '../services/storageService.js';
import { listMediaFromFolder, deleteMedia } from '../services/cloudinaryService.js';
import { generateViralPostContent } from '../services/aiCaptionService.js';
import { publishToPlatforms } from '../services/blotatoService.js';

const router = express.Router();
const canAccessClientPortal = req => {
  const token = req.get('x-client-token') || req.query.token;
  return Boolean(token && token === getSettings().clientPortal?.shareToken);
};
const requireClientPortalAccess = (req, res, next) => canAccessClientPortal(req)
  ? next()
  : res.status(403).json({ error: 'This client review link is not valid.' });
const addRevision = (draft, event, note = '', overrides = {}) => ({
  ...overrides,
  revisionHistory: [...(draft.revisionHistory || []), {
    revision: overrides.revision || draft.revision || 1, event, at: new Date().toISOString(), note,
    caption: overrides.captions?.instagramCaption || draft.captions?.instagramCaption || '', media: overrides.media || draft.media
  }]
});

router.get('/', (req, res) => {
  try { res.json({ drafts: getDrafts() }); } catch (error) { res.status(500).json({ error: error.message }); }
});

// This is the only dataset exposed on the shareable client page.
router.get('/client-link', (req, res) => {
  res.json({ token: getSettings().clientPortal?.shareToken });
});

router.get('/client', requireClientPortalAccess, (req, res) => {
  try {
    const drafts = getDrafts().map(({ id, status, media, captions, scheduledFor, approvedAt, revision, revisionHistory, productRequest, clientFeedback, createdAt }) =>
      ({ id, status, media, captions, scheduledFor, approvedAt, revision, revisionHistory, productRequest, clientFeedback, createdAt }));
    res.json({ drafts });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', (req, res) => {
  try {
    const draft = createDraft(req.body);
    addLog('info', `Post ${draft.id} submitted for client review.`);
    res.status(201).json({ success: true, draft });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Existing AI generator, now feeding the new review workflow.
router.post('/generate-daily-batch', async (req, res) => {
  try {
    const settings = getSettings();
    const media = (await listMediaFromFolder(settings.cloudinary.folder)).resources || [];
    if (!media.length) return res.status(400).json({ success: false, message: 'No media is available in the review folder.' });
    const slots = [{ theme: 'motivation', time: '08:30' }, { theme: 'nutrition', time: '12:30' }, { theme: 'workout', time: '18:30' }];
    const drafts = [];
    for (const [index, slot] of slots.entries()) {
      const asset = media[index % media.length];
      const content = await generateViralPostContent({ theme: slot.theme, mediaTitle: asset.title || asset.filename || 'NutriFitness' });
      drafts.push(createDraft({ theme: slot.theme, slotTime: slot.time, media: asset, captions: {
        instagramCaption: content.instagramCaption, pinterestTitle: content.pinterestTitle, pinterestDescription: content.pinterestDescription
      } }));
    }
    addLog('success', `${drafts.length} posts submitted for client review.`);
    res.json({ success: true, drafts });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/:id', (req, res) => {
  try {
    if (!getDrafts().some(draft => draft.id === req.params.id)) return res.status(404).json({ error: 'Post not found' });
    res.json({ success: true, draft: updateDraft(req.params.id, req.body) });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Creator fixes a product/design request. The old version stays in revisionHistory.
router.post('/:id/resubmit', (req, res) => {
  try {
    const current = getDrafts().find(draft => draft.id === req.params.id);
    if (!current) return res.status(404).json({ error: 'Post not found' });
    const revision = (current.revision || 1) + 1;
    const captions = { ...current.captions, ...(req.body.captions || {}) };
    const updates = addRevision(current, 'RESUBMITTED', req.body.note || 'Updated by creator and resubmitted.', {
      status: 'PENDING_REVIEW', revision, captions, media: req.body.media || current.media,
      scheduledFor: req.body.scheduledFor ?? current.scheduledFor, productRequest: '', clientFeedback: ''
    });
    const draft = updateDraft(current.id, updates);
    addLog('info', `Post ${current.id} resubmitted as revision ${revision}.`);
    res.json({ success: true, draft });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// The four client controls requested for the client portal.
router.post('/:id/client-response', requireClientPortalAccess, (req, res) => {
  try {
    const current = getDrafts().find(draft => draft.id === req.params.id);
    if (!current) return res.status(404).json({ error: 'Post not found' });
    const { action, productRequest = '', caption = '', scheduledFor = null, note = '' } = req.body;
    const now = new Date().toISOString();
    let updates;
    if (action === 'approve') {
      updates = addRevision(current, 'APPROVED', note || 'Approved by client.', { status: 'APPROVED', approvedAt: now, scheduledFor: scheduledFor || current.scheduledFor });
    } else if (action === 'product_change') {
      if (!productRequest.trim()) return res.status(400).json({ error: 'Please enter the product requested.' });
      updates = addRevision(current, 'PRODUCT_CHANGE_REQUESTED', productRequest, { status: 'PRODUCT_CHANGE_REQUESTED', productRequest, clientFeedback: productRequest });
    } else if (action === 'reject') {
      updates = addRevision(current, 'REJECTED', note || 'Rejected by client.', { status: 'REJECTED', clientFeedback: note });
    } else if (action === 'caption_approve') {
      if (!caption.trim()) return res.status(400).json({ error: 'A caption is required.' });
      updates = addRevision(current, 'CAPTION_EDITED_AND_APPROVED', 'Caption edited and approved by client.', {
        status: 'APPROVED', approvedAt: now, scheduledFor: scheduledFor || current.scheduledFor,
        captions: { ...current.captions, instagramCaption: caption }
      });
    } else return res.status(400).json({ error: 'Unknown review action.' });
    const draft = updateDraft(current.id, updates);
    addLog('info', `Client review for ${current.id}: ${action}.`);
    res.json({ success: true, draft });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/:id/publish-now', async (req, res) => {
  try {
    const draft = getDrafts().find(item => item.id === req.params.id);
    if (!draft) return res.status(404).json({ error: 'Post not found' });
    if (draft.status !== 'APPROVED') return res.status(409).json({ error: 'Only approved posts can be published.' });
    const settings = getSettings();
    const publishResult = await publishToPlatforms({ mediaUrl: draft.media?.secure_url, captionInstagram: draft.captions.instagramCaption,
      captionPinterest: draft.captions.pinterestDescription, pinterestTitle: draft.captions.pinterestTitle,
      platforms: { instagram: settings.scheduling.postToInstagram !== false, pinterest: settings.scheduling.postToPinterest !== false }, resourceType: draft.media?.resource_type || 'image' });
    const successful = (publishResult.instagram?.success || !settings.scheduling.postToInstagram) && (publishResult.pinterest?.success || !settings.scheduling.postToPinterest);
    let deletion = null;
    // Legacy opt-in only: by default files remain for audit and reuse.
    if (successful && settings.scheduling.autoDeleteMediaOnSuccess && draft.media?.public_id) deletion = await deleteMedia(draft.media.public_id, draft.media.resource_type || 'image');
    updateDraft(draft.id, addRevision(draft, 'PUBLISHED', 'Published to selected channels.', { status: 'POSTED', publishedAt: new Date().toISOString() }));
    addPostHistory({ draftId: draft.id, media: draft.media, captions: draft.captions, platforms: publishResult, autoDeleted: deletion?.success || false, status: successful ? 'COMPLETED' : 'FAILED' });
    res.json({ success: successful, publishResult, deletion });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', (req, res) => {
  try { deleteDraft(req.params.id); res.json({ success: true }); } catch (error) { res.status(500).json({ error: error.message }); }
});

export default router;
