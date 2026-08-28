import { listLeads } from './leads-store.js';
import { getBusinessId } from './auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  // MVP identity boundary. Production should replace x-business-id with a
  // verified session/JWT before exposing personal lead information.
  const headerBusinessId = getBusinessId(req);
  const queryBusinessId = typeof req.query?.businessId === 'string' ? req.query.businessId.trim() : '';
  const businessId = headerBusinessId || (queryBusinessId && /^[a-zA-Z0-9_-]{1,100}$/.test(queryBusinessId) ? queryBusinessId : '');
  if (!businessId) return res.status(401).json({ error: 'Business authentication is required.' });

  try {
    const leads = await listLeads(businessId);
    return res.status(200).json({ businessId, leads, count: leads.length, persistent: Boolean(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING) });
  } catch (error) {
    console.error('Lead listing error:', error?.message || 'Unknown error');
    return res.status(500).json({ error: 'Unable to load leads right now.' });
  }
}
