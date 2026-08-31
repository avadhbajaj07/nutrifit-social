import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  Trash2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Image as ImageIcon,
  Calendar,
  Check,
  RefreshCw
} from 'lucide-react';

export default function DashboardOverview({
  mediaList,
  history,
  drafts,
  onNavigateTab
}) {
  const [schedule, setSchedule] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const nextMedia = mediaList?.[0];

  const completedTodayCount = history.filter(h => {
    const postDate = new Date(h.timestamp).toDateString();
    return postDate === new Date().toDateString();
  }).length;

  const approvedCount = (drafts || []).filter(d => d.status === 'APPROVED').length;

  const fetchSchedule = async () => {
    setLoadingSchedule(true);
    try {
      const res = await fetch('/api/settings/schedule');
      const data = await res.json();
      setSchedule(data);
    } catch (e) {
      console.error('Could not load schedule', e);
    } finally {
      setLoadingSchedule(false);
    }
  };

  useEffect(() => { fetchSchedule(); }, []);

  // Group schedule slots by date
  const slotsByDate = {};
  (schedule?.slots || []).forEach(slot => {
    if (!slotsByDate[slot.date]) slotsByDate[slot.date] = [];
    slotsByDate[slot.date].push(slot);
  });

  const formatDate = (isoDate) => {
    const d = new Date(`${isoDate}T12:00:00Z`);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Zurich' });
    const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'Europe/Zurich' });
    if (isoDate === today) return 'Today';
    if (isoDate === tomorrow) return 'Tomorrow';
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

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
              Cloudinary folder
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
              {completedTodayCount} <span className="text-gray-400">/ 2</span>
            </h3>
            <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              07:00 + 17:00 CET
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Approved & Queued</p>
            <h3 className={`text-2xl font-bold mt-1 ${approvedCount > 0 ? 'text-emerald-600' : 'text-amber-500'}`}>
              {approvedCount}
              <span className="text-xs font-normal text-gray-400 ml-1">posts</span>
            </h3>
            <p className="text-[11px] text-gray-400 mt-1">
              {approvedCount > 0
                ? `~${Math.ceil(approvedCount / 2)} day${Math.ceil(approvedCount / 2) !== 1 ? 's' : ''} of content`
                : 'No approved posts yet'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
            <CheckCircle2 className="w-5 h-5" />
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

      {/* 7-Day Schedule + Next Media */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 7-Day Calendar */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                Publishing Schedule
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                2 posts/day · 07:00 & 17:00 CET · approved posts only
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Auto-active
              </span>
              <button
                onClick={fetchSchedule}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Refresh schedule"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {loadingSchedule ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : Object.keys(slotsByDate).length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">
              No upcoming slots found.
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(slotsByDate).map(([date, slots]) => (
                <div key={date}>
                  {/* Date header */}
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 px-1">
                    {formatDate(date)}
                    <span className="ml-2 text-gray-300 font-normal normal-case tracking-normal">
                      {date}
                    </span>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {slots.map(slot => {
                      const isMorning = slot.time === '07:00';
                      const hasPost = Boolean(slot.assignedDraft);
                      const isNext = slot.isNext;
                      return (
                        <div
                          key={slot.id}
                          className={`p-3 rounded-lg border flex items-center justify-between gap-2 ${
                            isNext
                              ? 'border-emerald-300 bg-emerald-50'
                              : hasPost
                              ? 'border-gray-200 bg-white'
                              : 'border-dashed border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{isMorning ? '🌅' : '🌆'}</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-gray-700 font-mono">{slot.time}</span>
                                {isNext && (
                                  <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-full uppercase">
                                    Next
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {isMorning ? 'Morning' : 'Evening'}
                                {isNext && slot.countdownMinutes != null && (
                                  <span className="ml-1 text-emerald-600">· {slot.countdownMinutes < 60
                                    ? `${slot.countdownMinutes}min`
                                    : `${Math.round(slot.countdownMinutes / 60)}h`}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {hasPost ? (
                            <div className="w-9 h-11 rounded overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                              {slot.assignedDraft.media?.secure_url ? (
                                <img
                                  src={slot.assignedDraft.media.secure_url}
                                  alt="Scheduled"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                  <ImageIcon className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 shrink-0">Empty</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] text-gray-400 pt-2 border-t border-gray-100">
            Slots fill automatically when the client approves posts. &nbsp;
            <button
              className="underline text-gray-500 hover:text-gray-800"
              onClick={() => onNavigateTab?.('approval')}
            >
              Go to Client Approval →
            </button>
          </p>
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
                onClick={() => onNavigateTab?.('cloudinary')}
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
              onClick={() => onNavigateTab?.('studio')}
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
