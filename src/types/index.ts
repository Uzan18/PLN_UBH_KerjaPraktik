// Shared TypeScript types and enums for SIAT

// ---- Status & Judgement ----

export type JudgementLabel = 'GOOD' | 'FAIR' | 'POOR' | 'BAD' | 'NA';
export type DataStatus = 'DRAFT' | 'SUBMITTED' | 'VALIDATED' | 'REJECTED';
export type UserRole = 'VIEWER' | 'INPUT' | 'QC' | 'ADMIN';

// Severity order: BAD (worst) -> POOR -> FAIR -> GOOD (best)
export const JUDGEMENT_SEVERITY: Record<JudgementLabel, number> = {
  BAD: 4,
  POOR: 3,
  FAIR: 2,
  GOOD: 1,
  NA: 0,
};

export const SCORE_TO_JUDGEMENT: Record<number, JudgementLabel> = {
  5: 'GOOD',
  4: 'FAIR',
  2: 'POOR',
  1: 'BAD',
};

// ---- Status Colors (from Stitch design) ----

export const STATUS_COLORS: Record<JudgementLabel, string> = {
  GOOD: '#22C55E',
  FAIR: '#EAB308',
  POOR: '#F97316',
  BAD: '#EF4444',
  NA: '#94A3B8',
};

export const DATA_STATUS_COLORS: Record<DataStatus, string> = {
  DRAFT: '#94A3B8',
  SUBMITTED: '#3B82F6',
  VALIDATED: '#22C55E',
  REJECTED: '#EF4444',
};

// ---- UI Types ----

export interface KpiData {
  totalAssets: number;
  totalRecords: number;
  goodCount: number;
  fairCount: number;
  poorCount: number;
  badCount: number;
}

export interface MatrixCell {
  testTypeName: string;
  testTypeId: string;
  judgement: JudgementLabel;
}

export interface MatrixRow {
  assetId: string;
  assetName: string;
  ubpName: string;
  equipmentType?: string;
  testYear?: number;
  cells: MatrixCell[];
}

export interface AssetDetail {
  id: string;
  name: string;
  equipmentType: string;
  mfgYear: number | null;
  vectorGroup: string | null;
  serialNumber: string | null;
  ubpName: string;
  overallScore: number | null;
  overallJudgement: JudgementLabel;
}

export interface ParameterResult {
  parameterId: string;
  parameterName: string;
  unit: string | null;
  value: number | null;
  isNotApplicable: boolean;
  score: number | null;
  judgement: JudgementLabel | null;
  goodThreshold: string | null;
  fairThreshold: string | null;
  poorThreshold: string | null;
  badThreshold: string | null;
}

export interface TestTypeStatus {
  testTypeId: string;
  testTypeName: string;
  judgement: JudgementLabel;
  parameters: ParameterResult[];
}

export interface ValidationQueueItem {
  sessionId: string;
  assetName: string;
  assetCode: string;
  testTypeName: string;
  status: DataStatus;
  createdByName: string;
  createdByInitials: string;
  submittedAt: string;
}

export interface CriteriaRow {
  parameterId: string;
  parameterName: string;
  unit: string | null;
  goodValue: string | null;
  fairValue: string | null;
  poorValue: string | null;
  badValue: string | null;
  criteriaId: string;
}

// ---- API Response Types ----

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
