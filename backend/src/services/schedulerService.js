import { getSettings, addPostHistory, addLog, getDrafts, getNextApprovedDraft, updateDraft } from './storageService.js';
import { publishToPlatforms } from './blotatoService.js';

let activeCronJobs = [];
let isExecuting = false;

// ─── The two daily CET slots ────────────────────────────────────────────────
const SLOT_TIMES = ['07:00', '17:00']; // Europe/Zurich

// ─── Convert HH:MM in Europe/Zurich to a UTC Date on a given calendar date ──
function cetSlotToUTC(isoDateStr, timeStr) {
  // isoDateStr = "2026-09-01", timeStr = "07:00"
  const [hours, minutes] = timeStr.split(':').map(Number);
  // Build a date-time string that looks like it's in Zurich (we'll let the
  // browser/node resolve it via toLocaleString trick)
  const naiveLocal = new Date(`${isoDateStr}T${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00`);
  // Compute the UTC offset for Europe/Zurich at that moment
  const zurichStr = naiveLocal.toLocaleString('en-US', { timeZone: 'Europe/Zurich' });
  const zurichDate = new Date(zurichStr);
  const offsetMs = naiveLocal - zurichDate; // CET offset in ms
  return new Date(naiveLocal.getTime() + offsetMs);
}

// ─── Get today's date in Zurich as "YYYY-MM-DD" ──────────────────────────────
function todayInZurich() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Zurich' }); // en-CA gives YYYY-MM-DD
}

