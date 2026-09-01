import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { addLog } from './storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CATALOG_PATH = path.join(__dirname, '../../data/nutrifitness_catalog.json');

let cachedProducts = null;

/**
 * Loads products from local JSON cache, or fetches from WooCommerce Store API if empty
 */
export async function getProductCatalog() {
  if (cachedProducts && cachedProducts.length > 0) {
    return cachedProducts;
  }

  try {
    if (fs.existsSync(CATALOG_PATH)) {
      const data = fs.readFileSync(CATALOG_PATH, 'utf8');
      cachedProducts = JSON.parse(data);
      if (cachedProducts.length > 0) return cachedProducts;
    }
  } catch (err) {
    console.warn('Could not read cached catalog, will fetch live:', err.message);
  }

  // Fallback: Fetch live from nutrifitness.ch
  try {
    let page = 1;
    const products = [];
    while (page <= 2) {
      const res = await fetch(`https://nutrifitness.ch/wp-json/wc/store/v1/products?per_page=100&page=${page}`);
      if (!res.ok) break;
      const items = await res.json();
      if (!items.length) break;
      products.push(...items);
      if (items.length < 100) break;
      page++;
    }

    const strip = html => (html || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

    cachedProducts = products.map(p => ({
      id: p.id,
      name: strip(p.name),
      slug: p.slug,
      permalink: p.permalink,
      price: p.prices?.price ? `${(Number(p.prices.price) / 100).toFixed(2)} CHF` : null,
      categories: (p.categories || []).map(c => strip(c.name)),
      short_description: strip(p.short_description),
      description: strip(p.description)?.slice(0, 1000),
      images: (p.images || []).map(i => i.src)
    }));

    try {
      fs.mkdirSync(path.dirname(CATALOG_PATH), { recursive: true });
      fs.writeFileSync(CATALOG_PATH, JSON.stringify(cachedProducts, null, 2));
    } catch (e) {}

    addLog('info', `Product catalog loaded with ${cachedProducts.length} items from nutrifitness.ch`);
    return cachedProducts;
  } catch (error) {
    console.error('Error fetching catalog from nutrifitness.ch:', error);
    return cachedProducts || [];
  }
}

/**
 * Keyword matchers mapping image filenames or titles to specific nutrifitness.ch products
 */
const KEYWORD_MAPPINGS = [
  { keywords: ['ghost', 'legend', 'pre-workout', 'preworkout'], query: 'GHOST WHEY 918G' },
  { keywords: ['caffeine', 'cafeine', 'stimulant', 'caffein'], query: 'CAFFEINE 200MG 60 TABS' },
  { keywords: ['creatine', 'creapure', 'kreatin'], query: 'CREAPURE BIGMAN 300G' },
  { keywords: ['iso90', 'iso-90', 'cfm', 'isolate'], query: 'ISO 90X CFM 1KG' },
  { keywords: ['fatburn', 'fat-burn', 'bruleur', 'thermo', 'burn'], query: 'FAT BURN 60 CAPS' },
  { keywords: ['ashwagandha', 'ksm66', 'ksm-66', 'stress'], query: 'Ashwagandha KSM-66® 600mg' },
  { keywords: ['avoine', 'oat', 'flocons', 'farine'], query: "FARINE D'AVOINE 1KG" },
  { keywords: ['glycine', 'sommeil', 'recuperation', 'collagene'], query: 'GLYCINE 300G' },
  { keywords: ['zinc', 'immunite'], query: 'ZINC BISGLYCINATE 160 CAPS' },
  { keywords: ['magnesium', 'bisglycinate', 'crampes'], query: 'MAGNÉSIUM BISGLYCINATE 60 TABS' },
  { keywords: ['bcaa', 'amino', 'eaa'], query: 'BM EAA 300G' },
  { keywords: ['mass', 'gainer', 'anabolic'], query: 'ANABOLIC MASS 2.5KG' },
  { keywords: ['shaker', 'gourde', 'bouteille'], query: 'NF SHAKER 600ML' },
  { keywords: ['cookie', 'snack', 'barre', 'protein bar'], query: 'MAX PROTÉINES COOKIE' },
  { keywords: ['peanut', 'beurre', 'cacahuete', 'butter'], query: 'PEANUT BUTTER CREMEUX 500G' }
];

/**
 * Matches a media asset to the best fitting product on nutrifitness.ch
 */
export async function matchProductForMedia(media, index = 0) {
  const catalog = await getProductCatalog();
  if (!catalog || catalog.length === 0) return null;

  const searchText = `${media?.filename || ''} ${media?.public_id || ''} ${media?.title || ''}`.toLowerCase();

  // 1. Try keyword rules
  for (const mapping of KEYWORD_MAPPINGS) {
    if (mapping.keywords.some(kw => searchText.includes(kw))) {
      const match = catalog.find(p => p.name.toUpperCase().includes(mapping.query.toUpperCase()));
      if (match) return match;
    }
  }

  // 2. Try direct product name in filename
  for (const product of catalog) {
    const cleanName = product.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanSearch = searchText.replace(/[^a-z0-9]/g, '');
    if (cleanSearch.includes(cleanName) && cleanName.length > 3) {
      return product;
    }
  }

  // 3. Fallback: Curated high-converting bestsellers on nutrifitness.ch in round-robin order
  const bestSellerSlugs = [
    'caffeine-200mg-60-tabs',
    'ghost-whey-918g',
    'creapure-bigman-300g',
    'iso-90x-cfm-1kg',
    'fat-burn-60-caps',
    'ashwagandha-ksm-66-600mg',
    'farine-davoine-1kg',
    'glycine-300g',
    'magnesium-bisglycinate-60-tabs',
    'zinc-bisglycinate-160-caps',
    'anabolic-mass-2-5kg',
    'bm-eaa-300g',
    'peanut-butter-cremeux-500g',
    'max-proteines-cookie',
    'omega-3-120-softgels'
  ];

  const targetSlug = bestSellerSlugs[index % bestSellerSlugs.length];
  const matched = catalog.find(p => p.slug === targetSlug) || catalog[index % catalog.length];
  return matched;
}

/**
 * Generates an authentic, high-converting French Swiss Instagram & Pinterest caption
 * using real product specs, benefits, and price from nutrifitness.ch.
 */
export function generateCaptionFromProduct(product, options = {}) {
  const name = product.name;
  const price = product.price ? `(${product.price})` : '';
  const shortDesc = product.short_description || '';
  const fullDesc = product.description || '';

  // Extract clean bullet points from description
  const bulletLines = shortDesc
    .split(/✅|✔|•|\n/)
    .map(s => s.trim())
    .filter(s => s.length > 5 && !s.toLowerCase().includes('http'));

  const benefits = bulletLines.slice(0, 4);

  // Determine post theme based on categories or name
  let theme = 'motivation';
  const nameLower = name.toLowerCase();
  if (nameLower.includes('whey') || nameLower.includes('protein') || nameLower.includes('iso') || nameLower.includes('mass') || nameLower.includes('avoine') || nameLower.includes('snack') || nameLower.includes('cookie') || nameLower.includes('butter')) {
    theme = 'nutrition';
  } else if (nameLower.includes('caffeine') || nameLower.includes('creatine') || nameLower.includes('ghost') || nameLower.includes('pre-workout') || nameLower.includes('eaa') || nameLower.includes('bcaa') || nameLower.includes('burn')) {
    theme = 'workout';
  }

  // Hook tailored to product
  let hook = `⚡️ ${name} — Le choix de l'élite pour tes objectifs en Suisse romande !`;
  if (theme === 'workout') {
    hook = `🔥 Maximise chaque répétition avec ${name} !`;
  } else if (theme === 'nutrition') {
    hook = `🥗 Atteins tes quotas de nutrition sans compromis : découvre ${name}.`;
  }

  // Build benefits list
  let benefitsText = '';
  if (benefits.length > 0) {
    benefitsText = benefits.map(b => `▫️ ${b}`).join('\n');
  } else {
    benefitsText = `▫️ Formule de qualité pharmaceutique testée et approuvée\n▫️ Pureté maximale & haute biodisponibilité\n▫️ Idéal pour sportifs et personnes actives en Suisse\n▫️ Résultats visibles et digestibilité optimale`;
  }

  // Usage guidance based on product
  let advice = "Prends 1 dose selon tes besoins d'entraînement pour des performances optimales.";
  if (nameLower.includes('caffeine') || nameLower.includes('pre-workout') || nameLower.includes('ghost')) {
    advice = "Consomme 1 dose 20 à 30 minutes avant ta séance pour un focus tranchant et zéro coup de fatigue.";
  } else if (nameLower.includes('whey') || nameLower.includes('iso') || nameLower.includes('protein')) {
    advice = "Consomme 1 shaker immédiatement après l'entraînement ou au petit-déjeuner pour nourrir tes fibres musculaires.";
  } else if (nameLower.includes('creatine') || nameLower.includes('creapure')) {
    advice = "Prends 3 à 5g par jour de façon régulière avec de l'eau ou ton shaker pour saturer tes stocks d'ATP.";
  } else if (nameLower.includes('glycine') || nameLower.includes('magnesium') || nameLower.includes('sommeil')) {
    advice = "Prends ta dose environ 30 minutes avant le coucher pour optimiser ton sommeil profond et ta régénération nerveuse.";
  } else if (nameLower.includes('fat burn') || nameLower.includes('burn')) {
    advice = "Prends ta dose le matin ou avant une séance cardio pour accélérer ta dépense calorique.";
  }

  // Construct final Instagram caption
  const instagramCaption = `${hook}

Tu cherches à optimiser tes performances, ta silhouette ou ta récupération ? Ne laisse rien au hasard.

👉 Pourquoi ${name} fait la différence :
${benefitsText}

💡 Conseil NutriFitness :
${advice}

🇨🇭 Retrouve ${name} ${price} directement sur notre boutique officielle nutrifitness.ch !
Lien disponible dans la bio. Livraison express partout en Suisse romande (Genève, Lausanne, Valais, Fribourg, Neuchâtel).

#fitnesssuisse #suisseromande #nutrifitness #genevefitness #lausannefit`;

  const pinterestTitle = `${name} | NutriFitness Suisse 🇨🇭`;
  const pinterestDescription = `${name} disponible sur nutrifitness.ch. ${shortDesc.slice(0, 200)} Livraison rapide en Suisse romande. Conseils sport & nutrition.`;

  return {
    theme,
    product,
    instagramCaption,
    pinterestTitle,
    pinterestDescription
  };
}
