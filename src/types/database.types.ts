export type UserRole =
  | 'owner'
  | 'master'
  | 'helper'
  | 'accountant'
  | 'purchase'
  | 'supervisor'
  | 'operator'
  | 'inventory_manager';

export type FactoryStage =
  | 'cutting'
  | 'stitching'
  | 'washing'
  | 'qc'
  | 'packing'
  | 'dispatch';

export type PartyType = 'customer' | 'vendor' | 'both';
export type OrderStatus = 'draft' | 'invoiced';
export type InvoiceStatus = 'draft' | 'sent';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type SaleType = 'credit' | 'cash';
export type PaymentMode = 'cash' | 'upi' | 'bank' | 'cheque';
export type PurchaseStatus = 'draft' | 'billed';
export type JobStatus = 'open' | 'completed' | 'cancelled';
export type TransferStatus = 'awaiting_receive' | 'received';
export type VoiceCmdStatus = 'pending' | 'executed' | 'needs_review' | 'failed';
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Factory {
  id: string;
  name: string;
  gstin: string;
  state: string;
  state_code: string;
  address: string;
  phone: string;
  created_at: string;
}

export interface Profile {
  id: string;
  factory_id: string;
  full_name: string;
  phone: string;
  role: UserRole;
  assigned_department?: FactoryStage | null;
  is_active: boolean;
  created_at: string;
}

export interface Party {
  id: string;
  factory_id: string;
  name: string;
  type: PartyType;
  phone: string;
  gstin: string;
  state: string;
  state_code: string;
  address: string;
  balance: number; // positive = receivable (customer owes us), negative = payable (we owe vendor)
  created_at: string;
}

export interface Category {
  id: string;
  factory_id: string;
  name: string;
  type: 'product' | 'material';
  created_at: string;
}

export interface Unit {
  id: string;
  factory_id: string;
  name: string;
  symbol: string;
  created_at: string;
}

export interface Product {
  id: string;
  factory_id: string;
  name: string;
  sku: string;
  category_id: string;
  unit_id: string;
  sale_price: number;
  hsn_code: string;
  gst_percent: number;
  stock_qty: number;
  low_stock_threshold: number;
  created_at: string;
  category?: Category;
  unit?: Unit;
}

export interface Service {
  id: string;
  factory_id: string;
  name: string;
  rate: number;
  hsn_code: string;
  gst_percent: number;
  created_at: string;
}

export interface SaleOrder {
  id: string;
  factory_id: string;
  number: string;
  party_id: string;
  date: string;
  status: OrderStatus;
  notes?: string;
  total_amount: number;
  created_by?: string;
  created_at: string;
  party?: Party;
  items?: SaleOrderItem[];
}

export interface SaleOrderItem {
  id: string;
  factory_id: string;
  sale_order_id: string;
  product_id?: string;
  description: string;
  hsn_code: string;
  qty: number;
  price: number;
  gst_percent: number;
  product?: Product;
}

export interface Invoice {
  id: string;
  factory_id: string;
  number: string;
  sale_order_id?: string;
  party_id: string;
  date: string;
  status: InvoiceStatus;
  payment_status: PaymentStatus;
  sale_type: SaleType;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  paid_amount: number;
  pdf_url?: string;
  created_by?: string;
  created_at: string;
  party?: Party;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  factory_id: string;
  invoice_id: string;
  product_id?: string;
  description: string;
  hsn_code: string;
  qty: number;
  price: number;
  gst_percent: number;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  product?: Product;
}

export interface PaymentIn {
  id: string;
  factory_id: string;
  invoice_id?: string;
  party_id: string;
  mode: PaymentMode;
  amount: number;
  date: string;
  reference_no?: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
  party?: Party;
  invoice?: Invoice;
}

export interface PurchaseOrder {
  id: string;
  factory_id: string;
  number: string;
  party_id: string;
  date: string;
  status: PurchaseStatus;
  total_amount: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  party?: Party;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  factory_id: string;
  purchase_order_id: string;
  material_id: string;
  qty: number;
  price: number;
  gst_percent: number;
  material?: Material;
}

export interface PurchaseBill {
  id: string;
  factory_id: string;
  number: string;
  purchase_order_id?: string;
  party_id: string;
  date: string;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  paid_amount: number;
  payment_status: PaymentStatus;
  created_by?: string;
  created_at: string;
  party?: Party;
  items?: PurchaseBillItem[];
}

export interface PurchaseBillItem {
  id: string;
  factory_id: string;
  purchase_bill_id: string;
  material_id: string;
  qty: number;
  price: number;
  gst_percent: number;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  material?: Material;
}

export interface PaymentOut {
  id: string;
  factory_id: string;
  purchase_bill_id?: string;
  party_id: string;
  mode: PaymentMode;
  amount: number;
  date: string;
  reference_no?: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
  party?: Party;
  purchase_bill?: PurchaseBill;
}

export interface Material {
  id: string;
  factory_id: string;
  name: string;
  lot_no?: string;
  category_id?: string;
  unit_id?: string;
  cost_per_unit: number;
  qty_on_hand: number;
  low_stock_threshold: number;
  created_at: string;
  category?: Category;
  unit?: Unit;
}

