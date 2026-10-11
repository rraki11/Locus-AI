# LOCUS AI
**Multi-Modal Market-Entry & Ground Reality Location Intelligence**

LOCUS AI is an intelligent location-evaluation platform that bridges the gap between conventional digital maps and actual physical ground reality. When small business owners and retail operators evaluate a new commercial location, digital map directories often miss unindexed storefronts, informal stalls, and physical signage, while traditional field surveys are expensive and slow.

LOCUS AI synthesizes **structured geospatial directory baselines** (Google Places / calibrated registries) with **on-the-ground computer vision** (multi-image photo batch or street video with Tesseract multilingual OCR and TensorFlow COCO-SSD object detection) to produce a rigorous, multi-factor location intelligence assessment and executive decision brief.

---

## 🌟 Key Capabilities across 4 Stages

### Stage 01: Market Discovery
- **Natural Language Business Interpreter**: Enter an informal description (e.g. *"Cozy artisanal bakery targeting college students on a tight budget"*) to automatically extract business categories, formats, priority drivers, target demographics, and CapEx budget envelopes.
- **Hierarchical Spatial Catchments**: Visualizes 3 concentric geographic bands around any candidate pin:
  - `0–300m`: Immediate walking corridor (Ground Reality).
  - `300m–2km`: Primary neighborhood catchment (Local Market).
  - `2–5km`: Extended driving trade area (Wider Market).
- **Dual Data Mode**: Runs out-of-the-box using calibrated Indian urban baseline registries (Hyderabad, Bangalore, Mumbai, Delhi, etc.) or seamlessly connects to live **Google Places API** via server-side middleware.

### Stage 02: Ground Reality & Street Scan
- **Flexible Ingestion**: Upload **5–15 storefront photographs** (JPG, PNG, WebP) or a **30–60 second street-level video** (MP4, MOV, WebM).
- **Multilingual Signboard OCR**: Neural Tesseract OCR with built-in offline support for **English + Telugu**, **English + Hindi**, **English + Kannada**, and **English + Tamil**, plus on-demand CDN regional models.
- **Visual Activity Detection**: In-browser TensorFlow COCO-SSD models track pedestrian density, vehicle traffic, and outdoor seating context without transmitting raw imagery to external servers.
- **Interactive Signboard Inspection & Cropping**: Click any frame to inspect, crop, apply adaptive preprocessing filters, and refine business names before evidence fusion.
- **Resilient Pipeline**: Preserves uploaded photos and video in memory with one-click retry; seamlessly falls back to client-side edge fusion if serverless endpoints encounter transient timeouts.

### Stage 03: Location Intelligence & Scenario Simulator
- **8-Factor Multi-Source Matrix**: Derives ratings for Commercial Activity, Competition, Accessibility, Customer Fit, Footfall Synergy, Rent Pressure, Operating Friction, and Risk.
- **Epistemic Evidence Taxonomy**: Every signal is strictly tagged by source provenance:
  - `DATABASE`: Verified directory listings from provider registries.
  - `OBSERVED`: Direct physical camera sightings (storefronts, pedestrian counts).
  - `INFERRED`: Cross-source reconciliation and customer-fit heuristics.
  - `PREDICTED_ANALYTICAL`: Scenario projections and sensitivity deltas.
- **Interactive Scenario Simulator**: Stress-test viability under changing economic conditions:
  - Rent delta (`-30%` to `+50%`)
  - Footfall / activity delta (`-40%` to `+50%`)
  - Competitor arrival (`-3` to `+5` competitors)
- **Instant Reactive Sensitivity**: Recalculates engine postures (`FAVORABLE`, `MIXED`, `CAUTION`, `WEAK`) in real time.

### Stage 04: Market Entry Decision Report
- **Executive Decision Brief**: Replaces alarmist "Insufficient Evidence" warnings with **"Analysis Based on Available Information"**, clearly distinguishing completed analytical synthesis from data coverage levels (`"Partially verified"`, `"Limited data"`, or `"Verified data"`).
- **Priority Nearby Businesses Section**: Separates confirmed directory listings from visually observed street storefronts. Unreadable signage is honestly tagged as *"Unidentified storefront"* rather than inventing names or false competitor counts.
- **Why It May Work & Main Risks**: Top 3 positive drivers and top 3 critical due diligence checks tailored to the chosen business profile.
- **Actionable Next Steps**: Pragmatic guidance on what to verify on the ground before committing capital.
- **Audit-Ready Technical Appendix**: Collapsible section for judges containing the full multi-source evidence ledger, 8-factor evaluation matrix, computer vision sensor telemetry, and 0–300m corridor reconciliation.
- **One-Click Export**: Print-ready, executive report formatting optimized for PDF generation.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 18, TypeScript 5.6, Vite 6 |
| **Styling & Design System** | Tailwind CSS 3.4, Vanilla CSS tokens, Lucide React icons, Spline 3D ambient runtime |
| **Geospatial & Mapping** | Leaflet 1.9, React-Leaflet, OpenStreetMap CartoDB Dark tiles |
| **Computer Vision & AI** | Tesseract.js 7.0 (multilingual neural OCR), TensorFlow.js 4.22, COCO-SSD MobileNet v2 |
| **Backend & Middleware** | Node.js HTTP middleware, Vite connect middleware, Vercel Serverless Functions (`@vercel/node`) |
| **External Providers** | Google Maps Platform (Places API Text Search & Nearby Search) with graceful fallback |

---

## 📐 Architecture & Data Flow

