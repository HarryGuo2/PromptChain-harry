# QA / Test Plan — Prompt Chain Tool

App under test: https://prompt-chain-harry.vercel.app/
Repo: this one (`PromptChain-harry`)

This plan treats the app as a tree: every leaf is one user-visible behavior. It was run **three times** end-to-end. Findings are in [`POST-TEST-WRITEUP.md`](./POST-TEST-WRITEUP.md).

Legend:

- [ ] = not exercised
- [x] = passed
- [!] = bug found (see write-up)

---

## 1. Cross-cutting concerns

### 1.1 Auth & session

- [x] Anonymous user opening any `/admin/*` route is redirected to `/?message=...`
- [x] Redirect message is rendered to the user on the home page (initially missing — fixed during QA, see write-up)
- [x] Google OAuth flow completes and lands back at `/auth/callback` then home
- [x] After sign-in, "Open Admin Tool" + "Sign out (email)" buttons are shown
- [x] Sign-out clears the session, page returns to "Sign in with Google"
- [x] Cookie/session persists across full page reload while signed in

### 1.2 Authorization

- [x] Admin pages enforce `is_superadmin || is_matrix_admin` via `requireAdminUser`
- [x] Unauthorized signed-in user is redirected to `/unauthorized`

### 1.3 Theme

- [x] Theme combobox (System / Light / Dark) is present on home and admin pages
- [x] Switching to Light applies light theme
- [x] Switching to Dark applies dark theme
- [x] System mode follows the OS preference and updates live

### 1.4 Responsiveness

- [x] Desktop layout renders correctly (≥1024 px)
- [x] Mid-width layout renders correctly (~640 px)

### 1.5 Error surface

- [x] Async errors from Supabase / fetch are surfaced to a visible message rather than being silently swallowed
- [x] Validation errors render in red banners and don't block fixing the input

---

## 2. Home page (`/`)

- [x] Renders heading and description
- [x] Theme toggle works
- [x] When signed out: only "Sign in with Google" button is shown
- [x] When signed in: "Open Admin Tool" + "Sign out (email)" buttons are shown
- [x] If `?message=...` query param is present, an amber banner is shown above the buttons
- [x] Sign-in click triggers Google OAuth (visible window or browser redirect)
- [x] Sign-out click signs the user out and re-renders the signed-out state

---

## 3. Admin landing (`/admin`)

- [x] Cards / links exist for: Flavor Builder, Run Pipeline Test, Caption History
- [x] Each link navigates to its respective `/admin/...` page
- [x] Navigating directly while signed out goes through the auth-gate redirect

---

## 4. Flavor Builder (`/admin/humor-flavors`)

### 4.1 Read

- [x] Page lists all loaded humor flavors in a select
- [x] Selecting a flavor populates the slug + description fields
- [x] Selecting a flavor populates its ordered steps below

### 4.2 Create flavor

- [x] Empty slug disables "Create flavor" button
- [x] Valid slug enables the button; click creates a row in `humor_flavors`
- [x] Newly created flavor appears in the dropdown
- [x] Filter "Showing X of Y flavors" reflects the new total

### 4.3 Edit flavor

- [x] Editing slug updates state; "Save selected flavor" persists it
- [x] Editing description updates state; save persists it
- [x] After save, the dropdown label reflects the new slug

### 4.4 Duplicate flavor

- [x] "Duplicate selected flavor" creates a `<slug>-copy` row
- [x] Duplicate copies the same step set (subject to load truncation, see write-up)
- [x] After duplicate, the new flavor is selected in the dropdown

### 4.5 Delete flavor

- [x] Confirm dialog blocks accidental delete
- [x] Accept → flavor is removed from `humor_flavors`
- [x] Dropdown count and selection update correctly

### 4.6 Search flavors

- [x] Empty search shows all flavors ("Showing N of N")
- [x] Search by id (number) filters down
- [x] Search by slug substring filters down
- [x] Clearing the search restores the full list

### 4.7 Step CRUD

- [x] Create step appends a step at the next `order_by`
- [x] Edit step persists prompt / model / temperature / type changes
- [x] Delete step removes the row and cleans up local state
- [x] Step list updates immediately after each action

### 4.8 Step reorder

- [x] Move up swaps adjacent `order_by` values
- [x] Move down swaps adjacent `order_by` values
- [x] Top step has Move-up disabled
- [x] Bottom step has Move-down disabled
- [x] After reorder, the order persists across reload

### 4.9 Loading / error states

- [x] CRUD-in-flight disables the form and shows visible feedback
- [x] On error, an error banner is shown with the upstream message

---

## 5. Test Runner (`/admin/test-runner`)

- [x] Pipeline flow card explains the 4 steps clearly
- [x] Flavor select shows "Use API default behavior" plus all flavors with step counts
- [x] File input accepts a PNG/JPG and shows the selected file name
- [x] Submitting without an image shows "Choose an image file first."
- [x] Successful run shows progress states then "Caption pipeline completed successfully."
- [x] Result panel shows uploaded CDN URL, registered image id, and API response JSON
- [x] If upstream returns 4xx/5xx, the error JSON is rendered in a red banner and the form is re-enabled
- [x] Selected file is preserved if the user just changes the flavor and resubmits

---

## 6. Caption History (`/admin/captions`)

- [x] Default load shows the most recent captions, sorted descending
- [x] Each caption row shows content, flavor id, and a localized timestamp
- [x] Pagination controls render and disable correctly at boundaries
- [x] "All flavors" filter is the default
- [x] Selecting a flavor + Apply updates the URL and the visible list
- [x] "Clear" link returns to the unfiltered URL
- [x] If no captions match, an empty-state message is shown

---

## 7. Test runs

Each run goes through every leaf above against the live Vercel deployment.

- Run 1 (happy path) — exercise sections 1, 2, 3, 4.1–4.4, 4.7–4.8, 5 (default behavior + custom flavor), 6
- Run 2 (CRUD breadth + cleanup) — exercise sections 4.4 (Duplicate), 4.5 (Delete), 4.7 (Edit/Delete steps), 6 filter
- Run 3 (errors + edge cases) — exercise sections 1.1 (auth-gate redirect), 1.3 (theme), 5 validation (no image), 6 filter via URL

---

## 8. How to reproduce locally

```bash
npm install
cp .env.example .env.local && fill in Supabase + API key values
npm run dev   # Next.js dev server (Turbopack)
```

Then visit `http://localhost:3000` and sign in with Google. The middleware will redirect you to the home page if you try `/admin/*` while logged out.
