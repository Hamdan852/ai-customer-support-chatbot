import { createHmac, timingSafeEqual, randomBytes, scryptSync } from 'node:crypto';

const COOKIE = 'hamdan_session';
const SESSION_DAYS = 7;
function secret() { return String(process.env.HAMDAN_AUTH_SECRET || '').trim(); }
function b64(value) { return Buffer.from(value).toString('base64url'); }
function unb64(value) { return Buffer.from(value, 'base64url').toString('utf8'); }
function sign(payload) { return createHmac('sha256', secret()).update(payload).digest('base64url'); }
export function authConfigured() { return secret().length >= 32; }
export function createSession(businessId) {
  if (!authConfigured()) throw new Error('HAMDAN_AUTH_SECRET must be configured with at least 32 characters.');
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  const payload = b64(JSON.stringify({ sub: businessId, exp }));
  return `${payload}.${sign(payload)}`;
}
export function getSessionBusinessId(req) {
  if (!authConfigured()) return null;
  const cookieHeader = req.headers?.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)hamdan_session=([^;]+)/);
  if (!match) return null;
  const token = decodeURIComponent(match[1]);
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  try {
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const data = JSON.parse(unb64(payload));
    if (!data?.sub || !/^[a-zA-Z0-9_-]{1,100}$/.test(data.sub)) return null;
    if (!Number.isFinite(data.exp) || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data.sub;
  } catch { return null; }
}
export function setSessionCookie(res, token) { res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`); }
export function clearSessionCookie(res) { res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`); }
export function getPublicBusinessId(req) {
  const value = req.body?.businessId || req.query?.businessId;
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) return null;
  return value;
}
export function requireBusiness(req, res) {
  const businessId = getSessionBusinessId(req);
  if (!businessId) { res.status(401).json({ error: 'Please sign in to manage this business.' }); return null; }
  return businessId;
}
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}
export function verifyPassword(password, stored) {
  try {
    const [scheme, salt, hex] = String(stored || '').split(':');
    if (scheme !== 'scrypt' || !salt || !hex) return false;
    const actual = scryptSync(password, salt, 64);
    const expected = Buffer.from(hex, 'hex');
    return expected.length === actual.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}
