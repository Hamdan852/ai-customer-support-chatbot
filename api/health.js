export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const configured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const model = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();

  return res.status(200).json({
    ok: true,
    service: 'Hamdan AI',
    chatEndpoint: '/api/chat',
    leadEndpoint: '/api/lead',
    openaiKeyConfigured: configured,
    model,
    note: 'This endpoint never returns the API key or other secret values.'
  });
}
