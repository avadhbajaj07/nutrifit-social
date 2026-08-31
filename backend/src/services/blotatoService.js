import axios from 'axios';
import { getSettings, addLog } from './storageService.js';

const BLOTATO_BASE_URL = 'https://backend.blotato.com/v2';
const REQUEST_TIMEOUT = 25000;

const getApiKey = customApiKey => customApiKey || getSettings().blotato.apiKey;
const headersFor = apiKey => ({
  'blotato-api-key': apiKey,
  'Content-Type': 'application/json'
});
const apiError = error => {
  const detail = error.response?.data?.message || error.response?.data?.error || error.message;
  const wrapped = new Error(detail);
  wrapped.status = error.response?.status || 500;
  return wrapped;
};
const normalizeItems = data => data?.items || data?.accounts || (Array.isArray(data) ? data : []);

const mockAccounts = [
  {
    id: 'acc_insta_demo_01',
    fullname: 'NutriFitness Romandie',
    name: 'NutriFitness Romandie',
    platform: 'instagram',
    username: 'nutrifitness.ch'
  },
  {
    id: 'acc_pin_demo_02',
    fullname: 'NutriFitness Suisse',
    name: 'NutriFitness Suisse',
    platform: 'pinterest',
    username: 'nutrifitness_ch'
  }
];

export async function getBlotatoUser(customApiKey = null) {
  const apiKey = getApiKey(customApiKey);
  if (!apiKey) return { connected: false, isMock: true, user: null };

  try {
    const response = await axios.get(`${BLOTATO_BASE_URL}/users/me`, {
      headers: headersFor(apiKey), timeout: 10000
    });
    return { connected: true, isMock: false, user: response.data };
  } catch (error) {
    throw apiError(error);
  }
}

export async function testBlotatoConnection(customApiKey = null) {
  const apiKey = getApiKey(customApiKey);
  if (!apiKey) {
    return {
      connected: false,
      isMock: true,
      message: 'Blotato API key is not configured. Preview accounts are shown locally.',
      accounts: mockAccounts
    };
  }

  try {
    const response = await axios.get(`${BLOTATO_BASE_URL}/users/me/accounts`, {
      headers: headersFor(apiKey), timeout: 10000
    });
    return {
      connected: true,
      isMock: false,
      message: 'Blotato connection is active.',
      accounts: normalizeItems(response.data)
    };
  } catch (error) {
    const detail = apiError(error).message;
    return { connected: false, isMock: false, message: `Blotato connection failed: ${detail}`, accounts: [] };
  }
}

export async function getBlotatoAccounts(customApiKey = null, platform = '') {
  const apiKey = getApiKey(customApiKey);
  if (!apiKey) {
    const accounts = platform ? mockAccounts.filter(account => account.platform === platform) : mockAccounts;
    return { isMock: true, accounts };
  }

  try {
    const response = await axios.get(`${BLOTATO_BASE_URL}/users/me/accounts`, {
      params: platform ? { platform } : undefined,
      headers: headersFor(apiKey), timeout: 10000
    });
    return { isMock: false, accounts: normalizeItems(response.data) };
  } catch (error) {
    addLog('error', `Could not load Blotato accounts: ${error.message}`);
    throw apiError(error);
  }
}

export async function getBlotatoSubaccounts(accountId, customApiKey = null) {
  const apiKey = getApiKey(customApiKey);
  if (!apiKey) return { isMock: true, subaccounts: [] };

  try {
    const response = await axios.get(`${BLOTATO_BASE_URL}/users/me/accounts/${encodeURIComponent(accountId)}/subaccounts`, {
      headers: headersFor(apiKey), timeout: 10000
    });
    return { isMock: false, subaccounts: normalizeItems(response.data) };
  } catch (error) {
    throw apiError(error);
  }
}

export async function uploadBlotatoMedia(url, customApiKey = null) {
  const apiKey = getApiKey(customApiKey);
  if (!url) throw new Error('A public media URL is required.');
  if (!apiKey) return { isMock: true, url };

  try {
    const response = await axios.post(`${BLOTATO_BASE_URL}/media`, { url }, {
      headers: headersFor(apiKey), timeout: 60000
    });
    return { isMock: false, ...response.data };
  } catch (error) {
    throw apiError(error);
  }
}

