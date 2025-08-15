# Database Management Guide

## Current Setup Status

### ✅ Completed
- Docker is running and ready for local Supabase
- Created `drizzle.config.ts` for database configuration
- Created `supabase/migrations/` directory for migration files

### ⚠️ Pending Actions
1. **Supabase CLI Authentication**: You need to authenticate the CLI to manage your cloud instance
2. **Database Password**: The Drizzle config needs your Supabase database password

## Required Steps to Complete Setup

### 1. Authenticate Supabase CLI

Get your access token from: https://app.supabase.com/account/tokens

Then run:
```bash
export SUPABASE_ACCESS_TOKEN="your-token-here"
# OR
supabase login --token "your-token-here"
```

### 2. Link to Cloud Project

After authentication:
```bash
supabase link --project-ref ufwwmolopxkhdiylsntk
```

### 3. Configure Database Password

Add to `.env.local`:
```
SUPABASE_DB_PASSWORD=your-database-password
```

Get your database password from: https://app.supabase.com/project/ufwwmolopxkhdiylsntk/settings/database

## Database Management Commands

### Local Development

```bash
# Start local Supabase (requires Docker)
supabase start

# View local database in browser
open http://localhost:54323

# Reset local database
supabase db reset

# Run against local database
USE_CLOUD_DB=false pnpm dev
```

### Schema Management with Drizzle

```bash
# Generate migrations from schema.ts
pnpx drizzle-kit generate

# Push schema changes directly (without migrations)
pnpx drizzle-kit push

# Open Drizzle Studio for database exploration
pnpx drizzle-kit studio

# Pull schema from database
pnpx drizzle-kit introspect
```

### Cloud Database Management

```bash
# Pull cloud schema to local
supabase db pull

# Push local migrations to cloud
supabase db push

# Compare local vs cloud schemas
supabase db diff

# List migrations
supabase migration list

# Create new migration
supabase migration new migration_name
```

### Switching Between Local and Cloud

```bash
# Use local database (default in development)
pnpm dev

# Use cloud database in development
USE_CLOUD_DB=true pnpm dev
```

## Database Schema Overview

The application has two main tables:

### `studios` Table
- `id`: Primary key (serial)
- `user_id`: UUID for Supabase auth user
- `code`: Unique 5-character studio code
- `owner_schedule`: Teacher's availability (JSON)
- `studio_name`: Display name
- `events`: Calendar events array (JSONB)

### `students` Table
- `id`: Primary key (serial)
- `email`: Student email
- `first_name`: Optional first name
- `last_name`: Optional last name
- `studio_id`: Foreign key to studios
- `schedule`: Student's availability (JSON)
- `lesson_length`: '30' or '60' minutes (enum)

## Workflow for Schema Changes

1. **Modify schema** in `lib/schema.ts`
2. **Generate migration**: `pnpx drizzle-kit generate`
3. **Test locally**: 
   - Start local Supabase: `supabase start`
   - Apply migration: `pnpx drizzle-kit push`
   - Test application: `pnpm dev`
4. **Deploy to cloud**:
   - Review migration file in `supabase/migrations/`
   - Push to cloud: `supabase db push`

## Troubleshooting

### Docker Issues
- Ensure Docker Desktop is running
- Check Docker status: `docker info`
- Restart Docker if needed

### Connection Issues
- Local DB: `postgresql://postgres:postgres@localhost:54322/postgres`
- Cloud DB: Check connection string in Supabase dashboard
- Verify `.env.local` has correct URLs and keys

### Migration Issues
- Always test migrations locally first
- Use `supabase db diff` to verify changes
- Keep migrations small and focused