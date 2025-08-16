import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// For local development, use local Supabase instance
// For production or when specified, use cloud instance
const connectionString = isDevelopment && !process.env.USE_CLOUD_DB
  ? 'postgresql://postgres:postgres@localhost:54322/postgres'
  : `postgresql://postgres.${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '')}:${process.env.SUPABASE_DB_PASSWORD || '[db-password]'}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;

export default defineConfig({
  schema: './lib/scheduling/schema.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
  verbose: true,
  strict: true,
  // Optionally configure table and schema filtering
  schemaFilter: ['public'],
  tablesFilter: ['students', 'studios'],
});