-- ============================================================================
-- FactoryOS Database Schema Migration
-- Complete 30+ tables with Multi-tenant factory_id, Enums, Views & Atomic RPCs
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
CREATE TYPE user_role AS ENUM (
    'owner',
    'master',
    'helper',
    'accountant',
    'purchase',
    'supervisor',
    'operator',
    'inventory_manager'
);

CREATE TYPE factory_stage AS ENUM (
    'cutting',
    'stitching',
    'ironing',
    'qc',
    'packing',
    'dispatch'
);

CREATE TYPE party_type AS ENUM (
    'customer',
    'vendor',
    'both'
);

CREATE TYPE order_status AS ENUM (
    'draft',
    'invoiced'
);

CREATE TYPE invoice_status AS ENUM (
    'draft',
    'sent'
);

CREATE TYPE payment_status AS ENUM (
    'unpaid',
    'partial',
    'paid'
);

CREATE TYPE sale_type AS ENUM (
    'credit',
    'cash'
);

CREATE TYPE payment_mode AS ENUM (
    'cash',
    'upi',
    'bank',
    'cheque'
);

CREATE TYPE purchase_status AS ENUM (
    'draft',
    'billed'
);

CREATE TYPE job_status AS ENUM (
    'open',
    'completed',
    'cancelled'
);

CREATE TYPE transfer_status AS ENUM (
    'awaiting_receive',
    'received'
);

CREATE TYPE voice_cmd_status AS ENUM (
    'pending',
    'executed',
    'needs_review',
    'failed'
);

CREATE TYPE import_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);

-- 2. CORE FACTORY & PROFILE TABLES
CREATE TABLE IF NOT EXISTS factories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    gstin TEXT,
    state TEXT NOT NULL DEFAULT 'Maharashtra',
    state_code TEXT NOT NULL DEFAULT '27',
    address TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'operator',
    assigned_department factory_stage,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SELL MODULE TABLES
CREATE TABLE IF NOT EXISTS parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type party_type NOT NULL DEFAULT 'customer',
    phone TEXT,
    gstin TEXT,
    state TEXT NOT NULL DEFAULT 'Maharashtra',
    state_code TEXT NOT NULL DEFAULT '27',
    address TEXT,
    balance NUMERIC NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'product', -- 'product' or 'material'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    sale_price NUMERIC NOT NULL DEFAULT 0.00,
    hsn_code TEXT NOT NULL DEFAULT '61091000',
    gst_percent NUMERIC NOT NULL DEFAULT 5.00,
    stock_qty NUMERIC NOT NULL DEFAULT 0,
    low_stock_threshold NUMERIC NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(factory_id, sku)
);

CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rate NUMERIC NOT NULL DEFAULT 0.00,
    hsn_code TEXT NOT NULL DEFAULT '998821',
    gst_percent NUMERIC NOT NULL DEFAULT 18.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    number TEXT NOT NULL,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status order_status NOT NULL DEFAULT 'draft',
    notes TEXT,
    total_amount NUMERIC NOT NULL DEFAULT 0.00,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(factory_id, number)
);

CREATE TABLE IF NOT EXISTS sale_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    sale_order_id UUID NOT NULL REFERENCES sale_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    hsn_code TEXT NOT NULL,
    qty NUMERIC NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL DEFAULT 0.00,
    gst_percent NUMERIC NOT NULL DEFAULT 5.00
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    number TEXT NOT NULL,
    sale_order_id UUID REFERENCES sale_orders(id) ON DELETE SET NULL,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status invoice_status NOT NULL DEFAULT 'sent',
    payment_status payment_status NOT NULL DEFAULT 'unpaid',
    sale_type sale_type NOT NULL DEFAULT 'credit',
    taxable_amount NUMERIC NOT NULL DEFAULT 0.00,
    cgst NUMERIC NOT NULL DEFAULT 0.00,
    sgst NUMERIC NOT NULL DEFAULT 0.00,
    igst NUMERIC NOT NULL DEFAULT 0.00,
    total NUMERIC NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC NOT NULL DEFAULT 0.00,
    pdf_url TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(factory_id, number)
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    hsn_code TEXT NOT NULL,
    qty NUMERIC NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL DEFAULT 0.00,
    gst_percent NUMERIC NOT NULL DEFAULT 5.00,
    taxable_value NUMERIC NOT NULL DEFAULT 0.00,
    cgst NUMERIC NOT NULL DEFAULT 0.00,
    sgst NUMERIC NOT NULL DEFAULT 0.00,
    igst NUMERIC NOT NULL DEFAULT 0.00,
    total NUMERIC NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS payments_in (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
    mode payment_mode NOT NULL DEFAULT 'upi',
    amount NUMERIC NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_no TEXT,
    notes TEXT,
    recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. BUY MODULE TABLES
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    number TEXT NOT NULL,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status purchase_status NOT NULL DEFAULT 'draft',
    total_amount NUMERIC NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(factory_id, number)
);

CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    lot_no TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    cost_per_unit NUMERIC NOT NULL DEFAULT 0.00,
    qty_on_hand NUMERIC NOT NULL DEFAULT 0.00,
    low_stock_threshold NUMERIC NOT NULL DEFAULT 20.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    qty NUMERIC NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL DEFAULT 0.00,
    gst_percent NUMERIC NOT NULL DEFAULT 5.00
);

CREATE TABLE IF NOT EXISTS purchase_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    number TEXT NOT NULL,
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    taxable_amount NUMERIC NOT NULL DEFAULT 0.00,
    cgst NUMERIC NOT NULL DEFAULT 0.00,
    sgst NUMERIC NOT NULL DEFAULT 0.00,
    igst NUMERIC NOT NULL DEFAULT 0.00,
    total NUMERIC NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC NOT NULL DEFAULT 0.00,
    payment_status payment_status NOT NULL DEFAULT 'unpaid',
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(factory_id, number)
);

