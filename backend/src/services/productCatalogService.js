import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { addLog } from './storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CATALOG_PATH = path.join(__dirname, '../../data/nutrifitness_catalog.json');

let cachedProducts = null;

const CSV_PATHS = [
  '/Users/shikha/Downloads/nutrifitness instgram /wc-product-export-2-9-2026-1788288402546.csv',
  path.join(__dirname, '../../../wc-product-export-2-9-2026-1788288402546.csv'),
  path.join(__dirname, '../../data/wc-product-export-2-9-2026-1788288402546.csv')
];

function parseWooCommerceCSV(content) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let cur = '';
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    const next = content[i+1];
    if (c === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
    } else if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      row.push(cur);
      cur = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      row.push(cur);
      cur = '';
      if (row.length > 1 || (row[0] && row[0].trim() !== '')) lines.push(row);
      row = [];
    } else {
      cur += c;
    }
  }
  if (cur || row.length) {
    row.push(cur);
    lines.push(row);
  }
  if (lines.length < 2) return [];

  const headers = lines[0].map(h => h.trim().replace(/^[\uFEFF"]+|"+$/g, ''));
  const nameIdx = headers.indexOf('Name');
  const shortDescIdx = headers.indexOf('Short description');
  const descIdx = headers.indexOf('Description');
  const catIdx = headers.indexOf('Categories');
  const slugIdx = headers.indexOf('Slug');

  const products = [];
  for (let i = 1; i < lines.length; i++) {
    const r = lines[i];
    const name = (r[nameIdx] || '').trim();
    if (!name) continue;
    products.push({
      id: name,
      name,
      slug: (r[slugIdx] || name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      short_description: (r[shortDescIdx] || '').trim(),
      description: (r[descIdx] || '').trim(),
      categories: (r[catIdx] || '').split(',').map(c => c.trim()).filter(Boolean)
    });
  }
  return products;
}

/**
 * Loads products from WooCommerce CSV (highest priority), user custom file, local JSON cache, or WooCommerce API
 */
export async function getProductCatalog() {
  if (cachedProducts && cachedProducts.length > 0) {
    return cachedProducts;
  }

  // 1. Highest priority: WooCommerce Product Export CSV
  for (const csvPath of CSV_PATHS) {
    if (fs.existsSync(csvPath)) {
      try {
        const raw = fs.readFileSync(csvPath, 'utf8');
        const parsed = parseWooCommerceCSV(raw);
        if (parsed.length > 0) {
          cachedProducts = parsed;
          addLog('info', `Loaded ${cachedProducts.length} official products from WooCommerce CSV (${path.basename(csvPath)})`);
          return cachedProducts;
        }
      } catch (err) {
        console.warn('Error reading WooCommerce CSV:', err.message);
      }
    }
  }

  // 2. User-provided custom products file
  for (const customPath of CUSTOM_PATHS) {
    if (fs.existsSync(customPath)) {
      try {
        const raw = fs.readFileSync(customPath, 'utf8').trim();
        if (customPath.endsWith('.json')) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cachedProducts = parsed.map(p => ({
              id: p.id || p.name,
              name: p.name,
              slug: p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              short_description: p.short_description || p.shortDescription || p.description || '',
              description: p.description || p.longDescription || '',
              categories: p.categories || []
            }));
            addLog('info', `Loaded ${cachedProducts.length} custom products from ${path.basename(customPath)}`);
            return cachedProducts;
          }
        } else {
          // Text format: parse blocks separated by --- or double newlines
          const blocks = raw.split(/\n---\n|\n\n(?=[A-Z0-9])/);
          cachedProducts = blocks.map((b, i) => {
            const lines = b.trim().split('\n').map(l => l.trim()).filter(Boolean);
            const name = lines[0] || `Product ${i+1}`;
            const desc = lines.slice(1).join('\n');
            return {
              id: name,
              name,
              slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              short_description: desc,
              description: desc,
              categories: []
            };
          });
          if (cachedProducts.length > 0) {
            addLog('info', `Loaded ${cachedProducts.length} custom products from ${path.basename(customPath)}`);
            return cachedProducts;
          }
        }
      } catch (e) {
        console.warn('Error reading custom products file:', e.message);
      }
    }
  }

  // 2. Local WooCommerce catalog cache
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

  const rawFilename = (media?.filename || media?.title || media?.public_id || '')
    .replace(/\s*-\s*\d+\.(png|jpe?g|webp)$/i, '')
    .replace(/\.[^/.]+$/, '')
    .trim();

  const normalize = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const normSearch = normalize(rawFilename);

  // 1. Direct exact or strong substring match in catalog
  for (const product of catalog) {
    const normName = normalize(product.name);
    if (normName === normSearch || normSearch.includes(normName) || (normSearch.length > 6 && normName.includes(normSearch))) {
      return product;
    }
  }

  // 2. Token overlap match
  const tokens = rawFilename.toLowerCase().split(/[\s,–-]+/).filter(t => t.length > 2);
  let bestProduct = null;
  let maxTokens = 0;
  for (const product of catalog) {
    const pLower = product.name.toLowerCase();
    const count = tokens.filter(t => pLower.includes(t)).length;
    if (count > maxTokens) {
      maxTokens = count;
      bestProduct = product;
    }
  }
  if (bestProduct && maxTokens >= Math.min(2, tokens.length)) {
    return bestProduct;
  }

  // 3. Keyword rules fallback
  const fullSearch = `${media?.filename || ''} ${media?.public_id || ''} ${media?.title || ''}`.toLowerCase();
  for (const mapping of KEYWORD_MAPPINGS) {
    if (mapping.keywords.some(kw => fullSearch.includes(kw))) {
      const match = catalog.find(p => p.name.toUpperCase().includes(mapping.query.toUpperCase()));
      if (match) return match;
    }
  }

  // 4. Fallback: Curated high-converting bestsellers on nutrifitness.ch in round-robin order
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
  const normName = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const stripHtml = s => (s || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;/g, "'").replace(/&nbsp;/g, ' ').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
  const shortDesc = stripHtml(product.short_description || '');
  const fullDesc = stripHtml(product.description || '');

  // Extract clean bullet points from description
  const excludedPhrases = [
    'conseil', 'utilisation', 'avertissement', 'recommandé',
    'dépasser', 'portée', 'enfant', 'substitut', 'varié', 'équilibré', 'consommer de préférence', 'verre d\'eau'
  ];

  const rawText = (shortDesc && shortDesc.length > 25) ? shortDesc : fullDesc;
  const bulletLines = rawText
    .split(/✅|✔|•|\. |▪|▫/)
    .map(s => s.trim().replace(/^[-–—]\s*/, ''))
    .filter(s => {
      const lower = s.toLowerCase();
      return s.length >= 8 && s.length <= 95 &&
        !lower.includes('http') &&
        !lower.includes('chf') &&
        !excludedPhrases.some(p => lower.includes(p));
    });

  let benefits = bulletLines.slice(0, 4);
  if (benefits.length < 2) {
    if (normName.includes('magnesium')) {
      benefits = [
        'Haute biodisponibilité et absorption supérieure (Bisglycinate)',
        'Contribue à réduire la fatigue et prévient les crampes',
        'Soutient le fonctionnement normal du système nerveux et musculaire',
        'Idéal pour sportifs réguliers et récupération nocturne'
      ];
    } else {
      benefits = [
        'Formule premium de haute qualité et pureté certifiée',
        'Excellente digestibilité et assimilation rapide',
        'Idéal pour soutenir la performance et la récupération'
      ];
    }
  }

  // Determine post theme based on categories or name
  let theme = 'motivation';

  if (normName.includes('whey') || normName.includes('protein') || normName.includes('iso') || normName.includes('mass') || normName.includes('gainer') || normName.includes('avoine') || normName.includes('snack') || normName.includes('cookie') || normName.includes('butter') || normName.includes('peanut') || normName.includes('cacahuete')) {
    theme = 'nutrition';
  } else if (normName.includes('caffeine') || normName.includes('cafeine') || normName.includes('creatine') || normName.includes('creapure') || normName.includes('ghost') || normName.includes('pre-workout') || normName.includes('preworkout') || normName.includes('abe') || normName.includes('infected') || normName.includes('eaa') || normName.includes('bcaa') || normName.includes('burn') || normName.includes('citrulline') || normName.includes('beta-alanine')) {
    theme = 'workout';
  }

  // Hook tailored to product
  let hook = `⚡️ Boost tes performances avec ${name} !`;
  if (theme === 'workout') {
    hook = `🔥 Maximise chaque séance avec ${name} !`;
  } else if (theme === 'nutrition') {
    hook = `🥗 Optimise ta nutrition avec ${name} !`;
  }

  // Build benefits list
  let benefitsText = '';
  if (benefits.length > 0) {
    benefitsText = benefits.map(b => `▫️ ${b}`).join('\n');
  } else {
    benefitsText = `▫️ Formule premium testée et approuvée\n▫️ Haute qualité et pureté maximale\n▫️ Idéal pour sportifs et personnes actives\n▫️ Efficacité et digestibilité optimale`;
  }

  // Usage guidance based on product
  let advice = "Prends 1 dose selon tes besoins pour des résultats optimaux.";
  if (normName.includes('whey') || normName.includes('iso') || normName.includes('protein')) {
    advice = "Consomme 1 shaker immédiatement après l'entraînement ou en collation pour soutenir ta masse musculaire.";
  } else if (normName.includes('mass') || normName.includes('gainer')) {
    advice = "Prends 1 dose en collation ou après l'entraînement pour maximiser ta prise de masse.";
  } else if (normName.includes('creatine') || normName.includes('creapure')) {
    advice = "Prends 3 à 5g par jour avec de l'eau ou ton shaker pour maximiser ta force et ta récupération.";
  } else if (normName.includes('caffeine') || normName.includes('cafeine') || normName.includes('pre-workout') || normName.includes('preworkout') || normName.includes('abe') || normName.includes('infected') || normName.includes('blast') || normName.includes('citrulline') || normName.includes('beta-alanine') || (normName.includes('ghost') && !normName.includes('whey'))) {
    advice = "Consomme 1 dose 20 à 30 minutes avant ta séance pour un boost d'énergie et une concentration maximale.";
  } else if (normName.includes('glycine') || normName.includes('magnesium') || normName.includes('ashwagandha') || normName.includes('sommeil')) {
    advice = "Prends ta dose environ 30 minutes avant le coucher pour un sommeil profond et réparateur.";
  } else if (normName.includes('fat burn') || normName.includes('burn') || normName.includes('carnitine')) {
    advice = "Prends ta dose le matin ou avant ta séance pour stimuler ton métabolisme.";
  } else if (normName.includes('peanut') || normName.includes('cacahuete')) {
    advice = "À déguster en tartine, dans vos porridges ou avant votre entraînement pour un plein d'énergie saine.";
  }

  // Dynamic product-specific hashtag (always exactly 5 hashtags total)
  let productHashtag = '#musculation';
  if (normName.includes('creatine') || normName.includes('creapure')) productHashtag = '#creatine';
  else if (normName.includes('whey') || normName.includes('iso')) productHashtag = '#wheyisolate';
  else if (normName.includes('mass') || normName.includes('gainer')) productHashtag = '#massgainer';
  else if (normName.includes('pre-workout') || normName.includes('preworkout') || normName.includes('abe') || normName.includes('infected')) productHashtag = '#preworkout';
  else if (normName.includes('caffeine') || normName.includes('cafeine')) productHashtag = '#energie';
  else if (normName.includes('ashwagandha')) productHashtag = '#ashwagandha';
  else if (normName.includes('peanut') || normName.includes('cacahuete')) productHashtag = '#peanutbutter';
  else if (normName.includes('fat burn') || normName.includes('burn') || normName.includes('carnitine')) productHashtag = '#bruleurdegraisse';
  else if (normName.includes('glycine') || normName.includes('sommeil')) productHashtag = '#recuperation';
  else if (normName.includes('magnesium') || normName.includes('zinc')) productHashtag = '#santeactive';
  else if (normName.includes('omega')) productHashtag = '#omega3';
  else if (normName.includes('collagene')) productHashtag = '#collagene';
  else if (normName.includes('shaker')) productHashtag = '#fitnesslifestyle';

  const fiveHashtags = `#fitnesssuisse #suisseromande ${productHashtag} #nutrifitness #musculationsuisse`;

  // Construct final Instagram caption (No prices, clean Swiss link CTA, exactly 5 hashtags)
  const instagramCaption = `${hook}

👉 Pourquoi ${name} fait la différence :
${benefitsText}

💡 Conseil NutriFitness :
${advice}

🇨🇭 Disponible dès maintenant sur nutrifitness.ch (lien direct en bio).

${fiveHashtags}`;

  const pinterestTitle = `${name} | NutriFitness Suisse 🇨🇭`;
  const pinterestDescription = `${name} disponible sur nutrifitness.ch. ${shortDesc.slice(0, 200)} Conseils sport & nutrition en Suisse romande.`;

  return {
    theme,
    product,
    instagramCaption,
    pinterestTitle,
    pinterestDescription
  };
}

