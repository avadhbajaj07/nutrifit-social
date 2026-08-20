# 🇨🇭 NutriFitness Social Suite - Automatisation Instagram & Pinterest

Plateforme d'automatisation sociale clé en main conçue pour gérer la publication de **3 posts par jour** sur **Instagram et Pinterest** pour votre client dans le secteur fitness & nutrition en **Suisse romande (Genève, Lausanne, etc.)**.

---

## 🌟 Fonctionnalités Principales

1. **Intégration Cloudinary & Purge Automatique** :
   - Récupération en temps réel des photos et vidéos depuis le dossier Cloudinary (`nutrifitness/posts` ou personnalisé).
   - **Suppression définitive immédiate du média sur Cloudinary** dès que la publication est réussie pour éviter tout doublon.

2. **Connexion Blotato API (Instagram & Pinterest)** :
   - Utilise le point de terminaison officiel `https://backend.blotato.com/v2/posts` avec `blotato-api-key`.
   - Publication simultanée ou ciblée sur Instagram Business et tableaux Pinterest.

3. **Planificateur 3x par Jour (Fuseau Horaire Suisse / Europe/Zurich)** :
   - 🌅 **08:30 (Matin)** : Motivation & Routine Matinale
   - 🥗 **12:30 (Midi)** : Nutrition, Astuces Repas & Recettes Healthy
   - 🏋️ **18:30 (Soir)** : Entraînement, Exercices & Engagement

4. **Générateur IA de Légendes Virales (Français Suisse)** :
   - Accroches captivantes (Hooks), structure claire, émojis et call-to-actions puissants.
   - **Bouclier de Conformité Instagram (100% sans lien)** : Respecte la règle d'or d'Instagram interdisant les URLs brutes dans les légendes ou commentaires. Convertit automatiquement en appel au "Lien en bio" pour maximiser la portée de l'algorithme.
   - Clusters de hashtags ciblés pour la Suisse romande (`#fitnesssuisse #suisseromande #genevefitness #lausannefit`).

5. **Tableau de Bord Moderne** :
   - Interface épurée avec prévisualisation réaliste mobile d'Instagram et Pinterest.
   - Explorateur de fichiers Cloudinary avec détection des ratios d'aspect (1:1, 4:5, 9:16).
   - Historique complet des publications et journal des événements système (logs).

---

## 🚀 Démarrage Rapide

### 1. Installation des dépendances
```bash
npm run install:all
```

### 2. Lancement de la plateforme (Backend + Frontend)
```bash
npm run dev
```

L'application sera accessible sur :
- **Dashboard Web** : `http://localhost:5173`
- **Serveur Backend** : `http://localhost:5001`

---

## ⚙️ Configuration des Clés API

Vous pouvez configurer vos clés directement depuis l'interface web (bouton ⚙️ Paramètres en haut à droite) ou via le fichier `.env` :

```env
# Cloudinary
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret
CLOUDINARY_FOLDER=nutrifitness/posts

# Blotato API
BLOTATO_API_KEY=votre_cle_blotato
BLOTATO_ACCOUNT_ID=votre_account_id
```

---

## 🛡️ Règles de Conformité Instagram Intégrées

1. **Aucun lien brut** : Les URLs dans les légendes Instagram ne sont pas cliquables et diminuent l'engagement. Le système utilise des CTA comme *"Lien complet dans la bio 🔗"* ou *"Enregistre ce post 💾"*.
2. **Format d'image recommandé** : Portrait 4:5 (1080x1350) ou Carré 1:1 (1080x1080).
3. **Hashtags optimaux** : 10 à 15 hashtags hyper-ciblés localement pour la Suisse romande.
