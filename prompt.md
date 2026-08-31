# Agentic AI Build Prompt — FactoryOS

Copy everything below the line into Claude Code (or another agentic coding tool) as the first message to kick off the build. It's self-contained — the agent doesn't need the companion system-design doc to start working, though you can attach it too for extra context.

**v2 — full scope.** Covers Sell, Buy, Inventory (materials/BOM/fabric-estimate/packing/costing/import), Make (production jobs, batches, move/receive, write-offs, QR), Agents (WhatsApp + Voice), and Reports/Insights — not just billing and a basic production board.

---

You are building **FactoryOS**, a production-grade, integrated web app for a small textile/garment factory that replaces the owner's mix of WhatsApp groups, Excel sheets, and paper notebooks. It covers the full operation — sales/billing, purchasing, inventory with bill-of-materials, and floor production tracking — as **one app**, one codebase, one login system, different views per role. Do not build these as separate apps that happen to share a login.

### Non-negotiable requirements
1. **Real-time, no manual refresh.** When any user writes data (a floor operator marks a stage complete, an accountant records a payment), every other logged-in user whose screen shows that data must see it update live via a push subscription — never polling, never "pull to refresh" as the only mechanism.
2. **Role-based access enforced in the database**, not just hidden in the UI. Roles: `owner`, `accountant`, `purchase`, `supervisor`, `operator`, `inventory_manager`.
3. **GST-correct financial data.** Tax math (CGST/SGST/IGST) is computed server-side and stored, never trusted from client input. Sale-order→invoice conversion, purchase-bill posting, stock deduction/consumption, and payment recording must each be atomic (all-or-nothing) transactions.
4. **Piece-level traceability on the floor.** Every batch's quantity must always reconcile: pieces on-hand at its current stage + pieces written off (defects/loss) + pieces already moved further ahead = the batch's original quantity. Never let a stage's "current quantity" be a manually-edited number that can silently drift.
5. Installable **PWA**, mobile-first for floor operators (QR scanning from a phone camera, and voice input as an alternative to typing), desktop-friendly for the owner/accountant/purchase dashboards.

### Mandated stack
- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query
- **Backend/DB:** Supabase — Postgres (with Row Level Security), Supabase Realtime, Supabase Auth (phone/OTP), Supabase Storage, Edge Functions
- **QR:** `qrcode` for generation, `html5-qrcode` for in-browser scanning
- **WhatsApp:** WhatsApp Cloud API (Meta Business), invoked from an Edge Function triggered by a Postgres trigger — do not build this as a client-side call
- **Voice Agent:** Web Speech API (or hosted STT) for transcription → an LLM with tool/function-calling (e.g. Claude via the Messages API) to turn the transcript into a structured action → that structured action is executed through the *same* server-side write functions used by the typed UI, so it passes through the same RLS checks. Voice is an input channel, never a privilege bypass.
- **PDF generation:** server-side (Edge Function using `@react-pdf/renderer` or Puppeteer), output stored in Supabase Storage
- Do not substitute Firebase/Firestore or a different ORM/framework without flagging it to me first and explaining the tradeoff — the relational/transactional requirement in point 3 above is the reason Postgres was chosen.

### Core data model
Implement this schema (adjust only if you find a concrete correctness issue — tell me what and why):

**Sell**
- `parties` (id, name, type[customer/vendor/both], phone, gstin, address, balance, created_at)
- `units`, `categories`
- `products` (id, name, sku, category_id, unit_id, sale_price, hsn_code, gst_percent, stock_qty, low_stock_threshold)
- `services` (id, name, rate, hsn_code, gst_percent)
- `sale_orders` (id, number, party_id, date, status[draft/invoiced], notes, created_by)
- `sale_order_items` (id, sale_order_id, product_id, description, hsn_code, qty, price, gst_percent)
- `invoices` (id, number, sale_order_id, party_id, date, status[draft/sent], payment_status[unpaid/partial/paid], sale_type[credit/cash], taxable_amount, cgst, sgst, igst, total, pdf_url)
- `payments_in` (id, invoice_id, party_id, mode[cash/upi/bank/cheque], amount, date, recorded_by)

**Buy** (mirrors Sell)
- `purchase_orders` (id, number, party_id, date, status[draft/billed], created_by)
- `purchase_order_items` (id, purchase_order_id, material_id, qty, price, gst_percent)
- `purchase_bills` (id, number, purchase_order_id, party_id, date, taxable_amount, cgst, sgst, igst, total, payment_status)
- `payments_out` (id, purchase_bill_id, party_id, mode, amount, date, recorded_by)

**Inventory**
- `materials` (id, name, lot_no, category_id, unit_id, cost_per_unit, qty_on_hand, low_stock_threshold)
- `boms` (id, product_id, name) — the recipe for a product
- `bom_lines` (id, bom_id, material_id, qty_per_unit)
- `fabric_estimates` (id, bom_id, requested_qty, result jsonb, requested_by, created_at) — logged estimate runs, auditable
- `packing_lists` (id, invoice_id, production_job_id, status[draft/dispatched])
- `packing_list_items` (id, packing_list_id, product_id, carton_no, qty)
- `inventory_ledger` (id, item_type[material/product], item_id, change_qty, reason, ref_table, ref_id, created_at) — single source of truth for every stock movement, never overwrite a quantity directly
- `import_jobs` (id, entity_type, file_url, status, row_count, error_log jsonb, created_by) — bulk CSV/Excel import with a visible per-row error log
- Costing is a **computed view**, not a stored table: landed cost per piece = (Σ bom_lines.qty_per_unit × materials.cost_per_unit) + labor rate per stage × time in stage + overhead %. Recompute on read so it's never stale.

