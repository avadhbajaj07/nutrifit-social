import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const DATA_DIR = isServerless ? path.join(os.tmpdir(), 'nutrifitness-data') : path.join(__dirname, '../../data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

const DEFAULT_DATA = {
  settings: {
    safetyLock: {
      sendToMarcoAllowed: false,
      supervisorEmail: 'avadhbajaj07@gmail.com',
      clientEmail: 'marco.scarpantoni@hotmail.com'
    },
    email: {
      senderEmail: 'Hello@avadhbajaj.com',
      clientEmail: 'avadhbajaj07@gmail.com',
      resendApiKey: process.env.RESEND_API_KEY || ''
    },
    clientPortal: { shareToken: process.env.CLIENT_PORTAL_TOKEN || randomUUID() },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '',
      apiSecret: process.env.CLOUDINARY_API_SECRET || '',
      folder: process.env.CLOUDINARY_FOLDER || 'nutrifitness'
    },
    blotato: {
      apiKey: process.env.BLOTATO_API_KEY || '',
      accountId: process.env.BLOTATO_ACCOUNT_ID || '',
      instagramSubaccountId: process.env.BLOTATO_IG_SUBACCOUNT_ID || '',
      pinterestSubaccountId: process.env.BLOTATO_PIN_SUBACCOUNT_ID || '',
      pinterestBoardId: process.env.BLOTATO_PIN_BOARD_ID || ''
    },
    scheduling: {
      enabled: false,
      requireClientApproval: true,
      timezone: process.env.APP_TIMEZONE || 'Europe/Zurich',
      slots: [
        { id: 'slot-morning', label: 'Matin (Motivation & Réveil)', time: '08:30', cron: '30 8 * * *', theme: 'motivation' },
        { id: 'slot-lunch', label: 'Midi (Nutrition & Recette Saine)', time: '12:30', cron: '30 12 * * *', theme: 'nutrition' },
        { id: 'slot-evening', label: 'Soir (Workout & Engagement)', time: '18:30', cron: '30 18 * * *', theme: 'workout' }
      ],
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
let supabaseClient = null;

try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (error) {}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return supabaseClient;
}

function normalizeDraft(draft) {
  if (!draft) return draft;
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
}

function loadLocalStore() {
  if (memoryStore) return memoryStore;
  try {
    if (fs.existsSync(STORE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
      memoryStore = {
        settings: {
          ...DEFAULT_DATA.settings,
          ...parsed.settings,
          safetyLock: { ...DEFAULT_DATA.settings.safetyLock, ...(parsed.settings?.safetyLock || {}) },
          email: { ...DEFAULT_DATA.settings.email, ...(parsed.settings?.email || {}) },
          clientPortal: { ...DEFAULT_DATA.settings.clientPortal, ...(parsed.settings?.clientPortal || {}) },
          cloudinary: { ...DEFAULT_DATA.settings.cloudinary, ...(parsed.settings?.cloudinary || {}) },
          blotato: { ...DEFAULT_DATA.settings.blotato, ...(parsed.settings?.blotato || {}) },
          scheduling: {
            ...DEFAULT_DATA.settings.scheduling,
            ...(parsed.settings?.scheduling || {}),
            enabled: false,
            autoDeleteMediaOnSuccess: false
          }
        },
        drafts: (parsed.drafts || []).map(normalizeDraft),
        postsHistory: parsed.postsHistory || [],
        logs: parsed.logs || []
      };
      return memoryStore;
    }
  } catch (error) {}
  memoryStore = structuredClone(DEFAULT_DATA);
  return memoryStore;
}

function saveLocalStore(data) {
  memoryStore = data;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {}
}

export function getSettings() {
  return loadLocalStore().settings;
}

export function updateSettings(newSettings) {
  const store = loadLocalStore();
  store.settings = {
    ...store.settings,
    ...newSettings,
    safetyLock: { ...store.settings.safetyLock, ...(newSettings.safetyLock || {}) },
    email: { ...store.settings.email, ...(newSettings.email || {}) },
    clientPortal: { ...store.settings.clientPortal, ...(newSettings.clientPortal || {}) },
    cloudinary: { ...store.settings.cloudinary, ...(newSettings.cloudinary || {}) },
    blotato: { ...store.settings.blotato, ...(newSettings.blotato || {}) },
    scheduling: {
      ...store.settings.scheduling,
      ...(newSettings.scheduling || {}),
      enabled: false,
      autoDeleteMediaOnSuccess: false
    }
  };
  saveLocalStore(store);
  return store.settings;
}

export async function getDrafts() {
  const supabase = getSupabase();
  if (!supabase) return loadLocalStore().drafts || [];
  const { data, error } = await supabase
    .from('nutrifitness_drafts')
    .select('data')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => normalizeDraft(row.data));
}

export async function getDraftById(id) {
  const supabase = getSupabase();
  if (!supabase) return (loadLocalStore().drafts || []).find(draft => draft.id === id) || null;
  const { data, error } = await supabase
    .from('nutrifitness_drafts')
    .select('data')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return normalizeDraft(data?.data || null);
}

export async function createDraft(draftData) {
  const createdAt = draftData.createdAt || new Date().toISOString();
  const newDraft = normalizeDraft({
    id: draftData.id || 'draft_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    createdAt,
    status: draftData.status || 'PENDING_REVIEW',
    theme: draftData.theme || 'motivation',
    slotTime: draftData.slotTime || '08:30',
    media: draftData.media,
    captions: {
      instagramCaption: draftData.captions?.instagramCaption || '',
      pinterestTitle: draftData.captions?.pinterestTitle || 'NutriFitness.ch 🇨🇭',
      pinterestDescription: draftData.captions?.pinterestDescription || ''
    },
    clientFeedback: draftData.clientFeedback || '',
    productRequest: draftData.productRequest || '',
    approvedAt: draftData.approvedAt || null,
    publishedAt: draftData.publishedAt || null,
    scheduledFor: draftData.scheduledFor || null,
    revision: draftData.revision || 1,
    revisionHistory: draftData.revisionHistory?.length ? draftData.revisionHistory : [{
      revision: 1,
      event: 'SUBMITTED',
      at: createdAt,
      caption: draftData.captions?.instagramCaption || '',
      media: draftData.media,
      note: 'Post submitted for client review.'
    }]
  });

  const supabase = getSupabase();
  if (!supabase) {
    const store = loadLocalStore();
    store.drafts.unshift(newDraft);
    saveLocalStore(store);
    return newDraft;
  }

  const mediaPublicId = newDraft.media?.public_id || `draft:${newDraft.id}`;
  const { error } = await supabase.from('nutrifitness_drafts').insert({
    id: newDraft.id,
    status: newDraft.status,
    media_public_id: mediaPublicId,
    data: newDraft,
    created_at: newDraft.createdAt,
    updated_at: newDraft.updatedAt || newDraft.createdAt
  });
  if (error) throw error;
  return newDraft;
}

export async function updateDraft(id, updates) {
  const current = await getDraftById(id);
  if (!current) return null;
  const updated = normalizeDraft({ ...current, ...updates, updatedAt: new Date().toISOString() });
  const supabase = getSupabase();
  if (!supabase) {
    const store = loadLocalStore();
    const index = store.drafts.findIndex(draft => draft.id === id);
    store.drafts[index] = updated;
    saveLocalStore(store);
    return updated;
  }
  const { error } = await supabase
    .from('nutrifitness_drafts')
    .update({ status: updated.status, data: updated, updated_at: updated.updatedAt })
    .eq('id', id);
  if (error) throw error;
  return updated;
}

export async function deleteDraft(id) {
  const supabase = getSupabase();
  if (!supabase) {
    const store = loadLocalStore();
    store.drafts = store.drafts.filter(draft => draft.id !== id);
    saveLocalStore(store);
    return true;
  }
  const { error } = await supabase.from('nutrifitness_drafts').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function addPostHistory(entry) {
  const historyEntry = {
    id: entry.id || Date.now().toString() + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    ...entry
  };
  const supabase = getSupabase();
  if (!supabase) {
    const store = loadLocalStore();
    store.postsHistory.unshift(historyEntry);
    store.postsHistory = store.postsHistory.slice(0, 200);
    saveLocalStore(store);
    return historyEntry;
  }
  const { error } = await supabase.from('nutrifitness_post_history').insert({
    id: historyEntry.id,
    data: historyEntry,
    created_at: historyEntry.timestamp
  });
  if (error) throw error;
  return historyEntry;
}

export async function getPostHistory() {
  const supabase = getSupabase();
  if (!supabase) return loadLocalStore().postsHistory || [];
  const { data, error } = await supabase
    .from('nutrifitness_post_history')
    .select('data')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data || []).map(row => row.data);
}

export async function addLog(level, message, metadata = {}) {
  const logEntry = {
    id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    level,
    message,
    metadata
  };
  console.log(`[${level.toUpperCase()}] ${message}`);
  const supabase = getSupabase();
  if (!supabase) {
    const store = loadLocalStore();
    store.logs.unshift(logEntry);
    store.logs = store.logs.slice(0, 300);
    saveLocalStore(store);
    return logEntry;
  }
  const { error } = await supabase.from('nutrifitness_logs').insert({
    id: logEntry.id,
    level,
    message,
    data: logEntry,
    created_at: logEntry.timestamp
  });
  if (error) console.warn(`Could not persist log: ${error.message}`);
  return logEntry;
}

export async function getLogs(limit = 100) {
  const supabase = getSupabase();
  if (!supabase) return (loadLocalStore().logs || []).slice(0, limit);
  const { data, error } = await supabase
    .from('nutrifitness_logs')
    .select('data')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(row => row.data);
}

/**
 * Returns the oldest APPROVED draft that hasn't been posted yet.
 * Used by the auto-publish cron to pick what to post next.
 */
export async function getNextApprovedDraft() {
  const drafts = await getDrafts();
  const approved = drafts
    .filter(d => d.status === 'APPROVED')
    .sort((a, b) => new Date(a.approvedAt || a.createdAt) - new Date(b.approvedAt || b.createdAt));
  return approved[0] || null;
}

/**
 * Resets all non-posted drafts (APPROVED, SCHEDULED, REJECTED, PRODUCT_CHANGE_REQUESTED)
 * back to PENDING_REVIEW so the client can review everything fresh.
 * Returns the number of drafts reset.
 */
export async function bulkResetApprovedToPending(note = 'Resubmitted for client review — please read each caption carefully.') {
  const drafts = await getDrafts();
  const toReset = drafts.filter(d => ['APPROVED', 'SCHEDULED', 'REJECTED', 'PRODUCT_CHANGE_REQUESTED', 'PUBLISH_FAILED'].includes(d.status));
  let count = 0;
  for (const draft of toReset) {
    const revision = (draft.revision || 1) + 1;
    await updateDraft(draft.id, {
      status: 'PENDING_REVIEW',
      revision,
      approvedAt: null,
      scheduledFor: null,
      productRequest: '',
      clientFeedback: '',
      blotatoPublication: null,
      revisionHistory: [
        ...(draft.revisionHistory || []),
        {
          revision,
          event: 'RESUBMITTED',
          at: new Date().toISOString(),
          note,
          caption: draft.captions?.instagramCaption || '',
          media: draft.media
        }
      ]
    });
    count++;
  }
  return count;
}

/**
 * Deletes all drafts from store / database (e.g. when designs are rejected or media purged)
 */
export async function deleteAllDrafts() {
  const supabase = getSupabase();
  if (!supabase) {
    const store = loadLocalStore();
    const count = (store.drafts || []).length;
    store.drafts = [];
    saveLocalStore(store);
    return count;
  }
  const { data, error } = await supabase.from('nutrifitness_drafts').delete().neq('id', '__keep_none__').select('id');
  if (error) throw error;
  return data?.length || 0;
}

export function isPersistentStorageConfigured() {
  return Boolean(getSupabase());
}

