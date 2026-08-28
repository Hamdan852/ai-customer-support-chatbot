import { createLead } from './leads-store.js';
import { getBusinessConfig } from './business-store.js';
import { notifyNewLead } from './notifications.js';
import { rejectIfLimited } from './rate-limit.js';
function clean(value, max = 500) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function validEmail(value) { return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed.' }); }
  if (rejectIfLimited(req, res, 'lead', 5, 10 * 60_000)) return;
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (body.consent !== true) return res.status(400).json({ error: 'Customer consent is required before submitting a lead.' });
    const lead = { businessId: clean(body.businessId, 100) || 'demo-business', industry: clean(body.industry, 80) || 'general', name: clean(body.name, 120), email: clean(body.email, 254).toLowerCase(), phone: clean(body.phone, 50), location: clean(body.location, 150), request: clean(body.request, 1000), preferredContact: clean(body.preferredContact, 40) };
    if (!lead.name && !lead.email && !lead.phone) return res.status(400).json({ error: 'Provide at least one contact detail.' });
    if (!validEmail(lead.email)) return res.status(400).json({ error: 'Please provide a valid email address.' });
    const record = await createLead(lead); const business = await getBusinessConfig(lead.businessId);
    try { await notifyNewLead({ business, lead: record }); } catch (notificationError) { console.error('Lead notification failed:', notificationError?.message || 'Unknown error'); }
    console.log('Consent-based lead created', { leadId: record.id, businessId: record.businessId, industry: record.industry });
    return res.status(200).json({ success: true, message: 'Your request has been submitted. The business can follow up using the contact information you provided.', leadId: record.id });
  } catch (error) { console.error('Lead submission error:', error?.message || 'Unknown error'); return res.status(500).json({ error: 'Unable to submit the lead right now.' }); }
}
