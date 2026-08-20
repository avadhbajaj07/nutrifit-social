import React, { useState, useEffect } from 'react';
import { 
  History, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Instagram, 
  Terminal, 
  ExternalLink, 
  Calendar,
  Clock,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export default function HistoryLog({ history, onRefresh }) {
  const [activeView, setActiveView] = useState('posts'); // 'posts' or 'system_logs'
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
    <div className="space-y-6">
      
      {/* Header & Sub-nav */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            Historique des Publications & Purges Cloudinary
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Traçabilité complète des envois vers Blotato API et confirmation de suppression du stockage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveView('posts')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'posts'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Publications ({history.length})
            </button>
            <button
              onClick={() => setActiveView('system_logs')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'system_logs'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Journaux Système (Logs)
            </button>
          </div>

          <button
            onClick={() => { onRefresh(); if (activeView === 'system_logs') fetchLogs(); }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
            title="Rafraîchir"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* View 1: Posts History */}
      {activeView === 'posts' && (
        <div className="space-y-4">
          {history.length > 0 ? (
            history.map((item, idx) => {
              const formattedDate = new Date(item.timestamp).toLocaleString('fr-CH', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div 
                  key={item.id || idx}
                  className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
                >
                  {/* Media Thumbnail & Meta */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-20 h-24 rounded-xl overflow-hidden bg-black shrink-0 border border-slate-800 relative">
                      {item.media?.url ? (
                        <img 
                          src={item.media.url} 
                          alt="Published media" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">
                          Média
                        </div>
                      )}
                      <span className="absolute bottom-1 right-1 bg-black/80 text-[9px] font-mono text-slate-300 px-1 rounded">
                        {item.media?.aspectRatio || '1:1'}
                      </span>
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white uppercase px-2 py-0.5 rounded bg-slate-950 font-mono">
                          {item.slotTheme || 'Motivation'}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formattedDate}
                        </span>
                      </div>

                      <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                        {item.captions?.instagramCaption || item.captions?.pinterestDescription || 'Publication sans texte'}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {/* Instagram Status */}
                        {item.platforms?.instagram && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            item.platforms.instagram.success 
                              ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            <Instagram className="w-2.5 h-2.5" />
                            Instagram : {item.platforms.instagram.postSubmissionId || (item.platforms.instagram.success ? 'Envoyé' : 'Échec')}
                          </span>
                        )}

                        {/* Pinterest Status */}
                        {item.platforms?.pinterest && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            item.platforms.pinterest.success 
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            <span>📌</span>
                            Pinterest : {item.platforms.pinterest.postSubmissionId || (item.platforms.pinterest.success ? 'Envoyé' : 'Échec')}
                          </span>
                        )}

                        {/* Auto-Deletion Confirmation */}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                          <Trash2 className="w-2.5 h-2.5" />
                          {item.autoDeleted ? 'Média purgé de Cloudinary ✅' : 'Média conservé'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Publié avec succès
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <History className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h3 className="font-bold text-sm text-white">Aucune publication pour le moment</h3>
              <p className="text-xs text-slate-400 mt-1">
                Les publications programmées (3 par jour) ou manuelles s'afficheront ici avec le statut de purge Cloudinary.
              </p>
            </div>
          )}
        </div>
      )}

      {/* View 2: System Logs */}
      {activeView === 'system_logs' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs shadow-2xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-white">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Console des Événements & Tâches Cron
            </span>
            <span>Europe/Zurich (CET)</span>
          </div>

          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1 text-slate-300">
            {logs.length > 0 ? (
              logs.map((log) => {
                const logColor = {
                  info: 'text-sky-400',
                  success: 'text-emerald-400 font-bold',
                  warn: 'text-amber-400',
                  error: 'text-rose-400 font-bold'
                }[log.level] || 'text-slate-400';

                return (
                  <div key={log.id} className="flex items-start gap-2 hover:bg-slate-900/60 p-1 rounded">
                    <span className="text-slate-500 text-[10px] shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString('fr-CH')}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-1.5 rounded bg-slate-900 shrink-0 ${logColor}`}>
                      {log.level}
                    </span>
                    <span className="text-slate-200 break-words flex-1">
                      {log.message}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-slate-500 text-center py-4">Chargement des logs...</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
