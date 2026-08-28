import React, { useState, useEffect } from 'react';
import {
  History,
  Trash2,
  CheckCircle2,
  Instagram,
  Terminal,
  Clock,
  RefreshCw
} from 'lucide-react';

export default function HistoryLog({ history, onRefresh }) {
  const [activeView, setActiveView] = useState('posts');
  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/settings/logs?limit=80');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeView === 'system_logs') {
      fetchLogs();
    }
  }, [activeView]);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" />
            Publish History
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Full audit trail of posts sent to Blotato and Cloudinary cleanup confirmations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveView('posts')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeView === 'posts'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Posts ({history.length})
            </button>
            <button
              onClick={() => setActiveView('system_logs')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeView === 'system_logs'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              System Logs
            </button>
          </div>

          <button
            onClick={() => { onRefresh(); if (activeView === 'system_logs') fetchLogs(); }}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Posts History */}
      {activeView === 'posts' && (
        <div className="space-y-3">
          {history.length > 0 ? (
            history.map((item, idx) => {
              const formattedDate = new Date(item.timestamp).toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={item.id || idx}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-16 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200 relative">
                      {item.media?.url ? (
                        <img
                          src={item.media.url}
                          alt="Published"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">
                          No image
                        </div>
                      )}
                      <span className="absolute bottom-1 right-1 bg-black/60 text-[9px] font-mono text-white px-1 rounded">
                        {item.media?.aspectRatio || '1:1'}
                      </span>
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-700 uppercase px-2 py-0.5 rounded bg-gray-100 font-mono">
                          {item.slotTheme || 'Motivation'}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formattedDate}
                        </span>
                      </div>

                      <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
                        {item.captions?.instagramCaption || item.captions?.pinterestDescription || 'No caption'}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {item.platforms?.instagram && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
                            item.platforms.instagram.success
                              ? 'bg-pink-50 text-pink-600 border border-pink-200'
                              : 'bg-red-50 text-red-500 border border-red-200'
                          }`}>
                            <Instagram className="w-2.5 h-2.5" />
                            Instagram: {item.platforms.instagram.postSubmissionId || (item.platforms.instagram.success ? 'Sent' : 'Failed')}
                          </span>
                        )}

                        {item.platforms?.pinterest && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
                            item.platforms.pinterest.success
                              ? 'bg-red-50 text-red-600 border border-red-200'
                              : 'bg-red-50 text-red-500 border border-red-200'
                          }`}>
                            <span>📌</span>
                            Pinterest: {item.platforms.pinterest.postSubmissionId || (item.platforms.pinterest.success ? 'Sent' : 'Failed')}
                          </span>
                        )}

                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200 flex items-center gap-1">
                          <Trash2 className="w-2.5 h-2.5" />
                          {item.autoDeleted ? 'Media removed ✅' : 'Media kept'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Published
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center">
              <History className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-sm text-gray-700">No posts yet</h3>
              <p className="text-xs text-gray-400 mt-1">
                Scheduled (3/day) or manual posts will appear here with Cloudinary cleanup status.
              </p>
            </div>
          )}
        </div>
      )}

      {/* System Logs */}
      {activeView === 'system_logs' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 text-gray-500">
            <span className="flex items-center gap-1.5 font-bold text-gray-800">
              <Terminal className="w-4 h-4 text-gray-500" />
              Event Console
            </span>
            <span className="text-gray-400">Europe/Zurich (CET)</span>
          </div>

          <div className="space-y-1 max-h-96 overflow-y-auto pr-1 text-gray-700">
            {isLoadingLogs ? (
              <p className="text-gray-400 text-center py-4">Loading logs...</p>
            ) : logs.length > 0 ? (
              logs.map((log) => {
                const logColor = {
                  info: 'text-blue-600',
                  success: 'text-emerald-600 font-bold',
                  warn: 'text-amber-600',
                  error: 'text-red-600 font-bold'
                }[log.level] || 'text-gray-500';

                return (
                  <div key={log.id} className="flex items-start gap-2 hover:bg-gray-50 p-1 rounded">
                    <span className="text-gray-400 text-[10px] shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString('en-GB')}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-1.5 rounded bg-gray-100 shrink-0 ${logColor}`}>
                      {log.level}
                    </span>
                    <span className="text-gray-700 break-words flex-1">
                      {log.message}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 text-center py-4">No logs yet.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
