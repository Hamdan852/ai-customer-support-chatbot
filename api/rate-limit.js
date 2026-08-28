// Lightweight per-instance abuse protection. For high traffic, replace with a shared
// rate-limit store (for example Vercel KV/Redis) so limits apply across instances.
const buckets = globalThis.__HAMDAN_RATE_LIMIT__ || (globalThis.__HAMDAN_RATE_LIMIT__ = new Map());
function clientKey(req) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers?.['x-real-ip'] || '').trim() || 'unknown';
}
export function rateLimit(req, name, limit, windowMs) {
  const key = `${name}:${clientKey(req)}`;
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) { buckets.set(key, { count: 1, resetAt: now + windowMs }); return { allowed: true, retryAfter: 0 }; }
  if (current.count >= limit) return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}
export function rejectIfLimited(req, res, name, limit, windowMs) {
  const result = rateLimit(req, name, limit, windowMs);
  if (result.allowed) return false;
  res.setHeader('Retry-After', String(result.retryAfter));
  res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
  return true;
}
