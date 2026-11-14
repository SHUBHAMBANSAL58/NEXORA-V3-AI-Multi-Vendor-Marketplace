# NEXORA V3 — Phase 1: Foundation & Architecture Report

**Phase:** Phase 1 — Foundation & Four-Agent Architecture  
**Status:** **VERIFIED**  
**Date:** November 09, 2026  
**Engineering Orchestrator:** NEXORA Core Systems  
**Branch:** `phase-1-foundation`  

---

## 1. Executive Summary

Phase 1 establishes the full-stack architecture, centralized design system, database repository foundation, and the Four-Agent Engineering Orchestrator for NEXORA V3.

The application now runs as a unified full-stack service (`server.ts`) in Node.js/TypeScript on port 3000, serving both the client-side SPA through Vite middleware in development and a versioned REST API under `/api/v1`.

---

## 2. Architecture & Directory Structure

```
/
├── server.ts                        # Full-stack Express entry point with Vite middleware
├── package.json                     # Scripts ("dev": "tsx server.ts", "test": "tsx --test ...")
├── docs/
│   ├── AUDIT.md                     # Phase 0 comprehensive repository audit
│   └── PHASE_1_FOUNDATION.md        # Phase 1 architectural blueprint & verification
├── src/
│   ├── server/
│   │   ├── db.ts                    # Database abstraction, MongoDB Atlas connector & seed store
│   │   ├── orchestrator.ts          # Four-Agent engine (Planner -> Designer -> Builder -> Tester)
│   │   └── orchestrator.test.ts     # Automated unit tests for multi-agent workflows
│   ├── styles/
│   │   └── tokens.ts                # Centralized design tokens (Obsidian Dark & Pearl Light)
│   ├── components/
│   │   ├── Navbar.tsx               # Top Bar Contract, product search & profile menu
│   │   ├── Hero.tsx                 # Split-column hero with Tailwind background image placeholder
│   │   ├── FeaturedProductCard.tsx  # Interactive variant switcher, pricing & Add to Bag
│   │   ├── TrustBar.tsx             # 4-pillar Indian commerce trust strip
│   │   ├── FeaturedGrid.tsx         # Department-filtered product catalog grid
│   │   ├── CartDrawer.tsx           # Shopping bag slide-over with GST calculation in ₹ INR
│   │   ├── NovaModal.tsx            # Grounded AI shopping assistant dialogue
│   │   ├── CommandCenter.tsx        # Four-Agent Command Center & telemetry dashboard
│   │   └── Footer.tsx               # Marketplace legal and operational footer
│   ├── data/
│   │   └── mockData.ts              # Deterministic Indian marketplace dataset
│   ├── types/
│   │   └── index.ts                 # Core TypeScript interface contracts
│   └── utils/
│       ├── formatters.ts            # Currency formatters (paise to ₹ INR) & search filters
│       └── formatters.test.ts       # Formatters unit test suite
```

---

## 3. Centralized Design Tokens (`src/styles/tokens.ts`)

Conforms to Rule 5 with independent Obsidian Dark and Pearl Light palettes:

- **Dark Theme Palette:**
  - Canvas: `#060911` (Obsidian Deep)
  - Surface: `#090D16` (Midnight Navy)
  - Elevated: `#0F172A` (Graphite)
  - Accents: `#3B82F6` (Electric Blue), `#06B6D4` (Aurora Cyan), `#8B5CF6` (Cosmic Violet)
- **Light Theme Palette:**
  - Canvas: `#F8FAFC` (Pearl White)
  - Surface: `#FFFFFF` (Warm Ivory / Pure)
  - Elevated: `#F1F5F9` (Mist Grey)
  - Accents: `#2563EB` (Deep Indigo), `#0891B2` (Soft Blue)
- **Zero-Pill Discipline:**
  - Metadata rendered as clean, unboxed text separated by `·`.
  - Filter controls implemented as discrete segmented buttons.
- **Top Bar Contract:**
  - Zone 1: Single-element brand wordmark.
  - Zone 2: Search input with keyboard shortcut `/` and live suggestions.
  - Zone 3: Command Center trigger, Dark/Light toggle, Wishlist, Shopping Bag, and User Profile.

---

## 4. Full-Stack REST API Contracts (`/api/v1`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service health, database status, and uptime |
| `GET` | `/api/v1/orchestrator/state` | Returns the real state of all 4 agents, tasks, and telemetry logs |
| `POST` | `/api/v1/orchestrator/run` | Triggers a live task execution across Planner -> Designer -> Builder -> Tester |
| `GET` | `/api/v1/products` | Retrieves filtered products with category and search query parameters |
| `GET` | `/api/v1/products/:id` | Returns product specifications, variants, and stock count |
| `GET` | `/api/v1/categories` | Returns catalog taxonomy and default HSN/GST configurations |
| `GET` | `/api/v1/config` | Platform configurations: INR currency, Razorpay test mode, and NOVA AI tools |

---

## 5. Four-Agent Engineering System (Rule 2 & 3)

1. **Planner (`Agent 1`):** Analyzes domain requirements, creates task breakdowns, maps dependencies, and specifies risk acceptance criteria.
2. **Designer (`Agent 2`):** Defines visual tokens, layout contracts, WCAG 2.2 AA contrast adherence, and responsive behaviour.
3. **Builder (`Agent 3`):** Synthesizes typed TypeScript code, constructs REST services, and binds UI state.
4. **Tester (`Agent 4`):** Executes unit tests, audits type safety, verifies lint rules, and certifies deployment gates.

### NEXORA Command Center (`src/components/CommandCenter.tsx`)
A dedicated dashboard embedded directly in the application that allows administrators to:
- Monitor all 4 agents' real-time statuses and task completion counts.
- Inspect active and completed pipeline tasks and their structured deliverables.
- Dispatch new tasks on demand through the live 4-agent cycle with zero simulated delays.
- Inspect the append-only telemetry and handoff log stream.

---

## 6. Verification and Test Results

- **Unit Test Suite 1 (`src/utils/formatters.test.ts`):** 3/3 passed (paise to ₹ INR conversion, discounts, query matching).
- **Unit Test Suite 2 (`src/server/orchestrator.test.ts`):** 3/3 passed (4-agent initialization, task tracking, pipeline workflow execution).
- **TypeScript Typecheck (`tsc --noEmit`):** 0 errors.
- **Vite Build & Compilation:** Succeeded.
- **Server Bootstrap:** Tested on port 3000.
