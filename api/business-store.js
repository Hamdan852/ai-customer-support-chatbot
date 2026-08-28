// Persistent business configuration adapter.
// Uses Vercel Postgres when configured; otherwise keeps an in-memory fallback for demos.

const memory = globalThis.__HAMDAN_BUSINESS_CONFIGS__ || (globalThis.__HAMDAN_BUSINESS_CONFIGS__ = new Map());
let schemaReady = null;

function hasDatabase() {
  return Boolean(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING);
}

async function getSql() {
  if (!hasDatabase()) return null;
  const mod = await import('@vercel/postgres');
  return mod.sql;
}

async function ensureSchema() {
  if (!hasDatabase()) return false;
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = await getSql();
      await sql`CREATE TABLE IF NOT EXISTS hamdan_business_configs (
        business_id TEXT PRIMARY KEY,
        business_name TEXT NOT NULL,
        industry TEXT,
        website TEXT,
        contact_email TEXT,
        knowledge TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      return true;
    })().catch((error) => {
      schemaReady = null;
      console.error('Business database unavailable; using memory fallback:', error?.message || 'Unknown error');
      return false;
    });
  }
  return schemaReady;
}

export async function getBusinessConfig(businessId) {
  if (await ensureSchema()) {
    try {
      const sql = await getSql();
      const { rows } = await sql`SELECT business_id AS "businessId", business_name AS "businessName", industry, website, contact_email AS "contactEmail", knowledge, updated_at AS "updatedAt"
        FROM hamdan_business_configs WHERE business_id = ${businessId} LIMIT 1`;
      return rows[0] || null;
    } catch (error) {
      console.error('Business database query failed; using memory fallback:', error?.message || 'Unknown error');
    }
  }
  return memory.get(businessId) || null;
}

export async function saveBusinessConfig(businessId, config) {
  const record = { businessId, ...config, updatedAt: new Date().toISOString() };

  if (await ensureSchema()) {
    try {
      const sql = await getSql();
      await sql`INSERT INTO hamdan_business_configs
        (business_id, business_name, industry, website, contact_email, knowledge, updated_at)
        VALUES (${businessId}, ${config.businessName}, ${config.industry || ''}, ${config.website || ''}, ${config.contactEmail || ''}, ${config.knowledge || ''}, ${record.updatedAt})
        ON CONFLICT (business_id) DO UPDATE SET
          business_name = EXCLUDED.business_name,
          industry = EXCLUDED.industry,
          website = EXCLUDED.website,
          contact_email = EXCLUDED.contact_email,
          knowledge = EXCLUDED.knowledge,
          updated_at = EXCLUDED.updated_at`;
      return record;
    } catch (error) {
      console.error('Business database save failed; using memory fallback:', error?.message || 'Unknown error');
    }
  }

  memory.set(businessId, record);
  return record;
}
