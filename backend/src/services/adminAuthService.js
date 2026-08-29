import { createHash, createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'nutrifitness_admin_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const digest = value => createHash('sha256').update(String(value)).digest();
const safeEqual = (left, right) => timingSafeEqual(digest(left), digest(right));
const sessionSecret = () => process.env.ADMIN_SESSION_SECRET || 'local-development-session-secret';

function signature(expiresAt) {
  return createHmac('sha256', sessionSecret()).update(String(expiresAt)).digest('base64url');
}

function readCookies(req) {
  return Object.fromEntries((req.get('cookie') || '').split(';').map(item => {
    const [name, ...value] = item.trim().split('=');
    return name ? [name, decodeURIComponent(value.join('='))] : ['', ''];
  }).filter(([name]) => name));
}

export function adminPasswordIsConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function validateAdminPassword(password) {
  return adminPasswordIsConfigured() && safeEqual(password || '', process.env.ADMIN_PASSWORD);
}

export function createAdminSession() {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  return `${expiresAt}.${signature(expiresAt)}`;
}

export function hasValidAdminSession(req) {
  const token = readCookies(req)[COOKIE_NAME];
  if (!token) return false;
  const [expiresAt, providedSignature] = token.split('.');
  if (!expiresAt || !providedSignature || Number(expiresAt) <= Date.now()) return false;
  return safeEqual(providedSignature, signature(expiresAt));
}

export function adminCookie(token, req) {
  const secure = req.secure || req.get('x-forwarded-proto') === 'https' || process.env.NODE_ENV === 'production';
  return [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}`,
    ...(secure ? ['Secure'] : [])
  ].join('; ');
}

export function clearAdminCookie(req) {
  const secure = req.secure || req.get('x-forwarded-proto') === 'https' || process.env.NODE_ENV === 'production';
  return [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    ...(secure ? ['Secure'] : [])
  ].join('; ');
}

export function requireAdmin(req, res, next) {
  if (hasValidAdminSession(req)) return next();
  return res.status(401).json({ error: 'Admin authentication required.' });
}
