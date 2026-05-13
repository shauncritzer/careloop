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

## Food Photo Sodium Scanner (v3.1)
- [x] Add tRPC procedure `careloop.analyzeMeal` that accepts a base64 image and returns sodium estimate, food items, and confidence level
- [x] Build MealScanner component with camera capture, photo preview, and AI result display
- [x] Add "Scan Meal" button to daily check-in fluid/sodium card
- [x] Add running daily sodium total tracker showing remaining budget vs limit
- [x] Scanned sodium auto-adds to sodium_mg field (cumulative across multiple scans)
- [x] 31 tests passing, 0 TypeScript errors after integration

## v3.2 — UX Simplification & Meal Scanner Standalone
- [x] Remove PIN auth entirely — app opens directly to dashboard (no login screen)
- [x] Remove Login.tsx, Setup.tsx, and AuthContext.tsx PIN logic
- [x] Update App.tsx routing to go straight to Home/PatientProfile setup
- [x] Add standalone MealScanner page at /scan accessible from main nav
- [x] Add "Scan Meal" card/button to Home dashboard quick actions
- [x] Research and compile purchase links for: Withings Body+, Withings BPM Connect, Kardia Mobile 6L, pulse oximeter

## v3.3 — Clinical Calibration (Larry's MyChart Data)
- [x] Extract clinical data from MyChart (labs, echo, medications, diagnoses, discharge instructions)
- [x] Create larry_clinical_data.md with full extracted clinical data
- [x] Update patient profile in database: baseline weight 176 lbs, BP 158/98, pulse 90, SpO2 94, sodium 2000mg, fluid 64oz
- [x] Calibrate alertEngine.ts with Larry's specific thresholds (BP 190/90 red, 170 yellow; pulse 130 rapid AFib; COPD SpO2 context)
- [x] Update askAssistant LLM system prompt with Larry's full clinical context (meds, diagnoses, care team, thresholds)
- [x] Update generateSummary LLM system prompt with Larry's clinical context
- [x] Rename patient to Lawrence "Larry" Critzer in database
- [x] Update caregiverName to Shaun Critzer in database
