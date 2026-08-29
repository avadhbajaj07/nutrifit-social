import express from 'express';
import {
  adminCookie,
  adminPasswordIsConfigured,
  clearAdminCookie,
  createAdminSession,
  hasValidAdminSession,
  validateAdminPassword
} from '../services/adminAuthService.js';

const router = express.Router();
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const requestKey = req => req.get('x-forwarded-for')?.split(',')[0]?.trim() || req.ip || 'unknown';

router.get('/session', (req, res) => {
  res.json({ authenticated: hasValidAdminSession(req), configured: adminPasswordIsConfigured() });
});

router.post('/login', async (req, res) => {
  const key = requestKey(req);
  const now = Date.now();
  const record = attempts.get(key);
  const recent = record && now - record.startedAt < WINDOW_MS ? record : { count: 0, startedAt: now };

  if (recent.count >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many attempts. Please try again in 15 minutes.' });
  }
  if (!adminPasswordIsConfigured()) {
    return res.status(503).json({ error: 'Admin password is not configured.' });
  }
  if (!validateAdminPassword(req.body?.password)) {
    attempts.set(key, { ...recent, count: recent.count + 1 });
    await new Promise(resolve => setTimeout(resolve, 350));
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  attempts.delete(key);
  res.setHeader('Set-Cookie', adminCookie(createAdminSession(), req));
  return res.json({ authenticated: true });
});

router.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', clearAdminCookie(req));
  res.json({ authenticated: false });
});

export default router;