CREATE TABLE IF NOT EXISTS purchase_bill_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    purchase_bill_id UUID NOT NULL REFERENCES purchase_bills(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    qty NUMERIC NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL DEFAULT 0.00,
    gst_percent NUMERIC NOT NULL DEFAULT 5.00,
    taxable_value NUMERIC NOT NULL DEFAULT 0.00,
    cgst NUMERIC NOT NULL DEFAULT 0.00,
    sgst NUMERIC NOT NULL DEFAULT 0.00,
    igst NUMERIC NOT NULL DEFAULT 0.00,
    total NUMERIC NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS payments_out (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    purchase_bill_id UUID REFERENCES purchase_bills(id) ON DELETE SET NULL,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
    mode payment_mode NOT NULL DEFAULT 'bank',
    amount NUMERIC NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_no TEXT,
    notes TEXT,
    recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. INVENTORY & BOM MODULE
CREATE TABLE IF NOT EXISTS boms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    labor_cost_per_unit NUMERIC NOT NULL DEFAULT 25.00,
    overhead_percent NUMERIC NOT NULL DEFAULT 10.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bom_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    bom_id UUID NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    qty_per_unit NUMERIC NOT NULL DEFAULT 1.0,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS fabric_estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    bom_id UUID NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
    requested_qty NUMERIC NOT NULL,
    result JSONB NOT NULL,
    requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS packing_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    number TEXT NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    production_job_id UUID,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'dispatched'
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(factory_id, number)
);

CREATE TABLE IF NOT EXISTS packing_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    packing_list_id UUID NOT NULL REFERENCES packing_lists(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    carton_no TEXT NOT NULL DEFAULT 'Carton-1',
    size TEXT,
    colour TEXT,
    qty NUMERIC NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS inventory_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('material', 'product')),
    item_id UUID NOT NULL,
    change_qty NUMERIC NOT NULL, -- positive for addition, negative for deduction
    reason TEXT NOT NULL,
    ref_table TEXT,
    ref_id UUID,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- 'parties', 'materials', 'products'
    file_url TEXT,
    status import_status NOT NULL DEFAULT 'pending',
    row_count INTEGER NOT NULL DEFAULT 0,
    error_log JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. MAKE (PRODUCTION / FLOOR) MODULE
CREATE TABLE IF NOT EXISTS production_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    number TEXT NOT NULL,
    party_id UUID REFERENCES parties(id) ON DELETE SET NULL, -- nullable = internal production ("Make IQ")
    target_qty NUMERIC NOT NULL DEFAULT 0,
    status job_status NOT NULL DEFAULT 'open',
    due_date DATE,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(factory_id, number)
);

CREATE TABLE IF NOT EXISTS production_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    batch_no TEXT NOT NULL,
    production_job_id UUID REFERENCES production_jobs(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    style TEXT NOT NULL DEFAULT 'Standard',
    colour TEXT NOT NULL DEFAULT 'Navy',
    current_stage factory_stage NOT NULL DEFAULT 'cutting',
    initial_qty NUMERIC NOT NULL DEFAULT 0,
    current_qty NUMERIC NOT NULL DEFAULT 0,
    qr_code_url TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(factory_id, batch_no)
);

CREATE TABLE IF NOT EXISTS batch_size_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
    colour TEXT NOT NULL DEFAULT 'Navy',
    size TEXT NOT NULL DEFAULT 'M',
    qty NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS batch_stage_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
    from_stage factory_stage NOT NULL,
    to_stage factory_stage NOT NULL,
    is_outside_vendor BOOLEAN NOT NULL DEFAULT FALSE,
    vendor_id UUID REFERENCES parties(id) ON DELETE SET NULL,
    sent_qty NUMERIC NOT NULL,
    received_qty NUMERIC,
    status transfer_status NOT NULL DEFAULT 'awaiting_receive',
    sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    received_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    received_at TIMESTAMPTZ,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS batch_write_offs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
    stage factory_stage NOT NULL,
    qty NUMERIC NOT NULL,
    reason TEXT NOT NULL,
    recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6.1 ROAD CHALLANS & OUTSIDE JOB WORK
CREATE TABLE IF NOT EXISTS job_workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    process_type TEXT NOT NULL DEFAULT 'making',
    default_rate NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS road_challans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    challan_no TEXT NOT NULL,
    challan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    job_worker_id UUID NOT NULL REFERENCES job_workers(id) ON DELETE CASCADE,
    process_type TEXT NOT NULL DEFAULT 'making',
    status TEXT NOT NULL DEFAULT 'dispatched',
    photo_url TEXT,
    notes TEXT,
    completion_date DATE,
    stamp_image TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS road_challan_lots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    challan_id UUID NOT NULL REFERENCES road_challans(id) ON DELETE CASCADE,
    lot_no TEXT NOT NULL,
    article TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'Standard',
    rate_per_pc NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS road_challan_size_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lot_id UUID NOT NULL REFERENCES road_challan_lots(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    dispatched_qty NUMERIC NOT NULL DEFAULT 0,
    returned_qty NUMERIC,
    shortage_qty NUMERIC
);

