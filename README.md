# FactoryOS — Integrated Textile & Garment ERP

> **Modern Textile & Garment Manufacturing Floor ERP, Production Tracking, GST Billing, BOM Inventory & Real-Time Sync.**

---

## 🚀 Key Modules & Capabilities

### 1. Sell Module (Sales & Tax Invoices)
- **Parties & Customers:** Buyer directory with GSTIN validation and automatic State Code determination (Intra-state vs Inter-state).
- **Products Catalog:** Garment SKUs, HSN codes, GST %, and real-time finished goods inventory.
- **Sale Orders:** Purchase orders with 1-Click atomic conversion to GST Invoices.
- **GST Invoices:** Auto CGST/SGST/IGST tax calculation, downloadable jsPDF Tax Invoices, payment recording, and automated WhatsApp invoice triggers.
- **Payments-In Ledger:** Customer receipts entry with balance tracking.

### 2. Make Module (Production Floor & Traceability)
- **Floor Batches & Trolleys:** Piece-level tracking across sizes (`S`, `M`, `L`, `XL`), physical QR Traveler Cards, and defect scrap logs.
- **Strict 2-Step Handoff Loop:** `Move` initiates transfer in `awaiting_receive` state; `Receive` at destination confirms counted pieces and automatically logs any variance/transit loss.
- **Make IQ Jobs:** Internal stock runs and client contract manufacturing job orders.
- **Visual Floor Kanban:** Live pipeline tracking across all 6 departments: `Cutting`, `Stitching`, `Washing`, `QC`, `Packing`, `Dispatch`.

### 3. Inventory & Buy Module
- **Raw Materials & Trims:** Fabrics (meters), sewing threads (cones), polybags, care labels with lot tracking and reorder warnings.
- **BOM Recipes:** Bill of Materials calculating fabric consumption, labor costs, and overhead percentages.
- **Fabric Estimator:** Simulation engine computing exact fabric yardage and trims needed for any requested garment run.
- **Single Source of Truth Ledger:** Immutable double-entry inventory ledger for all stock inward/outward events.
- **Buy Procurement:** Supplier Purchase Orders, atomic Purchase Bill goods receipt, and Payments-Out.

### 4. Agents & Automation
- **WhatsApp Cloud API Hub:** Meta Graph API v19.0 notification engine for invoice dispatches and order alerts.
- **Floor Voice Assistant:** Web Speech natural language voice input in Hindi & English (e.g. *"Move batch 2601 to washing 248 pieces"*).

### 5. Costing & Reports
- **Live Landed Costing:** Real-time piece costing formula: $(\sum \text{BOM}) + \text{Labor} + \text{Overhead } \%$.
- **Packing Lists:** Carton breakdowns by sizes and dispatch slips.
- **Bulk CSV Importer:** Excel/CSV importer with row-by-row validation error table.
- **Mobile PWA Suite:** 1-Click installable mobile app with camera QR scanning.

---

## 👥 Factory Team Roles

| Member | Role | Capabilities |
| :--- | :--- | :--- |
| **Mudit Singhi** | `owner` | Full Administrative & Financial Master Access across all modules |
| **Uday Da** | `master` | Masterji & Production Lead (Batches, Jobs, BOM, Materials, Floor Kanban) |
| **Prem** | `helper` | Floor Operator (QR Code Scanner, Stage Move & Receive, Voice Assistant) |

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14+ (App Router, Turbopack, React 19)
- **Styling:** Tailwind CSS & Lucide Icons
- **Database:** Supabase PostgreSQL with Row Level Security (RLS) & Atomic RPCs
- **Realtime:** Supabase WebSockets & BroadcastChannel cross-device synchronization
- **PDF & QR Engine:** `jspdf`, `jspdf-autotable`, `qrcode`, `html5-qrcode`

---

## 📦 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/UDITCODE-LC4388/FACTORY.git
cd FACTORY
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Database Migrations
Copy the contents of [`supabase/SCHEMA_MIGRATION_CONSOLIDATED.sql`](supabase/SCHEMA_MIGRATION_CONSOLIDATED.sql) into your **Supabase SQL Editor** and click **RUN**.

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) (or open on your phone via [http://localhost:3000/download](http://localhost:3000/download)).
