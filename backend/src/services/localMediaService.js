import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_FOLDER = path.join(__dirname, '../../../nutriftness.ch');

export function getLocalClientMedia() {
  try {
    if (!fs.existsSync(LOCAL_FOLDER)) {
      return [];
    }

    const files = fs.readdirSync(LOCAL_FOLDER);
    const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];

    const mediaList = files
      .filter(file => validExtensions.includes(path.extname(file).toLowerCase()))
      .map((file, idx) => {
        const ext = path.extname(file).replace('.', '').toLowerCase();
        const stat = fs.statSync(path.join(LOCAL_FOLDER, file));

        return {
          public_id: `local/nutrifitness/${file}`,
          filename: file,
          secure_url: `http://localhost:5001/local-media/${encodeURIComponent(file)}`,
          format: ext,
          resource_type: 'image',
          aspect_ratio: '4:5 (Portrait Idéal)',
          width: 1080,
          height: 1350,
          bytes: stat.size,
          created_at: stat.birthtime.toISOString(),
          title: `NutriFitness.ch Visuel #${idx + 1} - Style Athlétique & Gym`,
          isLocalAsset: true,
          isMock: false
        };
      });

    return mediaList;
  } catch (error) {
    console.error('Error loading local client media:', error);
    return [];
  }
}
