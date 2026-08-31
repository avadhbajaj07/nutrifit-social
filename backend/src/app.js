import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import mediaRoutes from './routes/media.js';
import postsRoutes from './routes/posts.js';
import draftsRoutes from './routes/drafts.js';
import emailApprovalRoutes from './routes/emailApproval.js';
import aiRoutes from './routes/ai.js';
import settingsRoutes from './routes/settings.js';
import blotatoRoutes from './routes/blotato.js';
import adminAuthRoutes from './routes/adminAuth.js';
import cronRoutes from './routes/cron.js';
import { isPersistentStorageConfigured } from './services/storageService.js';
import { requireAdmin } from './services/adminAuthService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_MEDIA_PATH = path.join(__dirname, '../../nutriftness.ch');
const PRODUCTS_MEDIA_PATH = path.join(__dirname, '../../products');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve real client products from /products folder
app.use('/products-media', express.static(PRODUCTS_MEDIA_PATH));
app.use('/local-media', express.static(LOCAL_MEDIA_PATH));
app.use('/api/products-media', express.static(PRODUCTS_MEDIA_PATH));
app.use('/api/local-media', express.static(LOCAL_MEDIA_PATH));

// API Endpoints
app.use('/api/auth/admin', adminAuthRoutes);
app.use('/api/media', requireAdmin, mediaRoutes);
app.use('/api/posts', requireAdmin, postsRoutes);
app.use('/api/drafts', draftsRoutes);
app.use('/api/email-approval', requireAdmin, emailApprovalRoutes);
app.use('/api/ai', requireAdmin, aiRoutes);
app.use('/api/settings', requireAdmin, settingsRoutes);
app.use('/api/blotato', requireAdmin, blotatoRoutes);
app.use('/api/cron', cronRoutes); // Vercel Cron + manual trigger (protected by CRON_SECRET)

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'NutriFitness Social Media Automation Server',
    storage: isPersistentStorageConfigured() ? 'supabase' : 'local-fallback',
    website: 'nutrifitness.ch',
    language: 'fr',
    target: 'Suisse (Romandie)',
    instagramRules: {
      maxHashtags: 5,
      rawLinksAllowed: false,
      aspectRatio: '4:5 or 1:1'
    },
    timestamp: new Date().toISOString()
  });
});

export default app;
