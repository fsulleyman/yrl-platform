# Youth Republic Leadership (YRL)

Official web platform for **Youth Republic Leadership (YRL)** — an independent, non-partisan, youth-led civil society organisation in Ghana establishing foundational interim governance structures for ethical young leaders aged 18–40.

---

## Project Status

* **Model A (Production Frontend):** **Complete**
* **Model B (Backend Integration):** **Pending separate implementation and authorization**

This repository contains the complete, production-ready **Model A** frontend application. All production pages, design system primitives, multi-step forms, client-side validation rules, accessible navigation systems, and responsive layouts are fully implemented and verified.

---

## Model A Scope

Model A encompasses the complete client-facing web application and user experience:

* **11 Production Routes:** Fully structured, content-rich, responsive pages.
* **Component Design System:** 16 reusable UI primitives and global layout structures.
* **Civic Form Systems:** Multi-step leadership nomination wizard, general membership registration form, and official communications inquiry desk.
* **Client-Side Validation:** Strict Zod schema enforcement across all input fields with real-time feedback and accessibility error summaries.
* **Static Content Delivery:** High-performance pre-rendering of articles, governance structures, FAQs, and institutional declarations.
* **Frontend-First Simulation:** Form submissions execute complete client-side validation and transition to official confirmation vouchers and printable receipts using client-simulated states.

---

## Current Features

* **Homepage (`/`):** Hero section with institutional mission, trust indicators, foundational pillars (Leadership, Service, Development), participation pathways, and regional highlights across Ghana's 16 administrative regions.
* **About YRL (`/about`):** Detailed organizational profile, vision and mission statements, operational scope, participation standards, and non-partisan constitutional declaration.
* **Organisational Structure (`/structure`):** Complete breakdown of 10 National Ministerial Portfolios and 16 Regional Secretariats, anchored on merit-based, voluntary service.
* **News & Announcements (`/news`, `/news/[slug]`):** Official publications directory with category filtering, chronological ordering, and dynamic article reader with metadata and participation sidebar.
* **Frequently Asked Questions (`/faq`):** 12 official inquiries across General, Leadership, Membership, and Governance categories, with accessible accordion toggles and search/filtering capabilities.
* **Official Notice Board (`/notice`):** Interim legal notices, foundational declarations, and the Six Essential Principles of Public Trust.
* **Contact & Communications Desk (`/contact`):** Official inquiry form with real-time validation, reference number generation, and institutional secretariat details.
* **Leadership Nomination Form (`/get-involved/nominate`):** 4-step wizard for interim national and regional leadership roles, collecting 35 structured fields with dynamic age eligibility (18–40), portfolio-specific conditional fields, and printable record summaries.
* **General Membership Registration (`/get-involved/join`):** 6-section civic volunteer enrollment form with 14 fields, civic ethos acknowledgement, and instant membership voucher generation.
* **Privacy Policy (`/privacy-policy`):** Statutory data protection disclosures compliant with the Data Protection Act, 2012 (Act 843) of the Republic of Ghana.
* **Accessible Global Layout:** Sticky header with brand seal, desktop navigation, WAI-ARIA focus-trapped mobile drawer, skip-to-content link, and 4-column institutional footer.

---

## Production Routes

| Route | Description | Rendering Strategy |
| :--- | :--- | :---: |
| `/` | Homepage & Civic Mandate Overview | Static (`○`) |
| `/about` | Organisational Profile & Constitutional Mandate | Static (`○`) |
| `/structure` | 10 National Portfolios & 16 Regional Secretariats | Static (`○`) |
| `/news` | Official Announcements & Press Releases Index | Static (`○`) |
| `/news/[slug]` | Dynamic News Article Reader | SSG (`●` via `generateStaticParams`) |
| `/faq` | Frequently Asked Questions Repository | Static (`○`) |
| `/notice` | Official Notice Board & Six Core Principles | Static (`○`) |
| `/contact` | Official Communications & Inquiry Desk | Static (`○`) |
| `/get-involved/nominate` | 4-Step Leadership Nomination System | Static (`○`) |
| `/get-involved/join` | General Membership & Volunteer Registration | Static (`○`) |
| `/privacy-policy` | Data Protection Disclosures (Act 843) | Static (`○`) |

---

## Technology Stack

