// MVP authentication boundary.
// Production deployment must replace this demo identity with a real auth provider
// and verify the session/JWT server-side before accessing business data.
export function getBusinessId(req) {
  const value = req.headers?.['x-business-id'];
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) return null;
  return value;
}

export function requireBusiness(req, res) {
  const businessId = getBusinessId(req);
  if (!businessId) {
    res.status(401).json({ error: 'Business authentication is required.' });
    return null;
  }
  return businessId;
}
