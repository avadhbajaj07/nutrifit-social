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
const PRODUCTS_DIR = path.join(__dirname, '../../../products');
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

export function generateApprovalEmailHtml(draft, approvalUrl, editUrl, rejectUrl, hasInlineAttachment = true) {
  const mediaUrl = hasInlineAttachment ? 'cid:visual_post' : (draft.media?.secure_url || '');
  const igCaption = draft.captions?.instagramCaption || '';
  const slotTime = draft.slotTime || '08:30';
  const theme = draft.theme?.toUpperCase() || 'PRODUIT & PERFORMANCE';
  const productTitle = draft.media?.title || 'Produit Officiel NutriFitness';

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
    .image-container { border-radius: 14px; overflow: hidden; margin-bottom: 22px; background: #0f172a; text-align: center; padding: 20px; border: 1px solid #1e293b; }
    .image-container img { max-width: 85%; height: auto; display: block; margin: 0 auto; border-radius: 8px; }
    .caption-box { background: #030712; border-radius: 14px; padding: 20px; border: 1px solid #1f2937; margin-bottom: 24px; }
    .caption-box h3 { margin: 0 0 10px 0; font-size: 12px; color: #34d399; text-transform: uppercase; letter-spacing: 0.5px; }
    .caption-text { font-size: 13px; line-height: 1.6; color: #e5e7eb; white-space: pre-wrap; margin: 0; }
    
    /* 3 Action Buttons */
    .btn-container { text-align: center; margin: 26px 0; }
    .btn-approve { display: block; background: #10b981; color: #ffffff !important; text-decoration: none; padding: 15px 28px; border-radius: 12px; font-weight: 800; font-size: 14px; margin-bottom: 10px; box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4); text-align: center; }
    .btn-row { display: flex; gap: 10px; justify-content: center; margin-top: 10px; }
    .btn-edit { flex: 1; display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 700; font-size: 13px; text-align: center; }
    .btn-reject { flex: 1; display: inline-block; background: #e11d48; color: #ffffff !important; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 700; font-size: 13px; text-align: center; }
    
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
        <img src="${mediaUrl}" alt="${productTitle}" />
      </div>

      <div class="caption-box">
        <h3>📸 Légende Instagram & Pinterest (Français)</h3>
        <p class="caption-text">${igCaption}</p>
      </div>

      <div class="btn-container">
        <a href="${approvalUrl}" class="btn-approve">✅ APPROUVER & PROGRAMMER</a>
        <div class="btn-row">
          <a href="${editUrl}" class="btn-edit">✏️ MODIFIER LA LÉGENDE</a>
          <a href="${rejectUrl}" class="btn-reject">❌ DÉSAPPROUVER / REJETER</a>
        </div>
      </div>

      <div class="reply-instructions">
        💡 <strong>Vous pouvez également agir directement par email :</strong><br/>
        • Répondez <strong>"OUI"</strong> pour approuver le post.<br/>
        • Répondez <strong>"NON"</strong> ou <strong>"REJETÉ"</strong> pour désapprouver.<br/>
        • Ou répondez avec vos corrections de texte pour modifier la légende.
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
    const filename = draft.media?.filename || path.basename(draft.media?.secure_url || '');

    // Check in products folder
    const prodFile = path.join(PRODUCTS_DIR, filename);
    if (fs.existsSync(prodFile)) {
      const buffer = fs.readFileSync(prodFile);
      return {
        filename,
        content: buffer.toString('base64'),
        content_type: filename.endsWith('.png') ? 'image/png' : filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
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
  const drafts = await getDrafts();
  const draft = drafts.find(d => d.id === draftId);

  if (!draft) {
    throw new Error('Brouillon introuvable');
  }

  let recipientEmail = clientEmailOverride || settings.safetyLock?.supervisorEmail || 'avadhbajaj07@gmail.com';
  
  if (clientEmailOverride === 'marco.scarpantoni@hotmail.com' && !settings.safetyLock?.sendToMarcoAllowed) {
    addLog('warning', `[VERROU DE SÉCURITÉ ACTIF] Envoi à Marco bloqué. Redirigé vers ${settings.safetyLock.supervisorEmail}`);
    recipientEmail = settings.safetyLock.supervisorEmail;
  }

  const baseUrl = process.env.APP_BASE_URL || 'https://nutrifitness-social-media-desidreams.vercel.app';

  const approvalUrl = `${baseUrl}/api/email-approval/approve/${draft.id}?action=approve`;
  const rejectUrl = `${baseUrl}/api/email-approval/approve/${draft.id}?action=reject`;
  const editUrl = `${baseUrl}/api/email-approval/edit/${draft.id}`;

  const sender = getEmailSender();
  const attachment = await getImageAttachment(draft);
  const htmlContent = generateApprovalEmailHtml(draft, approvalUrl, editUrl, rejectUrl, !!attachment);

  const fromEmail = process.env.SENDER_EMAIL || settings.email?.senderEmail || 'Hello@avadhbajaj.com';
  const subject = `🇨🇭 [Validation Requise] Post Instagram & Pinterest - ${draft.media?.title || 'NutriFitness'}`;

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
      addLog('success', `Email Resend envoyé avec boutons Approuver, Modifier et Rejeter à ${recipientEmail}`);
      
      await updateDraft(draftId, {
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
    rejectUrl,
    subject,
    html: htmlContent
  };
}

export async function processClientEmailReply(draftId, replyBody = '') {
  const drafts = await getDrafts();
  const draft = drafts.find(d => d.id === draftId);

  if (!draft) {
    return { success: false, message: 'Brouillon introuvable' };
  }

  const cleanedBody = replyBody.trim();
  const lower = cleanedBody.toLowerCase();

  // Disapproval keywords
  const rejectKeywords = ['non', 'no', 'refuse', 'refusé', 'rejet', 'rejeté', 'reject', 'disapprove', 'annule', 'annulé', 'stop'];
  const isDirectReject = rejectKeywords.some(k => lower === k || lower.startsWith(k + ' ') || lower.startsWith(k + '!') || lower.startsWith(k + '.'));

  if (isDirectReject) {
    const updated = await updateDraft(draftId, {
      status: 'REJECTED',
      rejectedAt: new Date().toISOString(),
      rejectedVia: 'EMAIL_REPLY_REJECTION',
      clientFeedback: `Rejeté par email : "${cleanedBody}"`
    });

    addLog('warning', `Post (${draftId}) REJETÉ par réponse email ("${cleanedBody}"). Statut: REJECTED ❌`);
    return {
      success: true,
      action: 'REJECTED',
      draft: updated,
      message: 'Post rejeté avec succès par email.'
    };
  }

  // Approval keywords
  const approvalKeywords = ['oui', 'ok', 'yes', 'validé', 'valide', 'approuve', 'approuvé', 'approved', 'go', 'top', 'parfait', 'nickel'];
  const isDirectApproval = approvalKeywords.some(k => lower === k || lower.startsWith(k + ' ') || lower.startsWith(k + '!') || lower.startsWith(k + '.'));

  if (isDirectApproval) {
    const updated = await updateDraft(draftId, {
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedVia: 'EMAIL_REPLY',
      clientFeedback: `Approuvé par email : "${cleanedBody}"`
    });

    addLog('success', `Post (${draftId}) validé par email ! Status: APPROVED ✅`);
    return {
      success: true,
      action: 'APPROVED_DIRECT',
      draft: updated,
      message: 'Post approuvé avec succès.'
    };
  } else {
    const sanitized = sanitizeInstagramCaption(cleanedBody);
    const updated = await updateDraft(draftId, {
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