```
[User Input: Description / Pin / Photos / Video]
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ STAGE 01: Market Discovery                                  │
│ - Natural language profile interpretation                   │
│ - Candidate geocoding & spatial radii derivation            │
│ - Provider baseline fetch (/api/market-baseline)            │
└──────────────────────────────┬──────────────────────────────┘
                               │ Handoff Payload
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ STAGE 02: Ground Reality (Client-Side Edge AI)              │
│ - Multi-photo / video keyframe sampling & sharpness scoring │
│ - COCO-SSD object detection (pedestrians, vehicles, seating)│
│ - Multilingual Tesseract OCR (signboard recognition)        │
│ - Signboard crop & manual verification modal                │
│ - Corridor Fusion Engine (/api/street-scan/fuse or fallback)│
└──────────────────────────────┬──────────────────────────────┘
                               │ Fusion Response
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ STAGE 03: Location Intelligence & Scenario Simulator        │
│ - 8-Factor multi-source analytical synthesis                │
│ - Epistemic provenance tagging (DATABASE/OBSERVED/INFERRED) │
│ - Interactive scenario delta sensitivity stress testing     │
└──────────────────────────────┬──────────────────────────────┘
                               │ Comparison & Assumptions
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ STAGE 04: Executive Decision Report                         │
│ - Executive Decision Brief & transparent data-quality pill  │
│ - Relevant nearby businesses (Directory vs Observed)        │
│ - Top 3 drivers, top 3 risks, and capital action advice     │
│ - Collapsed technical audit ledger for judges               │
│ - Print / PDF export                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Installation & Execution

### Prerequisites
- Node.js 18.x or 20.x
- npm 9.x or later

### Quick Start (From Repository Root)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rraki11/Locus-AI.git
   cd Locus-AI
   ```

2. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   ```

3. **Configure Environment Variables (Optional):**
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   Add your Google Maps Platform API key (if evaluating live Google Places data):
   ```env
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```
   > **Note:** If no key is provided, LOCUS AI automatically operates in **Calibrated Demo Mode** using rich, geographically accurate Indian commercial corridor presets.

4. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

5. **Production Build & Verification:**
   ```bash
   npm run build
   ```
   This compiles TypeScript in project mode and builds the optimized bundle via Vite.

---

## 🌐 Deployment Instructions (Vercel)

LOCUS AI is designed for zero-config Vercel deployment:

1. Import the repository into Vercel.
2. In **Project Settings**:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Under **Environment Variables**, add:
   - `GOOGLE_MAPS_API_KEY` (optional, for live Places search)
4. Deploy! Vercel automatically routes `/api/market-baseline`, `/api/street-scan/fuse`, and `/api/location-intelligence/evaluate` as serverless functions and serves the Single-Page Application.

---

## 🔒 Security & Privacy Hygiene

- **API Keys Kept Server-Side**: The `GOOGLE_MAPS_API_KEY` is consumed solely by the Node/Vercel serverless middleware without the `VITE_` prefix, ensuring keys are never leaked to client bundles.
- **Client-Side Edge Vision**: Raw video frames and photographs are processed directly inside the user's browser via Canvas, Web Workers, and WebAssembly. Only lightweight bounding boxes, counts, and deduplicated text reads are submitted to the fusion endpoint.
- **Git Hygiene**: Environment files (`.env`, `.env.local`), local OCR language files, build artifacts (`dist/`), and caches are strictly excluded via `.gitignore`.

---

## ⚠️ Known Limitations & Boundaries

1. **Camera Field-of-View**: Street Scan reflects only the physical corridor and storefront angles captured in the uploaded photos or video (0–300m walking radius). It does not substitute for a regional market census across 2–5km.
2. **Signage Typography & Lighting**: Neural OCR transcription depends on camera resolution, lighting contrast, and font styling. Obscured or artistic signs are tagged as *Unidentified storefronts* and allow manual correction via the crop tool.
3. **Provider Directory Freshness**: Online directory listings (Google Places) reflect indexed registrations and may lag behind recent business openings or informal closures.
4. **Scenario Sensitivity**: Projections in the Scenario Simulator represent deterministic factor sensitivity analysis, not guaranteed financial returns or revenue forecasts.

---

## 🎬 Recommended 3-Minute Live Demo Walkthrough

| Step | Time | What to Show |
|---|---|---|
| **1. Introduction & Profile** | 0:00–0:35 | Start at `/market-discovery`. Enter *"Artisanal Specialty Coffee & Roastery"* targeting youth with a moderate budget. Select **Jubilee Hills, Hyderabad**. Show the 0–300m, 300m–2km, and 2–5km rings. |
| **2. Ground Reality & Street Scan** | 0:35–1:20 | Click **Continue to Ground Reality**. Switch to Photo Batch (or Calibrated Demo). Highlight the **English + Telugu** OCR engine. Show frame extraction, object detection, and signboard reading. Demonstrate the **Signboard Crop & Refine Modal**. |
| **3. Evidence Fusion & Epistemic Honesty** | 1:20–1:50 | Run Corridor Fusion. Show the reconciliation ledger: explain that observed storefronts reflect physical presence without falsely claiming confirmed competitor category match unless verified. |
| **4. Location Intelligence & Simulator** | 1:50–2:25 | Navigate to `/location-intelligence`. Show the 8-Factor Matrix. Adjust the **Rent Delta (+20%)** and **Competition (+2)** sliders to show instant reactive sensitivity and posture shift. |
| **5. Executive Decision Report** | 2:25–3:00 | Click **Continue to Decision Report**. Point out the reassuring **"Analysis Based on Available Information"** badge and **"Partially verified"** label. Review the **Relevant Nearby Businesses** section, Top 3 Drivers, Top 3 Risks, and Recommended Capital Action. Expand the collapsed **Technical Evidence** accordion to show the audit ledger. Click **Export Report** to demonstrate print/PDF readiness. |
