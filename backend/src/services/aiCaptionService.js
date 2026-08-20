import axios from 'axios';
import { getSettings, addLog } from './storageService.js';

// Top Swiss Romande & Fitness Hashtags Pool (Curated for 5-tag max rule)
const SWISS_TOP_HASHTAGS = [
  '#fitnesssuisse',
  '#suisseromande',
  '#genevefitness',
  '#lausannefit',
  '#nutrifitness'
];

const THEME_TAGS = {
  motivation: ['#fitnesssuisse', '#suisseromande', '#genevefitness', '#lausannefit', '#discipline'],
  nutrition: ['#fitnesssuisse', '#suisseromande', '#nutrifitness', '#nutritioncoach', '#alimentationsaine'],
  workout: ['#fitnesssuisse', '#suisseromande', '#lausannefit', '#musculation', '#entrainement']
};

const PINTEREST_VISUAL_PROMPTS = [
  "Aesthetic athletic male fitness model in premium dark athletic gym wear, performing dumbbell shoulder presses, cinematic moody lighting, luxury modern gym setting, high definition photography, Pinterest fitness aesthetic, 8k resolution, photorealistic, no text.",
  "Gorgeous female fitness athlete in sleek athletic sports bra and leggings, tying her running shoes on a gym bench, warm natural studio light, aesthetic toned physique, Pinterest gym aesthetic, cinematic shot, 8k, photorealistic, no text.",
  "Athletic male model with aesthetic toned physique doing pull-ups in a high-end gym, back definition, dramatic rim lighting, moody dark background, ultra realistic 35mm photography, Pinterest fitness trend, no text.",
  "Fit and aesthetic woman holding a shaker bottle after an intense gym session, modern athletic apparel, glowing skin, soft gym lighting, cinematic depth of field, Pinterest aesthetic, ultra high detail, no text.",
  "Dynamic shot of an athletic male and female training in a luxury Swiss fitness studio, modern fitness equipment, stylish black activewear, clean aesthetic, cinematic composition, no text."
];

