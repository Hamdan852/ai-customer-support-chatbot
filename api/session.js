import { randomBytes } from 'node:crypto';
import { authConfigured, clearSessionCookie, createSession, hashPassword, requireBusiness, setSessionCookie, verifyPassword } from './auth.js';
import { findUserByEmail, findUserByBusinessId, getBusinessConfig, hasDatabase, saveBusinessConfig, saveUser } from './business-store.js';
function clean(v, max = 500) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }
function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function slug(v) { return v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'business'; }
export default async function handler(req, res) {
  if (!authConfigured()) return res.status(503).json({ error: 'Authentication is not configured. Add HAMDAN_AUTH_SECRET (32+ random characters) in Vercel Environment Variables.' });
  if (!hasDatabase()) return res.status(503).json({ error: 'Persistent account storage is not configured. Connect a Vercel Postgres database before creating business accounts.' });
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed.' }); }
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const action = clean(body.action, 20);
  try {
    if (action === 'signup') {
      const email = clean(body.email, 254).toLowerCase(); const password = typeof body.password === 'string' ? body.password : ''; const businessName = clean(body.businessName, 160);
      if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
      if (password.length < 10) return res.status(400).json({ error: 'Password must be at least 10 characters.' });
      if (!businessName) return res.status(400).json({ error: 'Business name is required.' });
      if (await findUserByEmail(email)) return res.status(409).json({ error: 'An account with that email already exists.' });
      const businessId = `${slug(businessName)}-${randomBytes(5).toString('hex')}`;
      await saveUser({ email, passwordHash: hashPassword(password), businessId });
      await saveBusinessConfig(businessId, { businessName, industry: clean(body.industry, 80) || 'Other', website: clean(body.website, 500), contactEmail: email, knowledge: clean(body.knowledge, 12000) });
      setSessionCookie(res, createSession(businessId)); return res.status(201).json({ success: true, businessId, email });
    }
    if (action === 'login') {
      const email = clean(body.email, 254).toLowerCase(); const password = typeof body.password === 'string' ? body.password : ''; const user = await findUserByEmail(email);
      if (!user || !verifyPassword(password, user.passwordHash)) return res.status(401).json({ error: 'Incorrect email or password.' });
      setSessionCookie(res, createSession(user.businessId)); return res.status(200).json({ success: true, businessId: user.businessId, email: user.email });
    }
    if (action === 'logout') { clearSessionCookie(res); return res.status(200).json({ success: true }); }
    if (action === 'me') { const businessId = requireBusiness(req, res); if (!businessId) return; const user = await findUserByBusinessId(businessId); const config = await getBusinessConfig(businessId); return res.status(200).json({ authenticated: true, businessId, email: user?.email || config?.contactEmail || '', business: config }); }
    return res.status(400).json({ error: 'Unknown authentication action.' });
  } catch (error) { console.error('Session API error:', error?.message || 'Unknown error'); return res.status(500).json({ error: error?.message || 'Authentication request failed.' }); }
}
