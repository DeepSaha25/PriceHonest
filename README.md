# PriceHonest

> **Truth in pricing. Before you buy.**  
> *An evidence-first price investigation and deal verification workspace built for Indian shoppers.*  
> **Submitted to SerpApi India Hackathon 2026 🇮🇳**

[![Live Demo](https://img.shields.io/badge/Demo-pricehonest.vercel.app-brightgreen?style=flat-square&logo=vercel)](https://pricehonest.vercel.app/)
[![YouTube Demo](https://img.shields.io/badge/YouTube-Video_Walkthrough-red?style=flat-square&logo=youtube)](https://youtu.be/ZruTcO9Xk6k)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![SerpApi](https://img.shields.io/badge/Powered_by-SerpApi-blue?style=flat-square)](https://serpapi.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

---

## 🔗 Quick Links

* 🌐 **Live Web Application:** [https://pricehonest.vercel.app/](https://pricehonest.vercel.app/)
* 🎥 **YouTube Video Walkthrough:** [https://youtu.be/ZruTcO9Xk6k](https://youtu.be/ZruTcO9Xk6k)

---

## 📌 Visual Preview

<p align="center">
  <img src="assets/screenshots/01-landing-hero.jpg" alt="PriceHonest Landing Page" width="100%" />
</p>

| **Market Reality — Exposing Dark Patterns** | **Live Multi-Store Price Comparison** |
|:---:|:---:|
| <img src="assets/screenshots/02-market-reality.jpg" alt="Market Reality Problem Cards" width="100%" /> | <img src="assets/screenshots/03-live-deal-comparison.jpg" alt="Live Price Comparison" width="100%" /> |
| *Identifies inflated MRPs, pre-sale spikes & hidden fees* | *Scans Amazon, Flipkart, Croma & Reliance Digital in real time* |

<p align="center">
  <img src="assets/screenshots/04-market-analytics.jpg" alt="Market Analytics & Radar Chart" width="100%" />
  <br />
  <em>Store Price Comparison, Evidence Coverage Radar, and Price vs. Market Median Analytics</em>
</p>

---

## 🏆 Hackathon Evaluation Alignment

PriceHonest is designed from the ground up to address all five hackathon judging criteria with uncompromising rigor:

### 01. Idea Strength (Core Insight)
* **Discount as a Marketing Claim:** An advertised discount badge (e.g., *"65% OFF"*) is a seller's promotional claim, not mathematical proof of value.
* **Artificial MRP Anchoring:** E-commerce platforms regularly inflate reference Maximum Retail Prices (MRPs) before festive sales (Big Billion Days, Great Indian Festival) to manufacture phantom savings.
* **Empirical Market Baseline:** PriceHonest replaces retailer claims with an objective median market price derived by cross-examining multiple independent retail destinations simultaneously.
* **Refusal on Thin Data:** If data is ambiguous or scarce, the engine refuses to guess or invent a fake deal, returning a transparent `Weak Evidence` verdict.

### 02. Originality (Distinctive Approach)
* **Auditable Evidence Receipts:** Every verdict includes verifiable receipts: clickable merchant URLs, seller identities, extraction timestamps, and explicit data-limitation disclosures.
* **Separation of User Claim & Market Truth:** The user's offer price is evaluated as a separate variable against the verified market consensus, allowing instant scenario recalculation without re-fetching data.
* **Non-Hallucinatory Explanations:** Employs a deterministic classification engine for verdicts, backed by an optional Google Gemini rationale engine strictly constrained to verified search receipts.
* **Transparent Verdict Taxonomy:** Classifies products into clear, actionable states:
  * `genuine_deal` — Offered price is within the competitive band and near the market floor.
  * `fair_price` — Offered price aligns with normal prevailing market rates.
  * `inflated_claim` — Claimed discount is deceptive; competitors sell at or below this price everyday.
  * `weak_evidence` / `insufficient_data` — Market data coverage is insufficient to draw a trustworthy conclusion.

### 03. Technical Complexity & Engineering Rigor
* **Multi-Layer Search Orchestration:** Coordinates three simultaneous search vectors: Google Shopping discovery, retailer-restricted deep queries, and 12-month temporal context searches.
* **Strict Variant & Currency Normalization:** Advanced regex and keyword parsing filter out non-cash prices, EMI schemes, refurbished goods, accessories (cases/chargers), and mismatched RAM/storage configurations.
* **Real-Time NDJSON Streaming:** Built on Node.js/Express and TypeScript, streaming progressive search stages over NDJSON so users see live extraction milestones as they happen.
* **High-Efficiency Caching & Deduplication:** In-flight query deduplication and a TTL-based cache keyed by normalized query parameters prevent duplicate queries and optimize SerpApi quota usage.
* **Interactive Client-Side Scenario Calculator:** Allows buyers to adjust bank card discounts, coupons, and delivery fees with real-time reactive verdict recalculations.

### 04. Practical Usefulness (Real-World Impact)
* **Festive Sale Protection:** Protects Indian consumers during aggressive flash sales from deceptive countdown timers and artificial price drops.
* **High-Ticket Electronics Savings:** Prevents overpaying on smartphones, laptops, audio equipment, and appliances where price variations between stores often span ₹1,000–₹10,000+.
* **Elimination of Multi-Tab Fatigue:** Replaces the need to manually open 8+ browser tabs across Amazon, Flipkart, Croma, Reliance Digital, and Vijay Sales.
* **Universal Input Resolution:** Accepts raw product keywords or full product URLs (Amazon, Flipkart, etc.), automatically parsing and resolving them into clean search queries.

### 05. Meaningful SerpApi Dependency
* **Authoritative Data Backbone:** PriceHonest fundamentally depends on SerpApi; it is not a wrapper around static data or a cosmetic frontend.
* **`google_shopping` Engine:** Extracts live structured market offerings across Indian merchants, parsing live product titles, cash prices in INR, direct retailer URLs, seller reputations, and product media.
* **`google` Engine (Retailer-Restricted):** Queries authoritative Indian retail domains directly to capture direct-to-consumer store prices that shopping feeds often omit or delay.
* **`google` Engine (Temporal Context):** Scans 12 months of web context to determine whether a price drop is an authentic historic low or routine everyday pricing.
* **Anti-Bot & Geo-Resilience:** Leverages SerpApi's enterprise proxy and anti-bot infrastructure to bypass rate limits and geographic blocks reliably.

---

## 🏗️ Architecture & Data Lifecycle

```text
Browser (React + TypeScript + Vite + Tailwind/Vanilla CSS)
  Landing → Deal Investigator → Streamed Analysis Report
                         ├─ Seller Comparison Matrix
                         ├─ Auditable Evidence Receipts & Limitations
                         ├─ Scenario & Bank Discount Calculator
                         └─ Local Product Targets & Export (JSON / Print)
                                       │
                                       ▼ HTTP / NDJSON Stream
Express Server (Node.js + TypeScript)
  /api/resolve-product
  /api/check-deal
  /api/check-deal/stream
       │
       ├── In-flight Deduplication & TTL Cache (Keyed by Mode + Normalized Query)
       ├── Strict Variant, Currency (INR), & Accessory Guardrails
       ├── Deterministic Classification Engine
       └── Grounded AI Rationale (Google Gemini API - Optional)
             │
             └── SerpApi Integration Layer
                 ├── 1. Google Shopping Engine (`google_shopping`)
                 ├── 2. Retailer-Restricted Google Search (`google` + site filters)
                 └── 3. Temporal Context Google Search (`google` + 1-yr window)
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Canvas Confetti |
| **Backend** | Node.js, Express, TypeScript, NDJSON Streaming |
| **Data Engine** | **SerpApi** (`google_shopping`, `google`) |
| **AI / LLM** | Google Gemini API (Optional Rationale Engine) |
| **Monorepo / Tooling**| npm workspaces, concurrently, Playwright, Prettier |
| **Deployment** | Vercel (Single-command Serverless deployment with `vercel.json`) |

---

## ⚡ Quickstart & Local Setup

### 1. Prerequisites
* **Node.js** (v18.x or v20.x recommended)
* **npm** (v9.x or later)
* A **SerpApi Key** (Get free tier at [serpapi.com](https://serpapi.com))

### 2. Clone and Install
```bash
git clone https://github.com/DeepSaha25/PriceHonest.git
cd PriceHonest
npm run install:all
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Required for live retailer price checks
SERPAPI_KEY=your_serpapi_key_here

# Server Configuration
PORT=8080
CORS_ORIGIN=http://localhost:5173
SERPAPI_TIMEOUT_MS=35000

# Optional: AI Deal Rationale (Falls back to deterministic rules if empty)
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run Development Server
Start both the Express backend and Vite frontend concurrently:
```bash
npm run dev
```

* **Frontend Web App:** `http://localhost:5173`
* **Backend API:** `http://localhost:8080/api/health`

---

## 🧪 Testing & Verification

The codebase includes comprehensive integration and unit tests validating variant parsing, currency guardrails, and deterministic scoring:

```bash
# Run server test suite
npm test

# Format codebase
npm run format
```

---

## 🚀 Deployment (Vercel)

The repository is pre-configured for seamless single-click deployment on **Vercel** via [vercel.json](file:///Users/deepsaha/Documents/projects/PriceHonest/vercel.json):

* **Live Deployment:** [https://pricehonest.vercel.app/](https://pricehonest.vercel.app/)

To deploy your own instance:
1. Import your GitHub repository into Vercel.
2. Under **Project Settings → Environment Variables**, add:
   * `SERPAPI_KEY` = your SerpApi API key
   * `SERPAPI_TIMEOUT_MS` = `35000`
   * `GEMINI_API_KEY` = (Optional) your Gemini key
3. Click **Deploy**. Vercel builds both the frontend bundle and serverless API functions automatically.

---

## ⚖️ Ethics & Responsible Search

PriceHonest respects publisher rights and adheres to ethical data practices:
* Does not bypass paywalls or private account portals.
* Only queries publicly accessible merchant listings and search feeds.
* Employs conservative rate-limiting and query caching to prevent unnecessary traffic to data providers.
* Explicitly attributes merchant provenance with transparent outbound links.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
