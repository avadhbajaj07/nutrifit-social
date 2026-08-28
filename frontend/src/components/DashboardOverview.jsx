import React from 'react';
import {
  Clock,
  CheckCircle2,
  Trash2,
  Sparkles,
  Play,
  ArrowRight,
  ShieldCheck,
  Zap,
  Image as ImageIcon,
  Calendar,
  Check
} from 'lucide-react';

export default function DashboardOverview({
  schedule,
  mediaList,
  history,
  onTriggerSlot,
  isPublishing,
  onNavigateTab
}) {
  const nextMedia = mediaList?.[0];
  const completedTodayCount = history.filter(h => {
    const postDate = new Date(h.timestamp).toDateString();
    const today = new Date().toDateString();
    return postDate === today;
  }).length;

  return (
    <div className="space-y-6">

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Media Queue</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {mediaList?.length || 0}
              <span className="text-xs font-normal text-gray-400 ml-1">files</span>
            </h3>
            <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" />
              Folder: {schedule?.folder || 'nutrifitness'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
            <ImageIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Posts Today</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {completedTodayCount} <span className="text-gray-400">/ 3</span>
            </h3>
            <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              3 daily slots (Europe/Zurich)
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Auto-Cleanup</p>
            <h3 className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              Enabled
            </h3>
            <p className="text-[11px] text-gray-400 mt-1">Removed on successful publish</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
            <Trash2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Instagram Compliance</p>
            <h3 className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              100% (No raw links)
            </h3>
            <p className="text-[11px] text-gray-400 mt-1">Bio link CTA · max 5 hashtags</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Schedule + Next Media */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Daily Schedule */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                Daily Publishing Schedule
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Timezone: Europe/Zurich · Instagram & Pinterest
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ● Active
            </span>
          </div>

          <div className="space-y-3">
            {schedule?.slots?.map((slot, index) => {
              const themeConfig = {
                motivation: {
                  icon: '🌅',
                  label: 'Slot 1 — Morning (Motivation)',
                  desc: 'Inspiring hook, discipline, and morning routine tips',
                  accent: 'border-amber-200 bg-amber-50'
                },
                nutrition: {
                  icon: '🥗',
                  label: 'Slot 2 — Noon (Nutrition)',
                  desc: 'Balanced plate tips, protein, quick meal prep',
                  accent: 'border-emerald-200 bg-emerald-50'
                },
                workout: {
                  icon: '🏋️',
                  label: 'Slot 3 — Evening (Workout)',
                  desc: 'Circuit training, technique tips, engagement call',
                  accent: 'border-blue-200 bg-blue-50'
                }
              }[slot.theme] || {
                icon: '⚡',
                label: slot.label || slot.time,
                desc: 'Scheduled auto-publish',
                accent: 'border-gray-200 bg-gray-50'
              };

              return (
                <div
                  key={slot.id || index}
                  className={`p-4 rounded-lg border ${themeConfig.accent} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{themeConfig.icon}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-700 font-mono">
                          {slot.time}
                        </span>
                        <h4 className="font-semibold text-sm text-gray-800">{themeConfig.label}</h4>
                        {slot.isNext && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                            Next ({slot.countdownMinutes} min)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{themeConfig.desc}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-400">
                        <span>📸 Instagram + 📌 Pinterest</span>
                        <span>·</span>
                        <span>🗑 Auto-remove from Cloudinary</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onTriggerSlot(slot.theme)}
                    disabled={isPublishing || (mediaList?.length === 0)}
                    className="self-end sm:self-center flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white hover:bg-gray-900 hover:text-white text-gray-700 border border-gray-200 hover:border-gray-900 transition-colors disabled:opacity-40"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Test slot
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Next Media Preview */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Next in Queue
              </h3>
              <button
                onClick={() => onNavigateTab('cloudinary')}
                className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
              >
                View all ({mediaList?.length || 0})
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {nextMedia ? (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden aspect-[4/5] bg-gray-100 border border-gray-200">
                  <img
                    src={nextMedia.secure_url}
                    alt="Next post"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold text-emerald-700">
                    Up next
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-mono text-white">
                    {nextMedia.aspect_ratio || '1:1'}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800 truncate">
                    {nextMedia.title || nextMedia.public_id}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {nextMedia.format?.toUpperCase()} · {nextMedia.resource_type}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 px-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <ImageIcon className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Cloudinary folder is empty.</p>
                <p className="text-[11px] text-gray-400 mt-1">Add photos or reset the demo.</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-gray-100">
            <button
              onClick={() => onNavigateTab('studio')}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              Open AI Studio
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