export async function createBlotatoPost({
  accountId,
  platform,
  text = '',
  mediaUrls = [],
  target = {},
  scheduledTime = null,
  useNextFreeSlot = false,
  additionalPosts = []
}, customApiKey = null) {
  const apiKey = getApiKey(customApiKey);
  if (!accountId) throw new Error('Select a connected Blotato account.');
  if (!platform) throw new Error('A target platform is required.');

  const payload = {
    post: {
      accountId,
      content: {
        text,
        mediaUrls: mediaUrls.filter(Boolean),
        platform,
        ...(additionalPosts.length ? { additionalPosts } : {})
      },
      target: { ...target, targetType: platform }
    },
    ...(scheduledTime ? { scheduledTime } : {}),
    ...(!scheduledTime && useNextFreeSlot ? { useNextFreeSlot: true } : {})
  };

  if (!apiKey) {
    return {
      isMock: true,
      postSubmissionId: `demo_${platform}_${Date.now().toString(36)}`,
      status: scheduledTime || useNextFreeSlot ? 'scheduled' : 'in-progress',
      payload
    };
  }

  try {
    const response = await axios.post(`${BLOTATO_BASE_URL}/posts`, payload, {
      headers: headersFor(apiKey), timeout: REQUEST_TIMEOUT
    });
    const postSubmissionId = response.data?.postSubmissionId || response.data?.id;
    addLog('success', `${platform} post sent to Blotato (${postSubmissionId || 'queued'}).`);
    return { isMock: false, ...response.data, postSubmissionId, payload };
  } catch (error) {
    addLog('error', `Blotato ${platform} publish failed: ${apiError(error).message}`);
    throw apiError(error);
  }
}

export async function getBlotatoPostStatus(postSubmissionId, customApiKey = null) {
  const apiKey = getApiKey(customApiKey);
  if (!postSubmissionId) throw new Error('A Blotato post submission ID is required.');
  if (!apiKey || postSubmissionId.startsWith('demo_')) {
    return { isMock: true, postSubmissionId, status: 'published', publicUrl: '' };
  }

  try {
    const response = await axios.get(`${BLOTATO_BASE_URL}/posts/${encodeURIComponent(postSubmissionId)}`, {
      headers: headersFor(apiKey), timeout: 10000
    });
    return { isMock: false, ...response.data };
  } catch (error) {
    throw apiError(error);
  }
}

/** Backward-compatible Instagram + Pinterest publisher used by the scheduler. */
export async function publishToPlatforms({
  mediaUrl,
  captionInstagram,
  captionPinterest,
  pinterestTitle = 'NutriFitness Suisse - Conseils & Motivation',
  platforms = { instagram: true, pinterest: true },
  resourceType = 'image',
  scheduledTime = null,
  useNextFreeSlot = false
}) {
  const settings = getSettings();
  const results = { instagram: null, pinterest: null, errors: [], isMock: !settings.blotato.apiKey };

  if (platforms.instagram) {
    try {
      results.instagram = {
        success: true,
        platform: 'instagram',
        ...(await createBlotatoPost({
          accountId: settings.blotato.instagramSubaccountId || settings.blotato.accountId || mockAccounts[0].id,
          platform: 'instagram',
          text: captionInstagram,
          mediaUrls: [mediaUrl],
          scheduledTime,
          useNextFreeSlot
        }))
      };
    } catch (error) {
      results.errors.push(`Instagram: ${error.message}`);
      results.instagram = { success: false, platform: 'instagram', error: error.message };
    }
  }

  if (platforms.pinterest) {
    try {
      results.pinterest = {
        success: true,
        platform: 'pinterest',
        ...(await createBlotatoPost({
          accountId: settings.blotato.pinterestSubaccountId || settings.blotato.accountId || mockAccounts[1].id,
          platform: 'pinterest',
          text: captionPinterest || captionInstagram,
          mediaUrls: [mediaUrl],
          target: { boardId: settings.blotato.pinterestBoardId, title: pinterestTitle },
          scheduledTime,
          useNextFreeSlot
        }))
      };
    } catch (error) {
      results.errors.push(`Pinterest: ${error.message}`);
      results.pinterest = { success: false, platform: 'pinterest', error: error.message };
    }
  }

  return results;
}

