import type {
  CommercialRow,
  CommercialView,
  Al1Commercial,
} from './al1-commercial-model';
import type { OpsScope } from './al1-operations-model';

export const econSum = (a: number[]) => a.reduce((s, n) => s + n, 0);
export const econRatio = (a: number | null, b: number | null, scale = 1) =>
  a == null || b == null || b === 0 ? null : (a / b) * scale;
export const econDelta = (a: number | null, p: number | null) => ({
  amount: a == null || p == null ? null : a - p,
  percent:
    a == null || p == null || p === 0 ? null : ((a - p) / Math.abs(p)) * 100,
});
export const econMonths = Array.from(
  { length: 12 },
  (_, i) => `2026-${String(i + 1).padStart(2, '0')}`,
);
type Layer = 'c1' | 'c2' | 'c3' | 'c4' | 'da' | 'otherOp';
type Expense = {
  id: string;
  name: string;
  category: string;
  fraction: number;
  layer: Layer;
  driver: 'FH' | 'FC' | 'PERIOD';
  acmi?: 'A' | 'C' | 'M' | 'I';
  owner: string;
};
export const econExpenses: Expense[] = [
  {
    id: 'fuel',
    name: 'Авиационное топливо',
    category: 'fuel',
    fraction: 1,
    layer: 'c1',
    driver: 'FH',
    owner: 'Производство и закупки',
  },
  {
    id: 'airport',
    name: 'Аэропортовые и наземные услуги',
    category: 'airport',
    fraction: 1,
    layer: 'c1',
    driver: 'FC',
    owner: 'Закупки и производство',
  },
  {
    id: 'maintenanceVariable',
    name: 'ACMI · переменный технический ресурс',
    category: 'maintenance',
    fraction: 0.65,
    layer: 'c2',
    driver: 'FH',
    acmi: 'M',
    owner: 'Технический директор',
  },
  {
    id: 'maintenanceFixed',
    name: 'ACMI · постоянные расходы ТО',
    category: 'maintenance',
    fraction: 0.35,
    layer: 'c3',
    driver: 'PERIOD',
    acmi: 'M',
    owner: 'Технический директор',
  },
  {
    id: 'crewVariable',
    name: 'ACMI · переменные расходы экипажей',
    category: 'personnel',
    fraction: 0.2,
    layer: 'c2',
    driver: 'FH',
    acmi: 'C',
    owner: 'Начальник лётной службы',
  },
  {
    id: 'crewFixed',
    name: 'ACMI · постоянные расходы экипажей',
    category: 'personnel',
    fraction: 0.6,
    layer: 'c3',
    driver: 'PERIOD',
    acmi: 'C',
    owner: 'Начальник лётной службы',
  },
  {
    id: 'personnelIndirect',
    name: 'Косвенные расходы на персонал',
    category: 'personnel',
    fraction: 0.2,
    layer: 'c4',
    driver: 'PERIOD',
    owner: 'HR и владельцы бюджетов',
  },
  {
    id: 'aircraftFixed',
    name: 'ACMI · содержание воздушных судов',
    category: 'other',
    fraction: 0.3,
    layer: 'c3',
    driver: 'PERIOD',
    acmi: 'A',
    owner: 'Директор по управлению флотом',
  },
  {
    id: 'insurance',
    name: 'ACMI · страхование',
    category: 'other',
    fraction: 0.1,
    layer: 'c3',
    driver: 'PERIOD',
    acmi: 'I',
    owner: 'Финансовый директор',
  },
  {
    id: 'overheads',
    name: 'Производственные и корпоративные накладные',
    category: 'other',
    fraction: 0.2,
    layer: 'c4',
    driver: 'PERIOD',
    owner: 'Финансовый директор',
  },
  {
    id: 'programFixed',
    name: 'Прямые постоянные обязательства программ',
    category: 'other',
    fraction: 0.1,
    layer: 'c3',
    driver: 'PERIOD',
    owner: 'Руководитель программы',
  },
  {
    id: 'depreciation',
    name: 'Амортизация',
    category: 'other',
    fraction: 0.25,
    layer: 'da',
    driver: 'PERIOD',
    owner: 'Главный бухгалтер',
  },
  {
    id: 'otherOp',
    name: 'Прочие операционные расходы',
    category: 'other',
    fraction: 0.05,
    layer: 'otherOp',
    driver: 'PERIOD',
    owner: 'Финансовый директор',
  },
];
const basic = {
  revenue: [
    'Выручка',
    'Revenue',
    'Выручка общего коммерческого и финансового сценария.',
  ],
  m1: [
    'M1',
    'Contribution after C1',
    'Выручка − прямые операционные затраты вне ACMI.',
  ],
  m2: [
    'M2',
    'Contribution after C2',
    'M1 − переменный ACMI. Не прежний учебный Contribution 70/30.',
  ],
  m3: [
    'M3',
    'Contribution after C3',
    'M2 − постоянный ACMI − прямые постоянные обязательства программ.',
  ],
  core: [
    'Прибыль основной деятельности',
    'Core operating profit',
    'Промежуточный результат: M3 − косвенные расходы − амортизация. После прочих операционных расходов получается операционная прибыль · M4.',
  ],
  op: [
    'Операционная прибыль · M4',
    'Operating profit',
    'Выручка − все операционные расходы, включая амортизацию и прочие операционные расходы. M4 и Operating profit — один показатель. Амортизация вычитается один раз, до M4. Проценты и налог на прибыль учитываются ниже. Общая сумма совпадает с коммерцией и итогом АК1 в группе.',
  ],
  pbt: [
    'Прибыль до налогообложения',
    'Profit before tax',
    'OP + процентные доходы − финансовые расходы. Валютный результат в этом учебном профиле явно принят равным нулю.',
  ],
  net: [
    'Чистая прибыль / убыток',
    'Net profit / loss',
    'Прибыль до налогообложения − текущий налог. Отложенный налог явно принят равным нулю только в DEMO.',
  ],
  opex: [
    'Операционные расходы',
    'Operating expenses',
    'Все расходы выше OP, включая амортизацию и прочие операционные расходы. Равны Revenue − OP.',
  ],
  c1: [
    'Прямые расходы вне ACMI',
    'Direct operating costs',
    'Топливо и аэропортовые услуги учебного профиля; не дополнительный расход поверх статей.',
  ],
  variableAcmi: [
    'Переменный ACMI',
    'Variable ACMI',
    'Переменные расходы технического ресурса и экипажей.',
  ],
  fixedAcmi: [
    'Постоянный ACMI',
    'Fixed ACMI',
    'Aircraft + постоянный Crew + постоянный Maintenance + Insurance.',
  ],
  fullAcmi: [
    'Полный ACMI',
    'Total ACMI',
    'Переменный + постоянный ACMI. Не вся себестоимость и не минимальная цена дополнительного рейса.',
  ],
  indirect: [
    'Косвенные расходы',
    'Indirect costs',
    'Косвенный персонал + производственные и корпоративные накладные.',
  ],
  financeCost: [
    'Финансовые расходы',
    'Finance costs',
    'Учебный процентный расход компании–месяца. Не распределён на типы ВС или рейсы.',
  ],
  interestIncome: [
    'Процентные доходы',
    'Interest income',
    'Учебный доход компании–месяца. Не распределён на типы ВС или рейсы.',
  ],
  tax: [
    'Налог на прибыль',
    'Income tax expense',
    'Учебное начисление: изменение 20% × max(0, PBT с начала года). 20% — сценарное допущение, не действующая налоговая ставка. Не платёж и не задолженность.',
  ],
} as const;
export const econMetrics: Record<
  string,
  { name: string; en: string; definition: string; expense: boolean }
