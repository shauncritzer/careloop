# CareLoop v3 — No External Dependencies

## v3 Rebuild (remove Supabase, use built-in DB)
- [x] Remove @supabase/supabase-js dependency and all Supabase client code
- [x] Create database schema in drizzle/schema.ts for patients, daily_logs, alerts, family_members
- [x] Apply database migration via webdev_execute_sql
- [x] Build tRPC procedures for all CRUD operations (patients, logs, alerts, family)
- [x] Rebuild auth as simple PIN stored in built-in DB (no external auth service)
- [x] Rebuild all pages to use tRPC hooks instead of Supabase client hooks
- [x] Keep AI care assistant using built-in LLM
- [x] Keep alert engine logic (client-side, no external dependency)
- [x] Test everything works without any external service
- [x] Checkpoint and deliver

## Previous items (v1/v2 — completed)
- [x] Set up Supabase client with provided credentials (URL + anon key) — REMOVED in v3
- [x] Configure global theming — elegant healthcare aesthetic, large fonts, high contrast
- [x] Build login screen with Supabase email/password auth — REPLACED with PIN in v3
- [x] Build patient profile setup/management screen with baseline fields
- [x] Build daily check-in 5-card flow (vitals, symptoms, meds, fluid/sodium, notes)
- [x] Implement alert engine (RED/YELLOW/GREEN severity logic)
- [x] Build home dashboard with patient status card and quick navigation
- [x] Build trends/history screen with charts (weight, BP, pulse, SpO2, fluid, sodium)
- [x] Build doctor summary export with copy-to-clipboard and download
- [x] Integrate LLM for natural language summaries and care recommendations
- [x] Build family read-only view with invite-by-email
- [x] Implement automated in-app alerts for concerning patterns
- [x] Add medical disclaimer footer on every screen
- [x] Ensure minimum 48x48px touch targets and 16px+ body font
- [x] Write vitest tests for alert engine and key procedures
- [x] Fix signup "User already registered" error — REMOVED in v3
- [x] Fix infinite loading spinner on deployed site — FIXED by removing Supabase
