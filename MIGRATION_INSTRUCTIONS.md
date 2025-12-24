# Database Migration Instructions

## Error: Column "ai_lead_assigner_enabled" does not exist

This error occurs because the database schema hasn't been updated with the new columns and tables that were added to the codebase.

## Quick Fix

Run the migration SQL script to add the missing columns and tables.

### Option 1: Using psql (PostgreSQL CLI)

```bash
# Connect to your database
psql -h <your-host> -U <your-user> -d <your-database>

# Run the migration
\i migrations/add_ai_lead_assigner_and_new_tables.sql

# Or if running from command line:
psql -h <your-host> -U <your-user> -d <your-database> -f migrations/add_ai_lead_assigner_and_new_tables.sql
```

### Option 2: Using Railway CLI

If you're using Railway, you can run:

```bash
# Get database connection details
railway connect

# Or run the migration directly
railway run psql < migrations/add_ai_lead_assigner_and_new_tables.sql
```

### Option 3: Using Database Admin Tool

If you're using a database admin tool (pgAdmin, DBeaver, etc.):

1. Connect to your database
2. Open the SQL editor
3. Copy and paste the contents of `migrations/add_ai_lead_assigner_and_new_tables.sql`
4. Execute the script

### Option 4: Using Drizzle ORM (Recommended for future)

If you want to use Drizzle migrations in the future, you can set up:

```bash
npm install drizzle-kit
npx drizzle-kit generate
npx drizzle-kit migrate
```

## What This Migration Adds

1. **Users Table**:
   - `ai_lead_assigner_enabled` (BOOLEAN) - Enable/disable AI Lead Assigner
   - `openai_api_key` (TEXT) - OpenAI API key storage

2. **Leads Table**:
   - `pipeline_stage` (VARCHAR) - Current pipeline stage

3. **New Tables**:
   - `pipelines` - Sales pipeline stages
   - `notifications` - User notifications

## Verification

After running the migration, verify it worked:

```sql
-- Check users table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('ai_lead_assigner_enabled', 'openai_api_key');

-- Check leads table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND column_name = 'pipeline_stage';

-- Check if new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('pipelines', 'notifications');
```

## Rollback (if needed)

If you need to rollback:

```sql
-- Remove columns from users
ALTER TABLE users DROP COLUMN IF EXISTS ai_lead_assigner_enabled;
ALTER TABLE users DROP COLUMN IF EXISTS openai_api_key;

-- Remove column from leads
ALTER TABLE leads DROP COLUMN IF EXISTS pipeline_stage;

-- Drop tables
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS pipelines;
```

## Important Notes

- **Backup First**: Always backup your database before running migrations
- **Test Environment**: Test migrations in a development/staging environment first
- **Zero Downtime**: The migration uses `IF NOT EXISTS` clauses, so it's safe to run multiple times
- **Data Safety**: Existing data will not be affected by this migration

