# Wrestling Booker

A personal, single-user wrestling booking tool. Not a game — a record-keeper and
canvas. You author a world across multiple companies, book shows, play out
results, and read the history back. See [`docs/spec.md`](docs/spec.md) for the
design reference this is built from.

Two rules govern everything:

1. **Enter once, derive everything.** Win/loss records, title histories,
   rivalries and the calendar are computed on demand. None of them are stored.
2. **Nothing happens on its own.** No clock, no auto-expiry, no simulation. The
   app surfaces things for your attention; it never acts.

And one interaction concept:

- **Booking** picks participants. Editable forever, counts for nothing.
- **Playing** picks winners. It finalizes the show — a one-way door — and is the
  only thing that moves a record or a title lineage.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) + TypeScript
- **Tailwind CSS 4**
- **Prisma 7** over **PostgreSQL** (via `@prisma/adapter-pg`)
- One shared password, signed session cookie, enforced in `src/proxy.ts`

## Running it locally

Postgres has to be reachable at `DATABASE_URL`. This machine has a user-owned
cluster at `~/.local/share/wb-pgdata` on port **55432** — no root needed:

```bash
export PATH=/usr/lib/postgresql/16/bin:$PATH
pg_ctl -D ~/.local/share/wb-pgdata -o "-p 55432 -k /tmp" -l ~/.local/share/wb-pgdata/server.log start
```

Then:

```bash
npm install
cp .env.example .env      # already done; set APP_PASSWORD before deploying
npm run db:migrate        # apply migrations
npm run dev               # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | the app |
| `npm run db:migrate` | create + apply a migration |
| `npm run db:studio` | Prisma Studio, for poking at rows |
| `npm run seed` | build a demo world (see below) |
| `npm run verify` | assert the rules the spec cares about, against a throwaway world |
| `npm run backup` | gzip a full `pg_dump` into `backups/` |

`npm run seed` creates a **separate** world called "Demo Universe" — a two-promotion
world with played history, live title lineages and a show booked eight months
out. It never touches a world you are actually booking; switch to it from
Settings.

## Data model

Seven entities, top-down. `prisma/schema.prisma` is commented with the reasoning.

- **World** — the save. Owns wrestlers, companies, contracts, shows.
- **Wrestler** — world-level, not owned by a company. That is what makes
  crossover native: a talent jump is just a different contract.
- **Company** — owns titles and zero or more weekly series.
- **Contract** — one wrestler ↔ one company, many-to-many overall. Dates are
  inert. Governs *default roster membership and display*, never who is allowed
  on a card.
- **Title** — a spine of reigns. The current champion is the most recent open
  reign. Reigns are written only by `src/lib/titles.ts`, never by hand.
- **Show** — belongs to one *or several* companies (joint events). Its segment
  list *is* the card. `isFinalized` is the boundary between plan and history.
- **Segment** — a match is a segment whose type is `MATCH`; matches and
  non-matches are siblings in one reorderable list. Only matches carry a result
  payload.

Two places where the schema is deliberately more general than the spec's letter:

- **Multiple winners per match.** The spec says "winner" singular. Winners are
  modelled as a flag on each participant, so a tag match can have two. The UI
  still behaves as tap-one-name by default.
- **Multiple holders per reign.** Same reason — a tag title lineage reads
  "A & B" without a hack. Single-holder reigns are the normal case.

## Derived views

`src/lib/derive.ts` holds every computed view, and every query in it filters on
finalized shows only. A booked match is a plan: it never moves a record, never
changes a champion, never counts in a head-to-head.

The **calendar** is the clearest case — it merges stored shows with the episodes
a weekly series *implies*. Projected episodes have no database row at all until
you book one.

## Glance, don't leave

While booking a card you can check a record, a head-to-head, a title lineage or
a past show without navigating away and losing your half-built card. Tapping any
wrestler's name opens a sheet **over** the page — bottom sheet on a phone, side
panel on desktop — backed by `/api/peek`. It stacks, so you can peek a wrestler,
then their rival, then the belt, and walk back out.

## Deploying (Vercel + Neon)

Nothing here is hard-coded to a provider; the app only needs `DATABASE_URL`.

1. **Create the database.** In Neon, create a project and copy the **pooled**
   connection string (it has `-pooler` in the host and `?sslmode=require`).
2. **Push the repo to GitHub**, then import it in Vercel.
3. **Set environment variables** in Vercel (all three, for every environment):
   - `DATABASE_URL` — the Neon pooled string
   - `APP_PASSWORD` — the shared password you will type on your phone
   - `AUTH_SECRET` — `openssl rand -base64 32`
4. **Apply migrations** against the Neon database once:
   `DATABASE_URL="postgres://…" npx prisma migrate deploy`
5. Deploy. `postinstall` runs `prisma generate` so the client is built for you.
6. Open the URL on your iPhone and add it to the Home Screen.

Use `sslmode=verify-full` in `DATABASE_URL`, not `sslmode=require`. `pg` treats
them identically today but warns that a future major version will give
`require` libpq semantics, where the server certificate is *not* verified.
Being explicit means a dependency bump cannot silently weaken the connection.

### Two Vercel settings that will bite you

Both cost an afternoon if you do not know about them.

**Deployment Protection.** Vercel puts its own SSO gate in front of deployments
by default — the app redirects to `vercel.com/sso-api` instead of loading. That
breaks the entire point of this app, which is opening it on a phone. Turn it
off: *Settings → Deployment Protection → Vercel Authentication → Disabled*. The
app has its own gate; `src/proxy.ts` sends every unauthenticated request to
`/login`.

**Commit-author blocking on a private repo.** On the Hobby plan, Vercel checks
the *commit author's email* against your Vercel account and blocks anything it
cannot match, because Hobby does not support multiple contributors. A repo
where commits are authored by anyone else — including a coding agent — is
refused with "the commit author did not have contributing access".

Three ways out, cheapest first:

- **Make the repo public.** The restriction only applies to private repos, and
  nothing secret is committed here — real values live in Vercel's environment
  variables and a gitignored `.env`.
- **Match the author email** to the one on your Vercel account and re-push.
- **Deploy from the CLI** (`vercel --prod`), which skips the commit check
  entirely but gives up deploy-on-push.

A *blocked* deployment is terminal — redeploying it will not re-evaluate the
permission check. Push a new commit to get a fresh one.

### Durability — read this part

Your world is years of irreplaceable history, and it is the one thing that must
not be lost. What the free tiers actually give you as of August 2026:

- **Neon Free**: 0.5 GB storage, and point-in-time restore limited to a
  **6-hour window**. That covers "I broke it this morning". It does **not**
  cover "I noticed something wrong last week."
- **Neon paid plans** extend restore history to 7 days and up.

So do not rely on the provider alone. `npm run backup` writes a gzipped
`pg_dump` you keep yourself; run it after any big booking session and put the
file somewhere that is not the database host. Restore with:

```bash
gunzip -c backups/world-YYYY-MM-DD-HHMM.sql.gz | psql "$DATABASE_URL"
```

One storage note: wrestler portraits are stored **in Postgres**, deliberately, so
they are covered by the same backups as everything else. Uploads are capped at
2 MB each; at 0.5 GB total, keep portraits small or plan to move to a paid plan.

Sources for the numbers above: [Neon plans](https://neon.com/docs/introduction/plans),
[Neon backup & restore](https://neon.com/docs/guides/backup-restore).

## What is deliberately absent

No match ratings, no simulated outcomes, no AI promotions, no random events, no
auto-expiring contracts, no "feud" entity. A rivalry is a query over match
history — there is nothing to declare, open, close or maintain.
