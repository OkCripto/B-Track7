# Production Cutover Checklist

## Before Window
- Confirm production Clerk keys and URLs are configured.
- Confirm production Convex deployment has `CLERK_JWT_ISSUER_DOMAIN`.
- Run full migration rehearsal in development.
- Validate dashboard CRUD, transfers, CSV import/export, release notes, auth redirects.

## During Window (Big-Bang)
1. Freeze writes on current production app.
2. Export fresh production Supabase snapshot (`npm run migrate:export:prod`).
3. Run Clerk sync and generate user ID mapping (`npm run migrate:sync-clerk:prod -- <snapshot.json>`).
4. Import transformed snapshot to Convex production (`npm run migrate:import-convex:prod -- <snapshot.json> <user-map.json>`).
5. Run parity verification and smoke tests (`npm run migrate:verify:prod -- <convex-snapshot.json>`).
6. Deploy app version with Clerk + Convex stack.

## After Window
- Monitor authentication errors and Convex logs.
- Confirm release notes and dashboard data visibility for migrated users.
- Keep rollback artifact (old app build + Supabase snapshot) available for immediate recovery.
