# NEXORA V3 — AI-Powered Multi-Vendor Marketplace

**NEXORA V3** is an Indian multi-vendor e-commerce marketplace and autonomous engineering command center built with **React 19**, **TypeScript**, **Tailwind CSS v4**, **D3.js**, **Express**, and server-side **Google Gemini (`@google/genai`)**. It models a production storefront in Indian Rupees (₹ INR / paise integer arithmetic), multi-role account governance, B2B wholesale negotiation workflows, GST-compliant invoicing with Gift Receipt masking, and live voice-enabled AI shopping assistance.

---

## Key Features & Capabilities

### Storefront & Discovery
- **60-Item Multi-Vendor Curated Catalog**: 6 departments (*Smartphones & Technology*, *Audio & Headphones*, *Mechanical Keyboards & Accessories*, *Watches & Wearables*, *Workspace & Lifestyle*, *Smart Home & Gadgets*), multi-facet filtering by brand, ₹ price bracket, minimum rating, quick nav filters (*Top Sellers*, *New Releases*, *Direct Studio Deals*), sort options, pagination, and global keyboard search (`/`).
- **Resilient Media (`<SafeImage>`)**: Every product photograph renders with `referrerPolicy="no-referrer"` and automatic styled fallback placeholders on network error.
- **Persistent Product Comparison & Wishlist**: Side-by-side 3-product technical specification matrix persisted in `localStorage` (`nexora_compared_ids`), plus wishlist drawer with one-click bulk transfer to bag and Price Drop Alert alerts.
- **Global Light & Dark Theme**: Instant navbar toggle updating `<html class="dark">` and synchronizing all components, modals, and D3 SVG charts via CSS dark variants and DOM mutation observation.

### Product Intelligence, Community Q&A & B2B Negotiation (`QuickViewModal`)
- **Community Q&A & Dynamic Schema.org `FAQPage` JSON-LD**: Interactive customer Q&A tab that emits and dynamically updates valid `<script type="application/ld+json">` (`@type: FAQPage`) structured data when users post new questions.
- **Customer Reviews & Sorting**: Verified-buyer reviews with helpful vote increments, live review submission, and sorting by *Recent*, *Highest Rating*, or *Most Helpful*.
- **B2B Bulk Order Inquiry**: Triggered on high-inventory SKUs (`stock >= 10`), submitting wholesale pricing negotiations to the seller desk and tracking tickets in the customer's Profile portal and `/api/v1/bulk-inquiries`.

### Checkout & Razorpay Gateway Simulation (`RazorpayModal`)
- **Business-Day Preferred Delivery DatePicker**: Restricts selection to Monday–Friday future business days, rejects weekends and past dates, and attaches the chosen slot to the order summary.
- **NexWallet & Loyalty NexPoints**: One-tap wallet deposits, wallet balance checkout, and NexPoints redemption (`10 pts = ₹1.00`).
- **Gift Receipt & Order Notes**: Toggleable Gift Receipt masking unit prices and totals across order summaries and downloadable GST Tax Invoices, plus custom doorstep delivery instructions (`Order Notes`) archived per order.
- **Promo Codes**: Validated via `commerceFeatures.ts` (`NEXORA10`, `STUDIO20`, `FESTIVE500`, `WELCOME100`) alongside ₹999 free-shipping threshold logic.

### Customer Account Portal, D3 Analytics & Achievement System (`UserAccount` & `CommandCenter`)
- **Purchase History KPIs & Order Notes History**: Live calculation of lifetime spend, total orders & items purchased, average order value, delivery counts, plain-text `Share Order` export, and a dedicated `Order Notes` history filter.
- **D3 Order Milestone Gauge & Monthly Spending Trend Chart**: Interactive circular D3 SVG progression meter (*Processing* → *Dispatched* → *Out for Delivery* → *Delivered*) with stage advancement, plus D3 monthly spend visualization in the 4-Agent Command Center that dynamically adapts to Light & Dark modes.
- **Achievement Manager (`AchievementBadges`)**: Dynamically awards badges (*Verified Buyer*, *Top Reviewer*, *Gold/Platinum Patron*, *Tech Connoisseur*, *Green Logistics Partner*, *Founding Member*) with confetti/sparkle celebration effects on unlock.
- **GST Tax Invoice Modal (`GSTInvoiceModal`)**: Itemized CGST/SGST (9% + 9%) breakdown, printable invoice layout, and Gift Receipt price masking.
- **4-Agent Command Center**: Live task orchestration dashboard backed by `/api/v1/orchestrator/*` polling and task execution.

### NOVA AI Voice & Shopping Assistant (`NovaModal`)
- **Server-Side Gemini Integration (`/api/v1/nova/chat`)**: Uses `@google/genai` (`gemini-4-hydrogen`) grounded against the live `PRODUCTS_CATALOG` on the Express backend (`src/server/novaService.ts`)—never exposing API keys to the client and returning honest HTTP `503` feedback if `GEMINI_API_KEY` is unconfigured.
- **Voice Sound Wave Animation**: Real-time animated voice frequency bar equalizer (`nova-voice-wave-panel`) paired with browser `SpeechRecognition` when processing user voice input.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide React, D3.js (`d3`)
- **Backend**: Node.js, Express 4, Zod request validation, `@google/genai`
- **Testing & Quality**: Node native test runner via `tsx --test`, TypeScript (`tsc --noEmit`), Playwright CLI headless Chromium verification

---

## Project Structure

```
.
├── server.ts                  # Express + Vite middleware server (port 3000) & REST API v1
├── src/
│   ├── App.tsx                # Root state & modal orchestration
│   ├── components/            # Modular UI, checkout, D3 charts, NOVA modal & UserAccount
│   ├── data/                  # Curated 60-product catalog & category metadata
│   ├── server/                # Gemini service (novaService.ts), in-memory DB & 4-agent orchestrator
│   ├── types/                 # Shared TypeScript interfaces
│   └── utils/                 # Pure commerce logic, INR formatters, spending trends & unit tests
├── package.json
└── vite.config.ts
```

---

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Configure environment** (copy `.env.example` to `.env`):
   - Set `GEMINI_API_KEY` to enable live server-side NOVA AI responses.
3. **Run development server** (Express API + Vite on `http://localhost:3000`):
   ```bash
   npm run dev
   ```
4. **Verify tests, type-check, and production build**:
   ```bash
   npm test
   npm run lint
   npm run build
   ```

---

## Key Backend API Endpoints (`/api/v1`)

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service health & architecture check |
| `GET` | `/api/v1/products` | Filterable, sortable catalog endpoint |
| `GET` | `/api/v1/categories` | Dynamic department counts from catalog |
| `GET` / `POST` | `/api/v1/orders` | List & persist verified orders |
| `GET` / `POST` | `/api/v1/bulk-inquiries` | List & persist B2B bulk wholesale inquiries |
| `POST` | `/api/v1/nova/chat` | Zod-validated server-side Gemini shopping concierge |
| `GET` / `POST` | `/api/v1/orchestrator/*` | 4-Agent Command Center state & task dispatch |