// ─── Add N days to a YYYY-MM-DD string ──────────────────────────────────────
function addDays(isoDateStr, n) {
  const d = new Date(`${isoDateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toLocaleDateString('en-CA', { timeZone: 'UTC' });
}

/**
 * Returns the next free slot UTC Date that is not yet taken by any
 * APPROVED / SCHEDULED / POSTED draft with a scheduledFor date.
 *
 * Slots: 07:00 and 17:00 Europe/Zurich, 2 per day.
 * Starts from the current Zurich day and scans forward up to 90 days.
 */
export async function getNextFreeSlot() {
  const now = new Date();
  const drafts = await getDrafts();

  // Collect all already-taken scheduledFor timestamps (ISO strings) for active drafts
  const taken = new Set(
    drafts
      .filter(d => ['APPROVED', 'SCHEDULED'].includes(d.status) && d.scheduledFor)
      .map(d => new Date(d.scheduledFor).toISOString())
  );

  let date = todayInZurich();
  for (let day = 0; day < 90; day++) {
    for (const time of SLOT_TIMES) {
      const slotUTC = cetSlotToUTC(date, time);
      // Skip slots in the past (with 2-min buffer)
      if (slotUTC.getTime() <= now.getTime() + 2 * 60 * 1000) continue;
      // Skip slots already taken
      if (taken.has(slotUTC.toISOString())) continue;
      return slotUTC;
    }
    date = addDays(date, 1);
  }
  return null; // no slot found in 90 days (shouldn't happen)
}

/**
 * Assigns the next free CET slot to a newly approved draft AND
 * immediately schedules it in Blotato so Blotato handles the actual delivery.
 * Called automatically when a post is approved.
 */
export async function assignScheduledSlot(draftId) {
  const slot = await getNextFreeSlot();
  if (!slot) {
    addLog('warn', `[Scheduler] Could not find a free slot for draft ${draftId} in the next 90 days.`);
    return null;
  }

  // Save scheduledFor on the draft first
  const { getDraftById } = await import('./storageService.js');
  const draft = await getDraftById(draftId);
  if (!draft) return null;

  await updateDraft(draftId, {
    scheduledFor: slot.toISOString(),
    status: 'SCHEDULED',
    revisionHistory: [
      ...(draft.revisionHistory || []),
      {
        revision: draft.revision || 1,
        event: 'SCHEDULED',
        at: new Date().toISOString(),
        note: `Auto-scheduled for ${slot.toLocaleString('en-GB', { timeZone: 'Europe/Zurich', dateStyle: 'medium', timeStyle: 'short' })} CET via Blotato.`,
        caption: draft.captions?.instagramCaption || '',
        media: draft.media
      }
    ]
  });

  const zurichLabel = slot.toLocaleString('en-GB', {
    timeZone: 'Europe/Zurich', weekday: 'short', month: 'short',
    day: '2-digit', hour: '2-digit', minute: '2-digit'
  });
  addLog('info', `[Scheduler] Draft ${draftId} → Blotato scheduled for ${zurichLabel} CET.`);

  // Push to Blotato as a scheduled post (Blotato handles the actual publish)
  try {
    const { publishToPlatforms } = await import('./blotatoService.js');
    const settings = getSettings();
    const publishResult = await publishToPlatforms({
      mediaUrl: draft.media?.secure_url,
      captionInstagram: draft.captions?.instagramCaption || '',
      captionPinterest: draft.captions?.pinterestDescription || draft.captions?.instagramCaption || '',
      pinterestTitle: draft.captions?.pinterestTitle || 'NutriFitness.ch',
      platforms: {
        instagram: settings.scheduling?.postToInstagram !== false,
        pinterest: settings.scheduling?.postToPinterest !== false
      },
      resourceType: draft.media?.resource_type || 'image',
      scheduledTime: slot.toISOString() // ← Blotato publishes at this exact time
    });

    addLog('success', `[Scheduler] Draft ${draftId} queued in Blotato for ${zurichLabel} CET. IG: ${publishResult.instagram?.success}, PIN: ${publishResult.pinterest?.success}`);

    // Update draft with Blotato publication IDs
    await updateDraft(draftId, {
      blotatoPublication: {
        instagram: publishResult.instagram,
        pinterest: publishResult.pinterest,
        scheduledTime: slot.toISOString(),
        submittedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    addLog('warn', `[Scheduler] Blotato scheduling call failed for ${draftId}: ${err.message}. Will still publish via cron fallback at slot time.`);
  }

  return slot;
}

// ─── Utility: parse "HH:MM" in Europe/Zurich and return next occurrence ──────
function nextCETOccurrence(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const nowZurich = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Zurich' })
  );
  const target = new Date(nowZurich);
  target.setHours(hours, minutes, 0, 0);
  if (target <= nowZurich) target.setDate(target.getDate() + 1);
  const utcNow = Date.now();
  const zurichNow = nowZurich.getTime();
  const offset = utcNow - zurichNow;
  return new Date(target.getTime() + offset);
}

// ─── Core: publish the next approved draft whose time has come ───────────────
export async function publishNextApprovedDraft(slotLabel = 'scheduled') {
  if (isExecuting) {
    addLog('warn', `[AutoPublish] Skipped ${slotLabel} — another publish is already running.`);
    return { success: false, message: 'Already executing' };
  }

  isExecuting = true;
  const startTime = Date.now();
  const now = new Date();
  addLog('info', `[AutoPublish] ${slotLabel} triggered. Looking for due approved post…`);

  try {
    // Pick the oldest APPROVED or SCHEDULED draft whose time has arrived.
    // SCHEDULED = already sent to Blotato, but we keep cron as fallback in case Blotato mock/failed.
    const allDrafts = await getDrafts();
    const dueDrafts = allDrafts
      .filter(d =>
        ['APPROVED', 'SCHEDULED'].includes(d.status) &&
        d.scheduledFor &&
        new Date(d.scheduledFor) <= now
      )
      .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));

    // If a SCHEDULED draft was already sent to Blotato (not mock), skip cron publishing —
    // Blotato is handling it. Only fire for mocks or APPROVED fallbacks.
    const draft = dueDrafts.find(d => {
      if (d.status === 'APPROVED') return true; // never reached Blotato
      if (d.blotatoPublication?.instagram?.isMock || d.blotatoPublication?.pinterest?.isMock) return true; // mock, no real Blotato
      return false; // real Blotato submission — let Blotato handle it
    }) || (dueDrafts.length > 0 ? null : await getNextApprovedDraft());

    if (!draft) {
      addLog('warn', `[AutoPublish] ${slotLabel}: No approved posts due. Skipping.`);
      isExecuting = false;
      return { success: false, message: 'No approved posts due for publishing' };
    }

    if (!draft.media?.secure_url) {
      addLog('warn', `[AutoPublish] Draft ${draft.id} has no media URL. Skipping.`);
      isExecuting = false;
      return { success: false, message: 'Draft has no media URL' };
    }

    const scheduledLabel = draft.scheduledFor
      ? new Date(draft.scheduledFor).toLocaleString('en-GB', { timeZone: 'Europe/Zurich', dateStyle: 'medium', timeStyle: 'short' }) + ' CET'
      : 'unscheduled';
    addLog('info', `[AutoPublish] Publishing draft ${draft.id} scheduled for ${scheduledLabel}`);

    const settings = getSettings();
    const publishResult = await publishToPlatforms({
      mediaUrl: draft.media.secure_url,
      captionInstagram: draft.captions?.instagramCaption || '',
      captionPinterest: draft.captions?.pinterestDescription || draft.captions?.instagramCaption || '',
      pinterestTitle: draft.captions?.pinterestTitle || 'NutriFitness.ch',
      platforms: {
        instagram: settings.scheduling?.postToInstagram !== false,
        pinterest: settings.scheduling?.postToPinterest !== false
      },
      resourceType: draft.media?.resource_type || 'image'
    });

    const successful =
      (publishResult.instagram?.success || settings.scheduling?.postToInstagram === false) &&
      (publishResult.pinterest?.success || settings.scheduling?.postToPinterest === false);

    const nowISO = now.toISOString();
    await updateDraft(draft.id, {
      status: successful ? 'POSTED' : 'PUBLISH_FAILED',
      publishedAt: nowISO,
      revisionHistory: [
        ...(draft.revisionHistory || []),
        {
          revision: draft.revision || 1,
          event: successful ? 'PUBLISHED' : 'PUBLISH_FAILED',
          at: nowISO,
          note: `Auto-published via ${slotLabel} slot.`,
          caption: draft.captions?.instagramCaption || '',
          media: draft.media
        }
      ]
    });

    await addPostHistory({
      draftId: draft.id,
      media: {
        publicId: draft.media.public_id,
        url: draft.media.secure_url,
        format: draft.media.format,
        resourceType: draft.media.resource_type || 'image',
        aspectRatio: draft.media.aspect_ratio
      },
      captions: draft.captions,
      platforms: {
        instagram: publishResult.instagram,
        pinterest: publishResult.pinterest
      },
      autoDeleted: false,
      slotTheme: draft.theme || slotLabel,
      slotLabel,
      scheduledFor: draft.scheduledFor,
      status: successful ? 'COMPLETED' : 'PARTIAL_FAILED',
      durationMs: Date.now() - startTime
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    if (successful) {
      addLog('success', `[AutoPublish] Draft ${draft.id} published in ${elapsed}s via ${slotLabel}.`);
    } else {
      addLog('error', `[AutoPublish] Draft ${draft.id} failed after ${elapsed}s. IG: ${publishResult.instagram?.success}, PIN: ${publishResult.pinterest?.success}`);
    }

    isExecuting = false;
    return { success: successful, draftId: draft.id, publishResult };

  } catch (error) {
    isExecuting = false;
    addLog('error', `[AutoPublish] Critical error in ${slotLabel}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ─── Legacy wrapper ───────────────────────────────────────────────────────────
export async function executePostWorkflow(slotTheme = 'motivation', options = {}) {
  return publishNextApprovedDraft(slotTheme);
}

// ─── Scheduler: 07:00 and 17:00 Europe/Zurich daily ─────────────────────────
const DAILY_SLOTS = [
  { time: '07:00', label: 'Morning (07:00 CET)' },
  { time: '17:00', label: 'Evening (17:00 CET)' }
];

function scheduleSlot(slot) {
  const fire = () => {
    publishNextApprovedDraft(slot.label);
    const next = nextCETOccurrence(slot.time);
    const delayMs = next.getTime() - Date.now();
    addLog('info', `[Scheduler] Next ${slot.label} in ${Math.round(delayMs / 60000)} min.`);
    return setTimeout(fire, delayMs);
  };
  const next = nextCETOccurrence(slot.time);
  const delayMs = next.getTime() - Date.now();
  addLog('info', `[Scheduler] ${slot.label} — next run in ${Math.round(delayMs / 60000)} min (${next.toISOString()}).`);
  return setTimeout(fire, delayMs);
}

export function initScheduler() {
  activeCronJobs.forEach(t => clearTimeout(t));
  activeCronJobs = [];
  addLog('info', '[Scheduler] Auto-publish initialized: 07:00 + 17:00 CET (approved posts only).');
  for (const slot of DAILY_SLOTS) {
    activeCronJobs.push(scheduleSlot(slot));
  }
}

// ─── Status for Dashboard ────────────────────────────────────────────────────
export async function getScheduleStatusAsync() {
  const settings = getSettings();
  const now = new Date();

  // Build upcoming slots with their assigned drafts
  const allDrafts = await getDrafts();
  const scheduledDrafts = allDrafts
    .filter(d => ['APPROVED', 'SCHEDULED'].includes(d.status) && d.scheduledFor)
    .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));

  // Build slot rows for next 7 days
  const rows = [];
  let date = todayInZurich();
  for (let day = 0; day < 7; day++) {
    for (const time of SLOT_TIMES) {
      const slotUTC = cetSlotToUTC(date, time);
      if (slotUTC.getTime() < now.getTime() - 60 * 1000) continue; // skip past slots
      const assigned = scheduledDrafts.find(d => {
        const diff = Math.abs(new Date(d.scheduledFor) - slotUTC);
        return diff < 60 * 1000; // within 1 min
      });
      const countdownMinutes = Math.round((slotUTC - now) / 60000);
      rows.push({
        id: `${date}-${time}`,
        date,
        time,
        slotUTC: slotUTC.toISOString(),
        label: `${time} CET`,
        countdownMinutes,
        isNext: false,
        assignedDraft: assigned ? {
          id: assigned.id,
          media: assigned.media,
          theme: assigned.theme
        } : null
      });
    }
    date = addDays(date, 1);
  }
  if (rows.length > 0) rows[0].isNext = true;

  return {
    enabled: true,
    timezone: 'Europe/Zurich',
    slots: rows,
    isExecuting,
    folder: settings.cloudinary?.folder,
    scheduledDraftCount: scheduledDrafts.length
  };
}

// Sync version for backward compat
export function getScheduleStatus() {
  const settings = getSettings();
  const now = new Date();
  const slots = DAILY_SLOTS.map(slot => {
    const nextRun = nextCETOccurrence(slot.time);
    return {
      id: slot.time,
      time: slot.time,
      label: slot.label,
      theme: slot.time === '07:00' ? 'motivation' : 'workout',
      nextRun: nextRun.toISOString(),
      countdownMinutes: Math.round((nextRun - now) / 60000),
      isNext: false
    };
  }).sort((a, b) => new Date(a.nextRun) - new Date(b.nextRun));
  if (slots.length > 0) slots[0].isNext = true;
  return { enabled: true, timezone: 'Europe/Zurich', slots, isExecuting, folder: settings.cloudinary?.folder };
}
