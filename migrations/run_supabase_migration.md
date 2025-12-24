# Running Migration on Supabase

## Option 1: Using Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `add_ai_lead_assigner_and_new_tables.sql`
5. Click **Run** (or press Ctrl+Enter)
6. Verify the migration completed successfully

## Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Make sure you're logged in
supabase login

# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push --file migrations/add_ai_lead_assigner_and_new_tables.sql
```

## Option 3: Using psql with Supabase Connection String

```bash
# Get your connection string from Supabase Dashboard > Settings > Database
# Format: postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

psql "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f migrations/add_ai_lead_assigner_and_new_tables.sql
```

## Verification

After running the migration, verify it worked by running this in Supabase SQL Editor:

```sql
-- Check users table columns
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('ai_lead_assigner_enabled', 'openai_api_key');

-- Check leads table columns
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND column_name = 'pipeline_stage';

-- Check if new tables exist
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_name IN ('pipelines', 'notifications')
AND table_schema = 'public';
```

## Troubleshooting

If you get errors:
- **"relation already exists"**: The table/column already exists, which is fine (IF NOT EXISTS handles this)
- **"permission denied"**: Make sure you're using the correct database user (postgres role)
- **"syntax error"**: Check that you copied the entire SQL file correctly