CREATE TABLE IF NOT EXISTS outside_job_works (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    challan_id UUID REFERENCES road_challans(id) ON DELETE SET NULL,
    vendor_name TEXT NOT NULL,
    phone TEXT,
    process TEXT NOT NULL DEFAULT 'making',
    batch_no TEXT NOT NULL,
    article TEXT NOT NULL,
    pieces_sent NUMERIC NOT NULL DEFAULT 0,
    pieces_returned NUMERIC NOT NULL DEFAULT 0,
    rate_per_piece NUMERIC NOT NULL DEFAULT 0,
    total_approx_cost NUMERIC NOT NULL DEFAULT 0,
    dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_return_date DATE,
    actual_return_date DATE,
    status TEXT NOT NULL DEFAULT 'sent',
    variance NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. AGENTS MODULE
CREATE TABLE IF NOT EXISTS whatsapp_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    recipient_phone TEXT NOT NULL,
    recipient_name TEXT,
    message TEXT NOT NULL,
    ref_table TEXT,
    ref_id UUID,
    status TEXT NOT NULL DEFAULT 'sent', -- 'queued', 'sent', 'failed', 'delivered'
    response_payload JSONB,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voice_commands_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    transcript TEXT NOT NULL,
    parsed_intent JSONB,
    action_taken TEXT,
    status voice_cmd_status NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. COMPUTED VIEWS

-- Live Costing View
CREATE OR REPLACE VIEW view_product_costing AS
SELECT 
    p.id AS product_id,
    p.factory_id,
    p.name AS product_name,
    p.sku,
    b.id AS bom_id,
    COALESCE(SUM(bl.qty_per_unit * m.cost_per_unit), 0) AS raw_material_cost,
    COALESCE(b.labor_cost_per_unit, 25.00) AS labor_cost,
    COALESCE(b.overhead_percent, 10.00) AS overhead_percent,
    (COALESCE(SUM(bl.qty_per_unit * m.cost_per_unit), 0) + COALESCE(b.labor_cost_per_unit, 25.00)) * (1 + COALESCE(b.overhead_percent, 10.00) / 100.0) AS landed_cost_per_piece,
    p.sale_price,
    p.sale_price - ((COALESCE(SUM(bl.qty_per_unit * m.cost_per_unit), 0) + COALESCE(b.labor_cost_per_unit, 25.00)) * (1 + COALESCE(b.overhead_percent, 10.00) / 100.0)) AS gross_margin_per_piece
FROM products p
LEFT JOIN boms b ON b.product_id = p.id AND b.is_active = TRUE
LEFT JOIN bom_lines bl ON bl.bom_id = b.id
LEFT JOIN materials m ON m.id = bl.material_id
GROUP BY p.id, p.factory_id, p.name, p.sku, b.id, b.labor_cost_per_unit, b.overhead_percent, p.sale_price;

-- Batch Reconciliation Summary View
CREATE OR REPLACE VIEW view_batch_reconciliation AS
SELECT 
    pb.id AS batch_id,
    pb.factory_id,
    pb.batch_no,
    pb.product_id,
    pb.current_stage,
    pb.initial_qty AS original_qty,
    pb.current_qty AS on_hand_qty,
    COALESCE((SELECT SUM(qty) FROM batch_write_offs WHERE batch_id = pb.id), 0) AS total_written_off,
    COALESCE((SELECT SUM(sent_qty) FROM batch_stage_transfers WHERE batch_id = pb.id AND status = 'awaiting_receive'), 0) AS in_transit_qty,
    -- Reconciliation Check: original = on_hand + total_written_off + in_transit (if in transfer)
    (pb.initial_qty - (pb.current_qty + COALESCE((SELECT SUM(qty) FROM batch_write_offs WHERE batch_id = pb.id), 0) + COALESCE((SELECT SUM(sent_qty) FROM batch_stage_transfers WHERE batch_id = pb.id AND status = 'awaiting_receive'), 0))) AS variance_qty
FROM production_batches pb;

-- 9. ATOMIC STORED PROCEDURES (RPCs)

-- Flow 1: Sale Order -> Invoice Conversion (Atomic)
CREATE OR REPLACE FUNCTION rpc_convert_sale_order_to_invoice(
    p_sale_order_id UUID,
    p_sale_type sale_type DEFAULT 'credit',
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_party RECORD;
    v_factory RECORD;
    v_invoice_id UUID;
    v_invoice_number TEXT;
    v_taxable NUMERIC := 0;
    v_cgst NUMERIC := 0;
    v_sgst NUMERIC := 0;
    v_igst NUMERIC := 0;
    v_total NUMERIC := 0;
    v_item RECORD;
    v_item_taxable NUMERIC;
    v_item_cgst NUMERIC;
    v_item_sgst NUMERIC;
    v_item_igst NUMERIC;
    v_item_total NUMERIC;
    v_is_interstate BOOLEAN;
BEGIN
    -- 1. Fetch sale order
    SELECT * INTO v_order FROM sale_orders WHERE id = p_sale_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sale order not found';
    END IF;

    IF v_order.status = 'invoiced' THEN
        RAISE EXCEPTION 'Sale order is already invoiced';
    END IF;

    -- 2. Fetch party and factory for GST determination
    SELECT * INTO v_party FROM parties WHERE id = v_order.party_id;
    SELECT * INTO v_factory FROM factories WHERE id = v_order.factory_id;

    v_is_interstate := (v_party.state_code <> v_factory.state_code);
    v_invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(v_order.number FROM '[0-9]+$');
    IF v_invoice_number IS NULL OR v_invoice_number = 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' THEN
        v_invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
    END IF;

    -- 3. Calculate taxes and line items
    FOR v_item IN SELECT * FROM sale_order_items WHERE sale_order_id = p_sale_order_id LOOP
        v_item_taxable := ROUND(v_item.qty * v_item.price, 2);
        IF v_is_interstate THEN
            v_item_cgst := 0;
            v_item_sgst := 0;
            v_item_igst := ROUND(v_item_taxable * (v_item.gst_percent / 100.0), 2);
        ELSE
            v_item_cgst := ROUND(v_item_taxable * ((v_item.gst_percent / 2.0) / 100.0), 2);
            v_item_sgst := ROUND(v_item_taxable * ((v_item.gst_percent / 2.0) / 100.0), 2);
            v_item_igst := 0;
        END IF;
        v_item_total := v_item_taxable + v_item_cgst + v_item_sgst + v_item_igst;

        v_taxable := v_taxable + v_item_taxable;
        v_cgst := v_cgst + v_item_cgst;
        v_sgst := v_sgst + v_item_sgst;
        v_igst := v_igst + v_item_igst;
        v_total := v_total + v_item_total;
    END LOOP;

    -- 4. Insert invoice
    INSERT INTO invoices (
        factory_id, number, sale_order_id, party_id, date, status,
        payment_status, sale_type, taxable_amount, cgst, sgst, igst, total,
        created_by
    ) VALUES (
        v_order.factory_id, v_invoice_number, v_order.id, v_order.party_id, CURRENT_DATE, 'sent',
        'unpaid', p_sale_type, v_taxable, v_cgst, v_sgst, v_igst, v_total,
        v_order.created_by
    ) RETURNING id INTO v_invoice_id;

    -- 5. Insert invoice items & inventory ledger deductions
    FOR v_item IN SELECT * FROM sale_order_items WHERE sale_order_id = p_sale_order_id LOOP
        v_item_taxable := ROUND(v_item.qty * v_item.price, 2);
        IF v_is_interstate THEN
            v_item_cgst := 0;
            v_item_sgst := 0;
            v_item_igst := ROUND(v_item_taxable * (v_item.gst_percent / 100.0), 2);
        ELSE
            v_item_cgst := ROUND(v_item_taxable * ((v_item.gst_percent / 2.0) / 100.0), 2);
            v_item_sgst := ROUND(v_item_taxable * ((v_item.gst_percent / 2.0) / 100.0), 2);
            v_item_igst := 0;
        END IF;
        v_item_total := v_item_taxable + v_item_cgst + v_item_sgst + v_item_igst;

        INSERT INTO invoice_items (
            factory_id, invoice_id, product_id, description, hsn_code,
            qty, price, gst_percent, taxable_value, cgst, sgst, igst, total
        ) VALUES (
            v_order.factory_id, v_invoice_id, v_item.product_id, v_item.description, v_item.hsn_code,
            v_item.qty, v_item.price, v_item.gst_percent, v_item_taxable, v_item_cgst, v_item_sgst, v_item_igst, v_item_total
        );

        -- Decrement finished goods inventory ledger if product_id is linked
        IF v_item.product_id IS NOT NULL THEN
            INSERT INTO inventory_ledger (
                factory_id, item_type, item_id, change_qty, reason, ref_table, ref_id, created_by
            ) VALUES (
                v_order.factory_id, 'product', v_item.product_id, -v_item.qty, 'Sale Invoice Dispatch', 'invoices', v_invoice_id, v_order.created_by
            );

            UPDATE products 
            SET stock_qty = stock_qty - v_item.qty
            WHERE id = v_item.product_id;
        END IF;
    END LOOP;

    -- 6. Update sale order status to invoiced
    UPDATE sale_orders SET status = 'invoiced' WHERE id = p_sale_order_id;

    -- 7. Update party balance (receivable)
    UPDATE parties SET balance = balance + v_total WHERE id = v_order.party_id;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_number,
        'total', v_total
    );
END;
$$;

-- Flow 2: Move Batch Stage (Initiates Transfer)
CREATE OR REPLACE FUNCTION rpc_move_batch_stage(
    p_batch_id UUID,
    p_to_stage factory_stage,
    p_sent_qty NUMERIC,
    p_is_outside_vendor BOOLEAN DEFAULT FALSE,
    p_vendor_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch RECORD;
    v_transfer_id UUID;
BEGIN
    SELECT * INTO v_batch FROM production_batches WHERE id = p_batch_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Batch not found';
    END IF;

    IF p_sent_qty <= 0 OR p_sent_qty > v_batch.current_qty THEN
        RAISE EXCEPTION 'Invalid sent quantity. Available on hand: %', v_batch.current_qty;
    END IF;

    -- Create transfer row awaiting receive
    INSERT INTO batch_stage_transfers (
        factory_id, batch_id, from_stage, to_stage, is_outside_vendor, vendor_id,
        sent_qty, status, sent_by, sent_at, notes
    ) VALUES (
        v_batch.factory_id, v_batch.id, v_batch.current_stage, p_to_stage, p_is_outside_vendor, p_vendor_id,
        p_sent_qty, 'awaiting_receive', auth.uid(), NOW(), p_notes
    ) RETURNING id INTO v_transfer_id;

    -- Reduce on-hand at current stage while in transit
    UPDATE production_batches
    SET current_qty = current_qty - p_sent_qty
    WHERE id = p_batch_id;

    RETURN jsonb_build_object(
        'success', true,
        'transfer_id', v_transfer_id,
        'sent_qty', p_sent_qty,
        'from_stage', v_batch.current_stage,
        'to_stage', p_to_stage
    );
END;
$$;

-- Flow 3: Receive Batch Stage (Completes Transfer with Variance & Stage Advance)
CREATE OR REPLACE FUNCTION rpc_receive_batch_stage(
    p_transfer_id UUID,
    p_received_qty NUMERIC,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transfer RECORD;
    v_batch RECORD;
    v_variance NUMERIC;
BEGIN
    SELECT * INTO v_transfer FROM batch_stage_transfers WHERE id = p_transfer_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer record not found';
    END IF;

    IF v_transfer.status = 'received' THEN
        RAISE EXCEPTION 'Transfer already received';
    END IF;

    SELECT * INTO v_batch FROM production_batches WHERE id = v_transfer.batch_id;

    v_variance := v_transfer.sent_qty - p_received_qty;

    -- Update transfer status
    UPDATE batch_stage_transfers
    SET received_qty = p_received_qty,
        status = 'received',
        received_by = auth.uid(),
        received_at = NOW(),
        notes = COALESCE(notes, '') || CASE WHEN p_notes IS NOT NULL THEN ' | ' || p_notes ELSE '' END
    WHERE id = p_transfer_id;

    -- If there's missing quantity variance, record automatic write-off / transit scrap
    IF v_variance > 0 THEN
        INSERT INTO batch_write_offs (
            factory_id, batch_id, stage, qty, reason, recorded_by, recorded_at
        ) VALUES (
            v_transfer.factory_id, v_transfer.batch_id, v_transfer.from_stage, v_variance, 'Transit Loss / Variance on Receive', auth.uid(), NOW()
        );
    END IF;

    -- Advance batch current stage and set new on-hand qty
    UPDATE production_batches
    SET current_stage = v_transfer.to_stage,
        current_qty = current_qty + p_received_qty
    WHERE id = v_transfer.batch_id;

    RETURN jsonb_build_object(
        'success', true,
        'batch_id', v_transfer.batch_id,
        'new_stage', v_transfer.to_stage,
        'received_qty', p_received_qty,
        'variance', v_variance
    );
END;
$$;

-- Flow 4: Record Batch Write-off (Scrap / Defect Reconciliation)
CREATE OR REPLACE FUNCTION rpc_record_batch_write_off(
    p_batch_id UUID,
    p_stage factory_stage,
    p_qty NUMERIC,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch RECORD;
    v_write_off_id UUID;
BEGIN
    SELECT * INTO v_batch FROM production_batches WHERE id = p_batch_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Batch not found';
    END IF;

    IF p_qty <= 0 OR p_qty > v_batch.current_qty THEN
        RAISE EXCEPTION 'Invalid write-off quantity. Available on-hand: %', v_batch.current_qty;
    END IF;

    INSERT INTO batch_write_offs (
        factory_id, batch_id, stage, qty, reason, recorded_by, recorded_at
    ) VALUES (
        v_batch.factory_id, v_batch.id, p_stage, p_qty, p_reason, auth.uid(), NOW()
    ) RETURNING id INTO v_write_off_id;

    -- Deduct from batch on-hand quantity
    UPDATE production_batches
    SET current_qty = current_qty - p_qty
    WHERE id = p_batch_id;

    RETURN jsonb_build_object(
        'success', true,
        'write_off_id', v_write_off_id,
        'written_off_qty', p_qty,
        'remaining_qty', v_batch.current_qty - p_qty
    );
END;
$$;

-- Flow 5: Post Purchase Bill (Atomic with Material Stock Increment)
CREATE OR REPLACE FUNCTION rpc_post_purchase_bill(
    p_purchase_order_id UUID,
    p_bill_number TEXT,
    p_bill_date DATE DEFAULT CURRENT_DATE,
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_po RECORD;
    v_party RECORD;
    v_factory RECORD;
    v_bill_id UUID;
    v_taxable NUMERIC := 0;
    v_cgst NUMERIC := 0;
    v_sgst NUMERIC := 0;
    v_igst NUMERIC := 0;
    v_total NUMERIC := 0;
    v_item JSONB;
    v_material_id UUID;
    v_qty NUMERIC;
    v_price NUMERIC;
    v_gst_percent NUMERIC;
    v_item_taxable NUMERIC;
    v_item_cgst NUMERIC;
    v_item_sgst NUMERIC;
    v_item_igst NUMERIC;
    v_item_total NUMERIC;
    v_is_interstate BOOLEAN;
BEGIN
    SELECT * INTO v_po FROM purchase_orders WHERE id = p_purchase_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order not found';
    END IF;

    SELECT * INTO v_party FROM parties WHERE id = v_po.party_id;
    SELECT * INTO v_factory FROM factories WHERE id = v_po.factory_id;

    v_is_interstate := (v_party.state_code <> v_factory.state_code);

    -- Insert purchase bill header
    INSERT INTO purchase_bills (
        factory_id, number, purchase_order_id, party_id, date, taxable_amount, cgst, sgst, igst, total, payment_status, created_by
    ) VALUES (
        v_po.factory_id, p_bill_number, v_po.id, v_po.party_id, p_bill_date, 0, 0, 0, 0, 0, 'unpaid', v_po.created_by
    ) RETURNING id INTO v_bill_id;

    -- Process bill items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_material_id := (v_item->>'material_id')::UUID;
        v_qty := (v_item->>'qty')::NUMERIC;
        v_price := (v_item->>'price')::NUMERIC;
        v_gst_percent := COALESCE((v_item->>'gst_percent')::NUMERIC, 5.00);

        v_item_taxable := ROUND(v_qty * v_price, 2);
        IF v_is_interstate THEN
            v_item_cgst := 0;
            v_item_sgst := 0;
            v_item_igst := ROUND(v_item_taxable * (v_gst_percent / 100.0), 2);
        ELSE
            v_item_cgst := ROUND(v_item_taxable * ((v_gst_percent / 2.0) / 100.0), 2);
            v_item_sgst := ROUND(v_item_taxable * ((v_gst_percent / 2.0) / 100.0), 2);
            v_item_igst := 0;
        END IF;
        v_item_total := v_item_taxable + v_item_cgst + v_item_sgst + v_item_igst;

        v_taxable := v_taxable + v_item_taxable;
        v_cgst := v_cgst + v_item_cgst;
        v_sgst := v_sgst + v_item_sgst;
        v_igst := v_igst + v_item_igst;
        v_total := v_total + v_item_total;

        INSERT INTO purchase_bill_items (
            factory_id, purchase_bill_id, material_id, qty, price, gst_percent,
            taxable_value, cgst, sgst, igst, total
        ) VALUES (
            v_po.factory_id, v_bill_id, v_material_id, v_qty, v_price, v_gst_percent,
            v_item_taxable, v_item_cgst, v_item_sgst, v_item_igst, v_item_total
        );

        -- Increment material stock via inventory ledger
        INSERT INTO inventory_ledger (
            factory_id, item_type, item_id, change_qty, reason, ref_table, ref_id, created_by
        ) VALUES (
            v_po.factory_id, 'material', v_material_id, v_qty, 'Purchase Bill Goods Receipt', 'purchase_bills', v_bill_id, v_po.created_by
        );

        UPDATE materials
        SET qty_on_hand = qty_on_hand + v_qty,
            cost_per_unit = v_price -- update latest purchase cost
        WHERE id = v_material_id;
    END LOOP;

    -- Update bill totals
    UPDATE purchase_bills
    SET taxable_amount = v_taxable,
        cgst = v_cgst,
        sgst = v_sgst,
        igst = v_igst,
        total = v_total
    WHERE id = v_bill_id;

    -- Update purchase order status
    UPDATE purchase_orders SET status = 'billed' WHERE id = p_purchase_order_id;

    -- Update vendor balance (payable)
    UPDATE parties SET balance = balance - v_total WHERE id = v_po.party_id;

    RETURN jsonb_build_object(
        'success', true,
        'purchase_bill_id', v_bill_id,
        'total', v_total
    );
END;
$$;
-- ============================================================================
-- FactoryOS Row Level Security (RLS) Policies Migration
-- Granular role enforcement for Owner, Accountant, Purchase, Supervisor,
-- Operator, and Inventory Manager.
-- ============================================================================

-- 1. Helper Security Functions (SECURITY DEFINER to avoid recursion)

CREATE OR REPLACE FUNCTION auth_factory_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT factory_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION auth_user_department()
RETURNS factory_stage
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT assigned_department FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Enable RLS on all tables
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments_in ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments_out ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_size_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_stage_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_write_offs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_commands_log ENABLE ROW LEVEL SECURITY;

-- 3. FACTORIES & PROFILES POLICIES
CREATE POLICY "Users can read own factory"
    ON factories FOR SELECT
    USING (id = auth_factory_id());

CREATE POLICY "Users can read profiles in own factory"
    ON profiles FOR SELECT
    USING (factory_id = auth_factory_id());

CREATE POLICY "Owner can manage profiles"
    ON profiles FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() = 'owner')
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() = 'owner');

-- 4. PARTIES & CATALOG (Products, Services, Categories, Units)
-- Read: Everyone in factory
CREATE POLICY "Factory members can read parties" ON parties FOR SELECT USING (factory_id = auth_factory_id());
CREATE POLICY "Factory members can read categories" ON categories FOR SELECT USING (factory_id = auth_factory_id());
CREATE POLICY "Factory members can read units" ON units FOR SELECT USING (factory_id = auth_factory_id());
CREATE POLICY "Factory members can read products" ON products FOR SELECT USING (factory_id = auth_factory_id());
CREATE POLICY "Factory members can read services" ON services FOR SELECT USING (factory_id = auth_factory_id());

-- Write on Parties: Owner, Accountant, Purchase
CREATE POLICY "Authorized roles can manage parties" ON parties FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'accountant', 'purchase'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'accountant', 'purchase'));

-- Write on Products/Catalog: Owner, Accountant, Inventory Manager
CREATE POLICY "Authorized roles can manage products" ON products FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'accountant', 'inventory_manager'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'accountant', 'inventory_manager'));

