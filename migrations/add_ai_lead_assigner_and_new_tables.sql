-- Migration: Add AI Lead Assigner columns and new tables
-- Date: 2025-12-24
-- Description: Adds ai_lead_assigner_enabled and openai_api_key columns to users table,
--              adds pipeline_stage column to leads table,
--              creates pipelines and notifications tables

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

-- Add comments for documentation
COMMENT ON COLUMN users.ai_lead_assigner_enabled IS 'Enable AI-powered lead assignment from call transcripts';
COMMENT ON COLUMN users.openai_api_key IS 'OpenAI API key for AI Lead Assigner (encrypted in production)';
COMMENT ON COLUMN leads.pipeline_stage IS 'Current stage in the sales pipeline';
COMMENT ON TABLE pipelines IS 'Sales/Lead pipeline stages for organizations';
COMMENT ON TABLE notifications IS 'User notifications for platform events';

