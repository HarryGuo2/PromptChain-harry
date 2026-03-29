# Prompt Chain Tool - Agent Handoff Notes

Use this file at start of a new conversation to restore context quickly.

## Goal

Build Week 8 Prompt Chain Tool that supports:

- auth gate for `is_superadmin` OR `is_matrix_admin`
- humor flavor CRUD
- humor flavor step CRUD
- step reorder
- test run via Assignment 5 REST API (`api.almostcrackd.ai`)
- read generated captions by humor flavor
- dark/light/system mode

## Current status

Scaffold complete:

- framework and configs: `package.json`, `next.config.ts`, Tailwind/PostCSS/TS configs
- auth + supabase:
  - `src/lib/supabase-browser.ts`
  - `src/lib/supabase-server.ts`
  - `src/middleware.ts`
  - `src/app/auth/callback/route.ts`
  - `src/app/unauthorized/page.tsx`
- initial pages:
  - `src/app/page.tsx`
  - `src/app/admin/page.tsx`
  - `src/app/admin/humor-flavors/page.tsx` (read-only baseline)
  - `src/app/admin/test-runner/page.tsx` (placeholder)
  - `src/app/admin/captions/page.tsx` (recent read view)
- theme scaffold:
  - `src/components/theme-provider.tsx`
  - `src/components/theme-toggle.tsx`
  - integrated in layout
- API helper:
  - `src/lib/prompt-chain-api.ts`

## Immediate next tasks (priority order)

1. Build `/admin/humor-flavors` client management:
   - create/update/delete humor flavors
   - create/update/delete humor flavor steps
2. Add step reorder UX:
   - up/down or drag/drop
   - persist `order_by` safely with transaction-style updates
3. Implement `/admin/test-runner`:
   - choose flavor
   - choose test image(s)
   - call REST API and display response
4. Implement `/admin/captions` filtering:
   - filter by humor flavor
   - pagination
5. Add better error handling and loading states

## Data tables expected

- `humor_flavors`
- `humor_flavor_steps`
- `captions`
- supporting refs:
  - `llm_models`
  - `llm_input_types`
  - `llm_output_types`
  - `humor_flavor_step_types`

## Guardrails

- Do NOT commit real secrets.
- Keep `.env.local` local only.
- Use `NEXT_PUBLIC_*` env vars only for safe client-readable values.
- Verify with `npm run build` before push.
