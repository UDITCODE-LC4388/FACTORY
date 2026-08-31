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
