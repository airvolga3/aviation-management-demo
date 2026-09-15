import type { MetricEnvelope, MetricMonth, MetricTimeline } from './data-contract';

export type ResultMonthsFixture = {
  snapshotId: string; year: number; closedMonth: number; description: string;
  rows: { id: string; plan: number[]; actual: number[]; forecast: number[] }[];
};
const round = (n: number) => Math.round(n * 100) / 100;
const sum = (ns: number[]) => round(ns.reduce((s, n) => s + n, 0));
const equal = (a: number, b: number | undefined) => typeof a === 'number' && Number.isFinite(a) && typeof b === 'number' && Number.isFinite(b) && Math.abs(a - b) < 0.005;
export const monthLabel = (month: string, short = false) => new Intl.DateTimeFormat('ru-RU', {month: short ? 'short' : 'long', ...(short ? {} : {year:'numeric'}), timeZone:'UTC'}).format(new Date(month + '-01T12:00:00Z'));
export const monthResult = (p: MetricMonth) => p.actual ?? p.forecast;
export const monthVariance = (p: MetricMonth) => { const value=monthResult(p); return value === null ? null : round(value-p.plan); };

// This adapter is synthetic-only. Corporate providers must supply their own governed timeline.
export function attachResultTimeline(metric: MetricEnvelope, fixture: ResultMonthsFixture): MetricEnvelope {
  if (metric.metricId !== 'GROUP_RESULT_FORECAST') return metric;
  if (metric.source.provider !== 'synthetic' || metric.dataStatus !== 'DEMO_SYNTHETIC' || fixture.snapshotId !== metric.version) throw new Error('Несовместимый источник помесячных данных.');
  const {year,closedMonth} = fixture;
  if (!Number.isInteger(year) || !Number.isInteger(closedMonth) || closedMonth < 1 || closedMonth > 11) throw new Error('Неверная граница факта.');
  const closedThrough = `${year}-${String(closedMonth).padStart(2,'0')}`;
  const end = new Date(Date.UTC(year,closedMonth,0)).toISOString().slice(0,10);
  if (metric.period.from !== `${year}-01-01` || metric.period.to !== `${year}-12-31` || metric.toDate?.period.from !== metric.period.from || metric.toDate.period.to !== end) throw new Error('Периоды данных не совпадают.');
  if (fixture.rows.length !== metric.breakdown.length || new Set(fixture.rows.map(r=>r.id)).size !== fixture.rows.length) throw new Error('Повторные или пропущенные компании.');
  const breakdown = metric.breakdown.map(row => {
    const input = fixture.rows.find(r=>r.id === row.id);
    if (!input || input.plan.length !== 12 || input.actual.length !== closedMonth || input.forecast.length !== 12-closedMonth || [...input.plan,...input.actual,...input.forecast].some(n=>typeof n !== 'number' || !Number.isFinite(n))) throw new Error('Неполный помесячный набор.');
    if (!equal(sum(input.plan),row.plan) || !equal(sum(input.actual),row.toDate?.actual) || !equal(sum(input.plan.slice(0,closedMonth)),row.toDate?.plan) || !equal(sum([...input.actual,...input.forecast]),row.forecast)) throw new Error('Месяцы не сходятся с итогом компании.');
    const points = input.plan.map((plan,i) => ({month:`${year}-${String(i+1).padStart(2,'0')}`,plan,actual:i < closedMonth ? input.actual[i] : null,forecast:i >= closedMonth ? input.forecast[i-closedMonth] : null,sourceRow:`DEMO-MONTH-${row.id}-${year}-${String(i+1).padStart(2,'0')}`}));
    return {...row,timeline:{snapshotId:fixture.snapshotId,closedThrough,points}};
  });
  const points = breakdown[0].timeline.points.map((p,i) => ({...p,sourceRow:`DEMO-MONTH-GROUP-${p.month}`,plan:sum(breakdown.map(r=>r.timeline.points[i].plan)),actual:p.actual === null ? null : sum(breakdown.map(r=>r.timeline.points[i].actual!)),forecast:p.forecast === null ? null : sum(breakdown.map(r=>r.timeline.points[i].forecast!))}));
  if (!equal(sum(points.map(p=>p.plan)),metric.comparison?.plan) || !equal(sum(points.map(p=>monthResult(p)!)),metric.comparison?.forecast) || !equal(sum(points.slice(0,closedMonth).map(p=>p.actual!)),metric.toDate.actual) || !equal(sum(points.slice(0,closedMonth).map(p=>p.plan)),metric.toDate.plan)) throw new Error('Месяцы не сходятся с итогом группы.');
  return {...metric,breakdown,timeline:{snapshotId:fixture.snapshotId,closedThrough,points}};
}