CREATE POLICY "Authorized roles can manage categories" ON categories FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'accountant', 'inventory_manager'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'accountant', 'inventory_manager'));

CREATE POLICY "Authorized roles can manage units" ON units FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'accountant', 'inventory_manager'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'accountant', 'inventory_manager'));

CREATE POLICY "Authorized roles can manage services" ON services FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'accountant'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'accountant'));

-- 5. SELL POLICIES (Sale Orders, Invoices, Payments In)
CREATE POLICY "Factory members can view sale orders" ON sale_orders FOR SELECT USING (factory_id = auth_factory_id());
CREATE POLICY "Factory members can view sale order items" ON sale_order_items FOR SELECT USING (factory_id = auth_factory_id());
CREATE POLICY "Factory members can view invoices" ON invoices FOR SELECT USING (factory_id = auth_factory_id());
CREATE POLICY "Factory members can view invoice items" ON invoice_items FOR SELECT USING (factory_id = auth_factory_id());
CREATE POLICY "Factory members can view payments in" ON payments_in FOR SELECT USING (factory_id = auth_factory_id());

CREATE POLICY "Accountant and Owner can manage sale orders" ON sale_orders FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'accountant'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'accountant'));

CREATE POLICY "Accountant and Owner can manage sale order items" ON sale_order_items FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'accountant'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'accountant'));

