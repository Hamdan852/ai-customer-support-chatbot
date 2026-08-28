// Storage adapter boundary for the MVP.
// Keep persistence behind this module so we can connect a real database later
// without changing the chatbot UI/API contract.

const memory = globalThis.__HAMDAN_LEADS__ || (globalThis.__HAMDAN_LEADS__ = new Map());

export function createLead(lead) {
  const id = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record = { id, ...lead, createdAt: new Date().toISOString() };
  const businessId = lead.businessId || 'demo-business';
  const list = memory.get(businessId) || [];
  list.unshift(record);
  memory.set(businessId, list.slice(0, 100));
  return record;
}

export function listLeads(businessId = 'demo-business') {
  return memory.get(businessId) || [];
}
