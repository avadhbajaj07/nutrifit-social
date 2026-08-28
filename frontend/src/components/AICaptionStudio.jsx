import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Play,
  Hash,
  Wand2,
  Image as ImageIcon
} from 'lucide-react';
import PostPreview from './PostPreview';

export default function AICaptionStudio({
  selectedMedia,
  onTriggerPublishWithCustom,
  isPublishing
}) {
  const [theme, setTheme] = useState('motivation');
  const [productCategory, setProductCategory] = useState('whey_isolate');
  const [customPrompt, setCustomPrompt] = useState('');
  const [currentMedia, setCurrentMedia] = useState(selectedMedia);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);

  const [instagramCaption, setInstagramCaption] = useState(
    "⚡️ La forme physique que tu admires commence par tes choix d'aujourd'hui.\n\nChaque entraînement compte. Pas besoin d'y passer 3 heures par jour, l'essentiel réside dans la régularité et l'intensité que tu y mets.\n\nCe que nous cultivons chez NutriFitness en Suisse romande :\n▫️ De la rigueur sans frustration\n▫️ Des séances ciblées et structurées\n▫️ Une nutrition adaptée à ton métabolisme\n▫️ Des résultats durables sur le long terme.\n\n💾 Enregistre cette publication pour booster ta motivation avant ta prochaine séance !\n\n#fitnesssuisse #suisseromande #genevefitness #lausannefit #discipline"
  );
  const [pinterestTitle, setPinterestTitle] = useState('NutriFitness.ch 🇨🇭 - Motivation & Training');
  const [pinterestDescription, setPinterestDescription] = useState('Fitness and nutrition tips for Switzerland. Find all our programs at nutrifitness.ch.');
  const [copied, setCopied] = useState(false);

  // Instagram Guidelines Validator
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|ch|fr|org|net|io|me)[^\s]*)/gi;
  const hashtagRegex = /#[a-zA-Z0-9_À-ÿ]+/g;

  const hasForbiddenLinks = urlRegex.test(instagramCaption);
  const hashtagCount = (instagramCaption.match(hashtagRegex) || []).length;
  const isHashtagCountValid = hashtagCount <= 5;
  const isFullyCompliant = !hasForbiddenLinks && isHashtagCountValid;

  const handleGenerateCaption = async (selectedTheme = theme) => {
    setIsGeneratingCaption(true);
    try {
      const res = await fetch('/api/ai/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: selectedTheme,
          customPrompt,
          mediaTitle: currentMedia?.title || 'NutriFitness Model'
        })
      });
      const data = await res.json();
      if (data.instagramCaption) {
        setInstagramCaption(data.instagramCaption);
        setPinterestTitle(data.pinterestTitle);
        setPinterestDescription(data.pinterestDescription);
      }
    } catch (err) {
      console.error('Error generating caption:', err);
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const handleGenerateAIImage = async () => {
    setIsGeneratingImage(true);
    try {
      const res = await fetch('/api/ai/generate-ai-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: productCategory, customPrompt })
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        setCurrentMedia({
          secure_url: data.imageUrl,
          title: `AI Image — DALL-E 3 (${data.category})`,
          aspect_ratio: '1:1',
          format: 'png',
          isAIGenerated: true
        });
      } else {
        alert(data.error || 'Error generating image with DALL-E 3');
      }
    } catch (err) {
      console.error('Error generating image:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleFixGuidelines = () => {
    let sanitized = instagramCaption.replace(urlRegex, '[Link in bio]');
    const tags = sanitized.match(hashtagRegex) || [];
    if (tags.length > 5) {
      const top5 = tags.slice(0, 5);
      sanitized = sanitized.replace(hashtagRegex, '').trim();
      sanitized = `${sanitized}\n\n${top5.join(' ')}`;
    }
    setInstagramCaption(sanitized);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(instagramCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">

      {/* Studio Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            AI Content Studio
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Generate athletic visuals with DALL-E 3 and viral captions (no raw links · max 5 hashtags).
          </p>
        </div>

        {/* Compliance Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
            hasForbiddenLinks
              ? 'bg-red-50 text-red-600 border-red-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {hasForbiddenLinks ? <AlertTriangle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            <span>{hasForbiddenLinks ? 'Link detected' : 'No raw links ✅'}</span>
          </div>

          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
            isHashtagCountValid
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <Hash className="w-3.5 h-3.5" />
            <span>Hashtags: {hashtagCount} / 5</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Left: Editor Controls */}
        <div className="lg:col-span-7 space-y-4 bg-white border border-gray-200 rounded-xl p-5">

          {/* AI Image Generator */}
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5" />
                AI Image Generator (DALL-E 3)
              </span>
              <span className="text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded font-mono">
                Pinterest style · no text
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { id: 'whey_isolate', label: '🥛 Whey & Protein' },
                { id: 'creatine_strength', label: '⚡ Creatine & Strength' },
                { id: 'pre_workout_energy', label: '🔥 Pre-Workout' },
                { id: 'collagen_wellness', label: '✨ Collagen & Skin' },
                { id: 'fat_burner_definition', label: '🏋️ Cut & Definition' },
                { id: 'recovery_bcaa', label: '🌿 BCAA & Recovery' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setProductCategory(cat.id)}
                  className={`p-2 rounded-lg font-medium border transition-colors text-left ${
                    productCategory === cat.id
                      ? 'bg-gray-900 border-gray-900 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerateAIImage}
              disabled={isGeneratingImage}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-700 text-white font-semibold text-xs disabled:opacity-50 transition-colors"
            >
              <Sparkles className={`w-4 h-4 ${isGeneratingImage ? 'animate-spin' : ''}`} />
              <span>{isGeneratingImage ? 'Generating with DALL-E 3...' : 'Generate with DALL-E 3'}</span>
            </button>
          </div>

          {/* Daily Slot Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Daily Posting Slot
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'motivation', icon: '🌅', label: 'Morning (08:30)' },
                { key: 'nutrition', icon: '🥗', label: 'Noon (12:30)' },
                { key: 'workout', icon: '🏋️', label: 'Evening (18:30)' }
              ].map(slot => (
                <button
                  key={slot.key}
                  type="button"
                  onClick={() => { setTheme(slot.key); handleGenerateCaption(slot.key); }}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-semibold transition-colors ${
                    theme === slot.key
                      ? 'bg-gray-900 border-gray-900 text-white'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  <span className="text-base mb-1">{slot.icon}</span>
                  <span>{slot.label}</span>
                  {isGeneratingCaption && theme === slot.key && (
                    <span className="text-[10px] mt-1 opacity-60">Generating...</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Caption Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                Instagram Caption
                <span className="text-[10px] text-gray-400 font-normal">({instagramCaption.length} chars)</span>
              </label>
              <div className="flex items-center gap-2">
                {!isFullyCompliant && (
                  <button
                    onClick={handleFixGuidelines}
                    className="text-[11px] bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded font-semibold hover:bg-red-600 hover:text-white transition-colors"
                  >
                    Fix guidelines
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <textarea
              value={instagramCaption}
              onChange={(e) => setInstagramCaption(e.target.value)}
              rows={7}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-800 leading-relaxed focus:outline-none focus:border-gray-400 resize-y"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-[11px] text-gray-400">
              ✅ Fully Instagram compliant
            </p>
            <button
              onClick={() => onTriggerPublishWithCustom({ instagramCaption, pinterestTitle, pinterestDescription, theme })}
              disabled={isPublishing || !isFullyCompliant}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-700 text-white font-semibold text-xs disabled:opacity-50 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isPublishing ? 'Posting...' : 'Post Now'}</span>
            </button>
          </div>

        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-5">
          <PostPreview
            media={currentMedia}
            caption={instagramCaption}
            pinterestTitle={pinterestTitle}
            pinterestDescription={pinterestDescription}
            theme={theme}
          />
        </div>

      </div>

    </div>
  );
}
