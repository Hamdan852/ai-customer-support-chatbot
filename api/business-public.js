import { getBusinessConfig } from './business-store.js';
export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed.' }); }
  const id = typeof req.query?.businessId === 'string' ? req.query.businessId.trim() : '';
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return res.status(400).json({ error: 'Valid businessId is required.' });
  try {
    const config = await getBusinessConfig(id);
    if (!config) return res.status(404).json({ error: 'Business not found.' });
    return res.status(200).json({ businessName: config.businessName || '', assistantName: config.assistantName || '', industry: config.industry || '' });
  } catch (error) { console.error('Public business lookup failed:', error?.message || 'Unknown error'); return res.status(500).json({ error: 'Unable to load business.' }); }
}
