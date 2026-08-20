import express from 'express';
import { 
  sendApprovalEmailToClient, 
  processClientEmailReply 
} from '../services/emailApprovalService.js';
import { updateDraft, addLog, getDrafts } from '../services/storageService.js';

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

// 1-Click approval from link in email
router.get('/approve/:draftId', (req, res) => {
  try {
    const { draftId } = req.params;
    const updated = updateDraft(draftId, {
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedVia: 'EMAIL_BUTTON_CLICK'
    });

    if (!updated) {
      return res.send(`
        <html><body style="font-family:sans-serif; background:#0f172a; color:#fff; text-align:center; padding:50px;">
          <h2>⚠️ Brouillon introuvable</h2>
        </body></html>
      `);
    }

    addLog('success', `Post (${draftId}) approuvé par le client via le bouton dans l'email !`);

    res.send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>Post Approuvé - NutriFitness</title>
        <style>
          body { font-family: -apple-system, sans-serif; background: #090d16; color: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #131a2a; border: 1px solid #23304a; border-radius: 16px; padding: 40px; text-align: center; max-width: 480px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
          .icon { font-size: 48px; margin-bottom: 16px; }
          h1 { font-size: 22px; margin: 0 0 10px 0; color: #10b981; }
          p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0; }
          .btn { background: #059669; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 13px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <h1>Post Validé avec Succès !</h1>
          <p>Merci ! Le post Instagram & Pinterest a été approuvé et programmé pour sa diffusion automatique. Le média sera nettoyé de Cloudinary dès publication.</p>
          <a href="http://localhost:5173/?tab=approval" class="btn">Voir sur le Tableau de Bord</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Simulate client email reply (For interactive testing in dashboard)
router.post('/simulate-reply', (req, res) => {
  try {
    const { draftId, replyBody } = req.body;
    const result = processClientEmailReply(draftId, replyBody);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Inbound Email Webhook (for SendGrid / Resend / Mailgun / Postmark incoming replies)
router.post('/inbound-webhook', (req, res) => {
  try {
    const { subject, text, from, draftId } = req.body;
    // Extract draftId from subject if not provided
    const targetDraftId = draftId || (subject?.match(/draft_[a-z0-9]+/i)?.[0]);

    if (!targetDraftId) {
      return res.status(400).json({ error: 'Could not identify draft ID from inbound email' });
    }

    const result = processClientEmailReply(targetDraftId, text || '');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