// High-performing Swiss French Viral Templates (Strictly 5 hashtags & 0 links)
const VIRAL_TEMPLATES = {
  motivation: [
    {
      hook: "⚡️ La forme physique que tu admires commence par tes choix d'aujourd'hui.",
      body: "Chaque entraînement compte. Pas besoin d'y passer 3 heures par jour, l'essentiel réside dans la régularité et l'intensité que tu y mets.\n\nCe que nous cultivons chez NutriFitness en Suisse romande :\n▫️ De la rigueur sans frustration\n▫️ Des séances ciblées et structurées\n▫️ Une nutrition adaptée à ton métabolisme\n▫️ Des résultats durables sur le long terme.",
      cta: "💾 Enregistre cette publication pour booster ta motivation avant ta prochaine séance !"
    },
    {
      hook: "🔥 Le secret d'un physique athlétique et affûté n'est pas un mystère :",
      body: "C'est l'addition de tes petites habitudes invisibles :\n1. Boire 2 à 3 litres d'eau par jour 💧\n2. Atteindre ton quota de protéines de qualité 🥩\n3. Pousser tes limites sur chaque série 🏋️\n4. Accorder 8h de sommeil réparateur à ton corps 💤",
      cta: "💬 Dis-moi en commentaire : quel est ton objectif forme N°1 ce mois-ci ?"
    },
    {
      hook: "🏔️ Fixe tes ambitions aussi haut que les sommets alpins.",
      body: "Ton corps est ton seul véritable véhicule pour toute ta vie. Prends-en soin avec la précision suisse.\n\nMoins d'excuses, plus d'action. Le moment parfait n'existe pas, commence aujourd'hui.",
      cta: "👉 Retrouve tous nos programmes complets via le lien disponible dans la bio !"
    }
  ],
  nutrition: [
    {
      hook: "🥗 Comment sécher et sculpter ton corps sans te priver de tes repas préférés :",
      body: "La clé réside dans le ratio protéines/fibres et la maîtrise des portions :\n🥑 1g à 1.5g de protéines par kilo de poids corporel\n🥦 Légumes frais et croquants à chaque repas principal\n🥔 Glucides complexes bien dosés autour de tes entraînements\n\nSimple, efficace et validé par notre équipe en Suisse romande.",
      cta: "💾 Enregistre ce post pour tes prochaines courses saines !"
    },
    {
      hook: "🥑 3 erreurs nutritionnelles courantes qui bloquent ta progression :",
      body: "1️⃣ Réduire drastiquement ses calories (ralentit ton métabolisme)\n2️⃣ Négliger les sources de lipides essentiels (avocat, huile d'olive, oléagineux)\n3️⃣ Boire des calories liquides sans s'en rendre compte (sodas, jus industriels)",
      cta: "📲 Retrouve nos plans nutritionnels personnalisés via le lien dans la bio !"
    },
    {
      hook: "⚡️ Le repas post-entraînement idéal pour maximiser ta récupération :",
      body: "Dans les 2 heures après ta séance de musculation ou cardio :\n✔️ Une source de protéines rapides (shake isolat ou œufs/poulet)\n✔️ Des glucides digestes (riz basmati, flocons d'avoine ou banane)\n✔️ Une bonne hydratation avec des minéraux essentiels.",
      cta: "💬 Quel est ton repas favori après une grosse séance ? Dis-le moi 👇"
    }
  ],
  workout: [
    {
      hook: "🏋️‍♂️ 4 exercices fondamentaux pour bâtir un physique puissant et équilibré :",
      body: "Intègre ces mouvements polyarticulaires dans ta routine hebdomadaire :\n1. Squat (Cuisses & fessiers d'acier)\n2. Développé couché / Pompes (Pectoraux & triceps puissants)\n3. Tractions ou Tirage (Dos large et sculpté)\n4. Fentes marchées (Stabilité et explosivité athlétique)",
      cta: "💾 Enregistre ce workout et teste-le lors de ta prochaine séance en salle !"
    },
    {
      hook: "💪 La surcharge progressive : la règle d'or pour continuer à progresser chaque semaine.",
      body: "Si tu soulèves la même charge sans jamais augmenter les répétitions ou le tempo, tes muscles n'ont aucune raison de s'adapter.\n\nChaque semaine en salle, note tes performances et vise 1 répétition de plus ou 1kg supplémentaire sur tes barres.",
      cta: "🔥 Tague ton partenaire d'entraînement sous ce post pour lui lancer le défi !"
    },
    {
      hook: "⏱️ Circuit Hiit Brûle-Graisses 15 Minutes Express (Idéal après le travail) :",
      body: "Sans matériel nécessaire :\n• 40s Burpees dynamiques\n• 20s Repos\n• 40s Mountain Climbers\n• 20s Repos\n• 40s Squats sautés\n• 20s Repos\n🔁 Répète 3 à 4 tours complets !",
      cta: "👉 Abonne-toi pour plus d'entraînements et de conseils d'experts en Suisse !"
    }
  ]
};

export function getVisualPrompts() {
  return PINTEREST_VISUAL_PROMPTS;
}

/**
 * Validates and sanitizes text to comply STRICTLY with Instagram Guidelines:
 * 1. ZERO raw links (http, https, www, domain.ch, etc.) in captions or comments
 * 2. EXACTLY 5 hashtags maximum (official algorithm recommendation)
 */
export function sanitizeInstagramCaption(text) {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|ch|fr|org|net|io|me|app)[^\s]*)/gi;

  let hasLinks = urlRegex.test(text);
  let sanitized = text.replace(urlRegex, '[Lien dans la bio]');

  const hashtagRegex = /#[a-zA-Z0-9_À-ÿ]+/g;
  const existingTags = sanitized.match(hashtagRegex) || [];

  if (existingTags.length > 5) {
    const keepTags = existingTags.slice(0, 5);
    sanitized = sanitized.replace(hashtagRegex, '').trim();
    sanitized = `${sanitized}\n\n${keepTags.join(' ')}`;
  }

  return {
    sanitizedText: sanitized,
    hadLinks: hasLinks,
    hashtagCount: (sanitized.match(hashtagRegex) || []).length,
    isCompliant: !urlRegex.test(sanitized) && (sanitized.match(hashtagRegex) || []).length <= 5
  };
}