**Make** (production/floor — the module needing the most care)
- `production_jobs` (id, number, party_id nullable, status[open/completed/cancelled], created_by) — "Make IQ": party_id null = internal production with no buyer yet
- `production_batches` (id, batch_no, production_job_id nullable, product_id, style, colour, current_stage, qr_code_url, created_by) — a physical trolley; nullable job link = "Direct — no Make IQ job"
- `batch_size_lines` (id, batch_id, colour, size, qty) — a trolley mixes sizes
- `batch_stage_transfers` (id, batch_id, from_stage, to_stage, is_outside_vendor, vendor_id nullable, sent_qty, received_qty nullable, status[awaiting_receive/received], sent_by, sent_at, received_by, received_at) — Move and Receive are two separate writes, not one status flip
- `batch_write_offs` (id, batch_id, stage, qty, reason, recorded_by, recorded_at)
- Stage enum: `cutting, stitching, washing, qc, packing, dispatch`

**Agents**
- `whatsapp_log` (id, recipient_phone, message, ref_table, ref_id, status, sent_at)
- `voice_commands_log` (id, user_id, transcript, parsed_intent jsonb, action_taken, status[pending/executed/needs_review/failed], created_at)

Add a `factory_id` column to every business table even though there's only one factory today — I want the option to add a second location later without a schema migration.

### Flows to get exactly right
1. **Sale order → invoice** (one atomic DB transaction): insert invoice + line items → mark sale order `invoiced` → insert `inventory_ledger` rows decrementing finished-goods stock. All-or-nothing.
2. **Move → Receive** (the core floor loop, NOT a single status update): sending stage inserts a `batch_stage_transfers` row with `status='awaiting_receive'` and `sent_qty`; the receiving stage later confirms with `received_qty`, flipping `status='received'` and advancing `production_batches.current_stage`. If `sent_qty ≠ received_qty`, that variance must be visible on the dashboard immediately, not just logged silently. Outsourced hops (`is_outside_vendor=true`) follow the identical flow with a `vendor_id`.
3. **Write-off:** inserting into `batch_write_offs` must reduce what's expected to arrive at the next stage — the reconciliation math (on-hand + written-off + moved-ahead = original qty) has to hold after every write-off, every time.
4. **Voice command:** transcript → LLM function-call → structured intent → executed via the *same* server function as the equivalent typed action, subject to the *same* RLS policy for that user's role. Low-confidence or ambiguous parses go to `needs_review`, not a best-guess write.
5. **Purchase bill posting:** insert `purchase_bills` row → insert `inventory_ledger` rows incrementing `materials.qty_on_hand`. Atomic, same pattern as flow #1.

### Role permission rules to enforce via RLS
- `owner`: full read/write everywhere
- `accountant`: full read/write on parties, items, sale orders, invoices, payments-in; read-only elsewhere
- `purchase`: full read/write on purchase orders/bills/payments-out and materials stock-in; read-only elsewhere
- `supervisor`: full read/write on production jobs, batches, stage transfers, write-offs; read-only on billing/purchasing
- `operator`: can only write `batch_stage_transfers` rows where the stage matches their assigned department (as a sender or receiver), and only read batches relevant to their queue
- `inventory_manager`: full read/write on materials, BOM, packing; read-only elsewhere

### Build order — work in this sequence, don't jump ahead
1. Project scaffold: Next.js + Supabase project, auth (phone/OTP), role-based routing/middleware
2. **Sell** end-to-end: Parties → Items (Products/Services/Categories/Units) → Sale Orders → Invoice conversion (correct GST math + PDF) → Payment-In, all with live Realtime updates across simultaneously open sessions
3. **Make (core):** production jobs, batches with size lines, Move/Receive with reconciliation, write-offs, QR generation + scanning + printable job card, board/list views, delay alerts
4. **Inventory + Buy:** materials, BOM, fabric estimate, purchase orders/bills/payment-out, inventory ledger wired to both batch consumption and dispatch
5. **Agents:** WhatsApp notifications first, then Voice Agent (build this against the Move/Receive/Write-off functions from step 3 — don't build voice parsing before those write paths exist)
6. **Costing, packing, import, reports/insights** — mostly computed/read-only, naturally last

### What I need from you as you go
- After scaffolding, show me the Supabase migration files and RLS policies before wiring up UI, so I can sanity-check permissions early.
- Stop and ask me only if something is genuinely blocking (e.g. you need my actual WhatsApp Business API credentials, a real GSTIN/tax rule, or which LLM provider/key to use for the Voice Agent) — otherwise make a reasonable default choice, note the assumption, and keep going.
- At the end of each numbered phase, give me a definition-of-done checklist and a way to test it locally (or a deployed preview) before moving to the next phase.
- This is a multi-month scope end to end — say so if I ask for something that would visibly break the sequencing above (e.g. building Costing before Make's reconciliation is solid), rather than quietly complying.
