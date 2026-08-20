import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSettings, updateDraft, getDrafts, addLog } from './storageService.js';
import { sanitizeInstagramCaption } from './aiCaptionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_MEDIA_DIR = path.join(__dirname, '../../../nutriftness.ch');

function getEmailSender() {
  const settings = getSettings();
  const resendApiKey = process.env.RESEND_API_KEY || settings.email?.resendApiKey;

  if (resendApiKey) {
    const resend = new Resend(resendApiKey);
    return { type: 'resend', client: resend };
  }

  const smtp = settings.email || {};
  const host = process.env.SMTP_HOST || smtp.host;
  const user = process.env.SMTP_USER || smtp.user;
  const pass = process.env.SMTP_PASS || smtp.pass;
  const port = process.env.SMTP_PORT || smtp.port || 587;

  if (host && user && pass) {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass }
    });
    return { type: 'smtp', client: transporter };
  }

  return null;
}

export function generateApprovalEmailHtml(draft, approvalUrl, editUrl, hasInlineAttachment = true) {
  const mediaUrl = hasInlineAttachment ? 'cid:visual_post' : (draft.media?.secure_url || '');
  const igCaption = draft.captions?.instagramCaption || '';
  const slotTime = draft.slotTime || '08:30';
  const theme = draft.theme?.toUpperCase() || 'MOTIVATION';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #131a2a; border-radius: 16px; border: 1px solid #23304a; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #059669, #0d9488); padding: 24px; text-align: center; color: white; }
    .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 800; }
    .header p { margin: 0; font-size: 13px; opacity: 0.9; }
    .body { padding: 24px; }
    .badge { display: inline-block; background: #1e293b; color: #38bdf8; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; border: 1px solid #334155; }
    .image-container { border-radius: 12px; overflow: hidden; margin-bottom: 20px; background: #000; text-align: center; }
    .image-container img { max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 12px; }
    .caption-box { background: #080c14; border-radius: 12px; padding: 18px; border: 1px solid #1e293b; margin-bottom: 24px; }
    .caption-box h3 { margin: 0 0 10px 0; font-size: 12px; color: #10b981; text-transform: uppercase; letter-spacing: 0.5px; }
    .caption-text { font-size: 13px; line-height: 1.6; color: #e2e8f0; white-space: pre-wrap; margin: 0; }
    .btn-container { text-align: center; margin: 26px 0; }
    .btn-approve { display: inline-block; background: #10b981; color: #ffffff !important; text-decoration: none; padding: 16px 36px; border-radius: 12px; font-weight: 800; font-size: 15px; margin: 0 6px 10px 6px; box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4); }
    .reply-instructions { background: rgba(30, 41, 59, 0.6); border-left: 3px solid #38bdf8; padding: 14px 18px; border-radius: 8px; font-size: 12px; color: #cbd5e1; line-height: 1.6; margin-top: 20px; }
    .footer { text-align: center; padding: 16px; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🇨🇭 NutriFitness Social Suite</h1>
      <p>Nouveau post en attente de votre validation client</p>
    </div>
    <div class="body">
      <div class="badge">⏰ Créneau Prévu : ${slotTime} CET • ${theme}</div>
      
      <div class="image-container">
        <img src="${mediaUrl}" alt="Visuel NutriFitness Suisse" />
      </div>

      <div class="caption-box">
        <h3>📸 Légende Instagram & Pinterest (Français)</h3>
        <p class="caption-text">${igCaption}</p>
      </div>

      <div class="btn-container">
        <a href="${approvalUrl}" class="btn-approve">✅ APPROUVER & PROGRAMMER CE POST</a>
      </div>

      <div class="reply-instructions">
        💡 <strong>Vous pouvez également approuver directement par email :</strong><br/>
        • Répondez simplement <strong>"OUI"</strong> ou <strong>"APPROUVÉ"</strong> à cet email.<br/>
        • Ou répondez avec vos corrections pour modifier la légende automatiquement.
      </div>
    </div>
    <div class="footer">
      NutriFitness.ch • 34 Rue des Pâquis, 1201 Genève • Instagram & Pinterest Automation
    </div>
  </div>
</body>
</html>
`;
}

async function getImageAttachment(draft) {
  try {
    const filename = draft.media?.filename || path.basename(draft.media?.secure_url || 'nutrifitness_swiss_model_01.jpg');
    const localFile = path.join(LOCAL_MEDIA_DIR, filename);

    if (fs.existsSync(localFile)) {
      const buffer = fs.readFileSync(localFile);
      return {
        filename,
        content: buffer.toString('base64'),
        content_type: filename.endsWith('.png') ? 'image/png' : 'image/jpeg',
        disposition: 'inline',
        cid: 'visual_post'
      };
    }

    if (draft.media?.secure_url?.startsWith('http')) {
      const response = await axios.get(draft.media.secure_url, { responseType: 'arraybuffer', timeout: 10000 });
      const base64 = Buffer.from(response.data).toString('base64');
      return {
        filename: 'visual_post.jpg',
        content: base64,
        content_type: 'image/jpeg',
        disposition: 'inline',
        cid: 'visual_post'
      };
    }
  } catch (err) {
    console.warn('Could not generate inline attachment:', err.message);
  }
  return null;
}

export async function sendApprovalEmailToClient(draftId, clientEmailOverride = null) {
  const settings = getSettings();
  const drafts = getDrafts();
  const draft = drafts.find(d => d.id === draftId);

  if (!draft) {
    throw new Error('Brouillon introuvable');
  }

  const recipientEmail = clientEmailOverride || process.env.CLIENT_EMAIL || settings.email?.clientEmail || 'marco.scarpantoni@hotmail.com';
  const baseUrl = process.env.APP_BASE_URL || 'https://nutrifitness-social-media-desidreams.vercel.app';
  const frontendUrl = process.env.FRONTEND_URL || 'https://nutrifitness-social-media-desidreams.vercel.app';

  const approvalUrl = `${baseUrl}/api/email-approval/approve/${draft.id}?action=approve`;
  const editUrl = `${frontendUrl}/?tab=approval&draftId=${draft.id}`;

  const sender = getEmailSender();
  const attachment = await getImageAttachment(draft);
  const htmlContent = generateApprovalEmailHtml(draft, approvalUrl, editUrl, !!attachment);

  const fromEmail = process.env.SENDER_EMAIL || settings.email?.senderEmail || 'Hello@avadhbajaj.com';
  const subject = `🇨🇭 [Validation Requise] Post Instagram & Pinterest - ${draft.theme?.toUpperCase()} (${draft.slotTime || '08:30'})`;

  if (sender?.type === 'resend') {
    try {
      const emailPayload = {
        from: fromEmail,
        to: recipientEmail,
        subject,
        html: htmlContent,
        ...(attachment ? { attachments: [attachment] } : {})
      };

      const data = await sender.client.emails.send(emailPayload);
      addLog('success', `Email Resend envoyé avec visuel intégré à ${recipientEmail}`);
      
      updateDraft(draftId, {
        emailSentTo: recipientEmail,
        emailSentAt: new Date().toISOString()
      });

      return { success: true, provider: 'resend', id: data.data?.id, recipient: recipientEmail };
    } catch (err) {
      addLog('error', `Erreur envoi Resend : ${err.message}`);
    }
  }

  return {
    success: true,
    isSimulated: true,
    recipient: recipientEmail,
    approvalUrl,
    editUrl,
    subject,
    html: htmlContent
  };
}

export function processClientEmailReply(draftId, replyBody = '') {
  const drafts = getDrafts();
  const draft = drafts.find(d => d.id === draftId);

  if (!draft) {
    return { success: false, message: 'Brouillon introuvable' };
  }

  const cleanedBody = replyBody.trim();
  const lower = cleanedBody.toLowerCase();

  const approvalKeywords = ['oui', 'ok', 'yes', 'validé', 'valide', 'approuve', 'approuvé', 'approved', 'go', 'top', 'parfait', 'nickel'];
  const isDirectApproval = approvalKeywords.some(k => lower === k || lower.startsWith(k + ' ') || lower.startsWith(k + '!') || lower.startsWith(k + '.'));

  if (isDirectApproval) {
    const updated = updateDraft(draftId, {
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedVia: 'EMAIL_REPLY',
      clientFeedback: `Approuvé par email : "${cleanedBody}"`
    });

    addLog('success', `Client (${draft.emailSentTo || 'client'}) a approuvé le post (${draftId}) par email ! Status: APPROVED ✅`);
    return {
      success: true,
      action: 'APPROVED_DIRECT',
      draft: updated,
      message: 'Post approuvé avec succès par email.'
    };
  } else {
    const sanitized = sanitizeInstagramCaption(cleanedBody);
    const updated = updateDraft(draftId, {
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedVia: 'EMAIL_REPLY_WITH_REVISED_CAPTION',
      clientFeedback: 'Légende révisée par le client par email',
      captions: {
        ...draft.captions,
        instagramCaption: sanitized.sanitizedText
      }
    });

    addLog('success', `Client a révisé la légende par email (${draftId}) et validé le post ! Status: APPROVED ✅`);
    return {
      success: true,
      action: 'APPROVED_WITH_REVISED_CAPTION',
      draft: updated,
      message: 'Légende mise à jour selon la réponse email du client et post approuvé !'
    };
  }
}
