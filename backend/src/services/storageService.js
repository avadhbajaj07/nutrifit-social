import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const DATA_DIR = isServerless ? path.join(os.tmpdir(), 'nutrifitness-data') : path.join(__dirname, '../../data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

const DEFAULT_DATA = {
  settings: {
    safetyLock: {
      sendToMarcoAllowed: false, // HARD SAFETY LOCK: Marco will NEVER receive an email without explicit approval
      supervisorEmail: 'avadhbajaj07@gmail.com',
      clientEmail: 'marco.scarpantoni@hotmail.com'
    },
    email: {
      senderEmail: 'Hello@avadhbajaj.com',
      clientEmail: 'avadhbajaj07@gmail.com', // Safe default: only send to you during review
      resendApiKey: process.env.RESEND_API_KEY || ''
    },
    clientPortal: {
      // A private review-link token. Set CLIENT_PORTAL_TOKEN to manage it explicitly in production.
      shareToken: process.env.CLIENT_PORTAL_TOKEN || randomUUID()
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '',
      apiSecret: process.env.CLOUDINARY_API_SECRET || '',
      folder: process.env.CLOUDINARY_FOLDER || 'nutrifitness/to-review'
    },
    blotato: {
      apiKey: process.env.BLOTATO_API_KEY || '',
      accountId: process.env.BLOTATO_ACCOUNT_ID || '',
      instagramSubaccountId: process.env.BLOTATO_IG_SUBACCOUNT_ID || '',
      pinterestSubaccountId: process.env.BLOTATO_PIN_SUBACCOUNT_ID || ''
    },
    scheduling: {
      enabled: false, // Disabled until you approve
      requireClientApproval: true,
      timezone: process.env.APP_TIMEZONE || 'Europe/Zurich',
      slots: [
        { id: 'slot-morning', label: 'Matin (Motivation & Réveil)', time: '08:30', cron: '30 8 * * *', theme: 'motivation' },
        { id: 'slot-lunch', label: 'Midi (Nutrition & Recette Saine)', time: '12:30', cron: '30 12 * * *', theme: 'nutrition' },
        { id: 'slot-evening', label: 'Soir (Workout & Engagement)', time: '18:30', cron: '30 18 * * *', theme: 'workout' }
      ],
      // Keep a recoverable audit trail. Posted files can be archived, never silently deleted.
      autoDeleteMediaOnSuccess: false,
      postToInstagram: true,
      postToPinterest: true
    },
    audience: {
      targetRegion: 'Suisse (Romandie / Suisse Romande)',
      language: 'fr',
      cities: ['Genève', 'Lausanne', 'Neuchâtel', 'Fribourg', 'Sion', 'Yverdon'],
      brandName: 'NutriFitness Romandie',
      callToActionType: 'bio_link'
    }
  },
  drafts: [],
  postsHistory: [],
  logs: []
};

let memoryStore = null;

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {}

export function loadStore() {
  if (memoryStore) return memoryStore;

  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      const drafts = (parsed.drafts || []).map(draft => {
        const status = draft.status === 'PENDING_APPROVAL' ? 'PENDING_REVIEW' : draft.status;
        const secureUrl = draft.media?.secure_url
          ?.replace(/^http:\/\/localhost:5001\/local-media/, '/api/local-media')
          ?.replace(/^\/local-media/, '/api/local-media') || draft.media?.secure_url;
        const media = draft.media ? { ...draft.media, secure_url: secureUrl } : draft.media;
        const revision = draft.revision || 1;
        return {
          ...draft,
          status,
          media,
          revision,
          revisionHistory: draft.revisionHistory?.length ? draft.revisionHistory : [{
            revision,
            event: status === 'APPROVED' ? 'APPROVED' : 'SUBMITTED',
            at: draft.approvedAt || draft.createdAt || new Date().toISOString(),
            note: status === 'APPROVED' ? 'Approved in the previous workflow.' : 'Imported from the previous workflow.',
            caption: draft.captions?.instagramCaption || '',
            media
          }],
          productRequest: draft.productRequest || ''
        };
      });
      memoryStore = {
        settings: {
          ...DEFAULT_DATA.settings,
          ...parsed.settings,
          safetyLock: { ...DEFAULT_DATA.settings.safetyLock, ...(parsed.settings?.safetyLock || {}) },
          email: { ...DEFAULT_DATA.settings.email, ...(parsed.settings?.email || {}) },
          clientPortal: { ...DEFAULT_DATA.settings.clientPortal, ...(parsed.settings?.clientPortal || {}) }
        },
        drafts,
        postsHistory: parsed.postsHistory || [],
        logs: parsed.logs || []
      };
      // Persist a token once for installations created before the client portal existed.
      if (!parsed.settings?.clientPortal?.shareToken) saveStore(memoryStore);
      return memoryStore;
    }
  } catch (error) {}

  memoryStore = { ...DEFAULT_DATA };
  return memoryStore;
}