CREATE POLICY "Accountant and Owner can manage invoices" ON invoices FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'accountant'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'accountant'));

CREATE POLICY "Accountant and Owner can manage invoice items" ON invoice_items FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'accountant'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'accountant'));

CREATE POLICY "Accountant and Owner can manage payments in" ON payments_in FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'accountant'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'accountant'));

-- 6. BUY POLICIES (Purchase Orders, Bills, Payments Out)
CREATE POLICY "Factory members can view purchase orders" ON purchase_orders FOR SELECT USING (factory_id = auth_factory_id());
CREATE POLICY "Factory members can view purchase order items" ON purchase_order_items FOR SELECT USING (factory_id = auth_factory_id());
CREATE POLICY "Factory members can view purchase bills" ON purchase_bills FOR SELECT USING (factory_id = auth_factory_id());
CREATE POLICY "Factory members can view purchase bill items" ON purchase_bill_items FOR SELECT USING (factory_id = auth_factory_id());
CREATE POLICY "Factory members can view payments out" ON payments_out FOR SELECT USING (factory_id = auth_factory_id());

CREATE POLICY "Purchase and Owner can manage purchase orders" ON purchase_orders FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'purchase'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'purchase'));

CREATE POLICY "Purchase and Owner can manage purchase order items" ON purchase_order_items FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'purchase'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'purchase'));

