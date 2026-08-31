# Agentic Build Prompt — Road Challan (Job-Work Delivery Challan) Feature

Paste this into your coding agent (Claude Code, etc.) inside the Factory OS repo.

---

## Objective
Add a **Road Challan** module to Factory OS: a digital job-work delivery challan used when garment lots are sent out to a job worker (e.g. for cutting/stitching) and reconciled when they return. Must support create, print/PDF export, and outbound→inbound reconciliation.

## Context
Factory OS is Udit's existing factory management solution. This feature is derived from a physical challan format currently used on paper (see field list below), extracted from a hand-drawn wireframe.

## Fields to implement

**Header**
- `companyName` (string, from tenant/org profile — e.g. "Manisha Garments")
- `challanDate` (date, defaults to today)
- `companyDetails`: `gstNumber`, `address`, `phoneNumber`
- `photo` (image upload/capture — attach a photo of the lot/goods being dispatched)

**Job worker**
- `jobWorkerName` (string, ideally a lookup against a `JobWorker` entity so history can be tracked per worker)
- `jobWorkerAddress` (string)

**Dispatch (outbound) line items — repeatable table**
- `lotNo` (string/identifier)
- `size` (enum/config — sketch shows 22, 24, 26, 28; must be admin-configurable, not hardcoded, since sizes vary by article type)
- `quantity` (integer, per size)
- `color` (string)
- `article` (string — the garment/style code)
- One challan can have multiple lot rows, each row can have multiple size×quantity pairs (size-quantity should be a nested sub-table per lot, not flat columns, so it scales past 4 sizes)

**Return (inbound/"After completion") reconciliation**
- Same size breakdown (22/24/26/28 or configured set) capturing quantity **returned** per size, per lot
- Computed field: `shortage/excess = dispatchedQty - returnedQty` per size — surface this, since that's the real business value of a before/after table
- `completionDate` (when goods came back)
- `stampImage` / `signatureImage` (capture on return — draw-to-sign or photo-of-stamp)
- `status`: `dispatched` → `partially_returned` → `completed`

## Data model (suggested)
```
Challan {
  id, orgId, challanDate, photoUrl,
  jobWorkerId -> JobWorker,
  status: enum(dispatched, partially_returned, completed),
  createdAt, updatedAt
}

ChallanLot {
  id, challanId -> Challan,
  lotNo, article, color
}

ChallanSizeLine {
  id, lotId -> ChallanLot,
  size, dispatchedQty, returnedQty (nullable until return),
}

JobWorker {
  id, orgId, name, address, phone
}
```

## UI requirements
1. **Create Challan** screen — header fields + dynamic lot/size table (add/remove rows), photo capture, GST/address auto-filled from org settings.
2. **Challan detail/list view** — filter by job worker, status, date range.
3. **Return/reconciliation screen** — pre-fills dispatched quantities, lets user enter returned quantities per size, shows shortage/excess delta live, captures signature + stamp, sets status to `completed`.
4. **Print/PDF export** — must visually resemble a traditional printed challan (company header, GST box, job worker block, size table, signature/stamp line at bottom) since this replaces a paper form used with vendors.

## Business rules
- Quantity fields are non-negative integers only.
- A challan cannot be marked `completed` until every size line across every lot has a `returnedQty` entered (even if 0).
- Shortage beyond a configurable tolerance should flag the challan visually (e.g. red badge) for follow-up.
- Size list should be an org-level configurable list, not hardcoded to 22/24/26/28.

## Acceptance criteria
- [ ] Can create a challan with company details auto-populated, job worker selected/created, one or more lots each with size-wise quantities, and a photo attached
- [ ] Can print/export the challan as a PDF matching the traditional paper layout
- [ ] Can reconcile a dispatched challan by entering returned quantities per size, with shortage/excess auto-computed
- [ ] Can capture signature and stamp on completion
- [ ] Challan list is filterable by job worker and status
- [ ] All size configs are editable from settings, not hardcoded

## Out of scope (flag if requested later)
- GST e-way bill / government challan compliance integration
- Multi-currency or export-related fields
