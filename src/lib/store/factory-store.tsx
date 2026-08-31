'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Factory,
  Profile,
  Party,
  Category,
  Unit,
  Product,
  Service,
  SaleOrder,
  SaleOrderItem,
  Invoice,
  InvoiceItem,
  PaymentIn,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseBill,
  PurchaseBillItem,
  PaymentOut,
  Material,
  BOM,
  BOMLine,
  FabricEstimate,
  PackingList,
  PackingListItem,
  InventoryLedger,
  ProductionJob,
  ProductionBatch,
  BatchSizeLine,
  BatchStageTransfer,
  BatchWriteOff,
  JobWorker,
  RoadChallan,
  RoadChallanLot,
  RoadChallanSizeLine,
  OutsideJobWork,
  JobWorkerProcess,
  WhatsAppLog,
  VoiceCommandLog,
  VoiceCmdStatus,
  UserRole,
  FactoryStage,
  SaleType,
  PaymentMode,
  ProductCostingView,
  BatchReconciliationView,
} from '@/types/database.types';
import { calculateGST } from '../gst';
import { computeBatchReconciliation } from '../reconciliation';
import { createClient } from '@/lib/supabase/client';

// Default initial factory setup
const INITIAL_FACTORY: Factory = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Manisha Garments',
  gstin: '27AAAAA0000A1Z5',
  state: 'Maharashtra',
  state_code: '27',
  address: 'Industrial Area, Phase 1, Bhiwandi',
  phone: '+91 98000 00000',
  created_at: new Date().toISOString(),
};

