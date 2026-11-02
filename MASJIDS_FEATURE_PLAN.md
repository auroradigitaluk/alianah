# Masjid Donations — FINAL Plan

_28 Oct 2026 · Repo: `alianah` (give.alianah.org)_

## The rule (your words)
- **Don't change** architecture, payment, webhook, checkout, basket, fundraiser flow, or existing UI/UX.
- **Build new** only the Masjid-specific tables and pages.
- **Reuse** everything else exactly as it already works.

## The one decision this depends on

To reuse payment **with zero edits to payment code**, Masjid donations must ride on an existing donation pipeline. The cleanest fit is the **Appeal** pipeline:

> Each Masjid country is backed by a hidden `Appeal` that the admin screen creates automatically. Donations and fundraisers for that country flow through the **existing** appeal checkout, Stripe, webhook, finalize, receipt, Gift Aid and fundraiser system — **nothing in payment is touched.** The new Masjid tables only hold the country content (prices, images, description) and point to that appeal.

**What this means:**
- ✅ Payment, webhook, checkout, basket, success page, receipt email, Gift Aid, fundraiser flow: **0 edits.**
- ✅ Masjid donations appear in the existing Donations page, Reports and Gift Aid automatically (tagged "Build a Masjid – <Country>"). No separate Gift Aid export to remember.
- ✅ "Start a Fundraiser" uses the existing wizard and fundraiser page with **no new fundraiser code.**
- ⚠️ There is **no separate `masjid_donations` table** — masjid money lives in the existing `Donation` table (just labelled by its appeal). The "new tables" are the country/content tables.

👉 **Confirm:** is that OK? If you specifically want a dedicated `masjid_donations` table, that **requires ~7 additive edits to checkout + finalize** (the way Water and Qurbani were built) — which breaks the "don't touch payment" rule. **Recommendation: the backing-appeal approach above.** The rest of this plan assumes it.

---

## What we build (new)

### 1. New table — `MasjidProject` (one row per country)
```prisma
model MasjidProject {
  id                        String   @id @default(cuid())
  country                   String               // "Uganda"
  slug                      String   @unique      // /masjids/uganda
  title                     String               // "Build a Masjid in Uganda"
  summary                   String
  content                   String?              // long description
  priceFromPence            Int                  // full masjid price
  priceToPence              Int?                 // range top (Pakistan); null = fixed
  priceNote                 String?              // "Depending on size"
  imageUrls                 String   @default("[]")
  fundraisingImageUrls      String   @default("[]")
  fundraisingDefaultMessage String?
  allowFundraising          Boolean  @default(true)
  allowPartialDonations     Boolean  @default(true)
  framerUrl                 String?
  isActive                  Boolean  @default(true)
  sortOrder                 Int      @default(0)
  appealId                  String   @unique      // backing appeal (payment rides on this)
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
  appeal Appeal @relation(fields: [appealId], references: [id], onDelete: Restrict)
  @@index([isActive, sortOrder])
  @@map("masjid_projects")
}
```
Plus a one-line back-relation on `Appeal` (`masjidProject MasjidProject?`). Additive only — the `appeals` table and all existing code are unchanged.

### 2. New public pages (clone the Water UI)
| URL | Built from | Purpose |
|---|---|---|
| `/masjids` | copy of `components/water-for-life-page.tsx` | Country grid: image, "From £X", raised so far |
| `/masjids/[country]` | copy of the water country page + donate form | Images, content, progress, **Donate a full Masjid** / **Contribute**, **Start a Fundraiser** |

- Donate → **existing basket** (`sidecart-provider`) with the backing `appealId` → **existing `/checkout`**. No new checkout.
- Start a Fundraiser → existing `/fundraiser/create?campaignId=<appealId>` → existing wizard → existing `/fundraise/<slug>` page. No new fundraiser code.

