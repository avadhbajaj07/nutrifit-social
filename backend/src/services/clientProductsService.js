import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRODUCTS_DIR = path.join(__dirname, '../../../products');

export function getClientProductsList() {
  if (!fs.existsSync(PRODUCTS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(PRODUCTS_DIR);
  return files
    .filter(file => !file.startsWith('.') && /\.(jpg|jpeg|png|webp)$/i.test(file))
    .map(file => {
      const cleanTitle = file
        .replace(/^imgi_\d+_/, '')
        .replace(/-768x768/g, '')
        .replace(/\.(png|webp|jpg|jpeg)$/i, '')
        .replace(/-/g, ' ');

      return {
        filename: file,
        title: cleanTitle,
        secure_url: `/products-media/${encodeURIComponent(file)}`,
        fullLocalPath: path.join(PRODUCTS_DIR, file),
        category: getProductCategory(file),
        aspect_ratio: '1:1',
        isClientProduct: true
      };
    });
}

function getProductCategory(filename) {
  const upper = filename.toUpperCase();
  if (upper.includes('WHEY') || upper.includes('PROTEIN') || upper.includes('GAINER') || upper.includes('MASS') || upper.includes('OEUF')) {
    return 'Protéines & Prise de Masse';
  }
  if (upper.includes('CREATINE') || upper.includes('CREAPURE') || upper.includes('PRE-WORKOUT') || upper.includes('AUKAN') || upper.includes('BETA-ALANINE') || upper.includes('GLYCEROL')) {
    return 'Force, Booster & Performance';
  }
  if (upper.includes('EAA') || upper.includes('BCAA') || upper.includes('GLUTAMINE') || upper.includes('ELECTROLYTES')) {
    return 'Acides Aminés & Récupération';
  }
  if (upper.includes('COLLAGENE') || upper.includes('VITAMINE') || upper.includes('ZMA') || upper.includes('ZINC') || upper.includes('MAGNESIUM') || upper.includes('OMEGA') || upper.includes('ASHWAGANDHA')) {
    return 'Santé, Articulations & Vitalité';
  }
  return 'Nutrition & Accessoires';
}
