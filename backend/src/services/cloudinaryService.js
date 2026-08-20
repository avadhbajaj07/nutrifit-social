import { v2 as cloudinary } from 'cloudinary';
import { getSettings, addLog } from './storageService.js';
import { getLocalClientMedia } from './localMediaService.js';

let dynamicDeletedIds = new Set();

function configureCloudinary() {
  const settings = getSettings();
  const { cloudName, apiKey, apiSecret } = settings.cloudinary || {};

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
    return true;
  }
  return false;
}

export async function checkCloudinaryConnection() {
  const isConfigured = configureCloudinary();
  if (!isConfigured) {
    const localMedia = getLocalClientMedia();
    return {
      connected: false,
      message: `Cloudinary non configuré. Mode local actif avec les ${localMedia.length} visuels du dossier nutrifitness.ch.`
    };
  }

  try {
    const result = await cloudinary.api.ping();
    return {
      connected: result.status === 'ok',
      message: result.status === 'ok' ? 'Connexion Cloudinary réussie !' : 'Erreur de réponse Cloudinary'
    };
  } catch (error) {
    return {
      connected: false,
      message: `Échec de connexion Cloudinary : ${error.message}`
    };
  }
}

export async function listMediaFromFolder(customFolder = null) {
  const settings = getSettings();
  const folder = customFolder || settings.cloudinary.folder || 'nutrifitness/posts';
  const isConfigured = configureCloudinary();

  if (!isConfigured) {
    const localMedia = getLocalClientMedia().filter(m => !dynamicDeletedIds.has(m.public_id));
    return {
      isMock: false,
      isLocal: true,
      folder: 'nutriftness.ch (Local)',
      count: localMedia.length,
      resources: localMedia
    };
  }

  try {
    const result = await cloudinary.search
      .expression(`folder:"${folder}"`)
      .sort_by('created_at', 'desc')
      .max_results(100)
      .execute();

    const formattedResources = (result.resources || []).map(r => {
      const width = r.width || 1080;
      const height = r.height || 1080;
      let ratio = '1:1';
      if (Math.abs(width / height - 4 / 5) < 0.05) ratio = '4:5 (Portrait Idéal)';
      else if (Math.abs(width / height - 9 / 16) < 0.05) ratio = '9:16 (Reel/Story)';
      else if (Math.abs(width / height - 16 / 9) < 0.05) ratio = '16:9';

      return {
        public_id: r.public_id,
        secure_url: r.secure_url,
        format: r.format,
        resource_type: r.resource_type,
        width,
        height,
        aspect_ratio: ratio,
        bytes: r.bytes,
        created_at: r.created_at,
        filename: r.filename,
        isMock: false
      };
    });

    addLog('info', `Cloudinary: ${formattedResources.length} médias trouvés dans "${folder}"`);

    return {
      isMock: false,
      isLocal: false,
      folder,
      count: formattedResources.length,
      resources: formattedResources
    };
  } catch (error) {
    addLog('warn', `Cloudinary recherche échouée dans "${folder}", basculement sur visuels locaux nutrifitness.ch: ${error.message}`);
    const localMedia = getLocalClientMedia().filter(m => !dynamicDeletedIds.has(m.public_id));
    return {
      isMock: false,
      isLocal: true,
      folder: 'nutriftness.ch (Local)',
      count: localMedia.length,
      resources: localMedia,
      error: error.message
    };
  }
}

/**
 * Delete media from Cloudinary or local queue once posted
 */
export async function deleteMedia(publicId, resourceType = 'image') {
  const isConfigured = configureCloudinary();

  if (!isConfigured || publicId.startsWith('local/')) {
    dynamicDeletedIds.add(publicId);
    const remaining = getLocalClientMedia().filter(m => !dynamicDeletedIds.has(m.public_id)).length;
    addLog('success', `[Auto-Purge] Média posté avec succès et supprimé de la file active : ${publicId} (Restants : ${remaining})`);
    return {
      success: true,
      publicId,
      message: 'Média supprimé de la file de publication'
    };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true
    });

    if (result.result === 'ok' || result.result === 'not found') {
      addLog('success', `Cloudinary: Média supprimé définitivement (${publicId})`);
      return {
        success: true,
        publicId,
        cloudinaryResult: result
      };
    } else {
      addLog('warn', `Cloudinary: Résultat suppression inattendu (${publicId}): ${JSON.stringify(result)}`);
      return {
        success: false,
        publicId,
        cloudinaryResult: result
      };
    }
  } catch (error) {
    addLog('error', `Erreur lors de la suppression Cloudinary (${publicId}): ${error.message}`);
    return {
      success: false,
      publicId,
      error: error.message
    };
  }
}

export function resetMockMedia() {
  dynamicDeletedIds.clear();
  return getLocalClientMedia();
}
