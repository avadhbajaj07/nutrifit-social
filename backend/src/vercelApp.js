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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/products-media', express.static(path.join(__dirname, '../../products')));
app.use('/local-media', express.static(path.join(__dirname, '../../nutriftness.ch')));

// Vercel Services removes the /api route prefix before forwarding here.
app.use('/media', mediaRoutes);
app.use('/posts', postsRoutes);
app.use('/drafts', draftsRoutes);
app.use('/email-approval', emailApprovalRoutes);
app.use('/ai', aiRoutes);
app.use('/settings', settingsRoutes);

app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'NutriFitness approval API',
  timezone: process.env.APP_TIMEZONE || 'Europe/Zurich',
  timestamp: new Date().toISOString()
}));

export default app;
