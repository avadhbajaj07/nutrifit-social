import React, { useState } from 'react';
import {
  Instagram,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  CheckCircle2
} from 'lucide-react';

export default function PostPreview({ media, caption, pinterestTitle, pinterestDescription, theme }) {
  const [activePlatform, setActivePlatform] = useState('instagram');
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const fallbackImage = 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1080&q=80';
  const displayImage = media?.secure_url || media?.url || fallbackImage;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      {/* Platform Switcher */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-500">Live Preview</span>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActivePlatform('instagram')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
              activePlatform === 'instagram'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Instagram className="w-3.5 h-3.5" />
            Instagram
          </button>
          <button
            onClick={() => setActivePlatform('pinterest')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
              activePlatform === 'pinterest'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-xs">📌</span>
            Pinterest
          </button>
        </div>
      </div>

      {/* Instagram Preview */}
      {activePlatform === 'instagram' && (
        <div className="max-w-sm mx-auto bg-black text-white rounded-xl border border-neutral-800 overflow-hidden font-sans">
          {/* Post Header */}
          <div className="flex items-center justify-between p-3 border-b border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-rose-600 p-[1.5px]">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[10px] font-bold text-emerald-400">
                  NF
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold">nutrifitness.ch</span>
                  <CheckCircle2 className="w-3 h-3 text-sky-400 fill-sky-400" />
                </div>
                <span className="text-[10px] text-neutral-400">Geneva, Switzerland 🇨🇭</span>
              </div>
            </div>
            <MoreHorizontal className="w-4 h-4 text-neutral-400" />
          </div>

          {/* Image */}
          <div className="relative aspect-[4/5] bg-neutral-900 overflow-hidden">
            <img src={displayImage} alt="Post preview" className="w-full h-full object-cover" />
            {media?.aspect_ratio && (
              <span className="absolute bottom-2 right-2 bg-black/60 text-[10px] text-white px-2 py-0.5 rounded font-mono">
                {media.aspect_ratio}
              </span>
            )}
          </div>

          {/* Engagement */}
          <div className="p-3 pb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
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
              {liked ? '1,429 likes' : '1,428 likes'}
            </p>

            <div className="text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto pr-1">
              <span className="font-bold mr-1.5 text-white">nutrifitness.ch</span>
              {caption || 'Your caption will appear here…'}
            </div>

            <p className="text-[10px] text-neutral-500 uppercase mt-2">Just now · Translate</p>
          </div>
        </div>
      )}

      {/* Pinterest Preview */}
      {activePlatform === 'pinterest' && (
        <div className="max-w-sm mx-auto bg-white rounded-xl border border-gray-200 overflow-hidden font-sans">
          <div className="relative bg-gray-100">
            <img
              src={displayImage}
              alt="Pinterest pin"
              className="w-full h-auto object-cover max-h-80"
            />
            <button className="absolute top-3 right-3 bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded-full hover:bg-red-700">
              Save
            </button>
          </div>

          <div className="p-4 space-y-2">
            <h3 className="font-bold text-sm text-gray-900 leading-snug">
              {pinterestTitle || 'NutriFitness — Health & Fitness'}
            </h3>
            <p className="text-xs text-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed">
              {pinterestDescription || caption}
            </p>
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500">
              <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center font-bold text-white text-[9px]">P</div>
              <span className="font-medium text-gray-700">Board: Health & Fitness</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
