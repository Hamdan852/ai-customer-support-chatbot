import { rejectIfLimited } from './rate-limit.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (rejectIfLimited(req, res, 'openai-check', 10, 60_000)) return;

  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  const model = String(process.env.OPENAI_MODEL || 'gpt-5.6-luna').trim();

  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      configured: false,
      model,
      provider: 'openai',
      message: 'OPENAI_API_KEY is not configured for this deployment environment.'
    });
  }

  try {
    const response = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      return res.status(200).json({
        ok: true,
        configured: true,
        reachable: true,
        model,
        provider: 'openai',
        message: 'OpenAI API key is accepted and the configured model is reachable.'
      });
    }

    return res.status(502).json({
      ok: false,
      configured: true,
      reachable: false,
      model,
      provider: 'openai',
      status: response.status,
      errorCode: data?.error?.code || null,
      message: data?.error?.message || 'OpenAI rejected the configured key or model.'
    });
  } catch (error) {
    console.error('OpenAI connectivity check failed:', error?.message || 'Unknown error');
    return res.status(502).json({
      ok: false,
      configured: true,
      reachable: false,
      model,
      provider: 'openai',
      message: 'The deployment could not reach OpenAI.'
    });
  }
}
