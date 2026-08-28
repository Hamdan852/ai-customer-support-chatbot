import { listLeads } from './leads-store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  // MVP only: this endpoint is intentionally limited to the demo business.
  // Production must require authenticated business identity before exposing lead data.
  const businessId = typeof req.query?.businessId === 'string' && req.query.businessId.trim()
    ? req.query.businessId.trim().slice(0, 100)
    : 'demo-business';

  try {
    const leads = listLeads(businessId).map(({ id, businessId: owner, industry, name, email, phone, location, request, preferredContact, createdAt }) => ({
      id, businessId: owner, industry, name, email, phone, location, request, preferredContact, createdAt
    }));
    return res.status(200).json({ businessId, leads, count: leads.length, persistent: false });
  } catch (error) {
    console.error('Lead listing error:', error?.message || 'Unknown error');
    return res.status(500).json({ error: 'Unable to load leads right now.' });
  }
}
