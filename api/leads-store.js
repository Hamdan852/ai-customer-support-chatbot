// Lead storage adapter.
// Demo/preview environments may use the in-memory fallback. Production must use persistent storage.
const memory = globalThis.__HAMDAN_LEADS__ || (globalThis.__HAMDAN_LEADS__ = new Map());
let schemaReady = null;

function hasDatabase() {
  return Boolean(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING);
}

function isProduction() {
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
}

async function getSql() {
  if (!hasDatabase()) return null;
  const mod = await import('@vercel/postgres');
  return mod.sql;
}

async function ensureSchema() {
  if (!hasDatabase()) {
    if (isProduction()) throw new Error('Persistent database storage is required in production.');
    return false;
  }
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = await getSql();
      await sql`CREATE TABLE IF NOT EXISTS hamdan_leads (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        industry TEXT,
        name TEXT,
        email TEXT,
        phone TEXT,
        location TEXT,
        request TEXT,
        preferred_contact TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS hamdan_leads_business_created_idx ON hamdan_leads (business_id, created_at DESC)`;
      return true;
    })().catch((error) => {
      schemaReady = null;
      console.error('Lead database unavailable:', error?.message || 'Unknown error');
      throw new Error('Persistent database storage is unavailable.');
    });
  }
  return schemaReady;
}

export async function createLead(lead) {
  const id = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record = { id, ...lead, createdAt: new Date().toISOString() };
  const businessId = lead.businessId || 'demo-business';

  if (await ensureSchema()) {
    try {
      const sql = await getSql();
      await sql`INSERT INTO hamdan_leads
        (id, business_id, industry, name, email, phone, location, request, preferred_contact, created_at)
        VALUES (${id}, ${businessId}, ${lead.industry || ''}, ${lead.name || ''}, ${lead.email || ''}, ${lead.phone || ''}, ${lead.location || ''}, ${lead.request || ''}, ${lead.preferredContact || ''}, ${record.createdAt})`;
      return record;
    } catch (error) {
      console.error('Lead database insert failed:', error?.message || 'Unknown error');
      if (isProduction()) throw new Error('Persistent database storage is unavailable.');
    }
  }

  const list = memory.get(businessId) || [];
  list.unshift(record);
  memory.set(businessId, list.slice(0, 100));
  return record;
}

export async function listLeads(businessId = 'demo-business') {
  if (await ensureSchema()) {
    try {
      const sql = await getSql();
      const { rows } = await sql`SELECT id, business_id AS "businessId", industry, name, email, phone, location, request, preferred_contact AS "preferredContact", created_at AS "createdAt"
        FROM hamdan_leads WHERE business_id = ${businessId} ORDER BY created_at DESC LIMIT 100`;
      return rows;
    } catch (error) {
      console.error('Lead database query failed:', error?.message || 'Unknown error');
      if (isProduction()) throw new Error('Persistent database storage is unavailable.');
    }
  }
  return memory.get(businessId) || [];
}
