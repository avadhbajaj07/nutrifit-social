import React, { useState } from 'react';
import { 
  Instagram, 
  Heart, 
  MessageCircle, 
  Send, 
  Bookmark, 
  MoreHorizontal, 
  MapPin, 
  CheckCircle2, 
  Share2, 
  ExternalLink 
} from 'lucide-react';

export default function PostPreview({ media, caption, pinterestTitle, pinterestDescription, theme }) {
  const [activePlatform, setActivePlatform] = useState('instagram');
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const fallbackImage = 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1080&q=80';
  const displayImage = media?.secure_url || media?.url || fallbackImage;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      {/* Platform Switcher */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aperçu Réaliste</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActivePlatform('instagram')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activePlatform === 'instagram'
                ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Instagram className="w-3.5 h-3.5" />
            Instagram
          </button>
          <button
            onClick={() => setActivePlatform('pinterest')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activePlatform === 'pinterest'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="font-bold text-xs">📌</span>
            Pinterest
          </button>
        </div>
      </div>

      {/* Instagram Preview */}
      {activePlatform === 'instagram' && (
        <div className="max-w-sm mx-auto bg-black text-white rounded-2xl border border-slate-800 shadow-2xl overflow-hidden font-sans">
          
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-rose-600 p-[1.5px]">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-xs font-bold text-emerald-400">
                  NF
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold leading-none">nutrifitness.ch</span>
                  <CheckCircle2 className="w-3 h-3 text-sky-400 fill-sky-400" />
                </div>
                <div className="flex items-center gap-0.5 text-[10px] text-neutral-400">
                  <MapPin className="w-2.5 h-2.5 text-red-500" />
                  <span>Genève, Suisse 🇨🇭</span>
                </div>
              </div>
            </div>
            <MoreHorizontal className="w-4 h-4 text-neutral-400" />
          </div>

          {/* Media Viewport */}
          <div className="relative aspect-[4/5] bg-neutral-900 flex items-center justify-center overflow-hidden">
            <img 
              src={displayImage} 
              alt="Preview Post" 
              className="w-full h-full object-cover"
            />
            {media?.aspect_ratio && (
              <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-[10px] text-white px-2 py-0.5 rounded font-mono">
                {media.aspect_ratio}
              </span>
            )}
          </div>

          {/* Engagement Bar */}
          <div className="p-3 pb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3.5">
                <button onClick={() => setLiked(!liked)} className="transition-transform active:scale-125">
                  <Heart className={`w-5 h-5 ${liked ? 'text-red-500 fill-red-500' : 'text-neutral-200'}`} />
                </button>
                <MessageCircle className="w-5 h-5 text-neutral-200" />
                <Send className="w-5 h-5 text-neutral-200" />
              </div>
              <button onClick={() => setSaved(!saved)}>
                <Bookmark className={`w-5 h-5 ${saved ? 'text-white fill-white' : 'text-neutral-200'}`} />
              </button>
            </div>

            <p className="text-xs font-bold text-neutral-200 mb-1">
              {liked ? '1,429 mentions J\'aime' : '1,428 mentions J\'aime'}
            </p>

            {/* Caption Body */}
            <div className="text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto pr-1">
              <span className="font-bold mr-1.5 text-white">nutrifitness.ch</span>
              {caption || 'Accroche percutante et conseils fitness sur mesure pour la Suisse romande...'}
            </div>

            <p className="text-[10px] text-neutral-500 uppercase mt-2">
              Il y a quelques instants • Traduction en français
            </p>
          </div>
        </div>
      )}

      {/* Pinterest Preview */}
      {activePlatform === 'pinterest' && (
        <div className="max-w-sm mx-auto bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-2xl overflow-hidden font-sans p-4">
          <div className="relative rounded-xl overflow-hidden mb-3 bg-neutral-900">
            <img 
              src={displayImage} 
              alt="Pinterest Pin" 
              className="w-full h-auto object-cover max-h-96"
            />
            <button className="absolute top-3 right-3 bg-red-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-full shadow-lg hover:bg-red-700">
              Enregistrer
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-sm text-slate-100 leading-snug">
              {pinterestTitle || 'NutriFitness Suisse 🇨🇭 - Conseils & Motivation'}
            </h3>
            
            <p className="text-xs text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
              {pinterestDescription || caption}
            </p>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center font-bold text-white text-[10px]">
                P
              </div>
              <span className="font-semibold text-slate-200">Tableau : Santé & Fitness Romandie</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