// Real factory team members
const INITIAL_PROFILES: Profile[] = [
  {
    id: '22222222-2222-2222-2222-222222222221',
    factory_id: INITIAL_FACTORY.id,
    full_name: 'Mudit Singhi',
    phone: '+91 98000 11111',
    role: 'owner',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    factory_id: INITIAL_FACTORY.id,
    full_name: 'Uday Da',
    phone: '+91 98000 22222',
    role: 'master',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222223',
    factory_id: INITIAL_FACTORY.id,
    full_name: 'Prem',
    phone: '+91 98000 33333',
    role: 'helper',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

// Standard measurement units
const STANDARD_UNITS: Unit[] = [
  { id: '33333333-3333-3333-3333-333333333301', factory_id: INITIAL_FACTORY.id, name: 'Pieces', symbol: 'pcs', created_at: new Date().toISOString() },
  { id: '33333333-3333-3333-3333-333333333302', factory_id: INITIAL_FACTORY.id, name: 'Meters', symbol: 'mtr', created_at: new Date().toISOString() },
  { id: '33333333-3333-3333-3333-333333333303', factory_id: INITIAL_FACTORY.id, name: 'Kilograms', symbol: 'kg', created_at: new Date().toISOString() },
  { id: '33333333-3333-3333-3333-333333333304', factory_id: INITIAL_FACTORY.id, name: 'Cones', symbol: 'cone', created_at: new Date().toISOString() },
];

const STANDARD_CATEGORIES: Category[] = [
  { id: '44444444-4444-4444-4444-444444444401', factory_id: INITIAL_FACTORY.id, name: 'Finished Garments', type: 'product', created_at: new Date().toISOString() },
  { id: '44444444-4444-4444-4444-444444444402', factory_id: INITIAL_FACTORY.id, name: 'Fabrics', type: 'material', created_at: new Date().toISOString() },
  { id: '44444444-4444-4444-4444-444444444403', factory_id: INITIAL_FACTORY.id, name: 'Trims & Accessories', type: 'material', created_at: new Date().toISOString() },
];

interface FactoryContextType {
  factory: Factory;
  updateFactory: (data: Partial<Factory>) => void;
  profiles: Profile[];
  currentProfile: Profile;
  switchProfile: (profileId: string) => void;
  parties: Party[];
  categories: Category[];
  units: Unit[];
  products: Product[];
  services: Service[];
  saleOrders: SaleOrder[];
  invoices: Invoice[];
  paymentsIn: PaymentIn[];
  purchaseOrders: PurchaseOrder[];
  purchaseBills: PurchaseBill[];
  paymentsOut: PaymentOut[];
  materials: Material[];
  boms: BOM[];
  fabricEstimates: FabricEstimate[];
  packingLists: PackingList[];
  inventoryLedger: InventoryLedger[];
  productionJobs: ProductionJob[];
  batches: ProductionBatch[];
  jobWorkers: JobWorker[];
  roadChallans: RoadChallan[];
  outsideJobWorks: OutsideJobWork[];
  whatsAppLogs: WhatsAppLog[];
  voiceLogs: VoiceCommandLog[];
  
  // Computed Views
  costingViews: ProductCostingView[];
  reconciliationViews: BatchReconciliationView[];

  // Actions / Atomic RPCs
  createSaleOrder: (data: Partial<SaleOrder>, items: Array<Partial<SaleOrderItem>>) => SaleOrder;
  convertSaleOrderToInvoice: (saleOrderId: string, saleType?: SaleType) => Invoice;
  recordPaymentIn: (data: { party_id: string; invoice_id?: string; amount: number; mode: PaymentMode; reference_no?: string; notes?: string }) => PaymentIn;
  createPurchaseOrder: (data: Partial<PurchaseOrder>, items: Array<Partial<PurchaseOrderItem>>) => PurchaseOrder;
  postPurchaseBill: (poId: string, billNumber: string, items: Array<{ material_id: string; qty: number; price: number; gst_percent: number }>) => PurchaseBill;
  recordPaymentOut: (data: { party_id: string; purchase_bill_id?: string; amount: number; mode: PaymentMode; reference_no?: string; notes?: string }) => PaymentOut;
  createProductionJob: (data: Partial<ProductionJob>) => ProductionJob;
  
  // 100% Typable Production Batch Creator
  createProductionBatch: (data: {
    batch_no?: string;
    style?: string;
    article_code?: string;
    product_name?: string;
    colour?: string;
    fabric?: string;
    product_id?: string;
    production_job_id?: string;
    notes?: string;
  }, sizeLines: Array<{ size: string; qty: number; colour?: string }>) => ProductionBatch;

  moveBatchStage: (batchId: string, toStage: FactoryStage, sentQty: number, isOutsideVendor?: boolean, vendorId?: string, notes?: string) => BatchStageTransfer;
  receiveBatchStage: (transferId: string, receivedQty: number, notes?: string) => { success: boolean; variance: number };
  recordBatchWriteOff: (batchId: string, stage: FactoryStage, qty: number, reason: string) => BatchWriteOff;
  
  // Road Challan & Job Workers
  createJobWorker: (data: { name: string; phone: string; address?: string; process_type: JobWorkerProcess; default_rate?: number }) => JobWorker;
  createRoadChallan: (data: {
    job_worker_id: string;
    process_type: JobWorkerProcess;
    challan_date?: string;
    notes?: string;
    photo_url?: string;
    lots: Array<{
      lot_no: string;
      article: string;
      color: string;
      rate_per_pc?: number;
      sizes: Array<{ size: string; dispatched_qty: number }>;
    }>;
  }) => RoadChallan;
  reconcileRoadChallan: (
    challanId: string,
    reconciliationData: {
      completion_date: string;
      stamp_image?: string;
      returnedSizes: Array<{ lot_id: string; size: string; returned_qty: number }>;
    }
  ) => RoadChallan;
  addOutsideJobWork: (data: Partial<OutsideJobWork>) => OutsideJobWork;
  updateOutsideJobWork: (id: string, data: Partial<OutsideJobWork>) => void;

  createBOM: (productId: string, name: string, laborCost: number, overheadPercent: number, lines: Array<{ material_id: string; qty_per_unit: number; notes?: string }>) => BOM;
  generateFabricEstimate: (bomId: string, requestedQty: number) => FabricEstimate;
  executeVoiceCommand: (transcript: string) => Promise<{ success: boolean; actionTaken: string; error?: string }>;
  sendWhatsAppNotification: (recipientPhone: string, recipientName: string, message: string, refTable?: string, refId?: string) => Promise<{ log: WhatsAppLog; directUrl: string }>;
  importBulkEntities: (entityType: 'parties' | 'materials' | 'products', rows: Array<Record<string, unknown>>) => { successCount: number; errors: Array<{ row: number; error: string }> };
  addParty: (party: Partial<Party>) => Party;
  addMaterial: (material: Partial<Material>) => Material;
  addProduct: (product: Partial<Product>) => Product;
  resetToCleanSlate: () => void;
}

const FactoryContext = createContext<FactoryContextType | null>(null);

const STORAGE_KEY = 'factoryos_store_v5_ironing';
const BROADCAST_CHANNEL_NAME = 'factoryos_realtime_bus';

export function FactoryProvider({ children }: { children: React.ReactNode }) {
  const [factory, setFactory] = useState<Factory>(INITIAL_FACTORY);
  const [profiles] = useState<Profile[]>(INITIAL_PROFILES);
  const [currentProfileId, setCurrentProfileId] = useState<string>(INITIAL_PROFILES[0].id);

  // Clean data stores
  const [parties, setParties] = useState<Party[]>([]);
  const [categories, setCategories] = useState<Category[]>(STANDARD_CATEGORIES);
  const [units, setUnits] = useState<Unit[]>(STANDARD_UNITS);
  const [products, setProducts] = useState<Product[]>([]);
  const [services] = useState<Service[]>([]);
  const [saleOrders, setSaleOrders] = useState<SaleOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentsIn, setPaymentsIn] = useState<PaymentIn[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([]);
  const [paymentsOut, setPaymentsOut] = useState<PaymentOut[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  const [fabricEstimates, setFabricEstimates] = useState<FabricEstimate[]>([]);
  const [packingLists, setPackingLists] = useState<PackingList[]>([]);
  const [inventoryLedger, setInventoryLedger] = useState<InventoryLedger[]>([]);
  const [productionJobs, setProductionJobs] = useState<ProductionJob[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [jobWorkers, setJobWorkers] = useState<JobWorker[]>([]);
  const [roadChallans, setRoadChallans] = useState<RoadChallan[]>([]);
  const [outsideJobWorks, setOutsideJobWorks] = useState<OutsideJobWork[]>([]);
  const [whatsAppLogs, setWhatsAppLogs] = useState<WhatsAppLog[]>([]);
  const [voiceLogs, setVoiceLogs] = useState<VoiceCommandLog[]>([]);

  const currentProfile = useMemo(
    () => profiles.find((p) => p.id === currentProfileId) || profiles[0],
    [profiles, currentProfileId]
  );

  const updateFactory = useCallback((data: Partial<Factory>) => {
    setFactory((prev) => ({ ...prev, ...data }));
  }, []);

  const resetToCleanSlate = useCallback(() => {
    setParties([]);
    setProducts([]);
    setSaleOrders([]);
    setInvoices([]);
    setPaymentsIn([]);
    setPurchaseOrders([]);
    setPurchaseBills([]);
    setPaymentsOut([]);
    setMaterials([]);
    setBoms([]);
    setFabricEstimates([]);
    setPackingLists([]);
    setInventoryLedger([]);
    setProductionJobs([]);
    setBatches([]);
    setJobWorkers([]);
    setRoadChallans([]);
    setOutsideJobWorks([]);
    setWhatsAppLogs([]);
    setVoiceLogs([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Broadcast channel for Multi-Window & Multi-Device Realtime sync
  const broadcastSync = useCallback((payload?: any) => {
    if (typeof window !== 'undefined') {
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        channel.postMessage({ type: 'STATE_UPDATED', timestamp: Date.now() });
        channel.close();
      }

      // Supabase Cross-Device Realtime WebSocket Broadcast
      try {
        const supabase = createClient();
        const realtimeChannel = supabase.channel('factoryos_sync_room');
        realtimeChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED' && payload) {
            realtimeChannel.send({
              type: 'broadcast',
              event: 'STATE_SYNC',
              payload,
            });
          }
        });
      } catch {
        // ignore
      }
    }
  }, []);

  // Save to localStorage
  const persistState = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const payload = {
        factory,
        parties,
        products,
        saleOrders,
        invoices,
        paymentsIn,
        purchaseOrders,
        purchaseBills,
        paymentsOut,
        materials,
        boms,
        fabricEstimates,
        packingLists,
        inventoryLedger,
        productionJobs,
        batches,
        jobWorkers,
        roadChallans,
        outsideJobWorks,
        whatsAppLogs,
        voiceLogs,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      broadcastSync(payload);
    } catch {
      // ignore
    }
  }, [
    factory,
    parties,
    products,
    saleOrders,
    invoices,
    paymentsIn,
    purchaseOrders,
    purchaseBills,
    paymentsOut,
    materials,
    boms,
    fabricEstimates,
    packingLists,
    inventoryLedger,
    productionJobs,
    batches,
    jobWorkers,
    roadChallans,
    outsideJobWorks,
    whatsAppLogs,
    voiceLogs,
    broadcastSync,
  ]);

  // Load from localStorage & Listen to Supabase Realtime across all phones/laptops
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        if (saved.factory) setFactory(saved.factory);
        if (saved.parties) setParties(saved.parties);
        if (saved.products) setProducts(saved.products);
        if (saved.saleOrders) setSaleOrders(saved.saleOrders);
        if (saved.invoices) setInvoices(saved.invoices);
        if (saved.paymentsIn) setPaymentsIn(saved.paymentsIn);
        if (saved.purchaseOrders) setPurchaseOrders(saved.purchaseOrders);
        if (saved.purchaseBills) setPurchaseBills(saved.purchaseBills);
        if (saved.paymentsOut) setPaymentsOut(saved.paymentsOut);
        if (saved.materials) setMaterials(saved.materials);
        if (saved.boms) setBoms(saved.boms);
        if (saved.fabricEstimates) setFabricEstimates(saved.fabricEstimates);
        if (saved.packingLists) setPackingLists(saved.packingLists);
        if (saved.inventoryLedger) setInventoryLedger(saved.inventoryLedger);
        if (saved.productionJobs) setProductionJobs(saved.productionJobs);
        if (saved.batches) setBatches(saved.batches);
        if (saved.jobWorkers) setJobWorkers(saved.jobWorkers);
        if (saved.roadChallans) setRoadChallans(saved.roadChallans);
        if (saved.outsideJobWorks) setOutsideJobWorks(saved.outsideJobWorks);
        if (saved.whatsAppLogs) setWhatsAppLogs(saved.whatsAppLogs);
        if (saved.voiceLogs) setVoiceLogs(saved.voiceLogs);
      } catch {
        // ignore
      }
    }

    // 1. Local Browser Tab Sync
    let localChannel: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      localChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      localChannel.onmessage = () => {
        const freshRaw = localStorage.getItem(STORAGE_KEY);
        if (freshRaw) {
          try {
            const fresh = JSON.parse(freshRaw);
            if (fresh.factory) setFactory(fresh.factory);
            if (fresh.parties) setParties(fresh.parties);
            if (fresh.products) setProducts(fresh.products);
            if (fresh.saleOrders) setSaleOrders(fresh.saleOrders);
            if (fresh.invoices) setInvoices(fresh.invoices);
            if (fresh.paymentsIn) setPaymentsIn(fresh.paymentsIn);
            if (fresh.purchaseOrders) setPurchaseOrders(fresh.purchaseOrders);
            if (fresh.purchaseBills) setPurchaseBills(fresh.purchaseBills);
            if (fresh.paymentsOut) setPaymentsOut(fresh.paymentsOut);
            if (fresh.materials) setMaterials(fresh.materials);
            if (fresh.boms) setBoms(fresh.boms);
            if (fresh.batches) setBatches(fresh.batches);
            if (fresh.productionJobs) setProductionJobs(fresh.productionJobs);
            if (fresh.jobWorkers) setJobWorkers(fresh.jobWorkers);
            if (fresh.roadChallans) setRoadChallans(fresh.roadChallans);
            if (fresh.outsideJobWorks) setOutsideJobWorks(fresh.outsideJobWorks);
            if (fresh.whatsAppLogs) setWhatsAppLogs(fresh.whatsAppLogs);
            if (fresh.voiceLogs) setVoiceLogs(fresh.voiceLogs);
          } catch {
            // ignore
          }
        }
      };
    }

    // 2. Supabase Cross-Device Realtime Listener
    let supabaseChannel: any = null;
    try {
      const supabase = createClient();
      supabaseChannel = supabase
        .channel('factoryos_sync_room')
        .on('broadcast', { event: 'STATE_SYNC' }, ({ payload }) => {
          if (payload) {
            if (payload.factory) setFactory(payload.factory);
            if (payload.parties) setParties(payload.parties);
            if (payload.products) setProducts(payload.products);
            if (payload.saleOrders) setSaleOrders(payload.saleOrders);
            if (payload.invoices) setInvoices(payload.invoices);
            if (payload.paymentsIn) setPaymentsIn(payload.paymentsIn);
            if (payload.purchaseOrders) setPurchaseOrders(payload.purchaseOrders);
            if (payload.purchaseBills) setPurchaseBills(payload.purchaseBills);
            if (payload.paymentsOut) setPaymentsOut(payload.paymentsOut);
            if (payload.materials) setMaterials(payload.materials);
            if (payload.boms) setBoms(payload.boms);
            if (payload.batches) setBatches(payload.batches);
            if (payload.productionJobs) setProductionJobs(payload.productionJobs);
            if (payload.jobWorkers) setJobWorkers(payload.jobWorkers);
            if (payload.roadChallans) setRoadChallans(payload.roadChallans);
            if (payload.outsideJobWorks) setOutsideJobWorks(payload.outsideJobWorks);
            if (payload.whatsAppLogs) setWhatsAppLogs(payload.whatsAppLogs);
            if (payload.voiceLogs) setVoiceLogs(payload.voiceLogs);
          }
        })
        .subscribe();
    } catch {
      // ignore
    }

    return () => {
      if (localChannel) localChannel.close();
      if (supabaseChannel) supabaseChannel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    persistState();
  }, [persistState]);

  // Computed Views
  const costingViews: ProductCostingView[] = useMemo(() => {
    return products.map((prod) => {
      const bom = boms.find((b) => b.product_id === prod.id && b.is_active);
      let rawMaterialCost = 0;
      if (bom && bom.lines) {
        bom.lines.forEach((line) => {
          const mat = materials.find((m) => m.id === line.material_id);
          const unitCost = mat?.cost_per_unit || 0;
          rawMaterialCost += line.qty_per_unit * unitCost;
        });
      }
      const laborCost = bom?.labor_cost_per_unit || 25.0;
      const overheadPercent = bom?.overhead_percent || 10.0;
      const landedCost = (rawMaterialCost + laborCost) * (1 + overheadPercent / 100);
      const grossMargin = prod.sale_price - landedCost;

      return {
        product_id: prod.id,
        factory_id: factory.id,
        product_name: prod.name,
        sku: prod.sku,
        bom_id: bom?.id,
        raw_material_cost: Math.round(rawMaterialCost * 100) / 100,
        labor_cost: laborCost,
        overhead_percent: overheadPercent,
        landed_cost_per_piece: Math.round(landedCost * 100) / 100,
        sale_price: prod.sale_price,
        gross_margin_per_piece: Math.round(grossMargin * 100) / 100,
      };
    });
  }, [products, boms, materials, factory.id]);

  const reconciliationViews: BatchReconciliationView[] = useMemo(() => {
    return batches.map((batch) => {
      const rec = computeBatchReconciliation(
        batch.initial_qty,
        batch.current_qty,
        batch.write_offs || [],
        batch.transfers || []
      );
      return {
        batch_id: batch.id,
        factory_id: factory.id,
        batch_no: batch.batch_no,
        product_id: batch.product_id,
        current_stage: batch.current_stage,
        original_qty: batch.initial_qty,
        on_hand_qty: batch.current_qty,
        total_written_off: rec.totalWrittenOff,
        in_transit_qty: rec.inTransitQty,
        variance_qty: rec.variance,
      };
    });
  }, [batches, factory.id]);

  // Actions

  const addParty = useCallback((data: Partial<Party>): Party => {
    const newParty: Party = {
      id: crypto.randomUUID(),
      factory_id: factory.id,
      name: data.name || 'New Party',
      type: data.type || 'customer',
      phone: data.phone || '',
      gstin: data.gstin || '',
      state: data.state || factory.state,
      state_code: data.state_code || factory.state_code,
      address: data.address || '',
      balance: Number(data.balance) || 0,
      created_at: new Date().toISOString(),
    };
    setParties((prev) => [newParty, ...prev]);
    return newParty;
  }, [factory.id, factory.state, factory.state_code]);

  const addMaterial = useCallback((data: Partial<Material>): Material => {
    const newMat: Material = {
      id: crypto.randomUUID(),
      factory_id: factory.id,
      name: data.name || 'New Material',
      lot_no: data.lot_no || `LOT-${Math.floor(1000 + Math.random() * 9000)}`,
      category_id: data.category_id || categories[0]?.id,
      unit_id: data.unit_id || units[0]?.id,
      cost_per_unit: Number(data.cost_per_unit) || 0,
      qty_on_hand: Number(data.qty_on_hand) || 0,
      low_stock_threshold: Number(data.low_stock_threshold) || 20,
      created_at: new Date().toISOString(),
    };
    setMaterials((prev) => [newMat, ...prev]);
    return newMat;
  }, [factory.id, categories, units]);

  const addProduct = useCallback((data: Partial<Product>): Product => {
    const newProd: Product = {
      id: crypto.randomUUID(),
      factory_id: factory.id,
      name: data.name || 'New Product',
      sku: data.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      category_id: data.category_id || categories[0]?.id,
      unit_id: data.unit_id || units[0]?.id,
      sale_price: Number(data.sale_price) || 0,
      hsn_code: data.hsn_code || '61091000',
      gst_percent: Number(data.gst_percent) || 5.0,
      stock_qty: Number(data.stock_qty) || 0,
      low_stock_threshold: Number(data.low_stock_threshold) || 10,
      created_at: new Date().toISOString(),
    };
    setProducts((prev) => [newProd, ...prev]);
    return newProd;
  }, [factory.id, categories, units]);

  const createSaleOrder = useCallback((data: Partial<SaleOrder>, items: Array<Partial<SaleOrderItem>>): SaleOrder => {
    const orderId = crypto.randomUUID();
    const orderNumber = data.number || `SO-${new Date().getFullYear()}-${String(saleOrders.length + 1).padStart(3, '0')}`;
    
    const party = parties.find((p) => p.id === data.party_id);
    const orderItems: SaleOrderItem[] = items.map((it) => {
      const prod = products.find((p) => p.id === it.product_id);
      return {
        id: crypto.randomUUID(),
        factory_id: factory.id,
        sale_order_id: orderId,
        product_id: it.product_id,
        description: it.description || prod?.name || 'Garment item',
        hsn_code: it.hsn_code || prod?.hsn_code || '61091000',
        qty: Number(it.qty) || 1,
        price: Number(it.price) || prod?.sale_price || 0,
        gst_percent: Number(it.gst_percent) || prod?.gst_percent || 5.0,
      };
    });

    const gstItems = orderItems.map((it) => ({
      description: it.description,
      hsnCode: it.hsn_code,
      qty: it.qty,
      price: it.price,
      gstPercent: it.gst_percent,
    }));
    const gstRes = calculateGST(factory.state_code, party?.state_code || factory.state_code, gstItems);

    const newOrder: SaleOrder = {
      id: orderId,
      factory_id: factory.id,
      number: orderNumber,
      party_id: data.party_id!,
      date: data.date || new Date().toISOString().split('T')[0],
      status: 'draft',
      notes: data.notes || '',
      total_amount: gstRes.totalAmount,
      created_by: currentProfile.id,
      created_at: new Date().toISOString(),
      party,
      items: orderItems,
    };

    setSaleOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  }, [saleOrders.length, parties, products, factory.state_code, factory.id, currentProfile.id]);

  const convertSaleOrderToInvoice = useCallback((saleOrderId: string, saleType: SaleType = 'credit'): Invoice => {
    const order = saleOrders.find((so) => so.id === saleOrderId);
    if (!order) throw new Error('Sale order not found');
    if (order.status === 'invoiced') throw new Error('Order is already invoiced');

    const party = parties.find((p) => p.id === order.party_id);
    if (!party) throw new Error('Party not found');

    const items = order.items || [];
    const gstItems = items.map((it) => ({
      description: it.description,
      hsnCode: it.hsn_code,
      qty: it.qty,
      price: it.price,
      gstPercent: it.gst_percent,
    }));
    const gstRes = calculateGST(factory.state_code, party.state_code, gstItems);

    const invoiceId = crypto.randomUUID();
    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(invoices.length + 101)}`;

    const invoiceItems: InvoiceItem[] = gstRes.itemBreakdown.map((b, idx) => {
      const origItem = items[idx];
      return {
        id: crypto.randomUUID(),
        factory_id: factory.id,
        invoice_id: invoiceId,
        product_id: origItem?.product_id,
        description: b.description,
        hsn_code: b.hsnCode,
        qty: b.qty,
        price: b.price,
        gst_percent: b.gstPercent,
        taxable_value: b.taxableValue,
        cgst: b.cgst,
        sgst: b.sgst,
        igst: b.igst,
        total: b.total,
      };
    });

    const newInvoice: Invoice = {
      id: invoiceId,
      factory_id: factory.id,
      number: invoiceNumber,
      sale_order_id: order.id,
      party_id: party.id,
      date: new Date().toISOString().split('T')[0],
      status: 'sent',
      payment_status: 'unpaid',
      sale_type: saleType,
      taxable_amount: gstRes.taxableAmount,
      cgst: gstRes.cgst,
      sgst: gstRes.sgst,
      igst: gstRes.igst,
      total: gstRes.totalAmount,
      paid_amount: 0,
      created_by: currentProfile.id,
      created_at: new Date().toISOString(),
      party,
      items: invoiceItems,
    };

    setInvoices((prev) => [newInvoice, ...prev]);

    setSaleOrders((prev) =>
      prev.map((so) => (so.id === saleOrderId ? { ...so, status: 'invoiced' } : so))
    );

    setParties((prev) =>
      prev.map((p) => (p.id === party.id ? { ...p, balance: p.balance + gstRes.totalAmount } : p))
    );

    const ledgerEntries: InventoryLedger[] = [];
    items.forEach((item) => {
      if (item.product_id) {
        ledgerEntries.push({
          id: crypto.randomUUID(),
          factory_id: factory.id,
          item_type: 'product',
          item_id: item.product_id,
          change_qty: -item.qty,
          reason: `Sale Invoice Dispatch (${invoiceNumber})`,
          ref_table: 'invoices',
          ref_id: invoiceId,
          created_by: currentProfile.id,
          created_at: new Date().toISOString(),
        });

        setProducts((prev) =>
          prev.map((pr) => (pr.id === item.product_id ? { ...pr, stock_qty: pr.stock_qty - item.qty } : pr))
        );
      }
    });

    setInventoryLedger((prev) => [...ledgerEntries, ...prev]);

    return newInvoice;
  }, [saleOrders, parties, factory.state_code, factory.id, invoices.length, currentProfile.id]);

  const recordPaymentIn = useCallback((data: {
    party_id: string;
    invoice_id?: string;
    amount: number;
    mode: PaymentMode;
    reference_no?: string;
    notes?: string;
  }): PaymentIn => {
    const paymentId = crypto.randomUUID();
    const party = parties.find((p) => p.id === data.party_id);
    const invoice = data.invoice_id ? invoices.find((inv) => inv.id === data.invoice_id) : undefined;

    const newPayment: PaymentIn = {
      id: paymentId,
      factory_id: factory.id,
      invoice_id: data.invoice_id,
      party_id: data.party_id,
      mode: data.mode,
      amount: data.amount,
      date: new Date().toISOString().split('T')[0],
      reference_no: data.reference_no,
      notes: data.notes,
      recorded_by: currentProfile.id,
      created_at: new Date().toISOString(),
      party,
      invoice,
    };

    setPaymentsIn((prev) => [newPayment, ...prev]);

    setParties((prev) =>
      prev.map((p) => (p.id === data.party_id ? { ...p, balance: p.balance - data.amount } : p))
    );

    if (data.invoice_id) {
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id === data.invoice_id) {
            const newPaid = (inv.paid_amount || 0) + data.amount;
            const newStatus = newPaid >= inv.total ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
            return { ...inv, paid_amount: newPaid, payment_status: newStatus };
          }
          return inv;
        })
      );
    }

    return newPayment;
  }, [parties, invoices, factory.id, currentProfile.id]);

  const createPurchaseOrder = useCallback((data: Partial<PurchaseOrder>, items: Array<Partial<PurchaseOrderItem>>): PurchaseOrder => {
    const poId = crypto.randomUUID();
    const poNumber = data.number || `PO-${new Date().getFullYear()}-${String(purchaseOrders.length + 1).padStart(3, '0')}`;
    const party = parties.find((p) => p.id === data.party_id);

    const poItems: PurchaseOrderItem[] = items.map((it) => {
      const mat = materials.find((m) => m.id === it.material_id);
      return {
        id: crypto.randomUUID(),
        factory_id: factory.id,
        purchase_order_id: poId,
        material_id: it.material_id!,
        qty: Number(it.qty) || 1,
        price: Number(it.price) || mat?.cost_per_unit || 0,
        gst_percent: Number(it.gst_percent) || 5.0,
      };
    });

    const calcItems = poItems.map((i) => ({
      description: 'Material',
      hsnCode: '5208',
      qty: i.qty,
      price: i.price,
      gstPercent: i.gst_percent,
    }));
    const gstRes = calculateGST(factory.state_code, party?.state_code || factory.state_code, calcItems);

    const newPO: PurchaseOrder = {
      id: poId,
      factory_id: factory.id,
      number: poNumber,
      party_id: data.party_id!,
      date: data.date || new Date().toISOString().split('T')[0],
      status: 'draft',
      total_amount: gstRes.totalAmount,
      notes: data.notes || '',
      created_by: currentProfile.id,
      created_at: new Date().toISOString(),
      party,
      items: poItems,
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);
    return newPO;
  }, [purchaseOrders.length, parties, materials, factory.state_code, factory.id, currentProfile.id]);

  const postPurchaseBill = useCallback((
    poId: string,
    billNumber: string,
    items: Array<{ material_id: string; qty: number; price: number; gst_percent: number }>
  ): PurchaseBill => {
    const po = purchaseOrders.find((p) => p.id === poId);
    const party = parties.find((p) => p.id === po?.party_id);
    if (!party) throw new Error('Party not found for PO');

    const billId = crypto.randomUUID();
    const calcItems = items.map((it) => ({
      description: 'Material item',
      hsnCode: '5208',
      qty: it.qty,
      price: it.price,
      gstPercent: it.gst_percent,
    }));
    const gstRes = calculateGST(factory.state_code, party.state_code, calcItems);

    const billItems: PurchaseBillItem[] = gstRes.itemBreakdown.map((b, idx) => {
      const orig = items[idx];
      return {
        id: crypto.randomUUID(),
        factory_id: factory.id,
        purchase_bill_id: billId,
        material_id: orig.material_id,
        qty: b.qty,
        price: b.price,
        gst_percent: b.gstPercent,
        taxable_value: b.taxableValue,
        cgst: b.cgst,
        sgst: b.sgst,
        igst: b.igst,
        total: b.total,
      };
    });

    const newBill: PurchaseBill = {
      id: billId,
      factory_id: factory.id,
      number: billNumber || `PB-${Math.floor(1000 + Math.random() * 9000)}`,
      purchase_order_id: poId,
      party_id: party.id,
      date: new Date().toISOString().split('T')[0],
      taxable_amount: gstRes.taxableAmount,
      cgst: gstRes.cgst,
      sgst: gstRes.sgst,
      igst: gstRes.igst,
      total: gstRes.totalAmount,
      paid_amount: 0,
      payment_status: 'unpaid',
      created_by: currentProfile.id,
      created_at: new Date().toISOString(),
      party,
      items: billItems,
    };

    setPurchaseBills((prev) => [newBill, ...prev]);

    setPurchaseOrders((prev) =>
      prev.map((p) => (p.id === poId ? { ...p, status: 'billed' } : p))
    );

    setParties((prev) =>
      prev.map((p) => (p.id === party.id ? { ...p, balance: p.balance - gstRes.totalAmount } : p))
    );

    const ledgerEntries: InventoryLedger[] = [];
    items.forEach((item) => {
      ledgerEntries.push({
        id: crypto.randomUUID(),
        factory_id: factory.id,
        item_type: 'material',
        item_id: item.material_id,
        change_qty: item.qty,
        reason: `Purchase Bill Goods Receipt (${newBill.number})`,
        ref_table: 'purchase_bills',
        ref_id: billId,
        created_by: currentProfile.id,
        created_at: new Date().toISOString(),
      });

      setMaterials((prev) =>
        prev.map((m) =>
          m.id === item.material_id
            ? { ...m, qty_on_hand: m.qty_on_hand + item.qty, cost_per_unit: item.price }
            : m
        )
      );
    });

    setInventoryLedger((prev) => [...ledgerEntries, ...prev]);

    return newBill;
  }, [purchaseOrders, parties, factory.state_code, factory.id, currentProfile.id]);

  const recordPaymentOut = useCallback((data: {
    party_id: string;
    purchase_bill_id?: string;
    amount: number;
    mode: PaymentMode;
    reference_no?: string;
    notes?: string;
  }): PaymentOut => {
    const paymentId = crypto.randomUUID();
    const party = parties.find((p) => p.id === data.party_id);
    const purchase_bill = data.purchase_bill_id ? purchaseBills.find((pb) => pb.id === data.purchase_bill_id) : undefined;

    const newPayment: PaymentOut = {
      id: paymentId,
      factory_id: factory.id,
      purchase_bill_id: data.purchase_bill_id,
      party_id: data.party_id,
      mode: data.mode,
      amount: data.amount,
      date: new Date().toISOString().split('T')[0],
      reference_no: data.reference_no,
      notes: data.notes,
      recorded_by: currentProfile.id,
      created_at: new Date().toISOString(),
      party,
      purchase_bill,
    };

    setPaymentsOut((prev) => [newPayment, ...prev]);

    setParties((prev) =>
      prev.map((p) => (p.id === data.party_id ? { ...p, balance: p.balance + data.amount } : p))
    );

    if (data.purchase_bill_id) {
      setPurchaseBills((prev) =>
        prev.map((pb) => {
          if (pb.id === data.purchase_bill_id) {
            const newPaid = (pb.paid_amount || 0) + data.amount;
            const newStatus = newPaid >= pb.total ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
            return { ...pb, paid_amount: newPaid, payment_status: newStatus };
          }
          return pb;
        })
      );
    }

    return newPayment;
  }, [parties, purchaseBills, factory.id, currentProfile.id]);

  // Production Floor Operations (Make Module)
  const createProductionJob = useCallback((data: Partial<ProductionJob>): ProductionJob => {
    const jobId = crypto.randomUUID();
    const newJob: ProductionJob = {
      id: jobId,
      factory_id: factory.id,
      number: data.number || `JOB-${new Date().getFullYear()}-${String(productionJobs.length + 1).padStart(3, '0')}`,
      party_id: data.party_id,
      target_qty: Number(data.target_qty) || 100,
      status: 'open',
      due_date: data.due_date,
      notes: data.notes,
      created_by: currentProfile.id,
      created_at: new Date().toISOString(),
      party: parties.find((p) => p.id === data.party_id),
    };
    setProductionJobs((prev) => [newJob, ...prev]);
    return newJob;
  }, [productionJobs.length, factory.id, currentProfile.id, parties]);

  // 100% TYPABLE PRODUCTION BATCH CREATOR
  const createProductionBatch = useCallback((
    data: {
      batch_no?: string;
      style?: string;
      article_code?: string;
      product_name?: string;
      colour?: string;
      fabric?: string;
      product_id?: string;
      production_job_id?: string;
      notes?: string;
    },
    sizeLines: Array<{ size: string; qty: number; colour?: string }>
  ): ProductionBatch => {
    const batchId = crypto.randomUUID();
    const batchNo = data.batch_no?.trim() || `BATCH-${Math.floor(2600 + Math.random() * 900)}`;
    const styleCode = data.style?.trim() || data.article_code?.trim() || 'Style-01';
    const prodTitle = data.product_name?.trim() || styleCode;
    const colourName = data.colour?.trim() || 'Standard';
    const fabricName = data.fabric?.trim() || 'Cotton Fabric';

    // Auto-create product in catalog if not existing so there's zero blocking friction
    let targetProductId = data.product_id;
    if (!targetProductId) {
      const existing = products.find((p) => p.name.toLowerCase() === prodTitle.toLowerCase() || p.sku.toLowerCase() === styleCode.toLowerCase());
      if (existing) {
        targetProductId = existing.id;
      } else {
        const newP = addProduct({
          name: prodTitle,
          sku: styleCode,
          sale_price: 450,
          hsn_code: '61091000',
          gst_percent: 5.0,
          stock_qty: 0,
        });
        targetProductId = newP.id;
      }
    }

    const sizes: BatchSizeLine[] = sizeLines.map((s) => ({
      id: crypto.randomUUID(),
      factory_id: factory.id,
      batch_id: batchId,
      colour: s.colour || colourName,
      size: String(s.size).trim(),
      qty: Number(s.qty) || 0,
    }));

    const totalCutQty = sizes.reduce((sum, s) => sum + s.qty, 0);

    const newBatch: ProductionBatch = {
      id: batchId,
      factory_id: factory.id,
      batch_no: batchNo,
      production_job_id: data.production_job_id,
      product_id: targetProductId,
      style: styleCode,
      article_code: styleCode,
      product_name: prodTitle,
      colour: colourName,
      fabric: fabricName,
      current_stage: 'cutting',
      initial_qty: totalCutQty > 0 ? totalCutQty : 100,
      current_qty: totalCutQty > 0 ? totalCutQty : 100,
      qr_code_url: `https://factoryos.app/qr/${batchNo}`,
      created_by: currentProfile.id,
      created_at: new Date().toISOString(),
      product: products.find((p) => p.id === targetProductId),
      job: productionJobs.find((j) => j.id === data.production_job_id),
      size_lines: sizes,
      transfers: [],
      write_offs: [],
    };

    setBatches((prev) => [newBatch, ...prev]);
    return newBatch;
  }, [factory.id, currentProfile.id, products, productionJobs, addProduct]);

  // Floor Loop Step 1: Move Stage
  const moveBatchStage = useCallback((
    batchId: string,
    toStage: FactoryStage,
    sentQty: number,
    isOutsideVendor: boolean = false,
    vendorId?: string,
    notes?: string
  ): BatchStageTransfer => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) throw new Error('Batch not found');
    if (sentQty <= 0 || sentQty > batch.current_qty) {
      throw new Error(`Invalid sent quantity. Available on hand: ${batch.current_qty}`);
    }

    const transferId = crypto.randomUUID();
    const newTransfer: BatchStageTransfer = {
      id: transferId,
      factory_id: factory.id,
      batch_id: batchId,
      from_stage: batch.current_stage,
      to_stage: toStage,
      is_outside_vendor: isOutsideVendor,
      vendor_id: vendorId,
      sent_qty: sentQty,
      status: 'awaiting_receive',
      sent_by: currentProfile.id,
      sent_at: new Date().toISOString(),
      notes,
      vendor: vendorId ? parties.find((p) => p.id === vendorId) : undefined,
    };

    setBatches((prev) =>
      prev.map((b) => {
        if (b.id === batchId) {
          const transfers = [newTransfer, ...(b.transfers || [])];
          return {
            ...b,
            current_qty: b.current_qty - sentQty,
            transfers,
          };
        }
        return b;
      })
    );

    return newTransfer;
  }, [batches, factory.id, currentProfile.id, parties]);

  // Floor Loop Step 2: Receive Stage
  const receiveBatchStage = useCallback((
    transferId: string,
    receivedQty: number,
    notes?: string
  ): { success: boolean; variance: number } => {
    let variance = 0;

    setBatches((prev) =>
      prev.map((b) => {
        const transfer = (b.transfers || []).find((t) => t.id === transferId);
        if (!transfer) return b;

        variance = transfer.sent_qty - receivedQty;

        const updatedTransfers = (b.transfers || []).map((t) => {
          if (t.id === transferId) {
            return {
              ...t,
              received_qty: receivedQty,
              status: 'received' as const,
              received_by: currentProfile.id,
              received_at: new Date().toISOString(),
              notes: notes ? `${t.notes || ''} | Recv: ${notes}` : t.notes,
            };
          }
          return t;
        });

        const newWriteOffs = [...(b.write_offs || [])];
        if (variance > 0) {
          newWriteOffs.push({
            id: crypto.randomUUID(),
            factory_id: factory.id,
            batch_id: b.id,
            stage: transfer.from_stage,
            qty: variance,
            reason: `Transit Loss / Variance on Receive (${transfer.from_stage} -> ${transfer.to_stage})`,
            recorded_by: currentProfile.id,
            recorded_at: new Date().toISOString(),
          });
        }

        return {
          ...b,
          current_stage: transfer.to_stage,
          current_qty: b.current_qty + receivedQty,
          transfers: updatedTransfers,
          write_offs: newWriteOffs,
        };
      })
    );

    return { success: true, variance };
  }, [factory.id, currentProfile.id]);

  // Write-off / Scrap recording
  const recordBatchWriteOff = useCallback((
    batchId: string,
    stage: FactoryStage,
    qty: number,
    reason: string
  ): BatchWriteOff => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) throw new Error('Batch not found');
    if (qty <= 0 || qty > batch.current_qty) {
      throw new Error(`Invalid scrap quantity. Available on hand: ${batch.current_qty}`);
    }

    const writeOffId = crypto.randomUUID();
    const newWriteOff: BatchWriteOff = {
      id: writeOffId,
      factory_id: factory.id,
      batch_id: batchId,
      stage,
      qty,
      reason,
      recorded_by: currentProfile.id,
      recorded_at: new Date().toISOString(),
    };

    setBatches((prev) =>
      prev.map((b) => {
        if (b.id === batchId) {
          return {
            ...b,
            current_qty: b.current_qty - qty,
            write_offs: [newWriteOff, ...(b.write_offs || [])],
          };
        }
        return b;
      })
    );

    return newWriteOff;
  }, [batches, factory.id, currentProfile.id]);

  // -------------------------------------------------------------------------
  // ROAD CHALLANS & OUTSIDE JOB WORK ACTIONS
  // -------------------------------------------------------------------------

  const createJobWorker = useCallback((data: {
    name: string;
    phone: string;
    address?: string;
    process_type: JobWorkerProcess;
    default_rate?: number;
  }): JobWorker => {
    const worker: JobWorker = {
      id: crypto.randomUUID(),
      factory_id: factory.id,
      name: data.name.trim(),
      phone: data.phone.trim(),
      address: data.address?.trim() || '',
      process_type: data.process_type || 'making',
      default_rate: Number(data.default_rate) || 0,
      created_at: new Date().toISOString(),
    };
    setJobWorkers((prev) => [worker, ...prev]);
    return worker;
  }, [factory.id]);

  const createRoadChallan = useCallback((data: {
    job_worker_id: string;
    process_type: JobWorkerProcess;
    challan_date?: string;
    notes?: string;
    photo_url?: string;
    lots: Array<{
      lot_no: string;
      article: string;
      color: string;
      rate_per_pc?: number;
      sizes: Array<{ size: string; dispatched_qty: number }>;
    }>;
  }): RoadChallan => {
    const challanId = crypto.randomUUID();
    const challanNo = `RC-${new Date().getFullYear()}-${String(roadChallans.length + 101).padStart(3, '0')}`;
    const worker = jobWorkers.find((w) => w.id === data.job_worker_id);

    const lots: RoadChallanLot[] = data.lots.map((l) => {
      const lotId = crypto.randomUUID();
      const sizes: RoadChallanSizeLine[] = l.sizes.map((s) => ({
        id: crypto.randomUUID(),
        lot_id: lotId,
        size: s.size,
        dispatched_qty: Number(s.dispatched_qty) || 0,
        returned_qty: null,
        shortage_qty: null,
      }));

      return {
        id: lotId,
        factory_id: factory.id,
        challan_id: challanId,
        lot_no: l.lot_no || 'LOT-01',
        article: l.article || 'Article',
        color: l.color || 'Standard',
        rate_per_pc: Number(l.rate_per_pc) || worker?.default_rate || 0,
        sizes,
      };
    });

    const newChallan: RoadChallan = {
      id: challanId,
      factory_id: factory.id,
      challan_no: challanNo,
      challan_date: data.challan_date || new Date().toISOString().split('T')[0],
      job_worker_id: data.job_worker_id,
      process_type: data.process_type,
      status: 'dispatched',
      photo_url: data.photo_url,
      notes: data.notes,
      created_by: currentProfile.id,
      created_at: new Date().toISOString(),
      job_worker: worker,
      lots,
    };

    setRoadChallans((prev) => [newChallan, ...prev]);

    // Automatically register entry into Outside Job Work Table
    lots.forEach((lot) => {
      const totalPcs = lot.sizes.reduce((sum, s) => sum + s.dispatched_qty, 0);
      const approxCost = totalPcs * (lot.rate_per_pc || 0);

      const jobWorkEntry: OutsideJobWork = {
        id: crypto.randomUUID(),
        factory_id: factory.id,
        challan_id: challanId,
        vendor_name: worker?.name || 'Outside Vendor',
        phone: worker?.phone || '',
        process: data.process_type,
        batch_no: lot.lot_no,
        article: lot.article,
        pieces_sent: totalPcs,
        pieces_returned: 0,
        rate_per_piece: lot.rate_per_pc,
        total_approx_cost: approxCost,
        dispatch_date: newChallan.challan_date,
        status: 'sent',
        variance: 0,
        created_at: new Date().toISOString(),
      };
      setOutsideJobWorks((prev) => [jobWorkEntry, ...prev]);
    });

    return newChallan;
  }, [roadChallans.length, jobWorkers, factory.id, currentProfile.id]);

  const reconcileRoadChallan = useCallback((
    challanId: string,
    reconciliationData: {
      completion_date: string;
      stamp_image?: string;
      returnedSizes: Array<{ lot_id: string; size: string; returned_qty: number }>;
    }
  ): RoadChallan => {
    let updatedChallan: RoadChallan | undefined;

    setRoadChallans((prev) =>
      prev.map((ch) => {
        if (ch.id !== challanId) return ch;

        let allCompleted = true;
        let anyReturned = false;

        const updatedLots = (ch.lots || []).map((lot) => {
          const updatedSizes = lot.sizes.map((sz) => {
            const match = reconciliationData.returnedSizes.find(
              (r) => r.lot_id === lot.id && r.size === sz.size
            );

            if (match !== undefined && match.returned_qty !== null) {
              anyReturned = true;
              const ret = Number(match.returned_qty) || 0;
              const shortage = sz.dispatched_qty - ret;
              return {
                ...sz,
                returned_qty: ret,
                shortage_qty: shortage,
              };
            }

            allCompleted = false;
            return sz;
          });

          return { ...lot, sizes: updatedSizes };
        });

        const status: 'dispatched' | 'partially_returned' | 'completed' = allCompleted
          ? 'completed'
          : anyReturned
          ? 'partially_returned'
          : 'dispatched';

        updatedChallan = {
          ...ch,
          status,
          completion_date: reconciliationData.completion_date,
          stamp_image: reconciliationData.stamp_image,
          lots: updatedLots,
        };

        return updatedChallan;
      })
    );

    // Sync outside job works table
    setOutsideJobWorks((prev) =>
      prev.map((jw) => {
        if (jw.challan_id !== challanId) return jw;
        const challan = roadChallans.find((c) => c.id === challanId);
        const lot = challan?.lots?.find((l) => l.lot_no === jw.batch_no);
        if (!lot) return jw;

        const returnedTotal = lot.sizes.reduce(
          (sum, s) => sum + (s.returned_qty || 0),
          0
        );
        const variance = jw.pieces_sent - returnedTotal;

        return {
          ...jw,
          pieces_returned: returnedTotal,
          variance,
          actual_return_date: reconciliationData.completion_date,
          status: variance === 0 && returnedTotal > 0 ? 'completed' : 'partially_received',
        };
      })
    );

    return updatedChallan!;
  }, [roadChallans]);

  const addOutsideJobWork = useCallback((data: Partial<OutsideJobWork>): OutsideJobWork => {
    const entry: OutsideJobWork = {
      id: crypto.randomUUID(),
      factory_id: factory.id,
      vendor_name: data.vendor_name || 'Outside Vendor',
      phone: data.phone || '',
      process: data.process || 'making',
      batch_no: data.batch_no || `LOT-${Math.floor(1000 + Math.random() * 9000)}`,
      article: data.article || 'Style',
      pieces_sent: Number(data.pieces_sent) || 100,
      pieces_returned: Number(data.pieces_returned) || 0,
      rate_per_piece: Number(data.rate_per_piece) || 15,
      total_approx_cost: (Number(data.pieces_sent) || 100) * (Number(data.rate_per_piece) || 15),
      dispatch_date: data.dispatch_date || new Date().toISOString().split('T')[0],
      expected_return_date: data.expected_return_date,
      status: data.status || 'sent',
      variance: Number(data.variance) || 0,
      notes: data.notes,
      created_at: new Date().toISOString(),
    };
    setOutsideJobWorks((prev) => [entry, ...prev]);
    return entry;
  }, [factory.id]);

  const updateOutsideJobWork = useCallback((id: string, data: Partial<OutsideJobWork>) => {
    setOutsideJobWorks((prev) =>
      prev.map((jw) => (jw.id === id ? { ...jw, ...data } : jw))
    );
  }, []);

  // BOM Management
  const createBOM = useCallback((
    productId: string,
    name: string,
    laborCost: number,
    overheadPercent: number,
    lines: Array<{ material_id: string; qty_per_unit: number; notes?: string }>
  ): BOM => {
    const bomId = crypto.randomUUID();
    const bomLines: BOMLine[] = lines.map((l) => ({
      id: crypto.randomUUID(),
      factory_id: factory.id,
      bom_id: bomId,
      material_id: l.material_id,
      qty_per_unit: Number(l.qty_per_unit) || 1,
      notes: l.notes,
      material: materials.find((m) => m.id === l.material_id),
    }));

    const newBOM: BOM = {
      id: bomId,
      factory_id: factory.id,
      product_id: productId,
      name,
      labor_cost_per_unit: laborCost,
      overhead_percent: overheadPercent,
      is_active: true,
      created_at: new Date().toISOString(),
      lines: bomLines,
      product: products.find((p) => p.id === productId),
    };

    setBoms((prev) => [newBOM, ...prev]);
    return newBOM;
  }, [factory.id, materials, products]);

  // Fabric Estimation Engine
  const generateFabricEstimate = useCallback((bomId: string, requestedQty: number): FabricEstimate => {
    const bom = boms.find((b) => b.id === bomId);
    if (!bom) throw new Error('BOM not found');

    let totalRawCost = 0;
    let fabricMeters = 0;
    let threadCones = 0;
    let polybags = 0;
    let labels = 0;

    const breakdown = (bom.lines || []).map((line) => {
      const mat = materials.find((m) => m.id === line.material_id);
      const needed = line.qty_per_unit * requestedQty;
      const cost = needed * (mat?.cost_per_unit || 0);
      totalRawCost += cost;

      if (mat?.name.toLowerCase().includes('cotton') || mat?.name.toLowerCase().includes('fabric')) {
        fabricMeters += needed;
      } else if (mat?.name.toLowerCase().includes('thread')) {
        threadCones += needed;
      } else if (mat?.name.toLowerCase().includes('polybag')) {
        polybags += needed;
      } else if (mat?.name.toLowerCase().includes('label')) {
        labels += needed;
      }

      return {
        material_name: mat?.name || 'Raw Material',
        qty_needed: Math.round(needed * 100) / 100,
        unit: mat?.unit_id ? (units.find((u) => u.id === mat.unit_id)?.symbol || 'units') : 'units',
        cost: Math.round(cost * 100) / 100,
      };
    });

    const laborCost = (bom.labor_cost_per_unit || 25.0) * requestedQty;
    const overheadCost = (totalRawCost + laborCost) * ((bom.overhead_percent || 10.0) / 100.0);
    const totalCost = totalRawCost + laborCost + overheadCost;

    const estimate: FabricEstimate = {
      id: crypto.randomUUID(),
      factory_id: factory.id,
      bom_id: bomId,
      requested_qty: requestedQty,
      result: {
        total_fabric_meters: Math.round(fabricMeters * 100) / 100,
        total_thread_cones: Math.round(threadCones * 100) / 100,
        total_polybags: Math.round(polybags * 100) / 100,
        total_labels: Math.round(labels * 100) / 100,
        estimated_raw_material_cost: Math.round(totalRawCost * 100) / 100,
        estimated_labor_cost: Math.round(laborCost * 100) / 100,
        estimated_overhead_cost: Math.round(overheadCost * 100) / 100,
        estimated_total_cost: Math.round(totalCost * 100) / 100,
        estimated_cost_per_piece: Math.round((totalCost / requestedQty) * 100) / 100,
        line_breakdown: breakdown,
      },
      requested_by: currentProfile.id,
      created_at: new Date().toISOString(),
    };

    setFabricEstimates((prev) => [estimate, ...prev]);
    return estimate;
  }, [boms, materials, units, factory.id, currentProfile.id]);

  // Voice Command Processing Agent
  const executeVoiceCommand = useCallback(async (transcript: string): Promise<{
    success: boolean;
    actionTaken: string;
    error?: string;
  }> => {
    const text = transcript.toLowerCase();
    let actionTaken = 'None';
    let status: VoiceCmdStatus = 'pending';
    let errMessage: string | undefined;

    try {
      if (text.includes('move') || text.includes('bhejo') || text.includes('transfer') || text.includes('shift')) {
        const batchMatch = text.match(/batch\s*[-#]?\s*([0-9a-z]+)/i);
        const batchNum = batchMatch ? batchMatch[1].toUpperCase() : '';
        const targetBatch = batches.find((b) => b.batch_no.toUpperCase().includes(batchNum));

        let toStage: FactoryStage = 'stitching';
        if (text.includes('iron') || text.includes('press') || text.includes('finish')) toStage = 'ironing';
        else if (text.includes('qc') || text.includes('check') || text.includes('inspect')) toStage = 'qc';
        else if (text.includes('pack')) toStage = 'packing';
        else if (text.includes('dispatch')) toStage = 'dispatch';
        else if (text.includes('stitch')) toStage = 'stitching';

        const qtyMatch = text.match(/(\d+)\s*(pcs|pieces|units|trolley)?/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : targetBatch?.current_qty || 0;

        if (targetBatch && qty > 0) {
          moveBatchStage(targetBatch.id, toStage, Math.min(qty, targetBatch.current_qty), false, undefined, `Voice Command: ${transcript}`);
          actionTaken = `Moved ${qty} pcs of ${targetBatch.batch_no} to ${toStage.toUpperCase()}`;
          status = 'executed';
        } else {
          status = 'needs_review';
          actionTaken = 'Ambiguous Move Parameters';
          errMessage = 'Could not identify batch number or valid quantity in voice command';
        }
      } else if (text.includes('receive') || text.includes('recv') || text.includes('accept') || text.includes('prapt')) {
        const pendingTransfers = batches.flatMap((b) => b.transfers || []).filter((t) => t.status === 'awaiting_receive');
        if (pendingTransfers.length > 0) {
          const t = pendingTransfers[0];
          receiveBatchStage(t.id, t.sent_qty, `Voice Command confirmed: ${transcript}`);
          actionTaken = `Confirmed receipt of transfer #${t.id.slice(0, 6)} (${t.sent_qty} pcs)`;
          status = 'executed';
        } else {
          status = 'needs_review';
          actionTaken = 'No pending transfers to receive';
        }
      } else if (text.includes('scrap') || text.includes('reject') || text.includes('defect') || text.includes('write off')) {
        const batchMatch = text.match(/batch\s*[-#]?\s*([0-9a-z]+)/i);
        const batchNum = batchMatch ? batchMatch[1].toUpperCase() : '';
        const targetBatch = batches.find((b) => b.batch_no.toUpperCase().includes(batchNum)) || batches[0];

        const qtyMatch = text.match(/(\d+)\s*(pcs|pieces|units)?/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

        if (targetBatch) {
          recordBatchWriteOff(targetBatch.id, targetBatch.current_stage, qty, `Voice Logged Defect: ${transcript}`);
          actionTaken = `Recorded scrap of ${qty} pcs on ${targetBatch.batch_no}`;
          status = 'executed';
        } else {
          status = 'needs_review';
          actionTaken = 'Batch not identified';
        }
      } else {
        status = 'needs_review';
        actionTaken = 'Unrecognized action phrasing';
      }
    } catch (err: unknown) {
      status = 'failed';
      errMessage = err instanceof Error ? err.message : String(err);
      actionTaken = `Execution Failed: ${errMessage}`;
    }

    const logEntry: VoiceCommandLog = {
      id: crypto.randomUUID(),
      factory_id: factory.id,
      user_id: currentProfile.id,
      transcript,
      action_taken: actionTaken,
      status,
      error_message: errMessage,
      created_at: new Date().toISOString(),
    };
    setVoiceLogs((prev) => [logEntry, ...prev]);

    return {
      success: status === 'executed',
      actionTaken,
      error: errMessage,
    };
  }, [batches, currentProfile.id, factory.id, moveBatchStage, receiveBatchStage, recordBatchWriteOff]);

  // Direct 1-Click WhatsApp + Cloud API Dispatcher
  const sendWhatsAppNotification = useCallback(async (
    recipientPhone: string,
    recipientName: string,
    message: string,
    refTable?: string,
    refId?: string
  ): Promise<{ log: WhatsAppLog; directUrl: string }> => {
    const logId = crypto.randomUUID();
    const cleanPhone = recipientPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('91') || cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone}`;
    const directUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;

    let apiStatus: 'queued' | 'sent' | 'delivered' | 'failed' = 'sent';
    let payload: Record<string, unknown> = { directUrl };

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: phoneWithCountry,
          recipientName,
          message,
          refTable,
          refId,
        }),
      });
      const data = await res.json();
      payload = { ...payload, apiResponse: data };
      if (!res.ok) apiStatus = 'failed';
    } catch (err: unknown) {
      // Fallback
    }

    const log: WhatsAppLog = {
      id: logId,
      factory_id: factory.id,
      recipient_phone: recipientPhone,
      recipient_name: recipientName,
      message,
      ref_table: refTable,
      ref_id: refId,
      status: apiStatus,
      response_payload: payload,
      sent_at: new Date().toISOString(),
    };

    setWhatsAppLogs((prev) => [log, ...prev]);
    return { log, directUrl };
  }, [factory.id]);

  // Bulk Data Importer
  const importBulkEntities = useCallback((
    entityType: 'parties' | 'materials' | 'products',
    rows: Array<Record<string, unknown>>
  ): { successCount: number; errors: Array<{ row: number; error: string }> } => {
    let successCount = 0;
    const errors: Array<{ row: number; error: string }> = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 1;
      try {
        if (entityType === 'parties') {
          if (!row.name) throw new Error('Party Name is required');
          addParty({
            name: String(row.name),
            type: (row.type as any) || 'customer',
            phone: String(row.phone || ''),
            gstin: String(row.gstin || ''),
            state: String(row.state || factory.state),
            address: String(row.address || ''),
            balance: Number(row.balance) || 0,
          });
          successCount++;
        } else if (entityType === 'materials') {
          if (!row.name) throw new Error('Material Name is required');
          addMaterial({
            name: String(row.name),
            lot_no: String(row.lot_no || `LOT-${Math.floor(1000 + Math.random() * 9000)}`),
            cost_per_unit: Number(row.cost_per_unit) || 0,
            qty_on_hand: Number(row.qty_on_hand) || 0,
            low_stock_threshold: Number(row.low_stock_threshold) || 20,
          });
          successCount++;
        } else if (entityType === 'products') {
          if (!row.name) throw new Error('Product Name is required');
          addProduct({
            name: String(row.name),
            sku: String(row.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`),
            sale_price: Number(row.sale_price) || 0,
            hsn_code: String(row.hsn_code || '61091000'),
            gst_percent: Number(row.gst_percent) || 5.0,
            stock_qty: Number(row.stock_qty) || 0,
          });
          successCount++;
        }
      } catch (err: unknown) {
        errors.push({
          row: rowNum,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });

    return { successCount, errors };
  }, [addParty, addMaterial, addProduct, factory.state]);

  return (
    <FactoryContext.Provider
      value={{
        factory,
        updateFactory,
        profiles,
        currentProfile,
        switchProfile: setCurrentProfileId,
        parties,
        categories,
        units,
        products,
        services,
        saleOrders,
        invoices,
        paymentsIn,
        purchaseOrders,
        purchaseBills,
        paymentsOut,
        materials,
        boms,
        fabricEstimates,
        packingLists,
        inventoryLedger,
        productionJobs,
        batches,
        jobWorkers,
        roadChallans,
        outsideJobWorks,
        whatsAppLogs,
        voiceLogs,
        costingViews,
        reconciliationViews,
        addParty,
        addMaterial,
        addProduct,
        createSaleOrder,
        convertSaleOrderToInvoice,
        recordPaymentIn,
        createPurchaseOrder,
        postPurchaseBill,
        recordPaymentOut,
        createProductionJob,
        createProductionBatch,
        moveBatchStage,
        receiveBatchStage,
        recordBatchWriteOff,
        createJobWorker,
        createRoadChallan,
        reconcileRoadChallan,
        addOutsideJobWork,
        updateOutsideJobWork,
        createBOM,
        generateFabricEstimate,
        executeVoiceCommand,
        sendWhatsAppNotification,
        importBulkEntities,
        resetToCleanSlate,
      }}
    >
      {children}
    </FactoryContext.Provider>
  );
}

export function useFactory() {
  const context = useContext(FactoryContext);
  if (!context) {
    throw new Error('useFactory must be used within a FactoryProvider');
  }
  return context;
}
