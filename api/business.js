import { requireBusiness } from './auth.js';
import { getBusinessConfig, saveBusinessConfig } from './business-store.js';
function clean(value, max = 500) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Method not allowed.' }); }
  const businessId = requireBusiness(req, res);
  if (!businessId) return;
  if (req.method === 'GET') return res.status(200).json({ businessId, config: await getBusinessConfig(businessId) });
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const config = { businessName: clean(body.businessName, 160), industry: clean(body.industry, 80), website: clean(body.website, 500), contactEmail: clean(body.contactEmail, 254), knowledge: clean(body.knowledge, 12000), notificationEmail: clean(body.notificationEmail || body.contactEmail, 254), notificationPhone: clean(body.notificationPhone, 32), emailNotifications: Boolean(body.emailNotifications), smsNotifications: Boolean(body.smsNotifications), humanHandoff: Boolean(body.humanHandoff) };
  if (!config.businessName) return res.status(400).json({ error: 'Business name is required.' });
  const saved = await saveBusinessConfig(businessId, config);
  return res.status(200).json({ success: true, businessId, config: saved });
}
