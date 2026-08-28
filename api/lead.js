import { createLead } from './leads-store.js';

function clean(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (body.consent !== true) return res.status(400).json({ error: 'Customer consent is required before submitting a lead.' });
    const lead = {
      businessId: clean(body.businessId, 100) || 'demo-business',
      industry: clean(body.industry, 80) || 'general',
      name: clean(body.name, 120), email: clean(body.email, 254), phone: clean(body.phone, 50),
      location: clean(body.location, 150), request: clean(body.request, 1000), preferredContact: clean(body.preferredContact, 40)
    };
    if (!lead.name && !lead.email && !lead.phone) return res.status(400).json({ error: 'Provide at least one contact detail.' });
    const record = await createLead(lead);
    console.log('Consent-based lead created', { leadId: record.id, businessId: record.businessId, industry: record.industry });
    return res.status(200).json({ success: true, message: 'Your request has been submitted. The business can follow up using the contact information you provided.', leadId: record.id });
  } catch (error) {
    console.error('Lead submission error:', error?.message || 'Unknown error');
    return res.status(500).json({ error: 'Unable to submit the lead right now.' });
  }
}
