# Winter Appeal

Donors pick a winter item (blanket, tent, jacket…), choose a quantity, and pay through the **existing** basket / checkout / Apple Pay / Google Pay flow.

**Nothing existing was changed:** no database schema change, no migration, no change to checkout, Stripe, webhooks, receipts or the main donation form.

---

## 1. Items & prices

Prices are entered exactly as supplied by the client, in the site's existing currency (£).

| Item | Price |
|---|---|
| Children's Winter Tracksuit – Type 1 | 11.23 |
| Children's Winter Tracksuit – Type 2 | 14.44 |
| Children's Winter Tracksuit – Type 3 | 16.05 |
| Children's Jacket – Type 1 | 12.84 |
| Children's Jacket – Type 2 | 16.05 |
| Adult Winter Tracksuit | 17.65 |
| Adult Jacket | 24.07 |
| High-Quality Tarpaulin | 57.77 |
| High-Quality Blanket | 28.89 |
| High-Quality Mattress | 25.68 |
| Tent – Type 1 | 224.66 |
| Tent – Type 2 | 433.38 |
| Tent – Type 3 | 609.80 |

---

## 2. How it was implemented

### Data — existing tables only
The database already had `products` and `appeal_products` tables (built earlier, never used on the site). We reuse them:

- **`appeals`** → one row: *Winter Appeal* (`slug: winter-appeal`)
- **`products`** → one row per item, `type = FIXED`, price in `fixedAmountPence`
- **`appeal_products`** → links each item to the appeal (`frequency = ONE_OFF`, `sortOrder` = display order)

### Files added / changed

| File | What it does |
|---|---|
| `scripts/seed-winter-appeal.ts` | **New.** Creates the Winter Appeal + 13 items. Re-runnable: only adds what's missing, never edits or deletes. |
| `package.json` | Added script `db:seed-winter`. |
| `app/api/admin/appeals/[id]/items/route.ts` | **New.** Admin-only API (ADMIN role) to list / add / edit / hide / delete items on any appeal. |
| `components/appeal-items-manager.tsx` | **New.** Admin "Appeal Items" panel. |
| `app/admin/appeals/[id]/edit/page.tsx` | Shows the Appeal Items panel below the existing appeal form. |
| `components/appeal-item-picker.tsx` | **New.** Public item picker: item cards, quantity, total, Add to Basket, Apple Pay / Google Pay. |
| `app/(public)/appeal/[slug]/page.tsx` | Loads the appeal's active items. Shows the picker **only if the appeal has items**; otherwise the page is exactly as before. |

### Donation flow (unchanged pipeline)
1. Donor opens `/appeal/winter-appeal`, picks e.g. **High-Quality Blanket**, quantity **3** → total **£86.67**.
2. Picker adds a normal one-off basket item with `productId` + `productName = "High-Quality Blanket × 3"` + `amountPence = 8667`.
3. Existing checkout → Stripe shows **"Winter Appeal • High-Quality Blanket × 3"**.
4. Existing webhook saves the donation with `productId` → appears in Donations, reports, receipts as normal.

The general "any amount" donation form stays underneath the picker for donors who just want to give a sum.

