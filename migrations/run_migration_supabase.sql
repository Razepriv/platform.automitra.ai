-- Quick Migration Script for Supabase
-- Copy and paste this entire file into Supabase SQL Editor and run it

-- Add AI Lead Assigner columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ai_lead_assigner_enabled BOOLEAN DEFAULT false;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS openai_api_key TEXT;

-- Add pipeline_stage column to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(255);

-- Create pipelines table
CREATE TABLE IF NOT EXISTS pipelines (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  stage VARCHAR(50) NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  color VARCHAR(7),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for pipelines table
CREATE INDEX IF NOT EXISTS idx_pipelines_org ON pipelines(organization_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_stage ON pipelines(stage);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  organization_id VARCHAR NOT NULL,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- Verification queries (optional - run these after migration to verify)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('ai_lead_assigner_enabled', 'openai_api_key');
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('pipelines', 'notifications');

