CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    recruiter_pubkey TEXT NOT NULL,
    candidate_pubkey TEXT,
    company_name TEXT NOT NULL,
    role_name TEXT NOT NULL,
    amount BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Run this migration to update your jobs table
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS job_description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tx_signature TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS selected_roles TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS candidate_pubkey TEXT,
  ADD COLUMN IF NOT EXISTS can_release BOOLEAN NOT NULL DEFAULT FALSE;