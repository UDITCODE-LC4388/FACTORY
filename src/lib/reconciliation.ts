import { FactoryStage } from '@/types/database.types';

export interface BatchTraceabilityCheck {
  batchId: string;
  batchNo: string;
  originalQty: number;
  onHandQty: number;
  totalWrittenOff: number;
  inTransitQty: number;
  accountedTotal: number;
  variance: number;
  isBalanced: boolean;
  stageBreakdown: {
    currentStage: FactoryStage;
    writeOffsByStage: Record<FactoryStage, number>;
  };
}

export const STAGE_ORDER: FactoryStage[] = [
  'cutting',
  'stitching',
  'ironing',
  'qc',
  'packing',
  'dispatch',
];

export const STAGE_CONFIG: Record<
  FactoryStage,
  { label: string; color: string; bgLight: string; icon: string }
> = {
  cutting: {
    label: 'Cutting',
    color: 'text-amber-700 dark:text-amber-400',
    bgLight: 'bg-amber-500/10 border-amber-500/30',
    icon: 'Scissors',
  },
  stitching: {
    label: 'Stitching',
    color: 'text-blue-700 dark:text-blue-400',
    bgLight: 'bg-blue-500/10 border-blue-500/30',
    icon: 'Shirt',
  },
  ironing: {
    label: 'Ironing & Finishing',
    color: 'text-cyan-700 dark:text-cyan-400',
    bgLight: 'bg-cyan-500/10 border-cyan-500/30',
    icon: 'Sparkles',
  },
  qc: {
    label: 'Quality Check (QC)',
    color: 'text-purple-700 dark:text-purple-400',
    bgLight: 'bg-purple-500/10 border-purple-500/30',
    icon: 'CheckSquare',
  },
  packing: {
    label: 'Packing',
    color: 'text-emerald-700 dark:text-emerald-400',
    bgLight: 'bg-emerald-500/10 border-emerald-500/30',
    icon: 'Package',
  },
  dispatch: {
    label: 'Dispatch / Finished',
    color: 'text-rose-700 dark:text-rose-400',
    bgLight: 'bg-rose-500/10 border-rose-500/30',
    icon: 'Truck',
  },
};

export function getNextStage(current: FactoryStage): FactoryStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export function getPreviousStage(current: FactoryStage): FactoryStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx <= 0) return null;
  return STAGE_ORDER[idx - 1];
}

export function computeBatchReconciliation(
  initialQty: number,
  currentQty: number,
  writeOffs: Array<{ stage: FactoryStage; qty: number }>,
  inTransitTransfers: Array<{ sent_qty: number; status: string }>
): {
  totalWrittenOff: number;
  inTransitQty: number;
  accountedTotal: number;
  variance: number;
  isBalanced: boolean;
} {
  const totalWrittenOff = writeOffs.reduce((sum, w) => sum + (Number(w.qty) || 0), 0);
  const inTransitQty = inTransitTransfers
    .filter((t) => t.status === 'awaiting_receive')
    .reduce((sum, t) => sum + (Number(t.sent_qty) || 0), 0);

  const accountedTotal = currentQty + totalWrittenOff + inTransitQty;
  const variance = initialQty - accountedTotal;

  return {
    totalWrittenOff,
    inTransitQty,
    accountedTotal,
    variance,
    isBalanced: Math.abs(variance) < 0.001,
  };
}
