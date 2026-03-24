# PlaceCard — Tech Stack

Last updated: 2026-03-24 (decisions logged 2026-03-24)

---

## The Stack

| Layer | Tool | What it does |
| :---- | :---- | :---- |
| Framework | Next.js (React) | Builds the UI and handles routing and server logic all in one package |
| Styling | Tailwind CSS | Utility-based styling system — fast to build with, easy to keep consistent |
| Drag and Drop | dnd-kit | Handles the guest-to-table drag and drop interactions |
| Database + Auth | Supabase | Stores all data, handles user accounts, and enables real-time collaboration |
| State Management | Zustand | Keeps track of app state (e.g. which guests are unassigned) without complexity |
| CSV Parsing | PapaParse | Reads and parses uploaded guest list CSV files |
| PDF Export | react-pdf | Generates a downloadable PDF of the finished seating chart |
| Hosting | Vercel | Publishes the app to the web with near-zero setup |

---

## Rationale by Layer

### Next.js (React)
Next.js is a framework built on top of React — the most widely used tool for building web apps. The reason to pick Next.js over plain React is that it bundles everything together: the user interface, the page routing (e.g. `/dashboard`, `/project/123`), and the server-side logic that talks to the database. One tool, one repo, one deploy. For a solo builder on a tight timeline, this matters a lot.

### Tailwind CSS
Tailwind is a styling system where you apply visual rules directly in the code rather than writing separate style files. It is fast to use, produces clean results, and makes it easy to maintain a consistent visual language across the app. The "calm design" principle in the CLAUDE.md is well-served by Tailwind's constraint-based approach.

### dnd-kit
The drag-and-drop library used by Vercel and widely considered the best modern option for React. It is flexible enough to handle the specific PlaceCard interaction model: guests in a holding area, tables as drop targets, capacity enforcement, and couples snapping together. The older alternative (react-beautiful-dnd) is no longer maintained.

### Supabase
Supabase replaces what would otherwise be three separate systems: a database, an authentication service, and a real-time sync layer. It uses PostgreSQL under the hood — a relational database (meaning it understands how records relate to each other, like which guest belongs to which table or which event belongs to which project). It also handles:
- User account creation and login
- Sharing / collaborator access via row-level security (rules that control who can see and edit what)
- Real-time updates so two collaborators can see changes live

Supabase has a generous free tier and integrates cleanly with Next.js. The alternative (Firebase) is less suited to relational data like this product's guest-table-event model.

### Zustand
A lightweight state management tool. "State" refers to things the app needs to hold in memory while you're using it — like which guests are seated, which table is currently selected, or what the live guest count is. Zustand is simpler than the alternatives and does not require much boilerplate (repetitive setup code).

### PapaParse
The standard JavaScript library for reading CSV files (comma-separated values — the format most guest list exports use, including Zola's). It handles edge cases like quoted fields, missing headers, and irregular formatting.

### react-pdf
Generates clean, structured PDF exports of the seating chart. More reliable than "print to PDF" browser tricks, and gives us control over the layout of the output document.

### Vercel
Vercel is the company that created Next.js, and deploying a Next.js app to Vercel is essentially one command. It handles hosting, SSL (the padlock in the browser), and preview deployments (a live URL for every code change). Free tier is sufficient for early-stage use.

---

## What This Stack Does Not Include (and Why)

| Excluded | Reason |
| :---- | :---- |
| Mobile optimization | Out of scope for v1 per PRD |
| AI/ML tooling | No AI features in v1 |
| A separate backend/API server | Next.js API routes + Supabase cover this without needing a standalone server |
| A separate auth service (e.g. Auth0) | Supabase Auth handles this natively |
| GraphQL | Unnecessary complexity — Supabase's REST API is sufficient |

---

## Deployment Model

```
Code lives in → GitHub repo
Built and deployed by → Vercel (automatic on every push)
Data stored in → Supabase (hosted PostgreSQL)
Users access via → placecard.app (or similar domain, TBD)
```

---

## Decisions Locked

| Decision | Choice | Notes |
| :---- | :---- | :---- |
| Language | TypeScript | Catches data model errors before they reach the user. Same as JavaScript but with a logic spell-checker. |
| Auth method | Google sign-in (primary), email/password (secondary) | Auth is deferred — not built until the core drag-and-drop experience is validated by Arlen in prototype form. Code is scaffolded to make adding it easy later. Nothing gated behind login in the prototype. |
| Domain | Vercel subdomain for now | Custom domain to be registered separately and connected when ready. |

## Open Questions

1. Pricing model — one-time per event, subscription, or freemium? Not needed before prototype, but needed before first paid user.
2. "Needs consideration" flag — what does it look like in the UI? Needs a design decision before build.
3. What happens to guest data after the event? Legal/privacy review needed before launch.
