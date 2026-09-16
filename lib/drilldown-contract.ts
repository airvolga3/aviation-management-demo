import type { OwnerRoute } from './owner-model';
import type { AirScope, AirTransaction } from './airline-model';
export function economicsMonthRoute(company: string, snapshot: string, month: string, kpi: string, field: OwnerRoute['field'] = 'forecast'): OwnerRoute {
  return { page: 'company', company, metric: 'economics', snapshot, start: month, end: month, kpi, field };
}
export function normalizeEconomicsRoute(route: OwnerRoute): OwnerRoute {
  const month = /^ECON-(2026-\d{2})$/.exec(route.id ?? '')?.[1];
  return month ? {...route, id: undefined, start: month, end: month, kpi: route.kpi ?? 'op'} : route;
}
export function cashTransactions(rows: AirTransaction[], scope: AirScope, kpi = 'fcf', category?: string, field?: OwnerRoute['field']) {
  return rows.filter(t => t.month >= scope.start && t.month <= scope.end
    && (!category || t.category === category)
    && (kpi !== 'capex' || t.flow === 'INVESTING')
    && (kpi !== 'ocf' || t.flow === 'OPERATING')
    && (field !== 'actual' || !t.future));
}
export function cashTotal(rows: AirTransaction[], field: 'plan' | 'actual' | 'forecast'): number | null {
  const selected = rows.filter(t => field !== 'actual' || !t.future);
  return selected.length ? selected.reduce((total, t) => total + (field === 'plan' ? t.plan : t.value), 0) : null;
}