* **Framework:** [Next.js](https://nextjs.org/) `16.3.5` (App Router, Turbopack)
* **UI Library:** [React](https://react.dev/) `19.2.8`
* **Language:** [TypeScript](https://www.typescriptlang.org/) `5.x` (Strict mode)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) `4.x`
* **Validation:** [Zod](https://zod.dev/) `4.6.2`
* **Icons:** [Lucide React](https://lucide.dev/) `1.45.0`
* **Typography:** [Montserrat](https://fonts.google.com/specimen/Montserrat) (Headings) & [Inter](https://fonts.google.com/specimen/Inter) (Body) via `next/font/google`
* **Package Manager:** [pnpm](https://pnpm.io/) `12.4.1`

---

## Project Structure

```text
yrl-platform/
├── app/                      # Next.js App Router routes & pages
│   ├── about/                # /about page
│   ├── contact/              # /contact page & ContactForm component
│   ├── design-system/        # UI primitive showcase & styleguide
│   ├── faq/                  # /faq page with accordion system
│   ├── get-involved/
│   │   ├── join/             # /get-involved/join membership form
│   │   └── nominate/         # /get-involved/nominate 4-step wizard
│   ├── news/                 # /news listing
│   │   └── [slug]/           # /news/[slug] dynamic article reader
│   ├── notice/               # /notice official notice board
│   ├── privacy-policy/       # /privacy-policy legal disclosure
│   ├── structure/            # /structure governance tiers
│   ├── layout.tsx            # Root layout with fonts, skip link, Header, Footer
│   ├── page.tsx              # Homepage
│   ├── error.tsx             # Global error boundary
│   └── not-found.tsx         # Custom accessible 404 page
├── components/
│   ├── layout/               # Header, Footer, navigation drawers
│   └── ui/                   # 16 reusable design system primitives
├── content/
│   └── news/                 # Static JSON news articles
├── data/                     # Typed static datasets (FAQs, navigation, notices, structure)
├── lib/
│   ├── metadata.ts           # OpenGraph & SEO metadata generator
│   ├── news.ts               # News query & slug resolution utilities
│   └── validations/          # Zod schemas (nomination, member, contact)
├── public/
│   ├── brand/                # Official YRL seal & brand assets
│   └── icons/                # Favicon and PWA icons
└── tests/                    # Vitest smoke & validation test suites
```

---

## Design System

The YRL design system balances authoritative institutional gravitas with an energetic, youth-centered civic identity:

### Brand Palette
* **Primary Deep Navy:** `#0B1F3A` — Authority, constitutional stability, institutional trust.
* **Secondary Dark Navy:** `#061120` — Deep background for footers and high-contrast containers.
* **Accent Gold:** `#C9A227` — Excellence, sovereign service, leadership distinction.
* **Bright Gold / Yellow:** `#FCD116` — High-visibility accents and Ghana flag center stripe.
* **Ghana Red:** `#CE1126` — Error states, critical notices, Ghana flag heritage stripe.
* **Ghana Green:** `#006B3F` — Success states, verified badges, Ghana flag future stripe.
* **Neutral Slate:** `#0F172A` (Text), `#F8FAFC` (Background), `#E2E8F0` (Borders).

### Reusable Primitives (`components/ui/`)
* `Accordion`: Accessible disclosure component with ARIA expanded controls.
* `Alert`: Information, success, warning, and error status banners.
* `Badge`: Category and status indicators with semantic color variants.
* `Button`: Standardized action triggers with `sm`, `md` (`min-h-[44px]`), and `lg` sizing.
* `Card`: Structured container panels with bordered, elevated, and flat styles.
* `Checkbox`: Programmatically bound multi-select inputs with custom focus rings.
* `Container`: Responsive max-width wrappers (`sm`, `md`, `lg`, `xl`, `full`).
* `Disclaimer`: Institutional notices with high-contrast accent borders.
* `Input`: Text input fields with error states and `aria-describedby` linkage.
* `Label`: Form label primitive with optional/required indicators.
* `NoticeBanner`: Full-width civic notice alerts.
* `PageHeading`: Semantic section headings supporting `h1`, `h2`, and `h3` rendering.
* `Radio`: Single-select option inputs with accessibility bindings.
* `Section`: Vertical rhythm wrappers with white, slate, and navy backgrounds.
* `Select`: Dropdown menus with custom chevron indicators and error handling.
* `Textarea`: Multi-line text inputs with live character counters.

---

## Form Workflows

### 1. Leadership Nomination (`/get-involved/nominate`)
* **Purpose:** Allows young Ghanaian leaders aged 18–40 to step forward for 11 Interim National Portfolios or 16 Interim Regional Minister roles.
* **Workflow:**
  1. *Step 1: Profile & Position* — Demographics, contact info, residence, education, occupation, and position selection.
  2. *Step 2: Vision & Commitment* — Portfolio vision essays (min 20 characters each), weekly availability, physical/online meeting commitments, and referee contact.
  3. *Step 3: Review & Confirm* — Comprehensive summary of all 35 fields with editing navigation and mandatory declaration agreement.
  4. *Step 4: Confirmation Record* — Displays official Nomination ID (`YRL-NOM-2026-XXXX`), submission timestamp, next steps timeline, print button (`window.print()`), and form reset.
* **Model A Status:** All 35 fields validate via Zod. Submission simulates server processing and displays the verified confirmation record on the client.

### 2. General Membership (`/get-involved/join`)
* **Purpose:** Public enrollment for civic volunteers and community advocates.
* **Fields (14 total):** Full name, date of birth (18–40), gender, phone number, WhatsApp number, email, region, district/municipality, town/community, occupation, education level, motivation statement (20–1000 characters), weekly availability, civic interests, and ethos acknowledgement.
* **Model A Status:** Validates all fields via Zod, simulates an 800ms submission delay, and generates a formal Membership Voucher with a unique Member ID (`YRL-MEM-2026-XXXX`).

### 3. Communications & Inquiry Desk (`/contact`)
* **Fields:** Full name (2–100 characters), email, and message body (20–2000 characters).
* **Model A Status:** Validates inputs, simulates a 1,200ms submission delay, and renders a transmission receipt card with an Inquiry Reference Number (`YRL-MSG-2026-XXXX`).

---

## Accessibility & Responsive Standards

* **Heading Hierarchy:** Strictly enforced single `<h1>` per page, followed by an unbroken heading ladder (`h1` -> `h2` -> `h3`).
* **Keyboard Navigation:** Dedicated skip link (`#main-content`) visible on focus, complete tab order, visible focus rings (`ring-2 ring-[#0B1F3A]`), and `Escape` key listeners.
* **Mobile Drawer Navigation:** WAI-ARIA modal dialog focus trap (`Tab`/`Shift+Tab`), auto-focus to Close button upon opening, and focus restoration to the trigger button upon closing.
* **Touch Ergonomics:** All interactive buttons, triggers, and navigation links adhere to a minimum 44×44px touch target (WCAG 2.5.8).
* **Color Contrast:** All body text, helper labels, and interactive states meet or exceed WCAG AA 4.5:1 contrast ratios. Gold-on-navy accents deliver high-contrast readability (9.8:1).
* **Responsive Breakpoints:** Fully verified across Mobile (375px, 390px, 430px), Tablet (768px), and Desktop (1024px, 1440px) viewports with zero horizontal overflow.

---

## Backend / Model B Boundary

> [!IMPORTANT]
> **Model A is a Frontend-Only Implementation.**  
> This repository contains zero production database connections, live server actions, authentication providers, or transactional email dispatchers.

Planned **Model B** backend responsibilities include:
* **Persistence Layer:** PostgreSQL database tables (`nominations`, `members`, `contact_messages`, `news_articles`) hosted on Supabase with Row Level Security (RLS).
* **Server-Side Validation:** 1:1 server-side enforcement of existing Zod schemas to reject unauthorized or malformed payloads.
* **Deterministic Identifiers:** Database sequence triggers for official reference numbers (`YRL-NOM-2026-XXXX`, `YRL-MEM-2026-XXXX`, `YRL-MSG-2026-XXXX`).
* **Transactional Email:** Automated dispatch of confirmation receipts to applicants and inquiry alerts to the national secretariat.
* **Reviewer Authentication:** Multi-tenant Role-Based Access Control (RBAC) for national committee reviewers and regional coordinators.

---

## Development & Build Commands

### Prerequisites
* Node.js `20.x` or higher
* `pnpm` `12.x` (or `npm` / `yarn`)

### Installation
```bash
# Install dependencies
pnpm install
```

### Local Development
```bash
# Start development server on port 3000
pnpm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### Production Build & Type Checking
```bash
# Run TypeScript type check
pnpm exec tsc --noEmit

# Compile production build
pnpm run build

# Start production server
pnpm run start
```

### Testing
```bash
# Execute Vitest test suite
pnpm run test
```

---

## Verification Summary

The Model A codebase has passed the following verification gates:
* **TypeScript Compilation:** `pnpm exec tsc --noEmit` exits with `0` errors.
* **Production Static Build:** `pnpm run build` compiles `21/21` static pages with exit code `0`.
* **F13 Quality Gate:** 16 of 16 responsive and accessibility acceptance criteria verified.
* **Security Audit:** Zero API keys, passwords, or private credentials committed to source control.

---

## License

Licensing terms and copyright for Youth Republic Leadership (YRL) are reserved by the interim founding committee. Open-source licensing has not yet been specified.
