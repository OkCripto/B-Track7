# Supabase -> Convex + Clerk Migration

## Prerequisites
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CONVEX_URL`
- `CLERK_SECRET_KEY`
- Convex env var `CLERK_JWT_ISSUER_DOMAIN` configured in target deployment
- Clerk JWT template named `convex`

## Development Migration Flow
1. Export Supabase snapshot:
   - `npm run migrate:export`
2. Sync/create Clerk users and generate ID map:
   - `npm run migrate:sync-clerk -- <path-to-supabase-snapshot.json>`
3. Transform and import snapshot into Convex:
   - `npm run migrate:import-convex -- <snapshot.json> <user-id-map.json>`
4. Verify row-count parity:
   - `npm run migrate:verify -- <path-to-convex-snapshot.json>`

## Production Migration Flow
1. Set production secrets in `.env.production.local`.
2. Export Supabase snapshot:
   - `npm run migrate:export:prod`
3. Sync/create Clerk users and generate ID map:
   - `npm run migrate:sync-clerk:prod -- <path-to-supabase-snapshot.json>`
4. Transform and import snapshot into Convex:
   - `npm run migrate:import-convex:prod -- <snapshot.json> <user-id-map.json>`
5. Verify row-count parity:
   - `npm run migrate:verify:prod -- <path-to-convex-snapshot.json>`

## Notes
- Password users are migrated as Clerk accounts and should use password reset.
- OAuth users are mapped by email or external ID.
- If Clerk requires password-based users during migration, the sync script falls back to generating temporary passwords.
- Import is destructive for target Convex deployment (`replace_snapshot` clears existing tables first).