CREATE POLICY "Purchase and Owner can manage purchase bills" ON purchase_bills FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'purchase'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'purchase'));

CREATE POLICY "Purchase and Owner can manage purchase bill items" ON purchase_bill_items FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'purchase'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'purchase'));

CREATE POLICY "Purchase, Accountant and Owner can manage payments out" ON payments_out FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'purchase', 'accountant'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'purchase', 'accountant'));

-- 7. INVENTORY, MATERIALS & BOM POLICIES
CREATE POLICY "Factory members can view materials" ON materials FOR SELECT USING (factory_id = auth_factory_id());
CREATE POLICY "Factory members can view boms" ON boms FOR SELECT USING (factory_id = auth_factory_id());
CREATE POLICY "Factory members can view bom lines" ON bom_lines FOR SELECT USING (factory_id = auth_factory_id());
CREATE POLICY "Factory members can view fabric estimates" ON fabric_estimates FOR SELECT USING (factory_id = auth_factory_id());
CREATE POLICY "Factory members can view packing lists" ON packing_lists FOR SELECT USING (factory_id = auth_factory_id());
CREATE POLICY "Factory members can view packing list items" ON packing_list_items FOR SELECT USING (factory_id = auth_factory_id());
CREATE POLICY "Factory members can view inventory ledger" ON inventory_ledger FOR SELECT USING (factory_id = auth_factory_id());

CREATE POLICY "Inventory Manager and Owner can manage materials" ON materials FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'inventory_manager', 'purchase'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'inventory_manager', 'purchase'));

CREATE POLICY "Inventory Manager and Owner can manage boms" ON boms FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'inventory_manager'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'inventory_manager'));

CREATE POLICY "Inventory Manager and Owner can manage bom lines" ON bom_lines FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'inventory_manager'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'inventory_manager'));

CREATE POLICY "Authorized roles can create fabric estimates" ON fabric_estimates FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'inventory_manager', 'supervisor'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'inventory_manager', 'supervisor'));

CREATE POLICY "Authorized roles can manage packing lists" ON packing_lists FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'inventory_manager', 'supervisor'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'inventory_manager', 'supervisor'));

CREATE POLICY "Authorized roles can manage packing list items" ON packing_list_items FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'inventory_manager', 'supervisor'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'inventory_manager', 'supervisor'));

-- 8. MAKE (FLOOR & PRODUCTION) POLICIES
-- Production Jobs & Batches Read:
-- Supervisors, Owners, Inventory Managers, Accountants can read all.
-- Operators can read batches at their assigned stage or queued for their stage.
CREATE POLICY "Authorized users can read production jobs" ON production_jobs FOR SELECT
    USING (factory_id = auth_factory_id());

CREATE POLICY "Supervisor and Owner can manage production jobs" ON production_jobs FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'supervisor'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'supervisor'));

CREATE POLICY "Production batches read policy" ON production_batches FOR SELECT
    USING (
        factory_id = auth_factory_id() AND (
            auth_user_role() IN ('owner', 'supervisor', 'inventory_manager', 'accountant')
            OR (auth_user_role() = 'operator' AND current_stage = auth_user_department())
        )
    );

CREATE POLICY "Supervisor and Owner can manage production batches" ON production_batches FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'supervisor'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'supervisor'));

CREATE POLICY "Batch size lines read policy" ON batch_size_lines FOR SELECT
    USING (factory_id = auth_factory_id());

CREATE POLICY "Supervisor and Owner can manage batch size lines" ON batch_size_lines FOR ALL
    USING (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'supervisor'))
    WITH CHECK (factory_id = auth_factory_id() AND auth_user_role() IN ('owner', 'supervisor'));

-- Batch Stage Transfers:
-- Operators can only read/insert transfers where from_stage or to_stage is their assigned department.
CREATE POLICY "Batch stage transfers read policy" ON batch_stage_transfers FOR SELECT
    USING (
        factory_id = auth_factory_id() AND (
            auth_user_role() IN ('owner', 'supervisor', 'inventory_manager')
            OR (auth_user_role() = 'operator' AND (from_stage = auth_user_department() OR to_stage = auth_user_department()))
        )
    );

CREATE POLICY "Batch stage transfers write policy" ON batch_stage_transfers FOR ALL
    USING (
        factory_id = auth_factory_id() AND (
            auth_user_role() IN ('owner', 'supervisor')
            OR (auth_user_role() = 'operator' AND (from_stage = auth_user_department() OR to_stage = auth_user_department()))
        )
    )
    WITH CHECK (
        factory_id = auth_factory_id() AND (
            auth_user_role() IN ('owner', 'supervisor')
            OR (auth_user_role() = 'operator' AND (from_stage = auth_user_department() OR to_stage = auth_user_department()))
        )
    );

-- Batch Write-offs:
CREATE POLICY "Batch write offs read policy" ON batch_write_offs FOR SELECT
    USING (factory_id = auth_factory_id());

CREATE POLICY "Batch write offs write policy" ON batch_write_offs FOR ALL
    USING (
        factory_id = auth_factory_id() AND (
            auth_user_role() IN ('owner', 'supervisor')
            OR (auth_user_role() = 'operator' AND stage = auth_user_department())
        )
    )
    WITH CHECK (
        factory_id = auth_factory_id() AND (
            auth_user_role() IN ('owner', 'supervisor')
            OR (auth_user_role() = 'operator' AND stage = auth_user_department())
        )
    );

