# Wrestling Booker — Build Spec

A personal, single-user wrestling booking tool. Not a game with AI or simulation.
It is a **record-keeper and canvas**: you author a wrestling world across multiple
companies, book shows, play out results, and read the history back. The tool tracks
state and history faithfully and never tells you "no."

This document is the design reference. Build the data model first; the features fall
out of it.

---

## Two governing rules

Everything in the tool obeys these two rules. When a design question comes up, answer
it by returning to these.

**1. Enter once, derive everything.**
You enter information a single time as structured data. Everything else is *derived*
(computed on demand), never maintained by hand. Win/loss records, title histories,
rivalries, and the calendar are all views computed from underlying data — they are
never stored or hand-updated.

**2. Nothing happens on its own.**
The tool never changes state by itself. No clock, no auto-expiry, no random events,
no AI. Time only moves when you act. The tool may *surface* things for your attention
(e.g. "this contract's expiry date has passed — re-sign, move, retire, or free agent?"),
but nothing changes until you choose. A flag is a prompt, never an event.

---

## The book / play model

The single most important interaction concept. Two distinct modes:

- **Booking** = choosing *participants* (the plan). You lay out a show's card:
  segments, participants, stipulations. Winners are deliberately NOT chosen here.
  A booked card is editable forever and counts for nothing.

- **Playing** = choosing *winners* (the results). You go through a booked card match
  by match and pick the outcomes, add result notes. Playing a show is the act that
  **finalizes** it and makes it count.

### Directionality (the emotional core)

- The **future is fully editable.** Book and rebook any show, any time, as far in
  advance as you want. Plan the WrestleMania main event a year out and revise it every
  week as the story shifts.
- **Playing a show is a one-way door.** Choosing the winners finalizes the show.
- The **past is immutable.** A played show is permanent history. It cannot be edited
  or re-played.

Because the past is locked, derived records only ever move *forward* — a title reign,
once created, never has to unwind; a win/loss record only ever increments. The tool
never recomputes history because history cannot change.

**Derived records reflect finalized (played) shows only.** A booked-but-unplayed match
is a plan, not a result. Your current champion does not change until the show where
they lose the title is *played*, no matter how far in advance that match was booked.

### Two things existing mobile tools (e.g. JOW) get wrong — must-haves here

1. **Book in advance.** Already handled by the book/play model above: the future is
   freely editable, playing is the one-way door. Nothing more needed — just honor it.
2. **Reference history without leaving the booking flow.** On a phone, looking
   something up must be a *glance, not a trip*. While booking a card, you must be able
   to check a wrestler's record, a head-to-head, a title history, or a past show
   *without* navigating away from and losing your half-built card. First-class design
   goal, not a later feature. Patterns that fit: a slide-over / bottom-sheet that opens
   history *over* the current card, and inline quick-peek on a tapped wrestler name
   (record + head-to-head right where you tapped). The pattern matters less than the
   rule: never make the user abandon the card to look something up.

---

## Entity model

Seven entities. Top-down.

### World
The save / universe. The top-level container. Owns everything below. One world = one
save file = one wrestling universe.

Owns directly:
- Wrestlers
- Companies
- Contracts (the links between them)

Wrestlers live at the **world level**, not inside companies. A company *employs* a
wrestler (via a contract); it does not *own* them. This is what makes crossover work
natively — talent jumping, trades, and joint shows are all just a wrestler pointing at
a different company, never a hack.

### Wrestler
A world-level person.

Fields:
- **Name**
- **Nickname**
- **Height**
- **Weight**
- **Alignment** — Face / Heel / Tweener (pick-list). Single current value.
  (If alignment-turn history is ever wanted, this becomes a dated list. Not now.)
- **Gender** — Men / Women / Other, or left unset. Recorded for filtering the
  roster; never inferred from a name, and never required.
- **Photo** — a single portrait image. (One image per wrestler, not a set.)
- **Status** — active / retired. Drives who appears in roster-pickers when booking.

**Derived, never stored:** win/loss record, rivalries. Both are computed from match
results.

### Unit — tag team, trio, faction
A named set of wrestlers. One entity covers all three, because they differ only in
size, and **the size is not a field**: two is a tag team, three a trio, four or more a
faction. A faction that loses a member becomes a trio the moment they leave, with
nothing to remember to update.

Fields:
- **Name**
- **Colour** — optional, tints the unit wherever it is listed.
- **Members** — any number of wrestlers. Nobody is exclusive: the same person can hold
  a tag team, a trio and a faction at once.
