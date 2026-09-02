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
  addLog('warn', '[Cron] Automation is currently stopped by user request.');
  return res.json({ success: false, paused: true, message: 'All automation is stopped.' });
});


/**
 * Cloudinary auto-sync endpoint (can be called by cron, webhook, or curl)
 */
router.post('/sync-cloudinary', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const { syncCloudinaryToDrafts } = await import('../services/reviewBatchService.js');
    const result = await syncCloudinaryToDrafts();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Rewrites all non-posted draft captions using real product data from nutrifitness.ch
 */
router.post('/rewrite-captions', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const { rewriteAllCaptions } = await import('../services/reviewBatchService.js');
    const result = await rewriteAllCaptions();
    res.json({ success: true, ...result });
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

/**
 * Sets strictly 3 curated non-UFO posts with clean captions (no prices, no cantons list)
 */
router.post('/set-curated-batch', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const { deleteAllDrafts, createDraft } = await import('../services/storageService.js');
    await deleteAllDrafts();

    // 1. Caffeine 200mg (nutrifitA12 image where the woman holds the caffeine bottle)
    const post1 = await createDraft({
      theme: 'workout',
      slotTime: '07:00',
      media: {
        public_id: 'nutrifitA12',
        filename: 'nutrifitA12.png',
        secure_url: 'https://res.cloudinary.com/qtah71h2/image/upload/v1788286846/nutrifitness/nutrifitA12.png',
        format: 'png',
        resource_type: 'image',
        aspect_ratio: '4:5 (Portrait Idéal)'
      },
      captions: {
        instagramCaption: `🔥 Maximise chaque séance avec CAFFEINE 200MG 60 TABS !

👉 Pourquoi CAFFEINE 200MG 60 TABS fait la différence :
▫️ 200 mg de caféine pure par comprimé
▫️ Améliore la concentration et la vigilance mentale
▫️ Soutient la performance physique lors d’efforts intenses
▫️ Effet énergisant rapide et durable

💡 Conseil NutriFitness :
Consomme 1 dose 20 à 30 minutes avant ta séance pour un boost d'énergie et une concentration maximale.

🇨🇭 Disponible dès maintenant sur nutrifitness.ch (lien direct en bio).

#fitnesssuisse #suisseromande #nutrifitness #genevefitness #lausannefit`,
        pinterestTitle: 'CAFFEINE 200MG 60 TABS | NutriFitness Suisse 🇨🇭',
        pinterestDescription: 'Améliore la force, l\'énergie et la concentration à l\'entraînement. Disponible sur nutrifitness.ch.'
      }
    });

    // 2. Ghost Whey 918g
    const post2 = await createDraft({
      theme: 'nutrition',
      slotTime: '17:00',
      media: {
        public_id: 'nutrifit_imastgram5',
        filename: 'nutrifit_imastgram5.png',
        secure_url: 'https://res.cloudinary.com/qtah71h2/image/upload/v1788286860/nutrifitness/nutrifit_imastgram5.png',
        format: 'png',
        resource_type: 'image',
        aspect_ratio: '4:5 (Portrait Idéal)'
      },
      captions: {
        instagramCaption: `⚡️ Optimise ta récupération avec GHOST WHEY 918G !

👉 Pourquoi GHOST WHEY fait la différence :
▫️ 25g de protéines pures de haute qualité par dose
▫️ Saveur gourmande et onctueuse style dessert
▫️ Faible en sucres et en matières grasses
▫️ Digestion facile et assimilation rapide

💡 Conseil NutriFitness :
Consomme 1 shaker immédiatement après l'entraînement ou en collation pour nourrir tes fibres musculaires.

🇨🇭 Disponible dès maintenant sur nutrifitness.ch (lien direct en bio).

#fitnesssuisse #suisseromande #nutrifitness #genevefitness #lausannefit`,
        pinterestTitle: 'GHOST WHEY 918G | NutriFitness Suisse 🇨🇭',
        pinterestDescription: 'Protéine premium pour la récupération musculaire et le développement sec. Disponible sur nutrifitness.ch.'
      }
    });

    // 3. ISO 90X CFM 1KG
    const post3 = await createDraft({
      theme: 'nutrition',
      slotTime: '07:00',
      media: {
        public_id: 'nutrifit_imastgram1',
        filename: 'nutrifit_imastgram1.png',
        secure_url: 'https://res.cloudinary.com/qtah71h2/image/upload/v1788286859/nutrifitness/nutrifit_imastgram1.png',
        format: 'png',
        resource_type: 'image',
        aspect_ratio: '4:5 (Portrait Idéal)'
      },
      captions: {
        instagramCaption: `🥗 Atteins tes objectifs musculaires avec ISO 90X CFM 1KG !

👉 Pourquoi ISO 90X CFM fait la différence :
▫️ 84 % de protéines Grass-Fed microfiltrées à froid
▫️ Enrichi en DIGEZYME® pour une digestion ultra-fluide
▫️ Teneur minimale en glucides et en lipides
▫️ Absorption express pour une régénération musculaire optimale

💡 Conseil NutriFitness :
Idéal au réveil ou après ta séance pour un apport immédiat en acides aminés essentiels.

🇨🇭 Disponible dès maintenant sur nutrifitness.ch (lien direct en bio).

#fitnesssuisse #suisseromande #nutrifitness #genevefitness #lausannefit`,
        pinterestTitle: 'ISO 90X CFM 1KG | NutriFitness Suisse 🇨🇭',
        pinterestDescription: 'Isolat de whey CFM ultra-pur pour la prise de muscle sec. Disponible sur nutrifitness.ch.'
      }
    });

    res.json({ success: true, count: 3, posts: [post1.id, post2.id, post3.id] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

