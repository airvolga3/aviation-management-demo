import type { MetricEnvelope, MetricId, ProviderHealth } from './data-contract';

export const OWNER_METRIC_IDS: MetricId[] = ['GROUP_RESULT_FORECAST', 'AL1_GROUP_CONTRIBUTION', 'AL1_STANDALONE_FORECAST', 'AL1_ATTRIBUTED_ELIMINATIONS', 'GROUP_LIQUIDITY_MIN_13W', 'GROUP_EXECUTABLE_CAPACITY_7D', 'GROUP_RECOVERY_EXPECTED', 'GROUP_RESIDUAL_GAP'];
export type ResultField = 'forecast' | 'plan' | 'variance' | 'actual' | 'ytdPlan';
export type OwnerPage = 'overview' | 'companies' | 'company' | 'company-result' | 'metric' | 'driver' | 'evidence' | 'row' | 'tasks' | 'task' | 'area' | 'month' | 'month-row' | 'production' | 'flight' | 'operating' | 'op-detail' | 'legacy' | 'executive-detail';
export type OwnerRoute = { page: OwnerPage; company?: string; metric?: string; field?: ResultField; row?: string; id?: string; from?: string; month?: string; fleet?: string; snapshot?:string; start?:string; end?:string; aircraft?:string; captain?:string; kpi?:string; week?:string; category?:string; stage?:string };
export type Company = { id: string; name: string; kind: string; description: string; owner: string };
export type Evidence = { id: string; driverId: string; title: string; kind: 'ACTUAL_RECORD' | 'FORECAST_ASSUMPTION'; period: string; object: string; owner: string; recordId: string; baseline: number; amount: number; impact: number; impactRule: string; description: string; lines: {label: string; value: string}[] };
export type Driver = { id: string; owner: string; dataOwner: string; action: string; due: string; documentIds: string[] };
export type OwnerTask = { id: string; title: string; owner: string; due: string; status: 'IN_PROGRESS' | 'DONE'; description: string; evidence: string; effect: string; metricId: MetricId };
export type OwnerContext = { schemaVersion: number; snapshotId: string; dataStatus: string; asOf: string | null; companies: Company[]; documents: Evidence[]; drivers: Driver[]; tasks: OwnerTask[]; disclaimer: string };
export type OwnerWorkspace = { provider: ProviderHealth; metrics: MetricEnvelope[]; context: OwnerContext; generatedAt: string };

