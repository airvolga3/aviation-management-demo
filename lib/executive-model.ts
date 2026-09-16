import {
  entity,
  monthlyFor,
  sumTotals,
  type OpSnapshot,
  type Totals,
  type OpMonth,
} from './operating-model';
import { productionTotals, type ProductionSnapshot } from './production-model';
import type { Al1CeoSnapshot } from './al1-ceo-model';
import type { Al1Operations } from './al1-operations-model';
import type { Al1Commercial } from './al1-commercial-model';
import type { Al1Finance } from './al1-finance-model';
import type { Al1Safety } from './al1-safety-model';
import type { AirlineBundle, AirlineId } from './airline-model';

type Seed = {
  id: string;
  revenue: number[];
  da: number[];
  cashBridge: number[];
  capex: number[];
  capital: number;
  openingCash: number;
  cashFloor: number;
  confirmedShare: number;
  pipelineShare: number;
  profile: string;
};
export type ExecutiveSeed = {
  snapshot_id: string;
  classification: string;
  op_snapshot_id: string;
  as_of: string;
  companies: Seed[];
  revenue_elimination: number[];
  actions: ExecutiveAction[];
};
export type ExecutiveAction = {
  id: string;
  company: string;
  title: string;
  status: string;
  due: string;
  role: string;
  decision: string;
  effect: string;
  metric: string;
};
export type FlowKey =
  | 'op'
  | 'revenue'
  | 'da'
  | 'cashBridge'
  | 'ocf'
  | 'capex'
  | 'fcf';
export type ExecutiveEntity = {
  id: string;
  name: string;
  profile: string;
  drivers: Record<string, number>;
  flows: Record<FlowKey, Totals>;
  monthly: Record<FlowKey, OpMonth[]>;
  capital: number;
  cash: number;
  cashFloor: number;
  weeks: { label: string; date: string; balance: number; movement: number }[];
  portfolio: {
    confirmed: number;
    pipeline: number;
    gap: number;
    total: number;
  };
  roic: number | null;
  fleets: {
    id: string;
    name: string;
    plan: number;
    actual: number;
    forecast: number;
    cancelled: number;
  }[];
};
export type ExecutiveSnapshot = {
  snapshotId: string;
  opSnapshotId: string;
  productionSnapshotId: string;
  asOf: string;
  classification: string;
  entities: ExecutiveEntity[];
  hierarchy: typeof executiveHierarchy;
  al1?: Al1CeoSnapshot;
  operations?: Al1Operations;
  commercial?: Al1Commercial;
  finance?: Al1Finance;
  safety?: Al1Safety;
  airlines?: Partial<Record<AirlineId, AirlineBundle>>;
  actions: ExecutiveAction[];
};
export const round = (v: number) => Math.round(v * 100) / 100;
// Management hierarchy, not a statement of legal ownership. MANAGEMENT is a view, never an additive ledger row.
export const executiveHierarchy = {root:'GROUP',wing:'MANAGEMENT',ownActivity:'UK',subsidiaries:['AL1','AL2','AL3','MRO-1','MRO-2','ENG','LEASE','INSURE']} as const;
export function executiveEntity(data:ExecutiveSnapshot,id:string):ExecutiveEntity|undefined {
  if(id==='MANAGEMENT'){const root=data.entities.find(e=>e.id==='GROUP');return root?{...root,id:'MANAGEMENT',name:'Управляющая компания',profile:'Управляющая компания · консолидированное крыло'}:undefined;}
  const row=data.entities.find(e=>e.id===id);
  return row&&id==='UK'?{...row,name:'УК · собственная деятельность',profile:'Собственный бюджет управляющей компании'}:row;
}
const fields = ['plan', 'ytd_plan', 'actual', 'remaining', 'forecast'] as const;
const fromArray = (a: number[]): Totals => ({
  plan: a[0],
  ytd_plan: a[1],
  actual: a[2],
  forecast: a[3],
  remaining: round(a[3] - a[2]),
});
const combine = (a: Totals, b: Totals, sign = 1): Totals =>
  Object.fromEntries(
    fields.map((k) => [k, round(a[k] + sign * b[k])]),
  ) as Totals;
const zero = () => fromArray([0, 0, 0, 0]);
const addMonthly = (a: OpMonth[], b: OpMonth[], sign = 1) =>
  a.map((m, i) => ({
    ...m,
    plan: round(m.plan + sign * b[i].plan),
    actual: m.actual === null ? null : round(m.actual + sign * b[i].actual!),
    forecast:
      m.forecast === null ? null : round(m.forecast + sign * b[i].forecast!),
  }));
const sumMonthly = (rows: OpMonth[][]) =>
  rows.reduce((a, b) => addMonthly(a, b));
