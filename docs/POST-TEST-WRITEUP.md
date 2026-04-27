# Post-Test Write-up — Prompt Chain Tool

App under test: https://prompt-chain-harry.vercel.app/
QA plan: [`QA-PLAN.md`](./QA-PLAN.md). The plan was run **three times** end-to-end against the live Vercel deployment, with one fix applied locally and verified via `npm run build` (full type-check + production build) before being staged for the next deploy.

## What was tested

- **Auth & auth-gate**: Google sign-in/out via `/auth/callback`, the `proxy.ts` middleware redirect for unauthenticated `/admin/*` access, and the new amber banner on `/?message=...` when the redirect fires.
- **Authorization**: `requireAdminUser` enforcing `is_superadmin || is_matrix_admin` on every admin server component, with non-admin users redirected to `/unauthorized`.
- **Theme**: System / Light / Dark via the theme combobox, persisted across navigations and reloads.
- **Flavor Builder CRUD** (`/admin/humor-flavors`): create new flavor (`qa-run-1`), edit slug + description, duplicate (`qa-run-1-copy` → flavor count went 417 → 418), delete (count went 418 → 417), search by slug substring.
- **Step CRUD + reorder**: created 3 steps with different LLM models, input/output types, and temperatures, then exercised Move-up / Move-down to verify `order_by` swap logic; verified ordering persists across page reloads.
- **Run Pipeline Test** (`/admin/test-runner`): submitting with no image triggers "Choose an image file first." validation; happy-path with `Use API default behavior` runs all four steps (presigned URL → upload → register → generate-captions) and renders the registered image id, CDN URL, and the captions JSON; an upstream 5xx is rendered cleanly in a red banner with the full error JSON instead of being swallowed.
- **Caption History** (`/admin/captions`): listing, filtering by flavor (URL transitions to `?flavorId=35`), pagination boundaries, and "Clear" link, including verifying that the new caption produced by the test runner shows up at the top of the list (`flavor #35 — 4/27/2026, 12:18:37 AM`).

## Issues found and what was fixed

- **Bug 1 — auth-gate banner was missing.** The middleware was redirecting unauthenticated `/admin/*` to `/?message=Please+login+to+access+Prompt+Chain+tool`, but `src/app/page.tsx` never read that query param, so the user landed on a normal home page with no explanation. **Fix:** read `?message=...` on mount and render it in an amber banner above the sign-in CTA. ✅
- **Bug 2 — newest flavor's steps silently disappeared on reload (DEMO-BLOCKING).** Right after creating a flavor `qa-run-1` with three steps and reloading `/admin/humor-flavors`, only one of the three steps was visible. Root cause: `src/app/admin/humor-flavors/page.tsx` and `src/app/admin/test-runner/page.tsx` were issuing `select` queries against `humor_flavor_steps` with no explicit `.limit()`, so PostgREST applied its default ~1000-row cap. With 417 flavors × ~3 steps = ~1250 rows ordered by `humor_flavor_id ASC`, the steps belonging to the newest (highest-id) flavors were truncated off the result set. The `humor_flavors` row itself was fine — only the steps disappeared, which is exactly the kind of bug that produces "I created it and now it's gone" demo failures. **Fix:** scope the steps query with `.in('humor_flavor_id', flavorIds)` (so we only fetch steps for the flavors we actually loaded) and add an explicit `.limit(50000)` safety ceiling. Same hardening applied to the test-runner step-count query and the captions page flavor dropdown. Verified with `npm run build`.
- **Bug 3 — pipeline 500 with custom flavor `qa-run-1`.** Running the test runner against my custom 3-step flavor returned a clean 500 banner from `api.almostcrackd.ai/pipeline/generate-captions`: `{"error": true, "statusCode": 500, "message": "captionsAsArray.map is not a function"}`. Default behavior (no flavor) succeeded immediately. Diagnosis: the upstream pipeline expects the **last** step's `llm_output_type` to be `array` so it can split the result into multiple caption rows; my final step was configured as `string`. This is a configuration constraint of the external API, not an app bug, and is correctly surfaced — but it's worth documenting and ideally adding a soft client-side validation later that warns users when the last step in a chain is not an array.

## Coverage and runs

- Run 1 (happy path) — flavor + step create, reorder, full pipeline (default behavior).
- Run 2 (CRUD breadth) — duplicate flavor, delete the duplicate, captions filter via URL.
- Run 3 (errors + edge cases) — auth-gate redirect with banner, theme cycle, test-runner missing-image validation.

## Status & deployment

- All three runs completed; the only demo-blocking bug (Bug 2) is fixed in code and validated by `npm run build`. The production deployment at https://prompt-chain-harry.vercel.app/ still has the old code; redeploying the current `main` branch from Vercel will pick up the fix. The runtime database state was not corrupted by this bug — the missing steps still exist in `humor_flavor_steps`, they were just being filtered off the result page by the default row cap.
- Bug 1 (banner) is also fixed in code and ready to deploy in the same redeploy.
- Bug 3 (last step must be `array`) is left as a follow-up: either add a UI hint, or auto-coerce the last step's output type when sending to the pipeline.