- **Notes**
- **Disbanded** — a flag, set by hand. Nothing disbands on its own, and a disbanded
  unit keeps its history.

**Derived, never stored:** the kind (from the member count) and the unit's win/loss
record. A unit's match is a played match where *every* member appeared **on the same
side**; members on opposite sides are the unit imploding, and count for neither.

### Company
A promotion.

Owns:
- Titles
- Weekly series (0 or more — see Schedule)
- Special events (0 or more)

A company may have **zero** weekly series (an indie that runs only special events).
Do not assume every company has a flagship weekly.

### Contract
Links exactly **one wrestler ↔ one company**. A wrestler may hold several contracts at
once (dual/multiple deals). Modeled as its own entity because the wrestler-company
relationship is many-to-many.

Fields:
- **Primary flag** — is this the wrestler's main/home roster? One contract can be
  primary so "whose roster is this?" still has an answer even with multiple deals.
- **Signed** (date) — inert, historical.
- **Expires** (date) — inert. Does NOT auto-expire. When the date passes, the tool may
  *surface* a prompt: re-sign (edit date), move (new contract elsewhere), retire (flip
  status), or leave as free agent (end contract). Nothing happens until you choose.
- **Salary** — inert, flavor/history.

A wrestler with no contract to a company can still be booked on that company's show —
that's just a guest booking, no special machinery needed. Contracts govern *default
roster membership and display*, not *who is allowed on a card*.

### Title
Belongs to a company.

A title is a **spine of reigns**. It is not "a current champion field" — it is the
ordered list of every reign. The current champion is simply the most recent *open*
reign.

A **Reign** (derived from title-match results, never typed by hand):
- Holder (wrestler)
- Start date + the event it started at
- End date + end event (empty while the reign is open)
- Length (derived)

When a match flagged as a title match is **played** with a winner, the tool
automatically: closes the previous reign, opens a new one, records dates/events. You
never edit a title history by hand.

A title can be defended on any show, including joint/co-promoted shows, and its lineage
tracks correctly regardless of where the match happened.

### Show
Belongs to a company — or to **several** companies (joint PPV / co-promoted event).

Fields:
- **Date**
- **Name**
- **Owning company/companies**
- **Segments** — one ordered list. This list *is* the card.
- **Finalized** (yes/no) — set by *playing* the show. The boundary between editable
  plan and immutable history.

A show is either an **episode of a weekly series** or a **standalone special event**
(see Schedule). Underneath, both are the same Show entity.

### Segment
The card unit. Everything on a show is a segment — a match is just a segment whose type
is "match." Matches and non-match segments are siblings in one reorderable list.

Common shape (every segment):
- **Order** — position in the card.
- **Type** — pick-list with a freeform escape hatch (see pattern below). Match, Promo,
  Backstage, Contract Signing, Video Package, Brawl, etc.
- **Participants** — wrestlers pulled in via a roster-picker (click names, never type).
- **Segment note** — short freeform text: what this was *about* / booking intent
  ("blow-off to their 3-month issue", "debut").

**Match** segments additionally carry a **result payload**:
- **Winner** — chosen from participants. *Only set during Play, never during Booking.*
- **Title match flag** + which title — firing this is what creates/closes reigns.
- **Stipulation** — pick-list with freeform escape hatch (Cage, Ladder, TLC, No-DQ,
  Iron Man, …). May be blank for a standard match.
- **Result note** — short freeform text: how it *finished* (interference, finishing
  move, screwy finish). Distinct from the segment note — *how it ended* vs. *what it
  was about*.

Non-match segments carry nothing beyond the common shape. They are the simple case;
matches are the rich one.

The **winner is the single most important input in the tool** — it is what ripples
upstream into win/loss records, title reigns, and rivalries.

---

## Schedule / Calendar

- A **Weekly Series** (0-to-many per company): a recurring show defined once (name,
  cadence, owning company). It always appears on the calendar on its day. Episodes
  exist to be booked/played.
- A **Special Event**: a standalone show. You create it, and once created it lives on
  the calendar on its date. Create as many as you want, whenever.
- The **Calendar** is a *derived view* of all shows arranged by date — world-wide or
  filtered per company. It is not a separate stored structure.

Intended workflow the schedule must support: place a special event on a future date as
a target, book the weekly shows leading up to it as the build, revise the special's
card freely over time, then **play** it when you're ready. Booking runs arbitrarily far
ahead of playing.

---

## Recurring UI pattern: pick-list with an escape hatch