const pages: OwnerPage[] = ['overview','companies','company','company-result','metric','driver','evidence','row','tasks','task','area','month','month-row','production','flight','operating','op-detail','legacy','executive-detail'];
const fields: ResultField[] = ['forecast','plan','variance','actual','ytdPlan'];
export function parseOwnerRoute(hash: string): OwnerRoute {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const page = pages.includes(path as OwnerPage) ? path as OwnerPage : 'overview';
  const params = new URLSearchParams(query);
  const route: OwnerRoute = { page };
  for (const key of ['company','metric','row','id','from','fleet','snapshot','start','end','aircraft','captain','kpi','week','category','stage'] as const) {
    const value = params.get(key);
    if (value && value.length <= 120) route[key] = value;
  }
  const field = params.get('field');
  const month = params.get('month');
  if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) route.month = month;
  if (fields.includes(field as ResultField)) route.field = field as ResultField;
  return route;
}
export function ownerHref(route: OwnerRoute): string {
  const params = new URLSearchParams();
  for (const key of ['company','metric','field','row','id','from','month','fleet','snapshot','start','end','aircraft','captain','kpi','week','category','stage'] as const) if (route[key]) params.set(key, route[key]);
  return '#/' + route.page + (params.size ? '?' + params.toString() : '');
}
export function resultValue(row: { value?: number | null; plan?: number; forecast?: number; variance?: number; comparison?: MetricEnvelope['comparison']; toDate?: MetricEnvelope['toDate'] } | undefined, field: ResultField): number | undefined {
  if (!row) return undefined;
  if (field === 'actual') return row.toDate?.actual;
  if (field === 'ytdPlan') return row.toDate?.plan;
  const value = row.comparison?.[field] ?? row[field];
  // A generic value may be actual, forecast or a bridge; never guess its scenario.
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
export function fieldLabel(field: ResultField, metric?: MetricEnvelope): string {
  if (field === 'actual' || field === 'ytdPlan') return (field === 'actual' ? 'Факт' : 'План') + (metric?.toDate ? ' · ' + metric.toDate.period.label : ' · прошедший период');
  if (field === 'variance') return 'Отклонение прогноза от плана';
  return (field === 'plan' ? 'План' : 'Прогноз') + (metric?.period ? ' · ' + metric.period.label : ' · период источника');
}
export function companyResult(metrics: MetricEnvelope[], id: string) {
  return metrics.find(m => m.metricId === 'GROUP_RESULT_FORECAST')?.breakdown.find(row => row.id === id);
}

export type ResultCrumb = { label: string; caption: string; value: number | undefined; route: OwnerRoute };
export function resultTrail(workspace: OwnerWorkspace, route: OwnerRoute): ResultCrumb[] {
  const group = workspace.metrics.find(m => m.metricId === 'GROUP_RESULT_FORECAST');
  if (!group) return [];
  const field = route.field ?? 'forecast';
  const root: ResultCrumb = {label:'Авиагруппа',caption:fieldLabel(field,group),value:resultValue(group,field),route:{page:'metric',metric:group.metricId,field}};
  if (route.page === 'metric') return route.metric === group.metricId ? [root] : [];
  if (route.page === 'month' || route.page === 'month-row') {
    const point = group.timeline?.snapshotId === group.version ? group.timeline.points.find(p => p.month === route.month) : undefined;
    if (!point) return [];
    const monthly: ResultCrumb = {label:'Авиагруппа',caption:(point.actual === null ? 'Прогноз' : 'Факт') + ' · ' + point.month,value:point.actual ?? point.forecast ?? undefined,route:{page:'month',month:point.month}};
    if (route.page === 'month') return [monthly];
    const row = group.breakdown.find(r => r.id === route.row);
    const child = row?.timeline?.snapshotId === group.version ? row.timeline.points.find(p => p.month === point.month) : undefined;
    return row && child ? [monthly,{label:row.label,caption:monthly.caption,value:child.actual ?? child.forecast ?? undefined,route:{...route}}] : [];
  }
  if (route.page === 'row') {
    const row = route.metric === group.metricId ? group.breakdown.find(r => r.id === route.row) : undefined;
    return row ? [root,{label:row.label,caption:fieldLabel(field,group),value:resultValue(row,field),route:{...route}}] : [];
  }
  if (!['company','company-result','driver','evidence'].includes(route.page)) return [];
  const id = route.company || (['driver','evidence'].includes(route.page) ? 'AL1' : '');
  const company = workspace.context.companies.find(c => c.id === id);
  const row = companyResult(workspace.metrics,id);
  if (!company || !row) return [];
  const companyCrumb: ResultCrumb = {label:company.name,caption:'Вклад · ' + fieldLabel(field,group),value:resultValue(row,field),route:{page:'company-result',company:id,field,from:route.from}};
  if (route.page === 'company' || route.page === 'company-result') return [root,companyCrumb];
  if (id !== 'AL1' || field === 'actual' || field === 'ytdPlan' || !allowDemoContext(workspace.metrics,workspace.context)) return [];
  const document = route.page === 'evidence' ? workspace.context.documents.find(d => d.id === route.id) : undefined;
  if (route.page === 'evidence' && !document) return [];
  const driverId = document?.driverId || route.id;
  const driver = workspace.context.drivers.find(d => d.id === driverId);
  const cause = workspace.metrics.find(m => m.metricId === 'AL1_GROUP_CONTRIBUTION')?.breakdown.find(r => r.id === driverId);
  if (!driver || !cause || (document && !driver.documentIds.includes(document.id))) return [];
  const trail = [root,companyCrumb,{label:cause.label,caption:'Влияние на годовой результат',value:cause.value,route:{page:'driver',company:id,id:driverId,field,from:route.from} as OwnerRoute}];
  if (document) trail.push({label:document.title,caption:'Влияние записи · ' + document.period,value:document.impact,route:{...route}});
  return trail;
}
export function allowDemoContext(metrics: MetricEnvelope[], context: OwnerContext): boolean {
  return context.dataStatus === 'DEMO_SYNTHETIC' && metrics.length > 0 && metrics.every(m => m.source.provider === 'synthetic' && m.version === context.snapshotId);
}

export function selectOwnerContext(metrics: MetricEnvelope[], health: ProviderHealth, fixture: OwnerContext): OwnerContext {
  if (health.provider === 'synthetic' && allowDemoContext(metrics, fixture)) return fixture;
  if (health.provider === 'synthetic') throw new Error('Несовместимые версии учебного набора.');
  return {schemaVersion:1, snapshotId:'', dataStatus:'NOT_CONNECTED', asOf:null, companies:fixture.companies, documents:[], drivers:[], tasks:[], disclaimer:'Корпоративные документы и поручения ещё не сопоставлены. Учебные записи не подставляются.'};
}
