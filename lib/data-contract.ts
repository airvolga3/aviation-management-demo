export type DataStatus =
  | 'READY'
  | 'DEMO_SYNTHETIC'
  | 'NOT_CONNECTED'
  | 'SOURCE_UNAVAILABLE'
  | 'ACCESS_RESTRICTED'
  | 'STALE'
  | 'SCHEMA_MISMATCH'
  | 'NO_ROWS';

export type MetricId =
  | 'GROUP_RESULT_FORECAST'
  | 'GROUP_LIQUIDITY_MIN_13W'
  | 'AL1_GROUP_CONTRIBUTION'
  | 'AL1_STANDALONE_FORECAST'
  | 'AL1_ATTRIBUTED_ELIMINATIONS'
  | 'GROUP_RECOVERY_EXPECTED'
  | 'GROUP_RESIDUAL_GAP'
  | 'GROUP_EXECUTABLE_CAPACITY_7D'
  | 'GROUP_CAPACITY_RECOVERY_7D'
  | 'GROUP_CAPACITY_RESIDUAL_GAP_7D'
  | 'GROUP_FLEET_READY_72H'
  | 'GROUP_CREW_COVERAGE_7D'
  | 'GROUP_INTERCOMPANY_SLA_AT_RISK'
  | 'GROUP_CAPACITY_RESULT_EFFECT'
  | 'GROUP_REVENUE_TOTAL'
  | 'GROUP_CONTRIBUTION_TOTAL'
  | 'GROUP_LOAD_FACTOR'
  | 'GROUP_FLIGHTS_TOTAL';

export type MetricUnit = 'RUB_MLN' | 'USD' | 'PERCENT' | 'COUNT' | 'TONNES';

export type MetricComparison = {
  plan?: number;
  actual?: number;
  forecast?: number;
  variance?: number;
  target?: number;
  guardrail?: number;
};

export type MetricBreakdownRow = {
  timeline?: MetricTimeline;
  toDate?: ToDateComparison;
  id: string;
  label: string;
  description?: string;
  value: number;
  plan?: number;
  forecast?: number;
  variance?: number;
  status?: string;
  owner?: string;
  path: string[];
};

export type MetricSource = {
  provider: 'synthetic' | 'superset';
  reference: string;
  datasetId?: number;
  datasetUuid?: string;
  metricName?: string;
  retrievedAt: string;
};

export type MetricEnvelope = {
  timeline?: MetricTimeline;
  toDate?: ToDateComparison;
  metricId: MetricId;
  label: string;
  description: string;
  value: number | null;
  unit: MetricUnit;
  comparison?: MetricComparison;
  aggregation?: 'SUM' | 'WEIGHTED_RATIO' | 'BRIDGE' | 'MINIMUM' | 'STATUS';
  object: { id: string; label: string };
  period: { from: string; to: string; label: string };
  scenario: 'ACTUAL' | 'PLAN' | 'FORECAST' | 'RECOVERY';
  perimeter: 'DEMO_GROUP';
  decisionCaseId?: string;
  version: string;
  dataStatus: DataStatus;
  methodStatus: 'DEMO_METHOD' | 'TO_APPROVE';
  source: MetricSource;
  owners: {
    result: string;
    data: string;
    action: string;
  };
  breakdown: MetricBreakdownRow[];
  disclaimer: string;
};

export type ProviderHealth = {
  provider: 'synthetic' | 'superset';
  status: DataStatus;
  checkedAt: string;
  configuredMetrics: number;
  message: string;
};

export interface DataProvider {
  health(): Promise<ProviderHealth>;
  getMetrics(metricIds: MetricId[]): Promise<MetricEnvelope[]>;
}

export type MetricsApiResponse = {
  generatedAt: string;
  provider: ProviderHealth;
  metrics: MetricEnvelope[];
};

export type ToDateComparison = {
  plan: number;
  actual: number;
  period: { from: string; to: string; label: string };
};

export type MetricMonth = {
  month: string;
  plan: number;
  actual: number | null;
  forecast: number | null;
  sourceRow: string;
};
export type MetricTimeline = {
  snapshotId: string;
  closedThrough: string;
  points: MetricMonth[];
};
