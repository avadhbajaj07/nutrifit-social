import express from 'express';
import { publishNextApprovedDraft } from '../services/schedulerService.js';
import { addLog } from '../services/storageService.js';

const router = express.Router();

/**
 * Called by Vercel Cron at 07:00 and 17:00 UTC+1 (Europe/Zurich).
 * Vercel Cron uses UTC, so:
 *   - 07:00 CET  = 06:00 UTC (winter) / 05:00 UTC (summer)
 *   - 17:00 CET  = 16:00 UTC (winter) / 15:00 UTC (summer)
 *
 * We schedule both and let the endpoint figure out the label from the hour.
 *
 * Protected by CRON_SECRET env var (set this in Vercel env vars).
 */
router.post('/trigger', async (req, res) => {
  // Validate cron secret — Vercel sends it as Authorization header
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // Determine which slot label to use based on current Zurich hour
  const zurichHour = parseInt(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Zurich', hour: 'numeric', hour12: false }),
    10
  );
  const slotLabel = zurichHour < 12 ? 'Morning (07:00 CET)' : 'Evening (17:00 CET)';

  addLog('info', `[Cron] Triggered via Vercel Cron — ${slotLabel}`);

  try {
    const result = await publishNextApprovedDraft(slotLabel);
    res.json({ success: result.success, slotLabel, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Resets all posts (approved, rejected, product change requested) back to PENDING_REVIEW
 */
router.post('/reset-all', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const { bulkResetApprovedToPending } = await import('../services/storageService.js');
    const note = req.body?.note || 'Resubmitted for client review — please read each caption carefully.';
    const count = await bulkResetApprovedToPending(note);
    addLog('info', `[ResetAll] Reset ${count} posts back to PENDING_REVIEW.`);
    res.json({ success: true, count, message: `Successfully reset ${count} posts back to PENDING_REVIEW.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