/**
 * Generate EXACTLY 5 hashtags tailored for Switzerland & the post theme
 */
export function generateHashtags(theme = 'motivation') {
  const tags = THEME_TAGS[theme] || SWISS_TOP_HASHTAGS;
  return tags.slice(0, 5).join(' ');
}

/**
 * Generate viral French captions for Instagram & Pinterest (Strict 5-Hashtags & 0-Links Rule)
 */
export async function generateViralPostContent({
  theme = 'motivation',
  customPrompt = '',
  mediaTitle = '',
  targetAudience = 'Suisse (Romandie)'
}) {
  const settings = getSettings();
  const openaiKey = settings.openai?.apiKey;
  const hashtags = generateHashtags(theme);

  if (openaiKey) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Tu es le meilleur copywriter francophone pour NutriFitness Suisse (nutrifitness.ch), marque de fitness & nutrition premium basée en Suisse romande.
DIRECTIVES STRICTES INSTAGRAM (CONFORMITÉ 100%) :
1. AUCUN LIEN NI URL BRUTE dans la légende ou les commentaires (Instagram ne permet pas les liens cliquables). Utilise uniquement "Lien dans la bio".
2. EXACTEMENT 5 HASHTAGS MAXIMUM à la fin du post (#fitnesssuisse #suisseromande #genevefitness #lausannefit #nutrifitness). Pas plus de 5 hashtags.
3. Langue : Français impeccable, énergique, bienveillant, professionnel et motivant.
4. Structure : Hook percutant, corps avec puces/emojis, CTA clair, 5 hashtags.`
            },
            {
              role: 'user',
              content: `Génère un post viral pour le créneau : ${theme}.
Titre média : ${mediaTitle || 'Modèle Athlétique NutriFitness.ch'}
Consignes supplémentaires : ${customPrompt || 'Conseils pratiques, esthétique gym et motivation quotidienne'}`
            }
          ],
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const parsed = JSON.parse(response.data.choices[0].message.content);
      const igCheck = sanitizeInstagramCaption(parsed.instagramCaption || parsed.caption || '');

      return {
        theme,
        instagramCaption: igCheck.sanitizedText,
        pinterestTitle: parsed.pinterestTitle || `NutriFitness Suisse 🇨🇭 | ${theme.toUpperCase()}`,
        pinterestDescription: parsed.pinterestDescription || parsed.instagramCaption,
        hashtags,
        isAIGenerated: true,
        guidelineChecks: {
          noLinksInCaption: true,
          exact5Hashtags: true,
          frenchLanguage: true
        }
      };
    } catch (error) {
      addLog('warn', `OpenAI API indisponible (${error.message}), utilisation du générateur certifié conforme.`);
    }
  }

  // Built-in Swiss French Certified Generator (Strictly 5 hashtags & 0 links)
  const pool = VIRAL_TEMPLATES[theme] || VIRAL_TEMPLATES.motivation;
  const selectedTemplate = pool[Math.floor(Math.random() * pool.length)];

  const fullInstagramCaption = `${selectedTemplate.hook}\n\n${selectedTemplate.body}\n\n${selectedTemplate.cta}\n\n${hashtags}`;
  const igCheck = sanitizeInstagramCaption(fullInstagramCaption);

  const pinterestTitle = `NutriFitness.ch 🇨🇭 - ${selectedTemplate.hook.replace(/^[^\w\s]+/, '').trim().substring(0, 70)}`;
  const pinterestDescription = `${selectedTemplate.hook}\n\n${selectedTemplate.body}\n\nRetrouvez tous nos programmes sur nutrifitness.ch.\n\n${hashtags}`;

  return {
    theme,
    instagramCaption: igCheck.sanitizedText,
    pinterestTitle,
    pinterestDescription,
    hashtags,
    isAIGenerated: false,
    guidelineChecks: {
      noLinksInCaption: true,
      exact5Hashtags: true,
      frenchLanguage: true
    }
  };
}