-- 9. AGENTS & LOGS POLICIES
CREATE POLICY "Factory members can view whatsapp log" ON whatsapp_log FOR SELECT
    USING (factory_id = auth_factory_id());

CREATE POLICY "Factory members can insert whatsapp log" ON whatsapp_log FOR INSERT
    WITH CHECK (factory_id = auth_factory_id());

CREATE POLICY "Users can manage own voice command logs" ON voice_commands_log FOR ALL
    USING (factory_id = auth_factory_id() AND (user_id = auth.uid() OR auth_user_role() IN ('owner', 'supervisor')))
    WITH CHECK (factory_id = auth_factory_id());

-- 10. REALTIME PUBLICATION SETUP
-- Enable full replica identity for real-time broadcasts on key operational tables
ALTER TABLE production_batches REPLICA IDENTITY FULL;
ALTER TABLE batch_stage_transfers REPLICA IDENTITY FULL;
ALTER TABLE batch_write_offs REPLICA IDENTITY FULL;
ALTER TABLE sale_orders REPLICA IDENTITY FULL;
ALTER TABLE invoices REPLICA IDENTITY FULL;
ALTER TABLE payments_in REPLICA IDENTITY FULL;
ALTER TABLE purchase_bills REPLICA IDENTITY FULL;
ALTER TABLE materials REPLICA IDENTITY FULL;
ALTER TABLE products REPLICA IDENTITY FULL;
-- ============================================================================
-- FactoryOS Initial Seed Data
-- Complete realistic Textile & Garment Manufacturing factory profile
-- ============================================================================

-- Fixed IDs for predictable testing
DO $$
DECLARE
    v_factory_id UUID := '11111111-1111-1111-1111-111111111111';
    v_owner_id UUID := '22222222-2222-2222-2222-222222222221';
    v_accountant_id UUID := '22222222-2222-2222-2222-222222222222';
    v_purchase_id UUID := '22222222-2222-2222-2222-222222222223';
    v_supervisor_id UUID := '22222222-2222-2222-2222-222222222224';
    v_operator_cut_id UUID := '22222222-2222-2222-2222-222222222225';
    v_operator_stitch_id UUID := '22222222-2222-2222-2222-222222222226';
    v_inventory_id UUID := '22222222-2222-2222-2222-222222222227';

    -- Units
    v_unit_meter UUID := '33333333-3333-3333-3333-333333333301';
    v_unit_pcs UUID := '33333333-3333-3333-3333-333333333302';
    v_unit_kg UUID := '33333333-3333-3333-3333-333333333303';
    v_unit_cone UUID := '33333333-3333-3333-3333-333333333304';

    -- Categories
    v_cat_fabrics UUID := '44444444-4444-4444-4444-444444444401';
    v_cat_trims UUID := '44444444-4444-4444-4444-444444444402';
    v_cat_garments UUID := '44444444-4444-4444-4444-444444444403';

    -- Parties
    v_party_fabindia UUID := '55555555-5555-5555-5555-555555555501';
    v_party_zara UUID := '55555555-5555-5555-5555-555555555502';
    v_party_arvind UUID := '55555555-5555-5555-5555-555555555503';
    v_party_coats UUID := '55555555-5555-5555-5555-555555555504';
    v_party_dye_vendor UUID := '55555555-5555-5555-5555-555555555505';

    -- Products
    v_prod_tshirt UUID := '66666666-6666-6666-6666-666666666601';
    v_prod_polo UUID := '66666666-6666-6666-6666-666666666602';

    -- Materials
    v_mat_cotton UUID := '77777777-7777-7777-7777-777777777701';
    v_mat_thread UUID := '77777777-7777-7777-7777-777777777702';
    v_mat_polybag UUID := '77777777-7777-7777-7777-777777777703';
    v_mat_label UUID := '77777777-7777-7777-7777-777777777704';

    -- BOM
    v_bom_tshirt UUID := '88888888-8888-8888-8888-888888888801';

    -- Production Job & Batch
    v_job_1 UUID := '99999999-9999-9999-9999-999999999901';
    v_batch_1 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
    v_batch_2 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';
