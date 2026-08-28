import { getBusinessId } from './auth.js';

const configs = globalThis.__HAMDAN_BUSINESS_CONFIGS__ || (globalThis.__HAMDAN_BUSINESS_CONFIGS__ = new Map());

function clean(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export default async function handler(req, res) {
  const businessId = getBusinessId(req);
  if (!businessId) return res.status(401).json({ error: 'Business authentication is required.' });

  if (req.method === 'GET') return res.status(200).json({ businessId, config: configs.get(businessId) || null });
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Method not allowed.' }); }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const config = {
    businessName: clean(body.businessName, 160),
    industry: clean(body.industry, 80),
    website: clean(body.website, 500),
    contactEmail: clean(body.contactEmail, 254),
    knowledge: clean(body.knowledge, 12000),
    updatedAt: new Date().toISOString()
  };
  if (!config.businessName) return res.status(400).json({ error: 'Business name is required.' });
  configs.set(businessId, config);
  return res.status(200).json({ success: true, businessId, config });
}
