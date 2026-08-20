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
  Flame,
  Calendar,
  Layers,
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
      
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Cloudinary Stock */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Médias en Attente (Cloudinary)</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">
              {mediaList?.length || 0}
              <span className="text-xs font-normal text-slate-400 ml-1.5">fichiers</span>
            </h3>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" />
              Dossier : {schedule?.folder || 'nutrifitness/posts'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ImageIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Daily Goal (3 posts/day) */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Publications du Jour</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">
              {completedTodayCount} <span className="text-slate-500">/ 3</span>
            </h3>
            <p className="text-[11px] text-teal-400 flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              3 créneaux quotidiens (Suisse)
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Auto Clean-up Policy */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Purge Automatique Cloudinary</p>
            <h3 className="text-base font-bold text-white mt-1 flex items-center gap-1.5 text-emerald-400">
              <Check className="w-4 h-4 text-emerald-400" />
              Activée (Instantanée)
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Suppression dès publication confirmée
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Trash2 className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Instagram Rules Compliance */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Conformité Instagram & Algorithme</p>
            <h3 className="text-base font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              100% (Zéro lien brut)
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              CTA Bio Link & Hashtags Romandie
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: 3 Posts Daily Schedule Timeline */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                Planning des 3 Publications Quotidiennes (Suisse)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Fuseau horaire : Europe/Zurich (CET) • Diffusion simultanée Instagram & Pinterest
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ● Cron Actif
            </span>
          </div>

          <div className="space-y-4">
            {schedule?.slots?.map((slot, index) => {
              const themeConfig = {
                motivation: {
                  icon: '🌅',
                  label: 'Créneau 1 : Matin (Motivation & Routine)',
                  desc: 'Accroche stimulante, discipline, citation & routine matinale',
                  color: 'from-amber-500/20 to-orange-500/5 border-amber-500/30'
                },
                nutrition: {
                  icon: '🥗',
                  label: 'Créneau 2 : Midi (Nutrition & Recette Saine)',
                  desc: 'Astuces assiette équilibrée, protéines, meal prep rapide',
                  color: 'from-emerald-500/20 to-teal-500/5 border-emerald-500/30'
                },
                workout: {
                  icon: '🏋️‍♂️',
                  label: 'Créneau 3 : Soir (Entraînement & Engagement)',
                  desc: 'Circuit training, conseils techniques et appel aux commentaires',
                  color: 'from-blue-500/20 to-indigo-500/5 border-blue-500/30'
                }
              }[slot.theme] || {
                icon: '⚡',
                label: slot.label || slot.time,
                desc: 'Publication automatique programmée',
                color: 'from-slate-800 to-slate-900 border-slate-700'
              };

              return (
                <div 
                  key={slot.id || index}
                  className={`p-4 rounded-xl border bg-gradient-to-r ${themeConfig.color} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:scale-[1.01]`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                      {themeConfig.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black px-2 py-0.5 rounded bg-slate-950 text-white font-mono">
                          {slot.time}
                        </span>
                        <h4 className="font-bold text-sm text-slate-100">
                          {themeConfig.label}
                        </h4>
                        {slot.isNext && (
                          <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 animate-pulse">
                            Prochain Post ({slot.countdownMinutes} min)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        {themeConfig.desc}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          📸 Instagram + 📌 Pinterest
                        </span>
                        <span>•</span>
                        <span className="text-purple-300">
                          🗑️ Auto-delete Cloudinary
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Manual Trigger for this specific slot */}
                  <button
                    onClick={() => onTriggerSlot(slot.theme)}
                    disabled={isPublishing || (mediaList?.length === 0)}
                    className="self-end sm:self-center flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-emerald-600 text-slate-200 hover:text-white border border-slate-800 hover:border-emerald-500 transition-all disabled:opacity-50"
                    title="Exécuter ce créneau immédiatement"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Tester ce créneau
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Next Queued Media Preview & Quick Actions */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Prochain Média en File
              </h3>
              <button 
                onClick={() => onNavigateTab('cloudinary')}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
              >
                Voir tout ({mediaList?.length || 0})
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {nextMedia ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden aspect-[4/5] bg-black border border-slate-800 group">
                  <img 
                    src={nextMedia.secure_url} 
                    alt="Next post asset" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-emerald-400">
                    Prochain en ligne
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono text-white">
                    {nextMedia.aspect_ratio || '1:1'}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {nextMedia.title || nextMedia.public_id}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Format : {nextMedia.format?.toUpperCase()} • {nextMedia.resource_type}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 px-4 bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                <ImageIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">
                  Dossier Cloudinary vide.
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ajoutez des photos ou réinitialisez la démo.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2">
            <button
              onClick={() => onNavigateTab('studio')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Ouvrir le Studio Viral IA
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