export interface BOM {
  id: string;
  factory_id: string;
  product_id: string;
  name: string;
  labor_cost_per_unit: number;
  overhead_percent: number;
  is_active: boolean;
  created_at: string;
  product?: Product;
  lines?: BOMLine[];
}

export interface BOMLine {
  id: string;
  factory_id: string;
  bom_id: string;
  material_id: string;
  qty_per_unit: number;
  notes?: string;
  material?: Material;
}

export interface FabricEstimate {
  id: string;
  factory_id: string;
  bom_id: string;
  requested_qty: number;
  result: {
    total_fabric_meters: number;
    total_thread_cones: number;
    total_polybags: number;
    total_labels: number;
    estimated_raw_material_cost: number;
    estimated_labor_cost: number;
    estimated_overhead_cost: number;
    estimated_total_cost: number;
    estimated_cost_per_piece: number;
    line_breakdown: Array<{
      material_name: string;
      qty_needed: number;
      unit: string;
      cost: number;
    }>;
  };
  requested_by?: string;
  created_at: string;
}

export interface PackingList {
  id: string;
  factory_id: string;
  number: string;
  invoice_id?: string;
  production_job_id?: string;
  status: 'draft' | 'dispatched';
  created_by?: string;
  created_at: string;
  items?: PackingListItem[];
}

export interface PackingListItem {
  id: string;
  factory_id: string;
  packing_list_id: string;
  product_id: string;
  carton_no: string;
  size?: string;
  colour?: string;
  qty: number;
  product?: Product;
}

export interface InventoryLedger {
  id: string;
  factory_id: string;
  item_type: 'material' | 'product';
  item_id: string;
  change_qty: number;
  reason: string;
  ref_table?: string;
  ref_id?: string;
  created_by?: string;
  created_at: string;
}

export interface ImportJob {
  id: string;
  factory_id: string;
  entity_type: 'parties' | 'materials' | 'products';
  file_url?: string;
  status: ImportStatus;
  row_count: number;
  error_log: Array<{
    row: number;
    error: string;
    data: Record<string, unknown>;
  }>;
  created_by?: string;
  created_at: string;
}

export interface ProductionJob {
  id: string;
  factory_id: string;
  number: string;
  party_id?: string;
  target_qty: number;
  status: JobStatus;
  due_date?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  party?: Party;
  batches?: ProductionBatch[];
}

export interface ProductionBatch {
  id: string;
  factory_id: string;
  batch_no: string;
  production_job_id?: string;
  product_id: string;
  style: string;
  colour: string;
  current_stage: FactoryStage;
  initial_qty: number;
  current_qty: number;
  qr_code_url?: string;
  created_by?: string;
  created_at: string;
  product?: Product;
  job?: ProductionJob;
  size_lines?: BatchSizeLine[];
  transfers?: BatchStageTransfer[];
  write_offs?: BatchWriteOff[];
}

export interface BatchSizeLine {
  id: string;
  factory_id: string;
  batch_id: string;
  colour: string;
  size: string;
  qty: number;
}

export interface BatchStageTransfer {
  id: string;
  factory_id: string;
  batch_id: string;
  from_stage: FactoryStage;
  to_stage: FactoryStage;
  is_outside_vendor: boolean;
  vendor_id?: string;
  sent_qty: number;
  received_qty?: number;
  status: TransferStatus;
  sent_by?: string;
  sent_at: string;
  received_by?: string;
  received_at?: string;
  notes?: string;
  vendor?: Party;
  batch?: ProductionBatch;
}

export interface BatchWriteOff {
  id: string;
  factory_id: string;
  batch_id: string;
  stage: FactoryStage;
  qty: number;
  reason: string;
  recorded_by?: string;
  recorded_at: string;
}

export interface WhatsAppLog {
  id: string;
  factory_id: string;
  recipient_phone: string;
  recipient_name?: string;
  message: string;
  ref_table?: string;
  ref_id?: string;
  status: 'queued' | 'sent' | 'failed' | 'delivered';
  response_payload?: Record<string, unknown>;
  sent_at: string;
}

export interface VoiceCommandLog {
  id: string;
  factory_id: string;
  user_id?: string;
  transcript: string;
  parsed_intent?: {
    action: 'move_stage' | 'receive_stage' | 'write_off' | 'create_batch' | 'unknown';
    batch_no?: string;
    from_stage?: FactoryStage;
    to_stage?: FactoryStage;
    qty?: number;
    reason?: string;
    confidence: number;
  };
  action_taken?: string;
  status: VoiceCmdStatus;
  error_message?: string;
  created_at: string;
}

export interface ProductCostingView {
  product_id: string;
  factory_id: string;
  product_name: string;
  sku: string;
  bom_id?: string;
  raw_material_cost: number;
  labor_cost: number;
  overhead_percent: number;
  landed_cost_per_piece: number;
  sale_price: number;
  gross_margin_per_piece: number;
}

export interface BatchReconciliationView {
  batch_id: string;
  factory_id: string;
  batch_no: string;
  product_id: string;
  current_stage: FactoryStage;
  original_qty: number;
  on_hand_qty: number;
  total_written_off: number;
  in_transit_qty: number;
  variance_qty: number;
}
