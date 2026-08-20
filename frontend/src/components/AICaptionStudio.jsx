import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  ShieldCheck, 
  AlertTriangle, 
  Play, 
  RefreshCw, 
  Hash, 
  Flame, 
  Camera,
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
  const [pinterestTitle, setPinterestTitle] = useState('NutriFitness.ch 🇨🇭 - Motivation & Entraînement Athlétique');
  const [pinterestDescription, setPinterestDescription] = useState('Découvrez nos conseils fitness et nutrition adaptés pour la Suisse romande. Retrouvez tous nos programmes sur nutrifitness.ch.');
  const [copied, setCopied] = useState(false);
  const [visualPrompts, setVisualPrompts] = useState([]);
  const [showPromptsModal, setShowPromptsModal] = useState(false);

  // Instagram Guidelines Validator
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|ch|fr|org|net|io|me)[^\s]*)/gi;
  const hashtagRegex = /#[a-zA-Z0-9_À-ÿ]+/g;

  const hasForbiddenLinks = urlRegex.test(instagramCaption);
  const hashtagCount = (instagramCaption.match(hashtagRegex) || []).length;
  const isHashtagCountValid = hashtagCount <= 5;
  const isFullyCompliant = !hasForbiddenLinks && isHashtagCountValid;

  useEffect(() => {
    fetch('/api/ai/visual-prompts')
      .then(res => res.json())
      .then(data => setVisualPrompts(data.prompts || []))
      .catch(err => console.error(err));
  }, []);

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
        body: JSON.stringify({
          theme: productCategory,
          customPrompt
        })
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        setCurrentMedia({
          secure_url: data.imageUrl,
          title: `Visuel IA DALL-E 3 (${data.category})`,
          aspect_ratio: '1:1',
          format: 'png',
          isAIGenerated: true
        });
      } else {
        alert(data.error || 'Erreur lors de la génération DALL-E 3');
      }
    } catch (err) {
      console.error('Error generating image with DALL-E 3:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleFixGuidelines = () => {
    let sanitized = instagramCaption.replace(urlRegex, '[Lien dans la bio]');
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
    <div className="space-y-6">
      
      {/* Studio Header */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              Studio IA de Création (DALL-E 3 & Rédaction nutrifitness.ch)
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
              🇨🇭 Suisse Romande (Français)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Générez de nouveaux visuels athlétiques avec DALL-E 3 et des légendes virales (0 lien brut & 5 hashtags max).
          </p>
        </div>

        {/* Live Instagram Compliance Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
            hasForbiddenLinks 
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}>
            {hasForbiddenLinks ? <AlertTriangle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            <span>{hasForbiddenLinks ? 'Lien détecté' : '0 Lien Brut ✅'}</span>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
            isHashtagCountValid 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            <Hash className="w-3.5 h-3.5" />
            <span>Hashtags : {hashtagCount} / 5 max</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Editor & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Creator Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5 bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
          
          {/* 1. DALL-E 3 Visual Generator Section */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-indigo-500/5 border border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Wand2 className="w-4 h-4" />
                Générateur de Nouveaux Visuels IA (DALL-E 3)
              </span>
              <span className="text-[10px] bg-slate-950 text-purple-300 px-2 py-0.5 rounded font-mono">
                Style Pinterest (0 texte)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { id: 'whey_isolate', label: '🥛 Isolat & Protéine' },
                { id: 'creatine_strength', label: '⚡ Créatine & Force' },
                { id: 'pre_workout_energy', label: '🔥 Booster Pré-Workout' },
                { id: 'collagen_wellness', label: '✨ Collagène & Peau' },
                { id: 'fat_burner_definition', label: '🏋️ Sèche & Définition' },
                { id: 'recovery_bcaa', label: '🌿 BCAA & Récupération' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setProductCategory(cat.id)}
                  className={`p-2 rounded-lg font-semibold border transition-all text-left ${
                    productCategory === cat.id
                      ? 'bg-purple-600/30 border-purple-500 text-white shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerateAIImage}
              disabled={isGeneratingImage}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 disabled:opacity-50 transition-all"
            >
              <Sparkles className={`w-4 h-4 ${isGeneratingImage ? 'animate-spin' : ''}`} />
              <span>{isGeneratingImage ? 'Génération DALL-E 3 en cours...' : 'Générer ce Visuel avec DALL-E 3'}</span>
            </button>
          </div>

          {/* 2. Theme & Caption Creator */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Créneau de Publication Quotidien
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setTheme('motivation'); handleGenerateCaption('motivation'); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                  theme === 'motivation'
                    ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/50 text-amber-300 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-lg mb-1">🌅</span>
                <span>Matin (08:30)</span>
              </button>

              <button
                type="button"
                onClick={() => { setTheme('nutrition'); handleGenerateCaption('nutrition'); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                  theme === 'nutrition'
                    ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-emerald-500/50 text-emerald-300 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-lg mb-1">🥗</span>
                <span>Midi (12:30)</span>
              </button>

              <button
                type="button"
                onClick={() => { setTheme('workout'); handleGenerateCaption('workout'); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                  theme === 'workout'
                    ? 'bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border-blue-500/50 text-blue-300 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-lg mb-1">🏋️‍♂️</span>
                <span>Soir (18:30)</span>
              </button>
            </div>
          </div>

          {/* 3. Caption Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Légende Instagram en Français</span>
                <span className="text-[10px] text-slate-500 font-normal">({instagramCaption.length} caractères)</span>
              </label>
              <div className="flex items-center gap-2">
                {!isFullyCompliant && (
                  <button
                    onClick={handleFixGuidelines}
                    className="text-[11px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-md font-semibold hover:bg-rose-500 hover:text-white transition-all"
                  >
                    Corriger (0 lien & 5 hashtags)
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copié !' : 'Copier'}
                </button>
              </div>
            </div>

            <textarea
              value={instagramCaption}
              onChange={(e) => setInstagramCaption(e.target.value)}
              rows={7}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-sans leading-relaxed focus:outline-none focus:border-emerald-500 resize-y"
            />
          </div>

          {/* 4. Action */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              💡 100% conforme aux règles Instagram.
            </div>
            <button
              onClick={() => onTriggerPublishWithCustom({
                instagramCaption,
                pinterestTitle,
                pinterestDescription,
                theme
              })}
              disabled={isPublishing || !isFullyCompliant}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isPublishing ? 'Publication...' : 'Publier Maintenant'}</span>
            </button>
          </div>

        </div>

        {/* Right Column: Preview (5 cols) */}
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
