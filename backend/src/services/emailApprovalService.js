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
const PRODUCTS_DIR = path.join(__dirname, '../../../nutrifitness_products');

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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080c14; color: #f1f5f9; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #111827; border-radius: 18px; border: 1px solid #1f2937; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.7); }
    .header { background: linear-gradient(135deg, #059669, #0d9488); padding: 26px; text-align: center; color: white; }
    .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 800; }
    .header p { margin: 0; font-size: 13px; opacity: 0.9; }
    .body { padding: 24px; }
    .badge { display: inline-block; background: #0f172a; color: #34d399; padding: 6px 14px; border-radius: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 18px; border: 1px solid #059669; }
    .image-container { border-radius: 14px; overflow: hidden; margin-bottom: 22px; background: #0f172a; text-align: center; padding: 15px; }
    .image-container img { max-width: 85%; height: auto; display: block; margin: 0 auto; border-radius: 10px; }
    .caption-box { background: #030712; border-radius: 14px; padding: 20px; border: 1px solid #1f2937; margin-bottom: 24px; }
    .caption-box h3 { margin: 0 0 10px 0; font-size: 12px; color: #34d399; text-transform: uppercase; letter-spacing: 0.5px; }
    .caption-text { font-size: 13px; line-height: 1.6; color: #e5e7eb; white-space: pre-wrap; margin: 0; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn-approve { display: inline-block; background: #10b981; color: #ffffff !important; text-decoration: none; padding: 16px 36px; border-radius: 12px; font-weight: 800; font-size: 15px; margin: 0 6px 10px 6px; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.5); }
    .reply-instructions { background: rgba(31, 41, 55, 0.6); border-left: 4px solid #10b981; padding: 14px 18px; border-radius: 8px; font-size: 12px; color: #cbd5e1; line-height: 1.6; margin-top: 20px; }
    .footer { text-align: center; padding: 18px; font-size: 11px; color: #6b7280; border-top: 1px solid #1f2937; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🇨🇭 NutriFitness Social Suite</h1>
      <p>Nouveau post en attente de votre validation</p>
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
    const filename = draft.media?.filename || path.basename(draft.media?.secure_url || 'ISO_BULK_2KG.png');
    
    // Check in nutrifitness_products first
    const prodFile = path.join(PRODUCTS_DIR, filename);
    if (fs.existsSync(prodFile)) {
      const buffer = fs.readFileSync(prodFile);
      return {
        filename,
        content: buffer.toString('base64'),
        content_type: filename.endsWith('.png') ? 'image/png' : 'image/webp',
        disposition: 'inline',
        cid: 'visual_post'
      };
    }

    // Check in local-media
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
        filename: 'visual_post.png',
        content: base64,
        content_type: 'image/png',
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

  // 🔒 HARD SAFETY LOCK CHECK
  let recipientEmail = clientEmailOverride || settings.safetyLock?.supervisorEmail || 'avadhbajaj07@gmail.com';
  
  // If target is Marco, verify if safetyLock is explicitly bypassed by supervisor
  if (clientEmailOverride === 'marco.scarpantoni@hotmail.com' && !settings.safetyLock?.sendToMarcoAllowed) {
    addLog('warning', `[VERROU DE SÉCURITÉ ACTIF] L'envoi automatique à Marco est bloqué. Redirigé en toute sécurité vers ${settings.safetyLock.supervisorEmail}`);
    recipientEmail = settings.safetyLock.supervisorEmail;
  }

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
      addLog('success', `Email Resend sécurisé envoyé à ${recipientEmail}`);
      
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

    addLog('success', `Superviseur/Client (${draft.emailSentTo || 'user'}) a validé le post (${draftId}) ! Status: APPROVED ✅`);
    return {
      success: true,
      action: 'APPROVED_DIRECT',
      draft: updated,
      message: 'Post approuvé avec succès.'
    };
  } else {
    const sanitized = sanitizeInstagramCaption(cleanedBody);
    const updated = updateDraft(draftId, {
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedVia: 'EMAIL_REPLY_WITH_REVISED_CAPTION',
      clientFeedback: 'Légende révisée par email',
      captions: {
        ...draft.captions,
        instagramCaption: sanitized.sanitizedText
      }
    });

    addLog('success', `Légende révisée par email (${draftId}) et validée ! Status: APPROVED ✅`);
    return {
      success: true,
      action: 'APPROVED_WITH_REVISED_CAPTION',
      draft: updated,
      message: 'Légende mise à jour et post validé !'
    };
  }
}