const weekDates = [
  '2026-09-07',
  '2026-09-14',
  '2026-09-21',
  '2026-09-28',
  '2026-10-05',
  '2026-10-12',
  '2026-10-19',
  '2026-10-26',
  '2026-11-02',
  '2026-11-09',
  '2026-11-16',
  '2026-11-23',
  '2026-11-30',
];
export const metricNames: Record<string, [string, string]> = {
  op: ['Операционная прибыль · M4', 'Operating Profit'],
  revenue: ['Выручка', 'Revenue'],
  margin: ['Операционная маржа', 'Operating Margin'],
  da: ['Амортизация', 'Depreciation & Amortisation'],
  cashBridge: ['Переход от прибыли к деньгам', 'Cash conversion bridge'],
  ocf: ['Операционный денежный поток', 'Operating Cash Flow'],
  capex: ['Капитальные платежи', 'Cash CAPEX'],
  fcf: ['Свободный денежный поток', 'Free Cash Flow'],
  cash: ['Ликвидность на 13 недель', 'Liquidity'],
  capital: ['Капитал и отдача', 'ROIC'],
  portfolio: ['Обеспеченность будущей выручки', 'Revenue coverage'],
  operations: ['Исполнение и ресурсы', 'Operations'],
  safety: ['Безопасность и ограничения', 'Safety'],
  decisions: ['Решения и поручения', 'Actions'],
};
export function buildExecutive(
  seed: ExecutiveSeed,
  op: OpSnapshot,
  production: ProductionSnapshot,
): ExecutiveSnapshot {
  if (
    seed.classification !== 'DEMO_SYNTHETIC' ||
    seed.op_snapshot_id !== op.snapshot_id ||
    seed.as_of !== op.actual_through ||
    production.asOf !== seed.as_of
  )
    throw Error('Несовместимые срезы');
  if (
    seed.companies.length !== op.companies.length ||
    new Set(seed.companies.map((c) => c.id)).size !== seed.companies.length ||
    seed.companies.some(c=>!op.companies.some(o=>o.id===c.id))
  )
    throw Error('Неверный периметр');
  if(seed.revenue_elimination.length!==4||seed.revenue_elimination.some(v=>!Number.isFinite(v)))throw Error('Неверная элиминация');
  const entities: ExecutiveEntity[] = seed.companies.map((s) => {
    const own = entity(op, s.id);
    if (!own) throw Error('Компания отсутствует');
    for (const a of [s.revenue, s.da, s.cashBridge, s.capex])
      if (a.length !== 4 || a.some((v) => !Number.isFinite(v)))
        throw Error('Неверные потоки');
    if (
      [s.confirmedShare,s.pipelineShare,s.capital,s.openingCash,s.cashFloor].some(v=>!Number.isFinite(v)) ||
      s.cashFloor<0 ||
      s.confirmedShare + s.pipelineShare > 1 ||
      s.confirmedShare < 0 ||
      s.pipelineShare < 0 ||
      s.capital <= 0
    )
      throw Error('Неверные предпосылки');
    const flows = {
      op: own,
      revenue: fromArray(s.revenue),
      da: fromArray(s.da),
      cashBridge: fromArray(s.cashBridge),
      capex: fromArray(s.capex),
      ocf: zero(),
      fcf: zero(),
    };
    flows.ocf = combine(combine(flows.op, flows.da), flows.cashBridge);
    flows.fcf = combine(flows.ocf, flows.capex, -1);
    const monthly = Object.fromEntries(
      Object.entries(flows).map(([k, v]) => [
        k,
        k === 'op' ? op.monthly[s.id] : monthlyFor(v, s.id + '-exec'),
      ]),
    ) as Record<FlowKey, OpMonth[]>;
    // Front-loaded future investment schedule. Remaining amount is allocated once, never added on top.
    let allocated = 0;
    [0.6, 0.25, 0.15, 0].forEach((w, i) => {
      const v =
        i === 3
          ? round(flows.capex.remaining - allocated)
          : round(flows.capex.remaining * w);
      allocated = round(allocated + v);
      monthly.capex[i + 8].forecast = v;
    });
    monthly.ocf = addMonthly(
      addMonthly(monthly.op, monthly.da),
      monthly.cashBridge,
    );
    monthly.fcf = addMonthly(monthly.ocf, monthly.capex, -1);
    const cash = round(s.openingCash + flows.fcf.actual);
    let balance = cash;
    const weeks = weekDates.map((date, i) => {
      const month = i < 4 ? 8 : i < 8 ? 9 : 10,
        count = i < 8 ? 4 : 5,
        index = i < 4 ? i : i < 8 ? i - 4 : i - 8;
      const total = monthly.fcf[month].forecast!;
      const base = round(total / count);
      const movement =
        index === count - 1 ? round(total - base * (count - 1)) : base;
      balance = round(balance + movement);
      return {
        date,
        label: date.slice(8) + '.' + date.slice(5, 7),
        movement,
        balance,
      };
    });
    const total = flows.revenue.remaining,
      confirmed = round(total * s.confirmedShare),
      pipeline = round(total * s.pipelineShare);
    return {
      id: s.id,
      name: own.name,
      profile: s.profile,
      drivers: own.drivers,
      flows,
      monthly,
      capital: s.capital,
      cash,
      cashFloor: s.cashFloor,
      weeks,
      portfolio: {
        total,
        confirmed,
        pipeline,
        gap: round(total - confirmed - pipeline),
      },
      roic:
        s.id === 'INSURE' ? null : round(((own.forecast * 0.8) / s.capital) * 100),
      fleets: production.fleets
        .filter((f) => f.company === s.id)
        .map((f) => {
          const t = productionTotals(
            production.flights.filter((r) => r.fleet === f.id),
          );
          return {
            id: f.id,
            name: f.aircraft,
            plan: t.plan / 60,
            actual: (t.actual ?? 0) / 60,
            forecast: t.forecast / 60,
            cancelled: t.cancelled,
          };
        }),
    };
  });
  const consFlows = {
    op: op.consolidation,
    revenue: fromArray(seed.revenue_elimination),
    da: zero(),
    cashBridge: combine(zero(), op.consolidation, -1),
    capex: zero(),
    ocf: zero(),
    fcf: zero(),
  };
  // OP elimination is non-cash. Matched intercompany settlements net to zero in this fixture.
  const consMonthly = Object.fromEntries(
    Object.entries(consFlows).map(([k, v]) => [
      k,
      k === 'op' ? op.monthly.CONSOLIDATION : monthlyFor(v, 'CONSOLIDATION'),
    ]),
  ) as Record<FlowKey, OpMonth[]>;
  const flows = Object.fromEntries(
    Object.keys(consFlows).map((k) => [
      k,
      sumTotals([
        ...entities.map((e) => e.flows[k as FlowKey]),
        consFlows[k as FlowKey],
      ]),
    ]),
  ) as Record<FlowKey, Totals>;
  const monthly = Object.fromEntries(
    Object.keys(flows).map((k) => [
      k,
      sumMonthly([
        ...entities.map((e) => e.monthly[k as FlowKey]),
        consMonthly[k as FlowKey],
      ]),
    ]),
  ) as Record<FlowKey, OpMonth[]>;
  const portfolioTotal = round(flows.revenue.remaining);
  const portfolioConfirmed = round(
    entities.reduce((a, e) => a + e.portfolio.confirmed, 0) +
      consFlows.revenue.remaining,
  );
  const portfolioPipeline = round(
    entities.reduce((a, e) => a + e.portfolio.pipeline, 0),
  );
  const capital = entities
    .filter((e) => e.id !== 'INSURE')
    .reduce((a, e) => a + e.capital, 0);
  const group: ExecutiveEntity = {
    id: 'GROUP',
    name: 'Авиагруппа',
    profile: 'Владелец–ГД группы',
    drivers: entity(op, 'GROUP')!.drivers,
    flows,
    monthly,
    capital,
    cash: round(entities.reduce((a, e) => a + e.cash, 0)),
    cashFloor: entities.reduce((a, e) => a + e.cashFloor, 0),
    weeks: weekDates.map((date, i) => ({
      date,
      label: date.slice(8) + '.' + date.slice(5, 7),
      balance: round(entities.reduce((a, e) => a + e.weeks[i].balance, 0)),
      movement: round(entities.reduce((a, e) => a + e.weeks[i].movement, 0)),
    })),
    portfolio: {
      total: portfolioTotal,
      confirmed: portfolioConfirmed,
      pipeline: portfolioPipeline,
      gap: round(portfolioTotal - portfolioConfirmed - portfolioPipeline),
    },
    roic: round(
      (((flows.op.forecast -
        entities.find((e) => e.id === 'INSURE')!.flows.op.forecast) *
        0.8) /
        capital) *
        100,
    ),
    fleets: entities.flatMap((e) => e.fleets),
  };
  if (seed.actions.some((a) => !entities.some((e) => e.id === a.company)))
    throw Error('Чужое поручение');
  return {
    snapshotId: seed.snapshot_id,
    opSnapshotId: op.snapshot_id,
    productionSnapshotId: production.version,
    asOf: seed.as_of,
    classification: seed.classification,
    entities: [group, ...entities],
    hierarchy: executiveHierarchy,
    actions: seed.actions,
  };
}
