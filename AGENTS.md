<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Wrestling Booker

Read `docs/spec.md` first — it is the design reference, and most design
questions are answered by its two rules:

1. **Enter once, derive everything.** Never store what can be computed. There
   are no win/loss columns, no current-champion field, no rivalry rows. Add
   derived views to `src/lib/derive.ts`.
2. **Nothing happens on its own.** No clock, no auto-expiry, no simulation.
   Surface a prompt; never change state on the user's behalf.

## Rules that are easy to break by accident

- **Derived views read finalized shows only.** Every query in `src/lib/derive.ts`
  filters `show: { isFinalized: true }`. A booked match is a plan.
- **Booking never sets a winner.** `src/lib/actions/shows.ts` must not touch
  `isWinner`; only `src/lib/actions/play.ts` does.
- **Played shows are immutable.** Every booking action goes through
  `assertEditable()` first. There is no un-play.
- **Reigns are written in exactly one place:** `src/lib/titles.ts`.

## Layout

- `prisma/schema.prisma` — the model, commented with the reasoning
- `src/lib/derive.ts` — every computed view (records, lineage, head-to-head, calendar)
- `src/lib/titles.ts` — the reign engine, kept out of the action so it is testable
- `src/lib/actions/` — server actions, split by entity
- `src/components/peek/` — the glance-don't-leave sheet, plus `/api/peek`

## Before finishing

`npm run verify` asserts the spec's core rules against a throwaway world in the
real database. Run it, plus `npx tsc --noEmit` and `npx eslint .`.
