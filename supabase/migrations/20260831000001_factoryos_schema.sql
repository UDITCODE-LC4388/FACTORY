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
    'washing',
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
