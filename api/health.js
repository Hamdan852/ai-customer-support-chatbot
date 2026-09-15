export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const databaseConfigured = Boolean(
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING
  );
  const authConfigured = Boolean(process.env.HAMDAN_AUTH_SECRET?.trim());
  const emailNotificationsConfigured = Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim()
  );
  const production = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const model = (process.env.OPENAI_MODEL || 'gpt-5.6-luna').trim();
  const criticalReady = databaseConfigured && authConfigured;

  // Optional OpenAI connectivity diagnostic is kept on this existing function so
  // the Hobby plan does not need a separate /api/openai-check serverless function.
  if (req.query?.check === 'openai') {
    if (!openaiConfigured) {
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
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY.trim()}` }
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

  return res.status(production && !criticalReady ? 503 : 200).json({
    ok: production ? criticalReady : true,
    service: 'Hamdan AI',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    chatEndpoint: '/api/chat',
    leadEndpoint: '/api/lead',
    openaiKeyConfigured: openaiConfigured,
    databaseConfigured,
    authSecretConfigured: authConfigured,
    emailNotificationsConfigured,
    model,
    productionReadiness: {
      databaseAndAuth: criticalReady,
      aiProvider: openaiConfigured ? 'configured' : 'local fallback',
      emailNotifications: emailNotificationsConfigured ? 'configured' : 'not configured'
    },
    note: 'This endpoint never returns API keys, auth secrets, database credentials, or other secret values.'
  });
}