Used everywhere a "type" is chosen — segment types and match stipulations both use it.
Predefined options for speed and consistency, plus an "other, specify" freeform entry
for creativity. Common cases stay consistent enough to be *countable* later ("how many
ladder matches has this wrestler had"); one-offs are still recorded faithfully. One
interaction, learned once, used everywhere.

---

## Derived views (never stored — computed from data above)

- **Win/loss record** (per wrestler) — count of played match results.
- **Title history** (per title) — the ordered list of reigns.
- **Rivalry / head-to-head** (per pair of wrestlers) — how many times they've wrestled,
  the record, the matches, whether titles were on the line. There is **no "feud" or
  "rivalry" entity** — it is purely a query over match history. Nothing to declare,
  open, close, or maintain.
- **Calendar** — all shows by date.

---

## Explicitly out of scope (by design)

- No match-quality ratings, star ratings, crowd reactions, or momentum.
- No simulation of outcomes — you choose every winner.
- No AI-controlled promotions, no rival booking, no talent poaching.
- No random events, injuries, or morale.
- No auto-expiring contracts or any state that changes without your action.
- No "feud" containers.

The whole point is a clean booking interface plus faithful, automatic bookkeeping —
the thing a pile of Google Docs was doing by hand.

---

## Platform & stack

**Decided:** a **hosted web app with a synced backend database.** Single-user (not for
sale), but must run in **both a desktop browser and mobile Safari on iPhone**, showing
the **same world on every device**. This rules out local-only storage (data wouldn't
follow you between devices) and rules out a native app (app-store friction, slow
build-test-on-phone loop, no distribution need for a personal tool). One codebase,
opened at a URL from any device.

Because it's single-user, optimize the stack for **simplicity and AI-coding-tool
compatibility, not scale.** Priorities in order: works reliably with Claude Code,
one language end-to-end (fewer data contracts to keep aligned across files — the top
failure mode for AI-built projects), batteries included, dead-simple deploy.

**Decided: single-codebase TypeScript full-stack framework + managed/hosted Postgres.**
The reason for managed Postgres is NOT scale (scale is just a free side effect of a
single user) — it's **data durability**: managed Postgres gives automatic backups, and
your world (years of booking history) is the one thing that must not be lost. It's also
the cleanest match for "same world on PC and phone." Frontend and backend share one
language so there's one set of type definitions to keep aligned, not two.

For reference, the rejected simpler alternative was a file-based database (SQLite) next
to the app — fewer moving parts, but data tied to one location and **backups become
your problem**. That tradeoff is why it was rejected: not worth risking the history to
save a small amount of setup.

**Framework note:** Next.js is a safe default *only because* it has the most training
data behind it, so Claude Code generates it most reliably — not for any trendiness
reason. Any single-language full-stack framework Claude Code is fluent in is fine.

**Do NOT hard-code a hosting provider from this doc.** Free tiers and pricing shift;
confirm current hosting + managed-Postgres options with Claude Code (or a fresh search)
at deploy time.

### Data durability — treat as a first-class concern

Your world is years of irreplaceable booking history. When picking the backend with
Claude Code, make "how do I not lose this data / how is it backed up" an **explicit
question**, not an afterthought. This is more important than any feature.

## Suggested build order

0. **Stand up the platform shell first.** Set up the TypeScript full-stack framework +
   managed Postgres with Claude Code, get a trivial "hello world" deploying to a URL you
   can open on your iPhone, and confirm the backup story on the managed database —
   *before* building features. This de-risks the hosting/sync/mobile-access part while
   it's cheap.
1. **Data model first.** World → Wrestler, Company, Contract, Title (with Reign), Show,
   Segment (with result payload). Get relationships right before any UI.
2. **Roster & company CRUD.** Create wrestlers, companies, contracts, titles. The
   roster-picker depends on this.
3. **Show booking.** One ordered segment list, add/reorder/edit segments, roster-picker
   for participants. Booking only — no winners yet.
4. **Play mode.** Go through a booked card, choose winners + result notes, finalize the
   show. This is where results first feed derived records.
5. **Derived views.** Title histories, win/loss records, head-to-head/rivalries,
   calendar.
6. **Mobile navigation pass.** Once views exist, wire up glance-don't-leave access:
   history (records, head-to-head, title lineage, past shows) reachable *over* the
   current booking card via slide-over/bottom-sheet + inline quick-peek on wrestler
   names. Design mobile-first; desktop can use the extra width for side-by-side panels.
7. **The attention prompts.** Contract-expiry surfacing and any other "flag, don't act"
   nudges.
