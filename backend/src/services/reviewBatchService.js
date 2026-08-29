import { listMediaFromFolder } from './cloudinaryService.js';
import { generateViralPostContent } from './aiCaptionService.js';
import { addLog, createDraft, getDrafts } from './storageService.js';

const BATCH_SIZE = 3;
const BATCH_SLOTS = [
  { theme: 'motivation', time: '08:30' },
  { theme: 'nutrition', time: '12:30' },
  { theme: 'workout', time: '18:30' }
];

const pendingDrafts = drafts => drafts
  .filter(draft => draft.status === 'PENDING_REVIEW')
  .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

export async function ensureClientReviewBatch() {
  let drafts = await getDrafts();
  const currentBatch = pendingDrafts(drafts);

  // A batch stays together. The next three are created only after every item
  // in the current batch has received a decision.
  if (currentBatch.length) return currentBatch.slice(0, BATCH_SIZE);

  const mediaResult = await listMediaFromFolder();
  const usedMedia = new Set(drafts.map(draft => draft.media?.public_id).filter(Boolean));
  const nextMedia = (mediaResult.resources || [])
    .filter(media => media.public_id && !usedMedia.has(media.public_id))
    .slice(0, BATCH_SIZE);

  if (!nextMedia.length) return [];

  for (const [index, media] of nextMedia.entries()) {
    const slot = BATCH_SLOTS[index % BATCH_SLOTS.length];
    const content = await generateViralPostContent({
      theme: slot.theme,
      mediaTitle: media.title || media.filename || media.public_id
    });
    try {
      await createDraft({
        theme: slot.theme,
        slotTime: slot.time,
        media,
        captions: {
          instagramCaption: content.instagramCaption,
          pinterestTitle: content.pinterestTitle,
          pinterestDescription: content.pinterestDescription
        }
      });
    } catch (error) {
      // A unique media ID prevents two simultaneous client requests from
      // placing the same Cloudinary image into separate batches.
      if (error.code !== '23505') throw error;
    }
  }

  drafts = await getDrafts();
  const createdBatch = pendingDrafts(drafts).slice(0, BATCH_SIZE);
  await addLog('info', `Client review batch prepared with ${createdBatch.length} Cloudinary posts.`);
  return createdBatch;
}

export const CLIENT_BATCH_SIZE = BATCH_SIZE;
