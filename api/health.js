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
