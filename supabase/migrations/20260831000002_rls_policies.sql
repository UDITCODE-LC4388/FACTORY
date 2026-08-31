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
