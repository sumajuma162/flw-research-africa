# FLW Research Africa — frontend

React + TypeScript frontend for the **Food Loss and Waste Research Network in Africa**, built to the Software Requirements Specification (FLWRA-SRS-001 v0.3).

It runs today **without a backend**. A simulated Django REST API (`src/api/mock.ts`) enforces the same rules the real server will (roles, review rules, consent, audit logging), so every workflow can be tested end to end. When the Django API exists, you swap the data layer and keep every screen.

> All people, organisations and records in the demo are fictional sample data.

---

## Quick start

Requirements: **Node.js 20 or 22** (LTS) and npm.

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Type-checks, then builds the production site into `dist/` (code-split, ~128 KB gzipped first load) |
| `npm run preview` | Serves `dist/` at http://localhost:4173 |
| `npm run build:demo` | Builds one self-contained HTML file into `dist-demo/` (used for the shareable demo) |
| `npm run typecheck` | TypeScript check only |

---

## Demo accounts

Password for every account: **`harvest-2026`** · Two-step sign-in code for staff: **`246810`**

| Email | Role | Good for testing |
|---|---|---|
| `amina@demo.flw` | Member, early-career researcher | Returned submission to revise, messages, workspace, mentorship |
| `neema@demo.flw` | Member, extension officer | Community knowledge submission in review |
| `kwame@demo.flw` | Member, policy adviser | Policy brief in review, privacy request |
| `joseph@demo.flw` | Moderator + reviewer (MFA) | Review queue, conduct reports |
| `grace@demo.flw` | Administrator + editor + reviewer (MFA) | Users, roles, taxonomy, content, newsletters, reports, audit |
| `fatou@demo.flw` | Applicant (pending) | Application status page |
| `peter@demo.flw` | Suspended | Sign-in is blocked |

The yellow **Demo** button (bottom left) lets you switch accounts in one click, read every **email and SMS** the system sends (verification links, password resets, decisions, newsletters), simulate 30 minutes of inactivity, and **reset all demo data**. Data is stored in your browser only.

---

## What to test (suggested walkthrough)

1. **Visitor** — home page (hero video with pause control), search from the hero, filters on the knowledge hub (URL updates, shareable), a resource page (copy citation, version history, external-link notice, download), datasets, events (times shown in the event's zone and yours, add to calendar), opportunities, learning, help, network map, contact form.
2. **Join** — complete the 4-step application (try submitting empty fields first). Open Demo → inbox → *Verify email*. Sign in to see application status.
3. **Reviewer (Joseph)** — sign in with the MFA code. In the console queue approve the new application; open *Clay pot seed storage* and note that *Accept* stays disabled until every check, including community permission, is ticked. Resolve the spam report.
4. **Member (Amina)** — revise the returned dataset; submit a new publication using DOI lookup (`10.5555/flw.2026.001`, an unknown DOI, or `10.5555/timeout`); try uploading a `.exe`; post in the community and report a post; accept Neema's connection request and message her; change profile visibility and use *Preview as others see me*; switch to dark mode; mark learning items done; export your data.
5. **Administrator (Grace)** — accept Amina's resubmission; change roles (try removing your own admin role — the last-admin rule blocks it); add a taxonomy term; edit and publish the Vision page; send a newsletter (see it in the Demo inbox); view reports and the audit trail; try creating an event that ends before it starts.
6. **Phone** — resize to 360–400 px: menu drawer, filter sheet, bottom tab bar for members, no sideways scrolling.

An automated version of this walkthrough is in `tests/e2e.py` (Playwright for Python): 21 scenarios at desktop and phone widths.

```bash
npm run build && npm run preview &        # serves http://localhost:4173
pip install playwright && playwright install chromium
python tests/e2e.py ./test-screenshots
```

---

## Project structure

```
src/
  api/          types.ts (domain model) · seed.ts (demo data) · mock.ts (simulated REST API) · index.ts (entry point)
  components/   ui.tsx (design system) · domain.tsx (cards, citation, links) · layout.tsx (header, layouts, guards, demo panel)
  lib/          session, preferences (theme, data saver), toasts, hooks, formatting, labels, media
  pages/
    public/     Home, Knowledge, Content (about, events, news…), Explore (orgs, learn, help, map), Auth
    member/     Dashboard, Profile/Settings/Privacy, People (directory, messages), Submit, Community
    console/    Queue + Review, Admin (content, users, organisations, taxonomy, reports, newsletters, mentorship, audit)
  assets/media/ hero video and illustrations
```

**Stack:** React 18, TypeScript (strict), Vite 6, Tailwind CSS 4 (design tokens in `src/index.css`), React Router 6, TanStack Query 5, Zod, Recharts, lucide icons. Routes are lazy-loaded.

---

## Connecting to Django

Every screen calls functions on `api` (for example `api.search(...)`, `api.decideReview(...)`). Each function corresponds to an endpoint in SRS Section 15.2. To connect the real backend:

1. Create `src/api/http.ts` exporting an `api` object with the **same function names and return types**, implemented with `fetch('/api/v1/...', { credentials: 'same-origin' })`.
2. Send the `X-CSRFToken` header on POST/PATCH/DELETE (read from the `csrftoken` cookie) and an `Idempotency-Key` header where the mock takes a `key` argument.
3. Convert RFC 9457 problem responses to `ApiError(status, title, errors)` so forms keep showing field errors.
4. In `src/api/index.ts`, export from `./http` when `import.meta.env.VITE_API_MODE === 'http'`.
5. Remove the Demo panel (`DemoPanel` in `layout.tsx`) for production.

Authentication uses Django sessions through django-allauth headless (`/_allauth/browser/v1/...`); no tokens are stored in browser storage (IR006).

---

## Pictures and video

The hero video and six illustrations in `src/assets/media/` are original artwork made for this build in the network's palette. Replace them with licensed, consent-based photography when available (SRS 14.9): keep the same file names, or update `src/lib/media.ts`. Keep the hero video under ~1.5 MB (H.264, muted, 8–15 s loop) and photos under ~150 KB (WebP).

---

## Quality notes

- **Responsive:** mobile-first, tested at 375 px and 1366 px; touch targets ≥ 44 px; no horizontal scroll.
- **Accessible:** semantic landmarks, skip link, labelled fields, error summaries linked to fields, focus-trapped dialogs, visible focus ring, reduced-motion support, pause control on the hero video.
- **Light on data:** text first, lazy images, code splitting, a *reduced data mode* that stops the video (Settings → Appearance).
- **Candidate features** (FR031–FR041 in the SRS v0.3) are built so they can be tested with users; they remain pending validation.