### 3. New admin section — Campaigns & Projects → **Masjid Donations ▸**
(A copy of the Water for Life sidebar item.)
| Sub-item | Access | Purpose |
|---|---|---|
| **Countries** | Admin | Create/edit a country: title, slug, prices, images, description, toggles. On save, it creates/updates the hidden backing appeal (fundraising on, hidden from donation form + Zakat page + the appeals list). **This is the CMS.** |
| **Overview** | Admin, Staff | Per country: price, raised, # donations, # fundraisers, **Copy Link**, active toggle |
| **Fundraisers** | Admin, Staff | Existing fundraisers filtered to masjid appeals: raised vs target, link |

Masjid **donations** are viewed on the **existing** `/admin/donations` page (filtered by the "Build a Masjid – …" appeal). No new donations table or screen.

### 4. New API — `/api/admin/masjid-donations/**`
CRUD for countries (each call wraps the country + its backing appeal in one transaction). Each route calls `requireAdminAuth()`. Public list: `GET /api/masjids`.

---

## Edits to existing files (all additive, none in payment)
| File | Change |
|---|---|
| `prisma/schema.prisma` | Append `MasjidProject` + Appeal back-relation |
| `components/public-header.tsx` | Add **Masjids** link after Water |
| `components/admin-sidebar.tsx` | Add **Masjid Donations** item |
| `lib/admin-routes.ts` | Add masjid admin routes to role rules |
| `app/admin/appeals` list query | Exclude masjid-backed appeals (`where: { masjidProject: null }`) so admins don't edit them by hand |
| `app/(public)/fundraiser/create/page.tsx` | Label masjid campaigns as "Build a Masjid – <Country>" in the picker (optional) |

**Not touched:** `app/api/checkout/*`, `app/api/webhooks/stripe/*`, `lib/payment-finalize.ts`, `lib/donation-number.ts`, basket, success page, receipt emails, fundraiser APIs, Gift Aid.

---

## Build order
| # | Task | Est. |
|---|---|---|
| 0 | Client confirms the decision above + open questions | — |
| 1 | Branch `feature/masjid-donations` + Vercel preview + preview DB | 0.5d |
| 2 | Prisma: `MasjidProject` + migration + seed countries | 0.5d |
| 3 | Admin: sidebar, routes, **Countries** CRUD (creates backing appeal) + image uploads — *client can start entering content* | 1.5d |
| 4 | Public: header link, `/masjids` grid, `/masjids/[country]` page + donate box → basket | 1.5d |
| 5 | Admin: Overview + Fundraisers views; hide masjid appeals from appeals list | 1d |
| 6 | Wire "Start a Fundraiser" deep link + label in the wizard | 0.5d |
| 7 | QA (masjid): full/partial/fundraiser donations, Apple/Google Pay, Gift Aid, receipt, roles, mobile | 1d |
| 8 | Regression QA: appeal donation, Water, Qurbani, appeal fundraiser still work | 0.5d |
| 9 | Deploy, client enters content, Framer links | 0.5d |

**Total: ~7–8 dev days (~1.5 weeks).**

---

## Open questions for the client
1. **Countries:** 4 or 5? (Bangladesh £8,000, Pakistan £15,000–£20,000, India £15,000, Zanzibar £45,000, Uganda £7,000)
2. **Price ranges** (Pakistan/India): "From £15,000" + note, or size options?
3. **Partial donations:** any amount, or full price only?
4. **Fundraiser approval:** instant or admin-approved?
5. **Content:** description + 2–4 photos per country.

---

## Reply to client
> We'll add **Masjids** as a new section that works exactly like Water for Life, reusing your existing donation and payment system — nothing in checkout, payments or your other sections changes. You'll get: a Masjids tab in the header after Water, a page per country (e.g. give.alianah.org/masjids/uganda) with a copyable link for Framer, "Donate a full Masjid / Contribute any amount", and "Start a Fundraiser" that creates the visitor's own page — all through your current checkout (card, Apple Pay, Google Pay, Gift Aid). You manage the countries, prices, descriptions and photos from a new Masjid Donations area in admin.
>
> Please confirm: (1) final country list + prices, (2) how to show the Pakistan/India ranges, (3) any amount vs full price only, (4) fundraisers instant or approved. Delivery ~1.5 weeks from confirmation.