// Fail closed instead of drawing an interpolated or zero-filled history.
export function validTimeline(t: MetricTimeline | undefined, version: string): t is MetricTimeline {
  if (!t || t.snapshotId !== version || t.points.length !== 12 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(t.closedThrough)) return false;
  const year=t.closedThrough.slice(0,4);
  return t.points.every((p,i) => p.month === `${year}-${String(i+1).padStart(2,'0')}` && Number.isFinite(p.plan) && !!p.sourceRow && (p.month <= t.closedThrough ? typeof p.actual === 'number' && Number.isFinite(p.actual) && p.forecast === null : p.actual === null && typeof p.forecast === 'number' && Number.isFinite(p.forecast)));
}

export function chartPoints(t: MetricTimeline) {
  let plan = 0, result = 0;
  return t.points.map(p => {
    plan=round(plan+p.plan); result=round(result+(monthResult(p) ?? 0));
    return {...p,label:monthLabel(p.month,true),planTotal:plan,actualTotal:p.month <= t.closedThrough ? result : null,forecastTotal:p.month >= t.closedThrough ? result : null,variance:monthVariance(p)};
  });
}

export function validResultTimeline(metric: MetricEnvelope): boolean {
  if (!validTimeline(metric.timeline,metric.version) || metric.metricId !== 'GROUP_RESULT_FORECAST' || metric.aggregation !== 'SUM' || metric.unit !== 'RUB_MLN' || !metric.breakdown.length) return false;
  const t=metric.timeline;
  const [year,month]=t.closedThrough.split('-').map(Number);
  const end=new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
  if (metric.period.from!==`${year}-01-01` || metric.period.to!==`${year}-12-31` || metric.toDate?.period.from!==metric.period.from || metric.toDate.period.to!==end) return false;
  const matches=(timeline:MetricTimeline,plan:number|undefined,forecast:number|undefined,actual:number|undefined,ytdPlan:number|undefined)=>{
    const closed=timeline.points.filter(p=>p.month<=t.closedThrough);
    return equal(sum(timeline.points.map(p=>p.plan)),plan) && equal(sum(timeline.points.map(p=>monthResult(p)!)),forecast) && equal(sum(closed.map(p=>p.actual!)),actual) && equal(sum(closed.map(p=>p.plan)),ytdPlan);
  };
  if (!matches(t,metric.comparison?.plan,metric.comparison?.forecast,metric.toDate.actual,metric.toDate.plan) || !equal(metric.comparison!.forecast!-metric.comparison!.plan!,metric.comparison?.variance) || !equal(metric.value!,metric.comparison?.forecast)) return false;
  if (new Set(metric.breakdown.map(r=>r.id)).size!==metric.breakdown.length) return false;
  for (const r of metric.breakdown) {
    if (!validTimeline(r.timeline,metric.version) || r.timeline.closedThrough!==t.closedThrough || r.toDate?.period.from!==metric.toDate.period.from || r.toDate.period.to!==end || !matches(r.timeline,r.plan,r.forecast,r.toDate.actual,r.toDate.plan) || !equal(r.forecast!-r.plan!,r.variance)) return false;
  }
  return t.points.every((p,i)=>['plan','actual','forecast'].every(field=>{
    const f=field as 'plan'|'actual'|'forecast';
    const cells=metric.breakdown.map(r=>r.timeline!.points[i][f]);
    return p[f]===null ? cells.every(v=>v===null) : cells.every(v=>v!==null) && equal(sum(cells as number[]),p[f]!);
  }));
}
