# UI Wireframes — SeatLock

| | |
|---|---|
| **Status** | Approved v1.0 (low fidelity) |
| **Related** | [PRD user stories](PRD.md#6-user-stories) · [Architecture: frontend](architecture.md#6-frontend-design) · [API](api.md) |
| **Last updated** | 2026-10-26 |

These are **low-fidelity** wireframes. They fix layout, content and behaviour, not visual style. Each screen lists the user stories it serves, the API calls it makes, and its loading, empty and error states. A high-fidelity design can be done in Figma later without changing these decisions.

---

## 1. Screen inventory

| # | Screen | Route | Stories | Role |
|---|---|---|---|---|
| S1 | Event listing | `/` | C1 | Public |
| S2 | Event detail + seat map | `/events/:id` | C2, C3, C4, C5 | Public (hold requires login) |
| S3 | Checkout | `/checkout/:holdId` | C3, C5, C6 | Customer |
| S4 | Order confirmation | `/orders/:id/confirmation` | C6 | Customer |
| S5 | My tickets | `/me/tickets` | C7 | Customer |
| S6 | Ticket detail (QR) | `/me/tickets/:id` | C7 | Customer |
| S7 | Login / Register / Reset | `/login`, `/register`, … | — | Public |
| O1 | Organizer dashboard | `/organizer` | O4 | Organizer |
| O2 | Venue layout builder | `/organizer/venues/:id` | O1 | Organizer |
| O3 | Event editor | `/organizer/events/:id/edit` | O2, O3 | Organizer |
| O4 | Event sales and seat management | `/organizer/events/:id` | O4, O5 | Organizer |
| A1 | Admin tables (users, events, orders) | `/admin/*` | A1, A2 | Admin |

## 2. Key user flows

### Buying tickets (happy path)

```
S1 Listing ──click event──▶ S2 Seat map ──select seats──▶ [Hold seats]
                                │                            │
                                │ not logged in              ▼
                                └──▶ S7 Login ──return──▶ S2 (selection kept)
                                                             │ 201 hold
                                                             ▼
                              S3 Checkout (countdown) ──pay──▶ S4 Confirmation
                                                                  │ order:updated → paid
                                                                  ▼
                                                            S5 My tickets ──▶ S6 QR
```

### Unhappy paths that must be designed

| Situation | Where | What the user sees |
|---|---|---|
| Seat taken while selecting | S2 | The seat turns "taken" live. If it was in the selection, it's removed and a toast says "B-12 was just taken". |
| Hold conflict (409) | S2 | Conflicting seats flash red, then show as taken. Other selected seats stay selected. "Some seats were just taken. Pick others and try again." |
| Hold expires on the map | S2 | The countdown banner turns to "Hold expired"; the selection is cleared; statuses refresh |
| Hold expires during checkout | S3 | The payment form is disabled, and a modal offers "Hold expired → Back to seat map" |
| Under 60 s left at checkout | S3 | The Pay button is disabled: "Not enough time left to pay safely. Re-hold your seats." |
| Card declined | S3 | An inline Stripe error; the customer can retry while the hold lasts |
| Payment after seats lost | S4 | "We couldn't secure your seats. You have **not** been charged; your refund is on its way." |
| Webhook slow | S4 | "Confirming your payment…" spinner for up to 60 s, then "This is taking longer than usual. We'll email you." |
| Socket disconnected | S2 | A subtle "Live updates paused, reconnecting…" pill; polling every 15 s in the background |

## 3. Customer screens

### S1 — Event listing

```
┌────────────────────────────────────────────────────────────────────────┐
│ ◼ SeatLock          [ Search events…            🔍]     Log in  Sign up │
├────────────────────────────────────────────────────────────────────────┤
│ City [Any ▾]  Category [Any ▾]  Dates [This week ▾]          [Clear]   │
├────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│ │   [cover]    │  │   [cover]    │  │   [cover]    │  │   [cover]    │ │
│ │ CONCERT      │  │ MOVIE        │  │ COMEDY       │  │ THEATRE      │ │
│ │ Midnight Jazz│  │ Dune: Part 3 │  │ Late Laughs  │  │ Hamlet       │ │
│ │ Fri 14 Nov   │  │ Sat 15 Nov   │  │ Sat 15 Nov   │  │ Sun 16 Nov   │ │
│ │ 7:30 PM EST  │  │ 6:00 PM EST  │  │ 9:00 PM EST  │  │ 2:00 PM PST  │ │
│ │ Grand Hall · │  │ Riverside ·  │  │ Grand Hall · │  │ Arena North ·│ │
│ │ New York     │  │ New York     │  │ New York     │  │ Seattle      │ │
│ │ from $45     │  │ from $12     │  │ from $25     │  │ from $60     │ │
│ │ 312 left     │  │ Almost full  │  │ 88 left      │  │ Sold out     │ │
│ └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                          [ Load more ]                                 │
└────────────────────────────────────────────────────────────────────────┘
```

- **API:** `GET /events?q&city&category&from&to&cursor`
- Filters are kept in the URL query string, so a filtered listing can be shared. Search is debounced by 300 ms.
- Times are shown in the **venue's** time zone, with the zone abbreviation.
- **Mobile:** single column; filters collapse into a "Filters" bottom sheet.
- **States:** skeleton cards while loading · empty: "No events match. Try clearing filters." · error: retry banner.

### S2 — Event detail and seat map (the core screen)

Desktop (≥1024 px):

```
┌────────────────────────────────────────────────────────────────────────┐
│ ◼ SeatLock                                              Hi, Priya ▾    │
├────────────────────────────────────────────────────────────────────────┤
│ ◀ All events                                                           │
│ Midnight Jazz Orchestra                                                 │
│ Fri 14 Nov 2026 · 7:30 PM EST · Grand Hall, New York                   │
├───────────────────────────────────────────────┬────────────────────────┤
│  ┌─────────────────────────────────────────┐  │ ⏱ Seats held — 08:42   │ ← only while a hold is active
│  │                 STAGE                   │  ├────────────────────────┤
│  └─────────────────────────────────────────┘  │ Your selection         │
│   ORCHESTRA ($85)                             │                        │
│   A  ○ ○ ○ ● ● ○ ○ ○   ○ ○ ○ ○ ○ ○ ○ ○        │ Orchestra B-5   $85  ✕ │
│   B  ○ ○ ○ ○ ◉ ◉ ○ ○   ○ ○ ✕ ✕ ○ ○ ○ ○        │ Orchestra B-6   $85  ✕ │
│   C  ○ ○ ◐ ◐ ○ ○ ○ ○   ○ ○ ○ ○ ○ ○ ○ ♿        │                        │
│                                               │ ────────────────────── │
│   MEZZANINE ($45)                             │ 2 seats       $170.00  │
│   D  ○ ○ ○ ○ ○ ○ ○ ○   ○ ○ ○ ○ ○ ○ ○ ○        │                        │
│   E  ● ● ● ● ○ ○ ○ ○   ○ ○ ○ ○ ● ● ● ●        │ [   Hold seats    ]    │
│                                               │ [ Continue to pay ]    │ ← after a hold
│  [−] [+] [⤢ fit]                              │ Release hold           │
├───────────────────────────────────────────────┤                        │
│ ○ Available  ◉ Selected  ◐ Held  ● Sold       │ Max 10 seats per order │
│ ✕ Unavailable  ♿ Accessible                   │                        │
├───────────────────────────────────────────────┴────────────────────────┤
│ About this event                                                       │
│ Lorem ipsum description…                                               │
└────────────────────────────────────────────────────────────────────────┘
```

Mobile (<640 px): the seat map takes the full width with pinch-zoom and pan; the selection panel becomes a **sticky bottom sheet**:

```
┌──────────────────────────┐
│ ◀ Midnight Jazz          │
│ Fri 14 Nov · 7:30 PM EST │
├──────────────────────────┤
│     ┌──── STAGE ────┐    │
│  A ○○○●●○○○ ○○○○○○○○     │
│  B ○○○○◉◉○○ ○○✕✕○○○○     │
│  C ○○◐◐○○○○ ○○○○○○○♿    │
│        (pinch to zoom)   │
├──────────────────────────┤
│ ⏱ 08:42  2 seats $170.00 │
│ [ Continue to pay ]   ▲  │ ← swipe up for details
└──────────────────────────┘
```

**Behaviour**
- **API / realtime order:** `GET /events/:id` and `GET /events/:id/seat-map` (cached) → socket `event:subscribe` → `GET /events/:id/seats` → apply `seat:update` messages by version (see [api.md §8](api.md#8-websocket-contract-socketio)).
- Clicking an available seat toggles it in the **local** selection. Nothing is reserved until **Hold seats** is pressed.
- If the user isn't logged in, **Hold seats** saves the selection to sessionStorage, redirects to login, and restores the selection on return.
- **Hold seats:** `POST /events/:id/holds`. On 201, the selected seats become "Yours" (◉ with a check mark) and the countdown starts from `expiresAt − serverTime`.
- Changing the selection after a hold shows **Update hold**, which re-calls `POST`. The new hold replaces the old one.
- **Seats held by someone else** (◐) can't be selected; the tooltip says "Held by another customer, may free up soon".
- **Accessibility:** each seat is a focusable `button` with `role="checkbox"`. Arrow keys move between seats; Space toggles. The label reads "Row B, seat 5, Orchestra, $85, available". Every state has a **shape or icon cue as well as colour** (○ ◉ ◐ ● ✕), so colour-blind users can tell them apart.

### S3 — Checkout

```
┌────────────────────────────────────────────────────────────────────────┐
│ ◼ SeatLock                                                             │
├────────────────────────────────────────────────────────────────────────┤
│ ⏱ Your seats are held for 07:58 — complete payment before time runs out│
├──────────────────────────────────────┬─────────────────────────────────┤
│ Payment                              │ Order summary                   │
│ ┌──────────────────────────────────┐ │ Midnight Jazz Orchestra         │
│ │  Stripe Payment Element          │ │ Fri 14 Nov · 7:30 PM EST        │
│ │  Card number  [______________]   │ │ Grand Hall, New York            │
│ │  Expiry [__/__]   CVC [___]      │ │ ─────────────────────────────── │
│ └──────────────────────────────────┘ │ Orchestra B-5            $85.00 │
│                                      │ Orchestra B-6            $85.00 │
│ Tickets will be sent to              │ ─────────────────────────────── │
│ priya@example.com                    │ Total                   $170.00 │
│                                      │                                 │
│ [         Pay $170.00          ]     │ ◀ Change seats                  │
└──────────────────────────────────────┴─────────────────────────────────┘
```

- **API:** `GET /holds/:holdId` → `POST /holds/:holdId/checkout` (one `Idempotency-Key` per page load) → `stripe.confirmPayment()` → navigate to S4.
- At **< 2 min** the countdown turns amber; at **< 60 s** it turns red and Pay is disabled (`HOLD_EXPIRING`).
- **Pay** is disabled during submission, so double-clicks can't send two requests.
- **Mobile:** the summary is collapsed above the payment form ("2 seats · $170.00 ▾").

### S4 — Order confirmation

```
┌──────────────────────────────────────────────┐
│   ⟳ Confirming your payment…                 │   status: pending
│   This usually takes a few seconds.          │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│   ✓ You're going!                            │   status: paid
│   Midnight Jazz Orchestra                    │
│   Fri 14 Nov · 7:30 PM EST · Grand Hall      │
│   Orchestra B-5, B-6                         │
│   Tickets emailed to priya@example.com       │
│   [ View tickets ]   [ Add to calendar ]     │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│   ⚠ We couldn't secure your seats            │   status: failed_conflict
│   Someone completed a purchase after your    │
│   hold expired. A full refund of $170.00     │
│   is on its way (3–5 business days).         │
│   [ Pick other seats ]                       │
└──────────────────────────────────────────────┘
```

- **API:** `GET /orders/:id` immediately, then wait for the `order:updated` socket message; poll every 2 s as a fallback.

### S5 — My tickets · S6 — Ticket detail

```
┌──────────────────────────────────────────────┐   ┌──────────────────────────┐
│ My tickets     [Upcoming] [Past]             │   │ ◀ My tickets             │
├──────────────────────────────────────────────┤   │ Midnight Jazz Orchestra  │
│ FRI 14 NOV · 7:30 PM EST                     │   │ Fri 14 Nov · 7:30 PM EST │
│ Midnight Jazz Orchestra — Grand Hall         │   │ Grand Hall, New York     │
│ 2 tickets · Orchestra B-5, B-6       [View ▸]│   │  ┌────────────────────┐  │
├──────────────────────────────────────────────┤   │  │ ▓▓  ▓ ▓▓▓  ▓ ▓▓    │  │
│ SAT 22 NOV · 8:00 PM EST                     │   │  │ ▓ ▓▓  QR CODE  ▓ ▓ │  │
│ Late Laughs — Grand Hall                     │   │  │ ▓▓ ▓  ▓▓ ▓▓▓  ▓▓   │  │
│ 1 ticket · Mezzanine D-3             [View ▸]│   │  └────────────────────┘  │
└──────────────────────────────────────────────┘   │  Orchestra · Row B · 5   │
                                                   │  SL-7KQ2-9XPA   ● Valid  │
                                                   │  ◀ 1 of 2 ▶              │
                                                   │  [ Download PDF ]        │
                                                   └──────────────────────────┘
```

- **API:** `GET /me/tickets?when=upcoming|past` · `GET /tickets/:id` (the QR is rendered client-side from `qrPayload`) · `GET /tickets/:id/pdf`.
- The ticket detail screen raises screen brightness where the browser allows it, and works offline once loaded (cached by TanStack Query).
- **Empty state:** "No upcoming tickets. [Browse events]"

## 4. Organizer screens

### O1 — Dashboard

```
┌────────────────────────────────────────────────────────────────────────┐
│ ◼ SeatLock · Organizer      Dashboard  Events  Venues        Sam ▾     │
├────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│ │ Revenue (30d)│ │ Tickets sold │ │ Live events  │ │ Conversion   │    │
│ │ $24,310      │ │ 412          │ │ 6            │ │ 71%          │    │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │
│ Upcoming events                                       [ + New event ]  │
│ ┌──────────────────────────────────────────────────────────────────┐   │
│ │ Event               Date         Status     Sold        Revenue  │   │
│ │ Midnight Jazz       14 Nov       Published  ███████░ 78%  $9,180 │   │
│ │ Late Laughs         22 Nov       Published  ██░░░░░░ 21%  $1,050 │   │
│ │ Winter Gala         12 Dec       Draft      —             —      │   │
│ └──────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### O2 — Venue layout builder

```
┌────────────────────────────────────────────────────────────────────────┐
│ ◀ Venues / Grand Hall                    🔒 Locked (event published)   │ ← read-only banner when locked
├──────────────────────┬─────────────────────────────────────────────────┤
│ Sections             │  Grid 40 × 30                       [−][+][fit] │
│ ■ Orchestra   [✎][🗑]│   ┌───────────── STAGE ─────────────┐           │
│ ■ Mezzanine   [✎][🗑]│                                                 │
│ [ + Add section ]    │   A  ■ ■ ■ ■ ■ ■ ■ ■   ■ ■ ■ ■ ■ ■ ■ ■           │
│                      │   B  ■ ■ ■ ■ ■ ■ ■ ■   ■ ■ ■ ■ ■ ■ ■ ■           │
│ Tools                │   C  ■ ■ ■ ■ ■ ■ ■ ■   ■ ■ ■ ■ ■ ■ ■ ♿          │
│ ◉ Add row            │                                                 │
│ ○ Paint seats        │   D  □ □ □ □ □ □ □ □   □ □ □ □ □ □ □ □           │
│ ○ Erase (gap)        │   E  □ □ □ □ □ □ □ □   □ □ □ □ □ □ □ □           │
│ ○ Toggle accessible  │                                                 │
│                      │                                                 │
│ Add row: label [F ]  │                                                 │
│ seats [16] start x[2]│                                                 │
│ section [Mezz ▾]     │  Total: 80 seats · 2 sections                   │
│                      │                     [ Discard ]  [ Save layout ]│
└──────────────────────┴─────────────────────────────────────────────────┘
```

- **API:** `GET /organizer/venues/:id` → edit locally → `PUT /organizer/venues/:id/layout` (the whole layout is saved atomically).
- Editing is local until **Save**; unsaved changes trigger a "Leave page?" prompt.
- Client-side validation mirrors the server's: no overlapping cells, unique row and seat numbers, at most 2,000 seats.
- When the layout is locked, the editor is read-only and offers **Duplicate venue** instead.
- **Desktop only** (≥1024 px); on smaller screens it shows "Use a larger screen to edit layouts".

### O3 — Event editor

```
┌────────────────────────────────────────────────────────────────────────┐
│ ◀ Events / New event                                    Status: Draft  │
├────────────────────────────────────────────────────────────────────────┤
│ Title        [ Midnight Jazz Orchestra                          ]      │
│ Category     [ Concert ▾ ]                                             │
│ Venue        [ Grand Hall (New York, EST) ▾ ]                          │
│ Starts       [ 2026-11-14 ] [ 19:30 ]   Ends [ 2026-11-14 ] [ 22:00 ]  │
│              Times are in venue local time (America/New_York)          │
│ Cover image  [ ⬆ Upload ]  midnight-jazz.jpg ✓                         │
│ Description  [ ...                                              ]      │
│                                                                        │
│ Prices                                                                 │
│   Orchestra   (48 seats)   $ [ 85.00 ]                                 │
│   Mezzanine   (32 seats)   $ [ 45.00 ]                                 │
│                                                                        │
│                      [ Delete draft ]  [ Save draft ]  [ Publish ▸ ]   │
└────────────────────────────────────────────────────────────────────────┘
```

- **Publish** opens a confirmation: "Publishing puts 80 seats on sale and **locks the Grand Hall layout**. Venue, times and prices can't be changed afterwards."
- Prices are typed in dollars and converted to cents on submit ([ADR-0012](adr/0012-money-and-time-conventions.md)).

### O4 — Event sales and seat management

```
┌────────────────────────────────────────────────────────────────────────┐
│ ◀ Events / Midnight Jazz Orchestra              Published  [ Cancel ]  │
├────────────────────────────────────────────────────────────────────────┤
│ Sold 62/80 (78%) · Held 4 · Blocked 2 · Revenue $4,910 · Conv. 71%     │  ← live
├───────────────────────────────────────────────┬────────────────────────┤
│  (same seat map as S2, organizer mode)        │ By section             │
│  Click seats to select for block / unblock    │ Orchestra 44/48 $3,740 │
│                                               │ Mezzanine 18/32 $810   │
│                                               │                        │
│                                               │ Selected: 2 seats      │
│                                               │ [ Block ] [ Unblock ]  │
└───────────────────────────────────────────────┴────────────────────────┘
```

- **API:** `GET /organizer/events/:id/stats` (refetched on each `seat:update`) · `POST …/seats/block|unblock` · `POST …/cancel` (requires a reason; the confirmation dialog states that all buyers will be refunded).

## 5. Admin screens (A1)

All three are standard data tables with search, filters, pagination and row actions:

| Table | Columns | Row actions |
|---|---|---|
| Users | Name, email, role, status, created | Change role · Disable/enable (with confirmation) |
| Events | Title, organizer, venue, date, status, sold % | View · Cancel (requires a reason) |
| Orders | ID, customer, event, total, status, created | View detail (items, payment ID, timeline) |

Rows in `failed_conflict` status are highlighted, and a filter chip links straight to them.

## 6. Design tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `seat-available` | `#2563EB` outline | `#60A5FA` outline | ○ open circle |
| `seat-selected` | `#2563EB` fill + white ✓ | `#3B82F6` fill | ◉ |
| `seat-held` | `#F59E0B` hatched | `#FBBF24` hatched | ◐ half-filled |
| `seat-sold` | `#9CA3AF` fill | `#4B5563` fill | ● solid grey |
| `seat-blocked` | `#D1D5DB` + ✕ | `#374151` + ✕ | ✕ |
| `timer-ok / warn / danger` | green / amber / red | | Countdown at > 2 min / < 2 min / < 60 s |

Rules:
- Every seat state has a distinct **shape** as well as colour, to meet WCAG 1.4.1 (colour isn't the only cue).
- Text contrast ≥ 4.5:1; seat outlines against the background ≥ 3:1.
- Minimum touch target is 24 × 24 px. On mobile, the map zooms so seats meet this target before they can be tapped.
- Breakpoints (Tailwind): `sm 640` · `md 768` · `lg 1024` · `xl 1280`.

## 7. Global UI rules

- **Loading:** skeletons for lists and cards; spinners only for button actions.
- **Errors:** inline for forms (mapped from the `errors[]` field paths in validation problems); a toast for background failures; a full-page error, with the `requestId` shown, for 500s.
- **Optimistic UI:** used only for local selection. Holds, payments and blocking always wait for the server.
- **Navigation guard:** leaving S2 or S3 with an active hold asks "Release your held seats?" and calls `DELETE /holds/:id` if confirmed.
- **Time display:** always in the venue's time zone with an abbreviation, using `Intl.DateTimeFormat`. Relative times ("in 3 days") appear only in secondary text.
