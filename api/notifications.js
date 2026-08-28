// Optional email notification adapter.
// Configure RESEND_API_KEY and RESEND_FROM on Vercel to enable email alerts.

function enabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

export async function notifyNewLead({ business, lead }) {
  if (!enabled() || !business?.contactEmail) return { sent: false, reason: 'Email notifications are not configured.' };

  const subject = `New customer lead — ${business.businessName}`;
  const text = [
    `A new customer request was submitted to ${business.businessName}.`,
    '',
    `Name: ${lead.name || 'Not provided'}`,
    `Email: ${lead.email || 'Not provided'}`,
    `Phone: ${lead.phone || 'Not provided'}`,
    `Location: ${lead.location || 'Not provided'}`,
    `Preferred contact: ${lead.preferredContact || 'Not provided'}`,
    `Request: ${lead.request || 'Not provided'}`,
    '',
    `Lead ID: ${lead.id}`
  ].join('\n');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: process.env.RESEND_FROM, to: [business.contactEmail], subject, text })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Email provider returned ${response.status}: ${detail.slice(0, 300)}`);
  }

  return { sent: true };
}
