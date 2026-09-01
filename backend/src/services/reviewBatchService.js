import { listMediaFromFolder } from './cloudinaryService.js';
import { generateViralPostContent } from './aiCaptionService.js';
import { matchProductForMedia, generateCaptionFromProduct } from './productCatalogService.js';
import { addLog, createDraft, getDrafts, updateDraft } from './storageService.js';

const BATCH_SLOTS = [
  { theme: 'motivation', time: '08:30' },
  { theme: 'nutrition', time: '12:30' },
  { theme: 'workout', time: '18:30' }
];

const pendingDrafts = drafts => drafts
  .filter(draft => draft.status === 'PENDING_REVIEW')
  .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

/**
 * Automatically syncs all Cloudinary media in the nutrifitness folder into pending drafts.
 * Every new image gets matched to a real product from nutrifitness.ch and gets
 * a product-specific viral French caption, then is placed directly into client review.
 */
export async function syncCloudinaryToDrafts() {
  const drafts = await getDrafts();
  const mediaResult = await listMediaFromFolder();
  const allMedia = mediaResult.resources || [];

  if (!allMedia.length) {
    return { newCount: 0, totalDrafts: drafts.length, message: 'No media found in Cloudinary folder' };
  }

  // Set of existing media public_ids already in the database
  const usedPublicIds = new Set(drafts.map(d => d.media?.public_id).filter(Boolean));
  const usedUrls = new Set(drafts.map(d => d.media?.secure_url).filter(Boolean));

  const newMediaList = allMedia.filter(m =>
    m.public_id &&
    !usedPublicIds.has(m.public_id) &&
    !usedUrls.has(m.secure_url)
  );

  let newCount = 0;
  for (const [index, media] of newMediaList.entries()) {
    const slot = BATCH_SLOTS[index % BATCH_SLOTS.length];
    const content = await generateViralPostContent({
      theme: slot.theme,
      mediaTitle: media.filename || media.public_id,
      media,
      index
    });

    try {
      await createDraft({
        theme: content.theme || slot.theme,
        slotTime: slot.time,
        media,
        captions: {
          instagramCaption: content.instagramCaption,
          pinterestTitle: content.pinterestTitle,
          pinterestDescription: content.pinterestDescription
        }
      });
      newCount++;
    } catch (error) {
      if (error.code !== '23505') {
        console.warn(`Could not create draft for ${media.public_id}:`, error.message);
      }
    }
  }

  if (newCount > 0) {
    await addLog('success', `Cloudinary Auto-Sync: ${newCount} new image(s) converted into drafts with nutrifitness.ch captions and sent for client review.`);
  }

  const updatedDrafts = await getDrafts();
  return { newCount, totalDrafts: updatedDrafts.length };
}

/**
 * Rewrites captions for ALL existing drafts using real product specs and descriptions from nutrifitness.ch
 */
export async function rewriteAllCaptions() {
  const drafts = await getDrafts();
  let updatedCount = 0;

  for (const [index, draft] of drafts.entries()) {
    // Only update non-posted drafts
    if (draft.status === 'POSTED') continue;

    const mediaObj = draft.media || { filename: draft.id, title: draft.theme };
    const product = await matchProductForMedia(mediaObj, index);
    if (!product) continue;

    const newCaptions = generateCaptionFromProduct(product);

    await updateDraft(draft.id, {
      theme: newCaptions.theme,
      captions: {
        instagramCaption: newCaptions.instagramCaption,
        pinterestTitle: newCaptions.pinterestTitle,
        pinterestDescription: newCaptions.pinterestDescription
      },
      revisionHistory: [
        ...(draft.revisionHistory || []),
        {
          revision: draft.revision || 1,
          event: 'CAPTION_REWRITTEN_WITH_PRODUCT',
          at: new Date().toISOString(),
          note: `Caption rewritten with real product data for ${product.name} from nutrifitness.ch.`,
          caption: newCaptions.instagramCaption,
          media: draft.media
        }
      ]
    });
    updatedCount++;
  }

  await addLog('success', `Captions Rewritten: Updated ${updatedCount} posts with real product descriptions from nutrifitness.ch.`);
  return { updatedCount };
}

/**
 * Serves the review batch for the client. Syncs any new Cloudinary images first,
 * and returns all reviewable posts.
 */
export async function ensureClientReviewBatch() {
  const drafts = await getDrafts();
  return drafts
    .filter(draft => draft.status === 'PENDING_REVIEW')
    .slice(0, 3);
}

