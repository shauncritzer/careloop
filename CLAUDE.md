# CareLoop — Project Context

## What this is
A mobile caregiver app for one real elderly heart-failure patient (79yo) 
and his spouse caregiver. Built with React Native (Expo) + Supabase.
This may eventually become a SaaS product but right now serves one family.

## Stack
- Frontend: React Native with Expo (managed workflow)
- Backend: Supabase (auth + Postgres + realtime)
- Charts: Victory Native or react-native-gifted-charts (lightweight)
- State: React Context or Zustand (keep it simple)
- Styling: StyleSheet — large fonts, high contrast, older-adult friendly

## Key commands
- `npx expo start` — run dev server
- `npx expo start --tunnel` — for physical device testing
- `npx supabase db push` — push schema migrations

## Architecture
- /src/screens — all screens
- /src/components — shared UI components
- /src/lib/supabase.ts — Supabase client
- /src/lib/alertEngine.ts — rules-based alert logic (isolated, editable)
- /src/navigation — stack/tab navigation
- /supabase/migrations — all schema changes

## Critical rules
- Alert thresholds live in alertEngine.ts only — never hardcode elsewhere
- All text must pass large-font accessibility (minimum 16px body, 20px+ headings)
- Never use medical diagnosis language — say "contact doctor" not "you have X"
- No device Bluetooth integrations in v1 — manual entry only
- Footer on every screen: "CareLoop does not provide medical diagnosis or 
  emergency services. If symptoms are severe, contact emergency services."
- Prefer working code over long explanations
- Commit after each working feature, not at the end

## What Claude gets wrong on this project
- Do not add Bluetooth/device sync — it's explicitly out of scope for v1
- Do not use small touch targets — every button minimum 48x48px
- Do not use medical jargon in user-facing strings
