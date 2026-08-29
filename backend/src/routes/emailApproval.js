import express from 'express';
import { 
  sendApprovalEmailToClient, 
  processClientEmailReply 
} from '../services/emailApprovalService.js';
import { updateDraft, addLog, getDrafts } from '../services/storageService.js';
import { sanitizeInstagramCaption } from '../services/aiCaptionService.js';

const router = express.Router();

// Send approval email for a draft
router.post('/send/:draftId', async (req, res) => {
  try {
    const { draftId } = req.params;
    const { clientEmail } = req.body;
    const result = await sendApprovalEmailToClient(draftId, clientEmail);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 1-Click Action from Email (Approve OR Disapprove / Reject)
router.get('/approve/:draftId', async (req, res) => {
  try {
    const { draftId } = req.params;
    const action = req.query.action || 'approve';

    if (action === 'reject') {
      const updated = await updateDraft(draftId, {
        status: 'REJECTED',
        rejectedAt: new Date().toISOString(),
        rejectedVia: 'EMAIL_DISAPPROVE_BUTTON'
      });

      addLog('warning', `❌ Post (${draftId}) REJETÉ / DÉSAPPROUVÉ par le client via le bouton dans l'email.`);

      return res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Post Rejeté - NutriFitness</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #080c14; color: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: #111827; border: 1px solid #1f2937; border-radius: 18px; padding: 36px 28px; text-align: center; max-width: 480px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
            .icon { font-size: 52px; margin-bottom: 14px; }
            h1 { font-size: 22px; margin: 0 0 10px 0; color: #f43f5e; font-weight: 800; }
            p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0; }
            .badge { display: inline-block; background: rgba(244, 63, 94, 0.15); color: #f43f5e; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; margin-bottom: 20px; border: 1px solid rgba(244, 63, 94, 0.3); }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">❌</div>
            <div class="badge">STATUT : REJETÉ</div>
            <h1>Post Rejeté</h1>
            <p>Ce visuel ne sera <strong>pas publié</strong> sur Instagram ni sur Pinterest. Une nouvelle proposition sera générée pour ce créneau.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Default: APPROVE
    const updated = await updateDraft(draftId, {
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedVia: 'EMAIL_BUTTON_CLICK'
    });

    if (!updated) {
      return res.send(`
        <html><body style="font-family:sans-serif; background:#080c14; color:#fff; text-align:center; padding:50px;">
          <h2>⚠️ Brouillon introuvable</h2>
        </body></html>
      `);
    }

    addLog('success', `Post (${draftId}) validé avec succès par le client via le bouton dans l'email !`);

    res.send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Post Approuvé - NutriFitness</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #080c14; color: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #111827; border: 1px solid #1f2937; border-radius: 18px; padding: 36px 28px; text-align: center; max-width: 480px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
          .icon { font-size: 52px; margin-bottom: 14px; }
          h1 { font-size: 22px; margin: 0 0 10px 0; color: #10b981; font-weight: 800; }
          p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 20px 0; }
          .badge { display: inline-block; background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; margin-bottom: 16px; border: 1px solid rgba(16, 185, 129, 0.3); }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <div class="badge">STATUT : APPROUVÉ & PROGRAMMÉ</div>
          <h1>Post Validé avec Succès !</h1>
          <p>Merci ! Le post Instagram & Pinterest est programmé pour sa diffusion automatique aux horaires prévus pour la Suisse.</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Interactive Web Caption Editor (Mobile-friendly direct edit page)
router.get('/edit/:draftId', async (req, res) => {
  try {
    const { draftId } = req.params;
    const drafts = await getDrafts();
    const draft = drafts.find(d => d.id === draftId);

    const caption = draft?.captions?.instagramCaption || '';
    const mediaTitle = draft?.media?.title || 'Produit NutriFitness';

    res.send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Modifier la Légende - NutriFitness</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #080c14; color: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #111827; border: 1px solid #1f2937; border-radius: 18px; padding: 30px; max-width: 520px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
          h1 { font-size: 20px; margin: 0 0 6px 0; color: #38bdf8; font-weight: 800; }
          p { font-size: 13px; color: #94a3b8; margin: 0 0 16px 0; }
          textarea { width: 100%; height: 180px; background: #030712; border: 1px solid #374151; border-radius: 12px; color: #f1f5f9; padding: 14px; font-size: 13px; line-height: 1.6; box-sizing: border-box; resize: vertical; margin-bottom: 18px; outline: none; }
          textarea:focus { border-color: #38bdf8; }
          .btn-save { background: #10b981; color: white; border: none; padding: 14px 24px; border-radius: 10px; font-weight: 800; font-size: 14px; cursor: pointer; width: 100%; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); }
          .btn-save:hover { background: #059669; }
          .rules-note { font-size: 11px; color: #64748b; margin-top: 14px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>✏️ Modifier la Légende</h1>
          <p>Ajustez le texte pour : <strong>${mediaTitle}</strong></p>
          <form method="POST" action="/api/email-approval/save-and-approve/${draftId}">
            <textarea name="caption" required>${caption}</textarea>
            <button type="submit" class="btn-save">💾 Enregistrer & Valider le Post</button>
          </form>
          <div class="rules-note">
            🇨🇭 Règles appliquées automatiquement : 5 hashtags max • 0 lien brut
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Save edited caption & approve
router.post('/save-and-approve/:draftId', async (req, res) => {
  try {
    const { draftId } = req.params;
    const rawCaption = req.body.caption || '';
    const sanitized = sanitizeInstagramCaption(rawCaption);

    const updated = await updateDraft(draftId, {
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedVia: 'WEB_CAPTION_EDIT_AND_APPROVE',
      captions: {
        instagramCaption: sanitized.sanitizedText
      }
    });

    addLog('success', `Légende modifiée via la page web et post validé (${draftId}) !`);

    res.redirect(`/api/email-approval/approve/${draftId}?action=approve`);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Simulate client email reply
router.post('/simulate-reply', async (req, res) => {
  try {
    const { draftId, replyBody } = req.body;
    const result = await processClientEmailReply(draftId, replyBody);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
