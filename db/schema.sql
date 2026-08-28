-- Hamdan AI production data model
-- PostgreSQL-compatible schema. Run this in the selected production database
-- after configuring the application database connection.

create table if not exists businesses (
  id text primary key,
  name text not null,
  industry text not null default 'general',
  website text,
  contact_email text,
  knowledge text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references businesses(id) on delete cascade,
  industry text not null default 'general',
  name text,
  email text,
  phone text,
  location text,
  request text,
  preferred_contact text,
  consent_at timestamptz not null,
  status text not null default 'new' check (status in ('new','contacted','qualified','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_business_created_idx on leads (business_id, created_at desc);
create index if not exists leads_business_status_idx on leads (business_id, status);

-- Production security requirements:
-- 1. Enable row-level security if your database provider supports it.
-- 2. Restrict reads/writes to an authenticated business identity.
-- 3. Never expose database credentials to browser code.
-- 4. Define retention/deletion rules appropriate to the business and jurisdiction.
-- 5. Keep consent_at with each lead so the business can demonstrate when consent was received.
