# CareLoop TODO

- [x] Set up Supabase client with provided credentials (URL + anon key)
- [x] Configure global theming — elegant healthcare aesthetic, large fonts, high contrast
- [x] Build login screen with Supabase email/password auth
- [x] Build signup screen with Supabase email/password auth
- [x] Build patient profile setup/management screen with baseline fields
- [x] Build daily check-in 7-card flow (weight, BP/pulse, SpO2, symptoms, meds, notes, result)
- [x] Implement alert engine (RED/YELLOW/GREEN severity logic)
- [x] Build home dashboard with patient status card and quick navigation
- [x] Build trends/history screen with charts (weight, BP, pulse, SpO2, symptoms, meds)
- [x] Build doctor summary export with copy-to-clipboard
- [x] Integrate LLM for natural language summaries and care recommendations
- [x] Build family read-only view with invite-by-email
- [x] Implement automated in-app alerts for concerning patterns (server-side logging + Supabase alerts table; email delivery requires Supabase Edge Function)
- [x] Add medical disclaimer footer on every screen
- [x] Ensure minimum 48x48px touch targets and 16px+ body font
- [x] Write vitest tests for alert engine and key procedures
