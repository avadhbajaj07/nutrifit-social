import React, { useState } from 'react';
import { 
  FolderGit2, 
  Trash2, 
  Play, 
  RefreshCw, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  Plus,
  Eye
} from 'lucide-react';

export default function CloudinaryExplorer({ 
  mediaList, 
  folder, 
  isMock, 
  onRefresh, 
  onDeleteMedia, 
  onResetDemo, 
  onTriggerMediaPost,
  onSelectPreview,
  isPublishing 
}) {
  const [selectedItem, setSelectedItem] = useState(null);

  return (
    <div className="space-y-6">
      
      {/* Header & Actions */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-emerald-400" />
              Explorateur de Médias Cloudinary
            </h2>
            {isMock && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Mode Démo Suisse
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dossier cible : <span className="font-mono text-emerald-400 bg-slate-950 px-2 py-0.5 rounded">{folder || 'nutrifitness/posts'}</span>
            {' • '}Total en attente : <strong className="text-white">{mediaList.length} médias</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all"
            title="Rafraîchir les fichiers Cloudinary"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </button>

          {isMock && (
            <button
              onClick={onResetDemo}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all"
              title="Réinitialiser les médias d'exemple"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Recharger démo
            </button>
          )}
        </div>
      </div>

      {/* Media Grid */}
      {mediaList.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {mediaList.map((item, index) => {
            const isFirst = index === 0;

            return (
              <div 
                key={item.public_id || index}
                className="bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between group"
              >
                {/* Media Image & Badges */}
                <div className="relative aspect-[4/5] bg-black overflow-hidden">
                  <img 
                    src={item.secure_url} 
                    alt={item.title || item.public_id} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Position Badge */}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                    {isFirst ? (
                      <span className="bg-emerald-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded shadow">
                        #1 Prochain Post
                      </span>
                    ) : (
                      <span className="bg-slate-950/80 backdrop-blur-md text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded">
                        #{index + 1}
                      </span>
                    )}
                  </div>

                  {/* Aspect Ratio Badge */}
                  <div className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-md text-white text-[10px] font-mono px-2 py-0.5 rounded">
                    {item.aspect_ratio || '1:1'}
                  </div>
                </div>

                {/* Info & Actions */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-xs text-white line-clamp-1">
                      {item.title || item.public_id.split('/').pop()}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span>{item.resource_type?.toUpperCase()} • {item.format?.toUpperCase()}</span>
                      <span>{item.width}x{item.height}px</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSelectPreview(item)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1"
                      title="Prévisualiser dans le studio"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onTriggerMediaPost(item.public_id)}
                      disabled={isPublishing}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all disabled:opacity-50"
                      title="Publier et supprimer de Cloudinary"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Publier
                    </button>

                    <button
                      onClick={() => onDeleteMedia(item.public_id, item.resource_type)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 transition-all text-xs"
                      title="Supprimer manuellement de Cloudinary"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <FolderGit2 className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-bold text-base text-white">Aucun média dans ce dossier</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Déposez vos photos ou vidéos dans le dossier Cloudinary spécifié pour alimenter le flux de publication 3 posts/jour.
          </p>
          <button
            onClick={onResetDemo}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 shadow-lg shadow-emerald-500/20"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Charger les médias démo Suisse
          </button>
        </div>
      )}

    </div>
  );
}
