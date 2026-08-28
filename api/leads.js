import { listLeads } from './leads-store.js';
import { requireBusiness } from './auth.js';
export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed.' }); }
  const businessId = requireBusiness(req, res);
  if (!businessId) return;
  try {
    const leads = await listLeads(businessId);
    return res.status(200).json({ businessId, leads, count: leads.length, persistent: Boolean(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING) });
  } catch (error) {
    console.error('Lead listing error:', error?.message || 'Unknown error');
    return res.status(500).json({ error: 'Unable to load leads right now.' });
  }
}
