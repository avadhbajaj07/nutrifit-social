import cron from 'node-cron';
import { getSettings, addPostHistory, addLog } from './storageService.js';
import { listMediaFromFolder, deleteMedia } from './cloudinaryService.js';
import { generateViralPostContent } from './aiCaptionService.js';
import { publishToPlatforms } from './blotatoService.js';

let activeCronJobs = [];
let isExecuting = false;

/**
 * Executes a single scheduled or manual post workflow:
 * 1. Fetch available media from Cloudinary folder
 * 2. Select next asset
 * 3. Generate French Swiss viral caption & Pinterest SEO data
 * 4. Publish via Blotato API (Instagram & Pinterest)
 * 5. If successful, permanently DELETE the media from Cloudinary
 * 6. Record to post history and logs
 */
export async function executePostWorkflow(slotTheme = 'motivation', options = {}) {
  if (isExecuting) {
    addLog('warn', 'Une tâche de publication est déjà en cours d\'exécution.');
    return { success: false, message: 'Publication déjà en cours' };
  }

  isExecuting = true;
  const startTime = Date.now();
  const settings = getSettings();

  try {
    addLog('info', `Démarrage du cycle de publication automatique [Thème : ${slotTheme.toUpperCase()}]`);

    // 1. Fetch media from Cloudinary folder
    const mediaResult = await listMediaFromFolder(settings.cloudinary.folder);
    const mediaList = mediaResult.resources || [];

    if (mediaList.length === 0) {
      const errMsg = `Aucun média disponible dans le dossier Cloudinary "${settings.cloudinary.folder}". Veuillez ajouter des images/vidéos.`;
      addLog('warn', errMsg);
      isExecuting = false;
      return { success: false, message: errMsg };
    }

    // Pick media (either user selected or next in queue)
    const selectedMedia = options.selectedMediaId
      ? mediaList.find(m => m.public_id === options.selectedMediaId) || mediaList[0]
      : mediaList[0];

    addLog('info', `Média sélectionné : ${selectedMedia.public_id} (${selectedMedia.aspect_ratio || '1:1'})`);

    // 2. Generate Swiss French Viral Captions (Zero-link compliant)
    const content = options.customCaption
      ? {
          instagramCaption: options.customCaption.instagramCaption,
          pinterestTitle: options.customCaption.pinterestTitle || 'NutriFitness Suisse 🇨🇭',
          pinterestDescription: options.customCaption.pinterestDescription || options.customCaption.instagramCaption,
          theme: slotTheme
        }
      : await generateViralPostContent({
          theme: slotTheme,
          mediaTitle: selectedMedia.title || selectedMedia.filename,
          customPrompt: options.customPrompt || ''
        });

    addLog('info', `Légende virale FR générée (Conformité Instagram : 100% sans lien brut)`);

    // 3. Publish via Blotato API
    const publishResult = await publishToPlatforms({
      mediaUrl: selectedMedia.secure_url,
      captionInstagram: content.instagramCaption,
      captionPinterest: content.pinterestDescription,
      pinterestTitle: content.pinterestTitle,
      platforms: {
        instagram: settings.scheduling.postToInstagram !== false,
        pinterest: settings.scheduling.postToPinterest !== false
      },
      resourceType: selectedMedia.resource_type || 'image'
    });

    const isPublishedOk =
      (publishResult.instagram?.success || !settings.scheduling.postToInstagram) &&
      (publishResult.pinterest?.success || !settings.scheduling.postToPinterest);

    // 4. Auto Delete from Cloudinary if successfully published
    let deleteResult = null;
    if (isPublishedOk && settings.scheduling.autoDeleteMediaOnSuccess !== false) {
      addLog('info', `Suppression automatique du média Cloudinary après publication (${selectedMedia.public_id})...`);
      deleteResult = await deleteMedia(selectedMedia.public_id, selectedMedia.resource_type || 'image');
    }

    // 5. Record to history
    const historyEntry = addPostHistory({
      media: {
        publicId: selectedMedia.public_id,
        url: selectedMedia.secure_url,
        format: selectedMedia.format,
        resourceType: selectedMedia.resource_type || 'image',
        aspectRatio: selectedMedia.aspect_ratio
      },
      captions: content,
      platforms: {
        instagram: publishResult.instagram,
        pinterest: publishResult.pinterest
      },
      autoDeleted: deleteResult?.success || false,
      slotTheme,
      status: isPublishedOk ? 'COMPLETED' : 'PARTIAL_FAILED',
      durationMs: Date.now() - startTime
    });

    addLog('success', `Cycle terminé avec succès en ${(Date.now() - startTime) / 1000}s !`);

    isExecuting = false;
    return {
      success: isPublishedOk,
      historyEntry,
      deleteResult,
      publishResult
    };
  } catch (error) {
    isExecuting = false;
    addLog('error', `Erreur critique dans le cycle de publication : ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Initializes and re-schedules the 3 daily cron jobs
 */
export function initScheduler() {
  // Stop existing cron jobs
  activeCronJobs.forEach(job => job.stop());
  activeCronJobs = [];

  const settings = getSettings();
  if (!settings.scheduling.enabled) {
    addLog('info', 'Planificateur automatique désactivé dans les réglages.');
    return;
  }

  const slots = settings.scheduling.slots || [
    { id: 'slot-morning', time: '08:30', cron: '30 8 * * *', theme: 'motivation' },
    { id: 'slot-lunch', time: '12:30', cron: '30 12 * * *', theme: 'nutrition' },
    { id: 'slot-evening', time: '18:30', cron: '30 18 * * *', theme: 'workout' }
  ];

  slots.forEach(slot => {
    try {
      const task = cron.schedule(slot.cron, async () => {
        addLog('info', `⏰ Déclencheur automatique : Créneau ${slot.label || slot.time} [${slot.theme}]`);
        await executePostWorkflow(slot.theme);
      }, {
        scheduled: true,
        timezone: settings.scheduling.timezone || 'Europe/Zurich'
      });

      activeCronJobs.push(task);
      addLog('info', `Tâche planifiée enregistrée : ${slot.time} (${slot.theme}) - Fuseau : ${settings.scheduling.timezone}`);
    } catch (err) {
      addLog('error', `Erreur configuration cron pour le créneau ${slot.time}: ${err.message}`);
    }
  });

  addLog('success', `Planificateur actif avec ${activeCronJobs.length} créneaux quotidiens (3 posts/jour pour la Suisse).`);
}

/**
 * Calculate upcoming scheduled post times
 */
export function getScheduleStatus() {
  const settings = getSettings();
  const slots = settings.scheduling.slots || [];

  const now = new Date();
  const upcoming = slots.map(s => {
    const [hours, minutes] = s.time.split(':').map(Number);
    const scheduledDate = new Date(now);
    scheduledDate.setHours(hours, minutes, 0, 0);

    if (scheduledDate < now) {
      // scheduled for next day
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    const diffMinutes = Math.round((scheduledDate - now) / 60000);

    return {
      ...s,
      nextRun: scheduledDate.toISOString(),
      countdownMinutes: diffMinutes,
      isNext: false
    };
  }).sort((a, b) => new Date(a.nextRun) - new Date(b.nextRun));

  if (upcoming.length > 0) {
    upcoming[0].isNext = true;
  }

  return {
    enabled: settings.scheduling.enabled,
    timezone: settings.scheduling.timezone,
    autoDeleteMediaOnSuccess: settings.scheduling.autoDeleteMediaOnSuccess,
    slots: upcoming,
    isExecuting
  };
}