BEGIN
    -- 1. Factory
    INSERT INTO factories (id, name, gstin, state, state_code, address, phone)
    VALUES (
        v_factory_id,
        'Vardhman TexFab Solutions Pvt Ltd',
        '27AABCV1234F1Z5',
        'Maharashtra',
        '27',
        'Plot 42, MIDC Industrial Area, Bhiwandi, Thane, Maharashtra 421302',
        '+91 98200 00000'
    ) ON CONFLICT (id) DO NOTHING;

    -- 2. Profiles (Real factory team)
    INSERT INTO profiles (id, factory_id, full_name, phone, role, assigned_department) VALUES
        (v_owner_id, v_factory_id, 'Mudit Singhi', '+91 98000 11111', 'owner', NULL),
        (v_supervisor_id, v_factory_id, 'Uday Da', '+91 98000 22222', 'master', NULL),
        (v_operator_cut_id, v_factory_id, 'Prem', '+91 98000 33333', 'helper', NULL)
    ON CONFLICT (id) DO NOTHING;

    -- 3. Units & Categories
    INSERT INTO units (id, factory_id, name, symbol) VALUES
        (v_unit_meter, v_factory_id, 'Meters', 'mtr'),
        (v_unit_pcs, v_factory_id, 'Pieces', 'pcs'),
        (v_unit_kg, v_factory_id, 'Kilograms', 'kg'),
        (v_unit_cone, v_factory_id, 'Cones', 'cone')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO categories (id, factory_id, name, type) VALUES
        (v_cat_fabrics, v_factory_id, 'Knitted Fabrics', 'material'),
        (v_cat_trims, v_factory_id, 'Trims & Accessories', 'material'),
        (v_cat_garments, v_factory_id, 'Apparel & T-Shirts', 'product')
    ON CONFLICT (id) DO NOTHING;

    -- 4. Parties
    INSERT INTO parties (id, factory_id, name, type, phone, gstin, state, state_code, address, balance) VALUES
        (v_party_fabindia, v_factory_id, 'FabIndia Overseas Pvt Ltd', 'customer', '+91 98111 22334', '27AAACF1029P1Z8', 'Maharashtra', '27', 'Bandra West, Mumbai, MH', 145000.00),
        (v_party_zara, v_factory_id, 'Zara Retail Inditex India', 'customer', '+91 98111 55667', '07AAACI8492A1Z3', 'Delhi', '07', 'Connaught Place, New Delhi, DL', 280000.00),
        (v_party_arvind, v_factory_id, 'Arvind Mills Fabric Ltd', 'vendor', '+91 98222 11223', '24AAACA1234A1Z9', 'Gujarat', '24', 'Naroda Road, Ahmedabad, GJ', -95000.00),
        (v_party_coats, v_factory_id, 'Coats India Threads', 'vendor', '+91 98222 33445', '27AABCC5678B1Z2', 'Maharashtra', '27', 'Andheri East, Mumbai, MH', -22000.00),
        (v_party_dye_vendor, v_factory_id, 'Apex Garment Dyeing Works', 'vendor', '+91 98333 44556', '27AABCA9988C1Z1', 'Maharashtra', '27', 'MIDC Tarapur, Boisar, MH', 0.00)
    ON CONFLICT (id) DO NOTHING;

    -- 5. Products & Services
    INSERT INTO products (id, factory_id, name, sku, category_id, unit_id, sale_price, hsn_code, gst_percent, stock_qty, low_stock_threshold) VALUES
        (v_prod_tshirt, v_factory_id, 'Men 100% Cotton Crew Neck T-Shirt (Navy)', 'TS-CRW-NVY-01', v_cat_garments, v_unit_pcs, 450.00, '61091000', 5.00, 320, 50),
        (v_prod_polo, v_factory_id, 'Classic Pique Polo Shirt (Black)', 'POLO-PIQ-BLK-02', v_cat_garments, v_unit_pcs, 680.00, '61051000', 5.00, 180, 40)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO services (id, factory_id, name, rate, hsn_code, gst_percent) VALUES
        (uuid_generate_v4(), v_factory_id, 'Screen Printing Jobwork (per piece)', 18.00, '998821', 18.00),
        (uuid_generate_v4(), v_factory_id, 'Bio-Wash Enzyme Treatment', 25.00, '998821', 18.00)
    ON CONFLICT DO NOTHING;

    -- 6. Raw Materials
    INSERT INTO materials (id, factory_id, name, lot_no, category_id, unit_id, cost_per_unit, qty_on_hand, low_stock_threshold) VALUES
        (v_mat_cotton, v_factory_id, '100% Combed Cotton Single Jersey (180 GSM, Navy)', 'LOT-CTN-2026-08', v_cat_fabrics, v_unit_meter, 145.00, 1850.00, 300.00),
        (v_mat_thread, v_factory_id, 'Spun Polyester Thread 40/2 (Navy 5000m)', 'LOT-THR-889', v_cat_trims, v_unit_cone, 85.00, 140.00, 20.00),
        (v_mat_polybag, v_factory_id, 'Self-Sealing Transparent Polybag (10x12)', 'LOT-PKG-01', v_cat_trims, v_unit_pcs, 2.50, 4200.00, 500.00),
        (v_mat_label, v_factory_id, 'Woven Satin Brand & Care Label', 'LOT-LBL-09', v_cat_trims, v_unit_pcs, 3.20, 2900.00, 400.00)
    ON CONFLICT (id) DO NOTHING;

    -- 7. BOM (Bill of Materials for T-Shirt)
    INSERT INTO boms (id, factory_id, product_id, name, labor_cost_per_unit, overhead_percent, is_active)
    VALUES (v_bom_tshirt, v_factory_id, v_prod_tshirt, 'Standard Recipe - Crew Neck T-Shirt', 35.00, 12.00)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO bom_lines (id, factory_id, bom_id, material_id, qty_per_unit, notes) VALUES
        (uuid_generate_v4(), v_factory_id, v_bom_tshirt, v_mat_cotton, 1.35, 'Body + Rib collar (1.35m per piece)'),
        (uuid_generate_v4(), v_factory_id, v_bom_tshirt, v_mat_thread, 0.02, 'Approx 1 cone per 50 garments'),
        (uuid_generate_v4(), v_factory_id, v_bom_tshirt, v_mat_label, 1.00, '1 Care + 1 Size label'),
        (uuid_generate_v4(), v_factory_id, v_bom_tshirt, v_mat_polybag, 1.00, 'Primary poly packaging')
    ON CONFLICT DO NOTHING;

    -- 8. Production Job & Active Floor Batches (Trolleys)
    INSERT INTO production_jobs (id, factory_id, number, party_id, target_qty, status, due_date, notes, created_by)
    VALUES (
        v_job_1, v_factory_id, 'JOB-2026-001', v_party_fabindia, 500, 'open', CURRENT_DATE + INTERVAL '10 days', 'Festive collection rush order', v_supervisor_id
    ) ON CONFLICT (id) DO NOTHING;

    -- Batch 1: Currently at Stitching stage
    INSERT INTO production_batches (id, factory_id, batch_no, production_job_id, product_id, style, colour, current_stage, initial_qty, current_qty, qr_code_url, created_by)
    VALUES (
        v_batch_1, v_factory_id, 'BATCH-2601', v_job_1, v_prod_tshirt, 'Crew Neck Classic', 'Navy', 'stitching', 250, 248, 'https://factoryos.app/qr/BATCH-2601', v_supervisor_id
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO batch_size_lines (id, factory_id, batch_id, colour, size, qty) VALUES
        (uuid_generate_v4(), v_factory_id, v_batch_1, 'Navy', 'S', 50),
        (uuid_generate_v4(), v_factory_id, v_batch_1, 'Navy', 'M', 100),
        (uuid_generate_v4(), v_factory_id, v_batch_1, 'Navy', 'L', 75),
        (uuid_generate_v4(), v_factory_id, v_batch_1, 'Navy', 'XL', 25)
    ON CONFLICT DO NOTHING;

    -- Log 2 write-offs for Batch 1 during cutting
    INSERT INTO batch_write_offs (id, factory_id, batch_id, stage, qty, reason, recorded_by)
    VALUES (uuid_generate_v4(), v_factory_id, v_batch_1, 'cutting', 2, 'Fabric knit hole defect during lay spread', v_operator_cut_id)
    ON CONFLICT DO NOTHING;

    -- Batch 2: Fresh at Cutting stage
    INSERT INTO production_batches (id, factory_id, batch_no, production_job_id, product_id, style, colour, current_stage, initial_qty, current_qty, qr_code_url, created_by)
    VALUES (
        v_batch_2, v_factory_id, 'BATCH-2602', v_job_1, v_prod_tshirt, 'Crew Neck Classic', 'Navy', 'cutting', 250, 250, 'https://factoryos.app/qr/BATCH-2602', v_supervisor_id
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO batch_size_lines (id, factory_id, batch_id, colour, size, qty) VALUES
        (uuid_generate_v4(), v_factory_id, v_batch_2, 'Navy', 'S', 50),
        (uuid_generate_v4(), v_factory_id, v_batch_2, 'Navy', 'M', 100),
        (uuid_generate_v4(), v_factory_id, v_batch_2, 'Navy', 'L', 75),
        (uuid_generate_v4(), v_factory_id, v_batch_2, 'Navy', 'XL', 25)
    ON CONFLICT DO NOTHING;

END $$;