> = Object.fromEntries([
  ...Object.entries(basic).map(([id, [name, en, definition]]) => [
    id,
    {
      name,
      en,
      definition,
      expense: [
        'opex',
        'c1',
        'variableAcmi',
        'fixedAcmi',
        'fullAcmi',
        'indirect',
        'financeCost',
        'tax',
      ].includes(id),
    },
  ]),
  ...econExpenses.map((x) => [
    x.id,
    {
      name: x.name,
      en: x.acmi ? `ACMI · ${x.acmi}` : 'Expense detail',
      definition: `Статья исходного пула «${x.category}», уровень ${x.layer}. Драйвер ${x.driver}. Учебное распределение, не фактический первичный документ.`,
      expense: true,
    },
  ]),
]);
// Compatibility alias only: one definition, calculation and public P&L row.
econMetrics.m4 = econMetrics.op;
export const canonicalEconMetric = (key: string) => key === 'm4' ? 'op' : key;
export const econPnl = [
  'revenue',
  'c1',
  'm1',
  'variableAcmi',
  'm2',
  'fixedAcmi',
  'programFixed',
  'm3',
  'indirect',
  'depreciation',
  'core',
  'otherOp',
  'op',
  'interestIncome',
  'financeCost',
  'pbt',
  'tax',
  'net',
];
export function econRows(c: Al1Commercial, s: OpsScope, flight?: string) {
  return c.rows.filter(
    (r) =>
      r.month >= s.start &&
      r.month <= s.end &&
      (!s.fleet || r.fleet === s.fleet) &&
      (!s.aircraft || r.aircraftId === s.aircraft) &&
      (!flight || r.flightId === flight),
  );
}
export function econLine(r: CommercialRow, x: Expense, view: CommercialView) {
  const cat = r.costBreakdown.find((c) => c.id === x.category);
  if (!cat) throw Error('Missing cost pool');
  const depreciation = view === 'plan' ? r.depreciationPlan : r.depreciation;
  if (!Number.isFinite(depreciation))
    throw Error('Shared depreciation unavailable');
  if (x.id === 'depreciation') return depreciation;
  // Deterministic synthetic reclassification WITHIN the existing pool, never extra expenses.
  const shift =
    view === 'plan'
      ? 0
      : Math.sin(
          Number(r.month.slice(5)) * 1.1 + (r.fleet === 'AL1-AN124' ? 0.8 : 0),
        ) * 0.05;
  const change =
    x.id === 'maintenanceVariable' ||
    x.id === 'crewVariable' ||
    x.id === 'overheads'
      ? shift
      : x.id === 'maintenanceFixed' ||
          x.id === 'crewFixed' ||
          x.id === 'aircraftFixed'
        ? -shift
        : 0;
  const pool = view === 'plan' ? cat.plan : cat.forecast;
  if (x.category === 'other') {
    if (pool < depreciation) throw Error('Depreciation exceeds source pool');
    return ((pool - depreciation) * (x.fraction + change)) / 0.75;
  }
  return pool * (x.fraction + change);
}
export function econDirect(
  rows: CommercialRow[],
  key: string,
  view: CommercialView,
): number | null {
  const rs =
    view === 'actual' ? rows.filter((r) => r.status !== 'FORECAST') : rows;
  if (!rs.length) return null;
  const R = econSum(
    rs.map((r) => (view === 'plan' ? r.revenuePlan : r.revenue)),
  );
  const part = (filter: (x: Expense) => boolean) =>
    econSum(
      rs.flatMap((r) =>
        econExpenses.filter(filter).map((x) => econLine(r, x, view)),
      ),
    );
  const C1 = part((x) => x.layer === 'c1'),
    C2 = part((x) => x.layer === 'c2'),
    C3 = part((x) => x.layer === 'c3'),
    C4 = part((x) => x.layer === 'c4'),
    da = part((x) => x.layer === 'da'),
    other = part((x) => x.layer === 'otherOp');
  const vals: Record<string, number> = {
    revenue: R,
    c1: C1,
    variableAcmi: C2,
    fixedAcmi: part((x) => x.layer === 'c3' && !!x.acmi),
    fullAcmi: part((x) => !!x.acmi),
    indirect: C4,
    m1: R - C1,
    m2: R - C1 - C2,
    m3: R - C1 - C2 - C3,
    core: R - C1 - C2 - C3 - C4 - da,
    op: R - C1 - C2 - C3 - C4 - da - other,
    opex: C1 + C2 + C3 + C4 + da + other,
  };
  key = canonicalEconMetric(key);
  return key in vals
    ? vals[key]
    : econExpenses.some((x) => x.id === key)
      ? part((x) => x.id === key)
      : null;
}
export function buildAl1Economics(c: Al1Commercial) {
  if (c.classification !== 'DEMO_SYNTHETIC' || !c.rows.length)
    throw Error('Economics requires shared synthetic ledger');
  let planPbt = 0,
    forecastPbt = 0,
    prevPlanTax = 0,
    prevForecastTax = 0;
  const financial = econMonths.map((month, i) => {
    const rows = c.rows.filter((r) => r.month === month);
    const planFinance = 3.5,
      forecastFinance = 4 + i * 0.12,
      planInterest = 0.3,
      forecastInterest = 0.25;
    planPbt +=
      (econDirect(rows, 'op', 'plan') ?? 0) + planInterest - planFinance;
    forecastPbt +=
      (econDirect(rows, 'op', 'forecast') ?? 0) +
      forecastInterest -
      forecastFinance;
    const planTax = Math.max(0, planPbt) * 0.2,
      forecastTax = Math.max(0, forecastPbt) * 0.2;
    const entry = {
      id: `ECO-AL1-${month}`,
      month,
      future: rows.every((r) => r.status === 'FORECAST'),
      plan: {
        financeCost: planFinance,
        interestIncome: planInterest,
        tax: planTax - prevPlanTax,
      },
      forecast: {
        financeCost: forecastFinance,
        interestIncome: forecastInterest,
        tax: forecastTax - prevForecastTax,
      },
    };
    prevPlanTax = planTax;
    prevForecastTax = forecastTax;
    return entry;
  });
  return {
    snapshotId: c.snapshotId,
    classification: 'DEMO_SYNTHETIC' as const,
    method: 'ECO-AL1-v0.19-M4-OP',
    financial,
  };
}
export type Al1Economics = ReturnType<typeof buildAl1Economics>;
export function econValue(
  c: Al1Commercial,
  e: Al1Economics,
  s: OpsScope,
  key: string,
  view: CommercialView,
  flight?: string,
): number | null {
  if (c.snapshotId !== e.snapshotId) throw Error('Economics snapshot mismatch');
  const rows = econRows(c, s, flight);
  const rs =
    view === 'actual' ? rows.filter((r) => r.status !== 'FORECAST') : rows;
  if (!rs.length) return null;
  if (['financeCost', 'interestIncome', 'tax', 'pbt', 'net'].includes(key)) {
    if (s.fleet || s.aircraft || flight) return null;
    const months = new Set(rs.map((r) => r.month));
    const list = e.financial.filter((f) => months.has(f.month));
    const get = (id: 'financeCost' | 'interestIncome' | 'tax') =>
      econSum(list.map((f) => f[view === 'plan' ? 'plan' : 'forecast'][id]));
    if (key === 'financeCost' || key === 'interestIncome' || key === 'tax')
      return get(key);
    return (
      (econDirect(rs, 'op', view) ?? 0) +
      get('interestIncome') -
      get('financeCost') -
      (key === 'net' ? get('tax') : 0)
    );
  }
  return econDirect(rs, key, view);
}
export function econFlex(rows: CommercialRow[], key: string): number | null {
  const rs = rows.filter((r) => r.status !== 'FORECAST');
  if (!rs.length) return null;
  const selected = econExpenses.filter(
    (x) =>
      key === 'opex' ||
      key === x.id ||
      (key === 'c1' && x.layer === 'c1') ||
      (key === 'variableAcmi' && x.layer === 'c2') ||
      (key === 'fixedAcmi' && x.layer === 'c3' && !!x.acmi) ||
      (key === 'fullAcmi' && !!x.acmi) ||
      (key === 'indirect' && x.layer === 'c4'),
  );
  if (!selected.length) return null;
  return econSum(
    rs.flatMap((r) =>
      selected.map((x) => {
        const factor =
          x.driver === 'PERIOD'
            ? 1
            : x.driver === 'FC'
              ? r.status === 'CANCELLED'
                ? 0
                : 1
              : r.planHours > 0
                ? (r.actualHours ?? 0) / r.planHours
                : 0;
        return econLine(r, x, 'plan') * factor;
      }),
    ),
  );
}
export function econUnit(
  rows: CommercialRow[],
  amount: number | null,
  view: CommercialView,
  unit: 'FH' | 'CTK',
) {
  const rs =
    view === 'actual' ? rows.filter((r) => r.status !== 'FORECAST') : rows;
  const denom = econSum(
    rs.map((r) =>
      unit === 'FH'
        ? view === 'plan'
          ? r.planHours
          : (r.actualHours ?? r.forecastHours ?? 0)
        : ((view === 'plan' ? r.cargoPlanKg : r.cargoKg) / 1000) * r.distanceKm,
    ),
  );
  return econRatio(amount, denom, unit === 'FH' ? 1000 : 1e6);
}
