import express from 'express';
import { getDrafts, getDraftById, createDraft, updateDraft, deleteDraft, addLog, getSettings, addPostHistory, bulkResetApprovedToPending } from '../services/storageService.js';
import { listMediaFromFolder } from '../services/cloudinaryService.js';
import { generateViralPostContent } from '../services/aiCaptionService.js';
import { createBlotatoPost, getBlotatoPostStatus, publishToPlatforms, uploadBlotatoMedia } from '../services/blotatoService.js';
import { ensureClientReviewBatch, syncCloudinaryToDrafts, rewriteAllCaptions } from '../services/reviewBatchService.js';
import { requireAdmin } from '../services/adminAuthService.js';
import { assignScheduledSlot } from '../services/schedulerService.js';

const router = express.Router();
const canAccessClientPortal = req => {
  const token = req.get('x-client-token') || req.query.token;
  const forwardedHost = req.get('x-forwarded-host') || req.get('host') || '';
  const requestHost = forwardedHost.split(',')[0].trim().split(':')[0].toLowerCase();
  const clientHost = (process.env.CLIENT_PORTAL_HOST || 'www.sdqure.com').toLowerCase();
  const validToken = token && token === getSettings().clientPortal?.shareToken;
  return requestHost === clientHost || Boolean(validToken);
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

router.get('/', requireAdmin, async (req, res) => {
  try {
    res.json({ drafts: await getDrafts() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Sync newly uploaded Cloudinary images into pending drafts with product captions
router.post('/sync-cloudinary', requireAdmin, async (req, res) => {
  try {
    const result = await syncCloudinaryToDrafts();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rewrite captions for all drafts using real product data from nutrifitness.ch
router.post('/rewrite-all-captions', requireAdmin, async (req, res) => {
  try {
    const result = await rewriteAllCaptions();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// This is the only dataset exposed on the shareable client page.
router.get('/client-link', requireAdmin, (req, res) => {
  res.json({
    token: getSettings().clientPortal?.shareToken,
    url: process.env.CLIENT_PORTAL_URL || null
  });
});

// Reset all APPROVED drafts back to PENDING_REVIEW for a new client review round.
router.post('/reset-all-to-pending', requireAdmin, async (req, res) => {
  try {
    const note = req.body.note || 'Resubmitted for client review — please read each caption carefully.';
    const count = await bulkResetApprovedToPending(note);
    addLog('info', `${count} post(s) reset to PENDING_REVIEW for client re-review.`);
    res.json({ success: true, count, message: `${count} post(s) sent back for client approval.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get('/client', requireClientPortalAccess, (req, res) => {
  ensureClientReviewBatch().then(drafts => {
    const clientDrafts = drafts.map(({ id, status, media, captions, scheduledFor, approvedAt, revision, revisionHistory, productRequest, clientFeedback, createdAt }) =>
      ({ id, status, media, captions, scheduledFor, approvedAt, revision, revisionHistory, productRequest, clientFeedback, createdAt }));
    res.json({ drafts: clientDrafts });
  }).catch(error => res.status(500).json({ error: error.message }));
});

router.post('/', requireAdmin, (req, res) => {
  createDraft(req.body).then(draft => {
    addLog('info', `Post ${draft.id} submitted for client review.`);
    res.status(201).json({ success: true, draft });
  }).catch(error => res.status(500).json({ error: error.message }));
});

// Existing AI generator, now feeding the new review workflow.
router.post('/generate-daily-batch', requireAdmin, async (req, res) => {
  try {
    const settings = getSettings();
    const media = (await listMediaFromFolder(settings.cloudinary.folder)).resources || [];
    if (!media.length) return res.status(400).json({ success: false, message: 'No media is available in the review folder.' });
    const slots = [{ theme: 'motivation', time: '08:30' }, { theme: 'nutrition', time: '12:30' }, { theme: 'workout', time: '18:30' }];
    const drafts = [];
    for (const [index, slot] of slots.entries()) {
      const asset = media[index % media.length];
      const content = await generateViralPostContent({ theme: slot.theme, mediaTitle: asset.title || asset.filename || 'NutriFitness' });
      drafts.push(await createDraft({ theme: slot.theme, slotTime: slot.time, media: asset, captions: {
        instagramCaption: content.instagramCaption, pinterestTitle: content.pinterestTitle, pinterestDescription: content.pinterestDescription
      } }));
    }
    addLog('success', `${drafts.length} posts submitted for client review.`);
    res.json({ success: true, drafts });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    if (!await getDraftById(req.params.id)) return res.status(404).json({ error: 'Post not found' });
    res.json({ success: true, draft: await updateDraft(req.params.id, req.body) });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Creator fixes a product/design request. The old version stays in revisionHistory.
router.post('/:id/resubmit', requireAdmin, (req, res) => {
  getDraftById(req.params.id).then(async current => {
    if (!current) return res.status(404).json({ error: 'Post not found' });
    const revision = (current.revision || 1) + 1;
    const captions = { ...current.captions, ...(req.body.captions || {}) };
    const updates = addRevision(current, 'RESUBMITTED', req.body.note || 'Updated by creator and resubmitted.', {
      status: 'PENDING_REVIEW', revision, captions, media: req.body.media || current.media,
      scheduledFor: req.body.scheduledFor ?? current.scheduledFor, productRequest: '', clientFeedback: ''
    });
    const draft = await updateDraft(current.id, updates);
    addLog('info', `Post ${current.id} resubmitted as revision ${revision}.`);
    res.json({ success: true, draft });
  }).catch(error => res.status(500).json({ error: error.message }));
});

// The four client controls requested for the client portal.
router.post('/:id/client-response', requireClientPortalAccess, (req, res) => {
  getDraftById(req.params.id).then(async current => {
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

    const draft = await updateDraft(current.id, updates);
    addLog('info', `Client review for ${current.id}: ${action}.`);

    res.json({ success: true, draft });
  }).catch(error => res.status(500).json({ error: error.message }));
});



router.post('/:id/publish-now', requireAdmin, async (req, res) => {
  try {
    const draft = await getDraftById(req.params.id);
    if (!draft) return res.status(404).json({ error: 'Post not found' });
    if (draft.status !== 'APPROVED') return res.status(409).json({ error: 'Only approved posts can be published.' });
    const settings = getSettings();
    const publishResult = await publishToPlatforms({ mediaUrl: draft.media?.secure_url, captionInstagram: draft.captions.instagramCaption,
      captionPinterest: draft.captions.pinterestDescription, pinterestTitle: draft.captions.pinterestTitle,
      platforms: { instagram: settings.scheduling.postToInstagram !== false, pinterest: settings.scheduling.postToPinterest !== false }, resourceType: draft.media?.resource_type || 'image' });
    const successful = (publishResult.instagram?.success || !settings.scheduling.postToInstagram) && (publishResult.pinterest?.success || !settings.scheduling.postToPinterest);
    await updateDraft(draft.id, addRevision(draft, 'PUBLISHED', 'Published to selected channels.', { status: 'POSTED', publishedAt: new Date().toISOString() }));
    await addPostHistory({ draftId: draft.id, media: draft.media, captions: draft.captions, platforms: publishResult, autoDeleted: false, status: successful ? 'COMPLETED' : 'FAILED' });
    res.json({ success: successful, publishResult });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Send one approved post to any social account connected in Blotato.
router.post('/:id/blotato-publication', requireAdmin, async (req, res) => {
  try {
    const draft = await getDraftById(req.params.id);
    if (!draft) return res.status(404).json({ error: 'Post not found' });
    if (!['APPROVED', 'SCHEDULED', 'PUBLISH_FAILED'].includes(draft.status)) {
      return res.status(409).json({ error: 'Only approved posts can be sent to Blotato.' });
    }

    const {
      accountId, platform, target = {}, scheduledTime = null, useNextFreeSlot = false,
      additionalPosts = [], relayMedia = false, text = ''
    } = req.body;
    let mediaUrl = draft.media?.secure_url;
    if (!mediaUrl) return res.status(400).json({ error: 'This post does not have a public media URL.' });
    if (relayMedia) mediaUrl = (await uploadBlotatoMedia(mediaUrl)).url || mediaUrl;

    const publication = await createBlotatoPost({
      accountId,
      platform,
      text: text || draft.captions?.instagramCaption || '',
      mediaUrls: [mediaUrl],
      target,
      scheduledTime,
      useNextFreeSlot,
      additionalPosts
    });
    const nextStatus = scheduledTime || useNextFreeSlot ? 'SCHEDULED' : 'PUBLISHING';
    const updated = await updateDraft(draft.id, addRevision(draft, nextStatus, `Sent to ${platform} through Blotato.`, {
      status: nextStatus,
      scheduledFor: scheduledTime || draft.scheduledFor,
      blotatoPublication: {
        ...publication,
        accountId,
        platform,
        target,
        submittedAt: new Date().toISOString()
      }
    }));
    addLog('success', `Draft ${draft.id} sent to ${platform} through Blotato.`);
    res.status(201).json({ success: true, draft: updated, publication });
  } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
});

router.get('/:id/blotato-publication', requireAdmin, async (req, res) => {
  try {
    const draft = await getDraftById(req.params.id);
    if (!draft) return res.status(404).json({ error: 'Post not found' });
    const submissionId = draft.blotatoPublication?.postSubmissionId;
    if (!submissionId) return res.status(404).json({ error: 'No Blotato submission is attached to this post.' });

    const publication = await getBlotatoPostStatus(submissionId);
    const statusMap = { published: 'POSTED', failed: 'PUBLISH_FAILED', scheduled: 'SCHEDULED', 'in-progress': 'PUBLISHING' };
    const nextStatus = statusMap[publication.status] || draft.status;
    let updates = {
      status: nextStatus,
      blotatoPublication: { ...draft.blotatoPublication, ...publication, checkedAt: new Date().toISOString() }
    };
    if (nextStatus !== draft.status) {
      const note = publication.errorMessage || publication.publicUrl || `Blotato status: ${publication.status}`;
      updates = addRevision(draft, `BLOTATO_${publication.status.toUpperCase().replace('-', '_')}`, note, {
        ...updates,
        ...(nextStatus === 'POSTED' ? { publishedAt: new Date().toISOString() } : {})
      });
    }
    const updated = await updateDraft(draft.id, updates);
    res.json({ success: true, draft: updated, publication });
  } catch (error) { res.status(error.status || 500).json({ error: error.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try { await deleteDraft(req.params.id); res.json({ success: true }); } catch (error) { res.status(500).json({ error: error.message }); }
});

export default router;
