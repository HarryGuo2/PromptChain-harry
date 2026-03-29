# PromptChain-harry

Prompt chain tool for Week 8 assignment.

## What this repo already has

- Next.js App Router scaffold
- Supabase client setup (browser + server)
- Auth callback route
- Admin middleware guard that allows:
  - `profiles.is_superadmin = TRUE`
  - `profiles.is_matrix_admin = TRUE`
- Initial admin routes:
  - `/admin`
  - `/admin/humor-flavors`
  - `/admin/test-runner`
  - `/admin/captions`
- Theme scaffold:
  - system / light / dark (via `next-themes`)

## Setup

1. Install dependencies:
   - `npm install`
2. Configure env values:
   - copy `.env.local.example` to `.env.local` (or edit existing `.env.local`)
3. Run:
   - `npm run dev`
4. Open:
   - `http://localhost:3000`

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_PROMPT_CHAIN_API_BASE_URL`
- `NEXT_PUBLIC_PROMPT_CHAIN_API_KEY` (optional)

## Assignment targets (still to implement)

- Humor flavor CRUD
- Humor flavor step CRUD
- Reorder flavor steps
- Test generation flow using `api.almostcrackd.ai`
- Read captions produced by specific humor flavor
- Polish UX and add pagination where needed

## Deployment notes

- Create new Vercel project from this repo
- Set env variables in Vercel
- Turn off deployment protection for incognito testing
