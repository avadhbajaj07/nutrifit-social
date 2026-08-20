import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In serverless / Vercel environments, write to os.tmpdir()
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const DATA_DIR = isServerless ? path.join(os.tmpdir(), 'nutrifitness-data') : path.join(__dirname, '../../data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

const DEFAULT_DATA = {
  settings: {
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '714623535956272',
      apiSecret: process.env.CLOUDINARY_API_SECRET || 'LwxYhU0APxRkMeS-nVfG6FvOMf0',
      folder: process.env.CLOUDINARY_FOLDER || 'nutrifitness'
    },
    blotato: {
      apiKey: process.env.BLOTATO_API_KEY || 'blt_xf24o9kuR/K6NKt6wDQ+c1Snut78GOX41jiqMJO5P7U=',
      accountId: process.env.BLOTATO_ACCOUNT_ID || '63353',
      instagramSubaccountId: process.env.BLOTATO_IG_SUBACCOUNT_ID || '63353',
      pinterestSubaccountId: process.env.BLOTATO_PIN_SUBACCOUNT_ID || '8915',
      pinterestBoardId: process.env.BLOTATO_PIN_BOARD_ID || ''
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || ''
    },
    scheduling: {
      enabled: true,
      requireClientApproval: true,
      timezone: 'Europe/Zurich',
      slots: [
        { id: 'slot-morning', label: 'Matin (Motivation & Réveil)', time: '08:30', cron: '30 8 * * *', theme: 'motivation' },
        { id: 'slot-lunch', label: 'Midi (Nutrition & Recette Saine)', time: '12:30', cron: '30 12 * * *', theme: 'nutrition' },
        { id: 'slot-evening', label: 'Soir (Workout & Engagement)', time: '18:30', cron: '30 18 * * *', theme: 'workout' }
      ],
      autoDeleteMediaOnSuccess: true,
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

// In-memory cache for fast serverless responses
let memoryStore = null;

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Cannot create DATA_DIR, using in-memory store:', e.message);
}

export function loadStore() {
  if (memoryStore) return memoryStore;

  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      memoryStore = {
        settings: {
          ...DEFAULT_DATA.settings,
          ...parsed.settings,
          cloudinary: { ...DEFAULT_DATA.settings.cloudinary, ...(parsed.settings?.cloudinary || {}) },
          blotato: { ...DEFAULT_DATA.settings.blotato, ...(parsed.settings?.blotato || {}) },
          scheduling: { ...DEFAULT_DATA.settings.scheduling, ...(parsed.settings?.scheduling || {}) },
          audience: { ...DEFAULT_DATA.settings.audience, ...(parsed.settings?.audience || {}) }
        },
        drafts: parsed.drafts || [],
        postsHistory: parsed.postsHistory || [],
        logs: parsed.logs || []
      };
      return memoryStore;
    }
  } catch (error) {
    console.warn('[Storage] Fallback to default in-memory store:', error.message);
  }

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
    return true;
  } catch (error) {
    console.warn('[Storage] Write to disk skipped, retained in memory:', error.message);
    return true;
  }
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
    cloudinary: { ...store.settings.cloudinary, ...(newSettings.cloudinary || {}) },
    blotato: { ...store.settings.blotato, ...(newSettings.blotato || {}) },
    scheduling: { ...store.settings.scheduling, ...(newSettings.scheduling || {}) },
    audience: { ...store.settings.audience, ...(newSettings.audience || {}) }
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
    status: 'PENDING_APPROVAL',
    theme: draftData.theme || 'motivation',
    slotTime: draftData.slotTime || '08:30',
    media: draftData.media,
    captions: {
      instagramCaption: draftData.captions?.instagramCaption || '',
      pinterestTitle: draftData.captions?.pinterestTitle || 'NutriFitness.ch 🇨🇭',
      pinterestDescription: draftData.captions?.pinterestDescription || ''
    },
    clientFeedback: '',
    approvedAt: null,
    publishedAt: null
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