### Deep links (for Framer buttons, ads, WhatsApp)
- Appeal page: `/appeal/winter-appeal`
- Pre-select an item: `/appeal/winter-appeal?item=high-quality-blanket`
  (`?item=` accepts the item's slug, with or without the `winter-appeal-` prefix — e.g. `tent-type-1`, `adult-jacket`, `children-s-jacket-type-2`)
- Donation type: add `&type=zakat`

---

## 3. Go-live steps

1. Merge & deploy.
2. Run once against production DB:
   ```bash
   npm run db:seed-winter
   ```
3. Admin → **Appeals** → *Winter Appeal* → Edit:
   - Add images, summary, Framer URL ("Read full appeal details").
   - Check donation types (General / Sadaqah / Zakat by default).
   - When ready, switch **Active** on (and *Show on donation form* if wanted). The appeal is created hidden from listings so nothing goes public by accident.
4. Test: open `/appeal/winter-appeal`, add 2 × Blanket, complete a test payment, confirm it shows in Admin → Donations with the item name.

---

## 4. Admin guide — Appeal Items panel

Location: **Admin → Appeals → (any appeal) → Edit → "Appeal Items"** (bottom of page). ADMIN role only.

| Action | How | Notes |
|---|---|---|
| **Add item** | Name + price → *Add item* | Appears on the public page immediately. |
| **Edit name / price** | Change fields → 💾 Save | New price applies to new donations only. Past donations keep their original amount. |
| **Reorder** | ↑ / ↓ arrows | Controls card order on the public page. |
| **Hide / show** | Live/Hidden switch | Hidden items disappear from the site; history kept. Use for out-of-stock. |
| **Delete** | 🗑 | If the item already has donations it is **hidden, not deleted**, so reports stay correct. Items with no donations are removed. |

- Each row shows its **slug** (for `?item=` links) and **donation count**.
- The panel works on **any** appeal — e.g. future Ramadan food packs or Eid gifts. An appeal with no items behaves exactly as before.

Reporting: donations carry `productId`, so item-level totals come from the existing donations data / exports (Stripe line items and receipts also show "Item × Qty").

---

## 5. Framer — building the Winter Appeal page with Framer AI

Framer has AI built in. Pick whichever AI model Framer offers in your plan's model selector (e.g. GPT, Claude Sonnet / Opus, Fable). Give it a prompt and it generates the page layout, writes copy, sets up a **CMS collection**, and places images. You then review and publish.

### Recommended setup
- **Framer** = the story / marketing page (hero, the need, items, impact, FAQ).
- **Alianah site** = the payment. Every "Donate" button in Framer links to `/appeal/winter-appeal?item=<slug>`.
- **Framer CMS** collection `Winter Items` holds the item cards, so marketing can edit copy and images without a developer.

### CMS collection: `Winter Items`
| Field | Type | Example |
|---|---|---|
| Title | Text | High-Quality Blanket |
| Slug | Text | high-quality-blanket |
| Price | Text | £28.89 |
| Category | Option | Children / Adults / Shelter / Bedding |
| Image | Image | blanket photo |
| Short impact line | Text | Keeps a child warm through freezing nights |
| Donate link | Link | `https://<site>/appeal/winter-appeal?item=high-quality-blanket` |
| Order | Number | 9 |

Keep the **prices in Framer the same as Admin → Appeal Items**. The admin panel is what donors are actually charged.

### Prompt to paste into Framer AI
```
Design a high-converting, mobile-first charity appeal page called "Winter Appeal" for Alianah.

Goal: get donors to sponsor winter essentials for families in freezing conditions.
Tone: urgent, warm, dignified — no graphic imagery. Islamic charity audience (Sadaqah & Zakat eligible).

Sections:
1. Hero — headline "Keep a Family Warm This Winter", sub-line on families facing sub-zero
   nights without shelter, big "Donate Now" button, full-width emotive image of children in winter clothing.
2. The Need — 3 short stat blocks (temperatures, families in tents, children without coats).
3. Choose Your Gift — grid of cards bound to the CMS collection "Winter Items"
   (fields: Title, Price, Image, Short impact line, Donate link, Category, Order).
   Filter tabs by Category: Children, Adults, Shelter, Bedding. Each card has a "Give this" button
   linking to the item's Donate link. Sort by Order.
4. Featured: Tents — highlight Tent Type 1/2/3 as "Shelter a whole family".
5. Where Your Money Goes — 3 steps: you give → we buy locally → we distribute & report back.
6. Zakat note — "This appeal is Zakat eligible."
7. FAQ — 4 questions (delivery, Zakat, reports, Gift Aid).
8. Sticky mobile "Donate" bar linking to /appeal/winter-appeal.

Create the CMS collection "Winter Items" with these 13 items:
Children's Winter Tracksuit Type 1 £11.23, Type 2 £14.44, Type 3 £16.05;
Children's Jacket Type 1 £12.84, Type 2 £16.05; Adult Winter Tracksuit £17.65; Adult Jacket £24.07;
High-Quality Tarpaulin £57.77; High-Quality Blanket £28.89; High-Quality Mattress £25.68;
Tent Type 1 £224.66, Type 2 £433.38, Type 3 £609.80.
Donate link format: https://<our-site>/appeal/winter-appeal?item=<slug>.

Style: deep navy and white with a warm amber accent, large readable type, generous spacing,
rounded cards, fast-loading images. Must look excellent on mobile.
```

### After the AI builds it
1. Swap placeholder images for real field photos (upload to CMS Image field).
2. Replace `<our-site>` with the live domain in every Donate link.
3. Check every item's link opens the right item pre-selected.
4. Publish. Paste the Framer page URL into Admin → Winter Appeal → **Framer URL** so the donation page links back to it.
