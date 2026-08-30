// Persistent business and account configuration adapter.
// Demo/preview environments may use the in-memory fallback. Production must use persistent storage.
const memory = globalThis.__HAMDAN_BUSINESS_CONFIGS__ || (globalThis.__HAMDAN_BUSINESS_CONFIGS__ = new Map());
const users = globalThis.__HAMDAN_USERS__ || (globalThis.__HAMDAN_USERS__ = new Map());
let schemaReady = null;

export function hasDatabase() {
  return Boolean(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING);
}

function isProduction() {
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
}

function databaseRequired() {
  return isProduction();
}

async function getSql() {
  if (!hasDatabase()) return null;
  const mod = await import('@vercel/postgres');
  return mod.sql;
}

async function ensureSchema() {
  if (!hasDatabase()) {
    if (databaseRequired()) throw new Error('Persistent database storage is required in production.');
    return false;
  }
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = await getSql();
      await sql`CREATE TABLE IF NOT EXISTS hamdan_business_configs (business_id TEXT PRIMARY KEY, business_name TEXT NOT NULL, assistant_name TEXT, industry TEXT, website TEXT, contact_email TEXT, knowledge TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await sql`ALTER TABLE hamdan_business_configs ADD COLUMN IF NOT EXISTS assistant_name TEXT`;
      await sql`CREATE TABLE IF NOT EXISTS hamdan_users (email TEXT PRIMARY KEY, password_hash TEXT NOT NULL, business_id TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      return true;
    })().catch((error) => {
      schemaReady = null;
      console.error('Business database unavailable:', error?.message || 'Unknown error');
      throw new Error('Persistent database storage is unavailable.');
    });
  }
  return schemaReady;
}

export async function getBusinessConfig(businessId) {
  if (await ensureSchema()) {
    try {
      const sql = await getSql();
      const { rows } = await sql`SELECT business_id AS "businessId", business_name AS "businessName", assistant_name AS "assistantName", industry, website, contact_email AS "contactEmail", knowledge, updated_at AS "updatedAt" FROM hamdan_business_configs WHERE business_id = ${businessId} LIMIT 1`;
      return rows[0] || null;
    } catch (error) {
      console.error('Business database query failed:', error?.message || 'Unknown error');
      if (databaseRequired()) throw new Error('Persistent database storage is unavailable.');
    }
  }
  return memory.get(businessId) || null;
}

export async function saveBusinessConfig(businessId, config) {
  const record = { businessId, ...config, updatedAt: new Date().toISOString() };
  if (await ensureSchema()) {
    try {
      const sql = await getSql();
      await sql`INSERT INTO hamdan_business_configs (business_id, business_name, assistant_name, industry, website, contact_email, knowledge, updated_at) VALUES (${businessId}, ${config.businessName}, ${config.assistantName || ''}, ${config.industry || ''}, ${config.website || ''}, ${config.contactEmail || ''}, ${config.knowledge || ''}, ${record.updatedAt}) ON CONFLICT (business_id) DO UPDATE SET business_name = EXCLUDED.business_name, assistant_name = EXCLUDED.assistant_name, industry = EXCLUDED.industry, website = EXCLUDED.website, contact_email = EXCLUDED.contact_email, knowledge = EXCLUDED.knowledge, updated_at = EXCLUDED.updated_at`;
      return record;
    } catch (error) {
      console.error('Business database save failed:', error?.message || 'Unknown error');
      if (databaseRequired()) throw new Error('Persistent database storage is unavailable.');
    }
  }
  memory.set(businessId, record);
  return record;
}

export async function findUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (await ensureSchema()) {
    try {
      const sql = await getSql();
      const { rows } = await sql`SELECT email, password_hash AS "passwordHash", business_id AS "businessId" FROM hamdan_users WHERE email = ${normalized} LIMIT 1`;
      return rows[0] || null;
    } catch (error) {
      console.error('User lookup failed:', error?.message || 'Unknown error');
      if (databaseRequired()) throw new Error('Persistent database storage is unavailable.');
    }
  }
  return users.get(normalized) || null;
}

export async function findUserByBusinessId(businessId) {
  if (await ensureSchema()) {
    try {
      const sql = await getSql();
      const { rows } = await sql`SELECT email, business_id AS "businessId" FROM hamdan_users WHERE business_id = ${businessId} LIMIT 1`;
      return rows[0] || null;
    } catch (error) {
      console.error('User business lookup failed:', error?.message || 'Unknown error');
      if (databaseRequired()) throw new Error('Persistent database storage is unavailable.');
    }
  }
  for (const user of users.values()) {
    if (user.businessId === businessId) return { email: user.email, businessId: user.businessId };
  }
  return null;
}

export async function saveUser(user) {
  const normalized = String(user.email).trim().toLowerCase();
  const record = { email: normalized, passwordHash: user.passwordHash, businessId: user.businessId };
  if (await ensureSchema()) {
    try {
      const sql = await getSql();
      await sql`INSERT INTO hamdan_users (email, password_hash, business_id) VALUES (${normalized}, ${user.passwordHash}, ${user.businessId})`;
      return record;
    } catch (error) {
      if (String(error?.message || '').toLowerCase().includes('duplicate') || String(error?.code || '') === '23505') {
        throw new Error('An account with that email already exists.');
      }
      console.error('User save failed:', error?.message || 'Unknown error');
      if (databaseRequired()) throw new Error('Persistent database storage is unavailable.');
    }
  }
  if (users.has(normalized)) throw new Error('An account with that email already exists.');
  users.set(normalized, record);
  return record;
}
