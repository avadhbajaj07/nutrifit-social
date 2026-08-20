import app from './app.js';
import { initScheduler } from './services/schedulerService.js';
import { addLog } from './services/storageService.js';

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 NutriFitness Social Suite Backend actif sur le port ${PORT}`);
  console.log(`🇨🇭 Site Web : nutrifitness.ch`);
  console.log(`📸 Canaux : Instagram (63353) & Pinterest (8915)`);
  console.log(`🛡️ Règles Instagram : 5 Hashtags max • 0 Lien brut`);
  console.log(`📧 Workflow : Approbation Client par Email & 1-Clic`);
  console.log(`====================================================`);

  addLog('info', `Serveur démarré sur le port ${PORT}`);
  initScheduler();
});