export function saveStore(data) {
  memoryStore = data;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {}
  return true;
}

export function getSettings() {
  const store = loadStore();
  return store.settings;
}

export function updateSettings(newSettings) {
  const store = loadStore();
  store.settings = {
    ...store.settings,
    ...newSettings,
    safetyLock: { ...store.settings.safetyLock, ...(newSettings.safetyLock || {}) },
    email: { ...store.settings.email, ...(newSettings.email || {}) },
    clientPortal: { ...store.settings.clientPortal, ...(newSettings.clientPortal || {}) }
  };
  saveStore(store);
  return store.settings;
}

export function getDrafts() {
  const store = loadStore();
  return store.drafts || [];
}

export function createDraft(draftData) {
  const store = loadStore();
  const newDraft = {
    id: draftData.id || 'draft_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    createdAt: new Date().toISOString(),
    status: 'PENDING_REVIEW',
    theme: draftData.theme || 'motivation',
    slotTime: draftData.slotTime || '08:30',
    media: draftData.media,
    captions: {
      instagramCaption: draftData.captions?.instagramCaption || '',
      pinterestTitle: draftData.captions?.pinterestTitle || 'NutriFitness.ch 🇨🇭',
      pinterestDescription: draftData.captions?.pinterestDescription || ''
    },
    clientFeedback: '',
    productRequest: '',
    approvedAt: null,
    publishedAt: null,
    scheduledFor: draftData.scheduledFor || null,
    revision: 1,
    revisionHistory: [{
      revision: 1,
      event: 'SUBMITTED',
      at: new Date().toISOString(),
      caption: draftData.captions?.instagramCaption || '',
      media: draftData.media,
      note: 'Post submitted for client review.'
    }]
  };
  store.drafts.unshift(newDraft);
  saveStore(store);
  return newDraft;
}

export function updateDraft(id, updates) {
  const store = loadStore();
  const index = store.drafts.findIndex(d => d.id === id);
  if (index === -1) return null;

  store.drafts[index] = {
    ...store.drafts[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  saveStore(store);
  return store.drafts[index];
}

export function deleteDraft(id) {
  const store = loadStore();
  store.drafts = store.drafts.filter(d => d.id !== id);
  saveStore(store);
  return true;
}

export function addPostHistory(entry) {
  const store = loadStore();
  store.postsHistory.unshift({
    id: entry.id || Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...entry
  });
  if (store.postsHistory.length > 200) {
    store.postsHistory = store.postsHistory.slice(0, 200);
  }
  saveStore(store);
  return store.postsHistory[0];
}

export function getPostHistory() {
  const store = loadStore();
  return store.postsHistory;
}

export function addLog(level, message, metadata = {}) {
  const store = loadStore();
  const logEntry = {
    id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    level,
    message,
    metadata
  };
  store.logs.unshift(logEntry);
  if (store.logs.length > 300) {
    store.logs = store.logs.slice(0, 300);
  }
  saveStore(store);
  console.log(`[${level.toUpperCase()}] ${message}`);
  return logEntry;
}

export function getLogs(limit = 100) {
  const store = loadStore();
  return store.logs.slice(0, limit);
}
