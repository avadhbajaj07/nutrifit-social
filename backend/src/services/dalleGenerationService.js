import axios from 'axios';
import { getSettings, addLog } from './storageService.js';

// Curated Pinterest-aesthetic visual prompts for NutriFitness.ch products
const PRODUCT_VISUAL_CONCEPTS = [
  {
    theme: 'whey_isolate',
    category: 'Protéines & Isolat',
    prompt: 'A stunning aesthetic female fitness athlete in sleek matte black athletic gym wear, drinking from a luxury frosted protein shaker bottle after an intense workout in a high-end modern Swiss gym, warm natural cinematic lighting, toned athletic physique, ultra-realistic 35mm photography, Pinterest fitness aesthetic, 8k resolution, completely photorealistic, strictly NO text, NO logos, NO letters on image.'
  },
  {
    theme: 'creatine_strength',
    category: 'Force & Créatine',
    prompt: 'A handsome muscular athletic male fitness model with defined aesthetic physique, resting between heavy dumbbell sets on an incline bench in a luxury dark-themed fitness club, dramatic rim lighting, sweat on toned muscles, cinematic moody depth of field, Pinterest gym trend, ultra detailed photography, 8k, strictly NO text, NO writing on image.'
  },
  {
    theme: 'pre_workout_energy',
    category: 'Booster Pré-Entraînement',
    prompt: 'An athletic and energetic female model with glowing skin and toned abs, tying her athletic shoes on a gym wooden platform, preparing for workout, natural sunlight streaming through high gym windows, luxury Geneva fitness studio vibe, high fashion sports photography, Pinterest aesthetic, strictly NO text, NO words.'
  },
  {
    theme: 'collagen_wellness',
    category: 'Collagène & Bien-être',
    prompt: 'A gorgeous fit woman in pastel athletic activewear holding a clean glass tumbler with a fresh healthy drink, standing on a minimalist balcony overlooking Lake Geneva and the Swiss Alps, bright morning sunlight, radiant skin, wellness lifestyle photography, Pinterest aesthetic, 8k, strictly NO text on image.'
  },
  {
    theme: 'fat_burner_definition',
    category: 'Sèche & Définition',
    prompt: 'A powerful and aesthetic male athlete doing pull-ups in a high-end athletic training facility, back muscle definition, dramatic shadows, athletic dark gym attire, cinematic commercial sports lighting, ultra high definition, Pinterest fitness inspiration, strictly NO text, NO letters.'
  },
  {
    theme: 'recovery_bcaa',
    category: 'Récupération & Acides Aminés',
    prompt: 'Two athletic fitness models, male and female, in stylish monochrome activewear, stretching and smiling after a workout in an upscale Swiss fitness center, clean modern interior, soft cinematic studio lights, Pinterest fitness lifestyle photography, 8k, strictly NO text.'
  }
];

export async function generateAIVisualWithDalle(theme = 'whey_isolate', customPrompt = '') {
  const settings = getSettings();
  const apiKey = process.env.OPENAI_API_KEY || settings.openai?.apiKey;

  if (!apiKey) {
    throw new Error('Clé API OpenAI non configurée.');
  }

  const concept = PRODUCT_VISUAL_CONCEPTS.find(c => c.theme === theme) || PRODUCT_VISUAL_CONCEPTS[0];
  const finalPrompt = customPrompt
    ? `${customPrompt}. Cinematic lighting, athletic fitness model, Pinterest gym aesthetic, 8k photorealistic, strictly NO text, NO words, NO letters on image.`
    : concept.prompt;

  addLog('info', `Génération d'un visuel IA DALL-E 3 pour NutriFitness.ch (${theme})...`);

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        model: 'dall-e-3',
        prompt: finalPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
        style: 'natural'
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    const imageUrl = response.data?.data?.[0]?.url;
    addLog('success', `Nouveau visuel IA DALL-E 3 généré avec succès pour NutriFitness.ch !`);

    return {
      success: true,
      imageUrl,
      revisedPrompt: response.data?.data?.[0]?.revised_prompt || finalPrompt,
      theme,
      aspectRatio: '1:1',
      category: concept.category
    };
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    addLog('error', `Erreur de génération DALL-E 3 : ${errMsg}`);
    throw new Error(errMsg);
  }
}

export function getProductConcepts() {
  return PRODUCT_VISUAL_CONCEPTS;
}
