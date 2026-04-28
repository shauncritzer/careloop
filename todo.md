# CareLoop v2 — Simplified Rebuild

## Completed (v1)
- [x] Set up Supabase client with provided credentials
- [x] Configure global theming — elegant healthcare aesthetic
- [x] Implement alert engine (RED/YELLOW/GREEN severity logic)
- [x] Write vitest tests for alert engine
- [x] Fix signup "User already registered" error — improve error message and add "try signing in" link
- [x] Handle Supabase auth edge case where user exists but hasn't confirmed email

## v2 Rebuild
- [x] Replace Supabase email auth with simple PIN/passphrase entry (no account creation needed)
- [x] Rebuild home dashboard — large clear status card, today's check-in status, quick actions
- [x] Rebuild daily check-in — focused on weight, BP, pulse, SpO2, symptoms, meds, fluid/sodium intake
- [x] Add fluid intake tracking (cups/oz per day) with daily target
- [x] Add sodium awareness prompts in check-in flow
- [x] Build clear RED/YELLOW/GREEN alert display after each check-in
- [x] Build AI chat assistant — mom can ask care questions and get guidance
- [x] Build trends/history view with simple charts (weight trend is priority)
- [x] Build family read-only view (Shaun can check data remotely)
- [x] Build doctor summary export with LLM analysis
- [x] Add medical disclaimer footer on every screen
- [x] Ensure large touch targets and readable fonts for elderly-friendly use
- [x] Write tests for new features (34 tests passing)
