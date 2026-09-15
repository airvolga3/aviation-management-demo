import type { ExecutiveSnapshot, ExecutiveEntity } from './executive-model';
import {
  allocateMinutes,
  type ProductionSnapshot,
  type DemoFlight,
} from './production-model';

// This extension is a deterministic DEMO, not an AOC, MEL, FTL or HR authority.
export const airlineIds = ['AL1', 'AL2', 'AL3'] as const;
export type AirlineId = (typeof airlineIds)[number];
export const airMonths = Array.from(
  { length: 12 },
  (_, i) => `2026-${String(i + 1).padStart(2, '0')}`,
);
export const airSum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const airRatio = (a: number, b: number) => (b ? (100 * a) / b : null);
const split = (total: number, weights: number[]) =>
  allocateMinutes(Math.round(total * 100), weights).map((x) => x / 100);
const days = (a: string, b: string) =>
  (Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000;
export const airProfiles = {
  'AL1-IL76': { payload: 45, speed: 650, fuel: 7.5, hoursPerDay: 5, crew: 6 },
  'AL1-AN124': { payload: 100, speed: 720, fuel: 12, hoursPerDay: 6, crew: 8 },
  'AL2-B734': { payload: 18, speed: 700, fuel: 2.6, hoursPerDay: 6, crew: 2 },
  'AL3-B744': {
    payload: 105,
    speed: 800,
    fuel: 10.5,
    hoursPerDay: 10,
    crew: 4,
  },
} as const; // Illustrative mission envelopes, NOT certified aircraft performance.
export type AirScope = {
  start: string;
  end: string;
  fleet?: string;
  aircraft?: string;
  category?: string;
};
export type AirRecord = {
  verification?: {
    domain: 'safety' | 'quality';
    due: string;
    verifiedDate?: string;
  };
  id: string;
  kind: string;
  title: string;
  date: string;
  due?: string;
  owner: string;
  status: string;
  cause: string;
  action: string;
  fields: [string, string][];
  links: string[];
  fleet?: string;
  aircraft?: string;
  flightId?: string;
};
export type AirLeg = DemoFlight & {
  fdmObserved: boolean;
  spiFlag: boolean;
  serviceFailure: boolean;
  cargoDamage: boolean;
  revenuePlan: number;
  revenue: number;
  costPlan: number;
  cost: number;
  daPlan: number;
  da: number;
  delay: number | null;
  techDelay: boolean;
  ferry: boolean;
  tonnesPlan: number;
  tonnes: number;
  distance: number;
  fuelPlan: number;
  fuel: number;
  costs: Record<string, { plan: number; value: number }>;
};
export type AirRepair = {
  id: string;
  aircraft: string;
  fleet: string;
  title: string;
  start: string;
  planReturn: string;
  eta: string;
  actualReturn?: string;
  kind: 'AOG' | 'TO';
  cost: number;
};
export type AirPlane = {
  id: string;
  fleet: string;
  name: string;
  status: 'READY' | 'MEL' | 'TO' | 'AOG' | 'UNKNOWN';
  evidence: string;
};
export type AirStaff = {
  id: string;
  department: string;
  role: string;
  fleet?: string;
  fte: number;
  qualification: 'VALID' | 'EXPIRED' | 'UNKNOWN';
  expires: string;
  active: true;
};
export type AirCrewCheck = {
  id: string;
  flightId: string;
  fleet: string;
  aircraft: string;
  date: string;
  members: string[];
  assigned: boolean;
  status: 'CONFIRMED' | 'BLOCKED' | 'UNKNOWN' | 'STALE';
  checks: {
    name: string;
    status: 'PASS' | 'FAIL' | 'UNKNOWN' | 'STALE';
    evidence: string;
  }[];
  legalRelease: 'NOT_EVALUATED';
};
export type AirRequirement = {
  id: string;
  aircraft: string;
  fleet: string;
  kind: string;
  due: string;
  status: 'OPEN' | 'UNKNOWN';
  title: string;
};
export type AirTransaction = {
  id: string;
  month: string;
  date: string;
  category: string;
  bank: string;
  plan: number;
  value: number;
  future: boolean;
  flow: 'OPERATING' | 'INVESTING';
};
export type AirDepartment = {
  id: string;
  name: string;
  plan: number;
  actual: number;
  forecast: number;
};
export type AirlineBundle = {
  companyId: AirlineId;
  name: string;
  snapshotId: string;
  asOf: string;
  classification: 'DEMO_SYNTHETIC';
  method: string;
  entity: ExecutiveEntity;
  fleets: ProductionSnapshot['fleets'];
  legs: AirLeg[];
  planes: AirPlane[];
  repairs: AirRepair[];
  requirements: AirRequirement[];
  departments: AirDepartment[];
  staff: AirStaff[];
  crew: AirCrewCheck[];
  records: AirRecord[];
  transactions: AirTransaction[];
  openingCash: number;
  bankShares: number[];
  hrMonths: {
    month: string;
    opening: number;
    joins: number;
    leavers: number;
    voluntary: number;
    closing: number;
    plan: number;
    future: boolean;
  }[];
};
const labels: Record<string, string> = {
  fuel: 'Топливо',
  airport: 'Аэропортовые услуги',
  maintenance: 'Техническое обслуживание',
  personnel: 'Персонал',
  other: 'Прочие операционные расходы',
  da: 'Амортизация',
};
export const airCostNames = labels;
export const airSectionNames: Record<string, [string, string]> = {
  economics: ['Экономика', 'Economics · P&L'],
  commerce: ['Коммерция', 'Commercial performance'],
  production: ['Производство', 'Flight operations'],
  technical: ['Флот и техника', 'Fleet & maintenance'],
  finance: ['Финансы', 'Treasury & cash flow'],
  people: ['Персонал', 'People & crew'],
  safety: ['Безопасность и качество', 'Safety & quality'],
};

function buildAirline(
  ex: ExecutiveSnapshot,
  prod: ProductionSnapshot,
  id: AirlineId,
): AirlineBundle {
  const e = ex.entities.find((x) => x.id === id);
  if (
    !e ||
    ex.classification !== 'DEMO_SYNTHETIC' ||
    prod.classification !== 'DEMO_SYNTHETIC' ||
    ex.asOf !== prod.asOf ||
    ex.productionSnapshotId !== prod.version
  )
    throw Error('Airline snapshot mismatch');
  if (id === 'AL1')
    for (const source of [ex.al1, ex.operations, ex.commercial])
      if (
        !source ||
        source.snapshotId !== ex.snapshotId ||
        source.asOf !== ex.asOf ||
        source.classification !== 'DEMO_SYNTHETIC'
      )
        throw Error('AL1 canonical source identity mismatch');
  const fleets = prod.fleets.filter((x) => x.company === id),
    source = prod.flights.filter((x) => x.company === id),
    legs: AirLeg[] = [];
  const code = id === 'AL1' ? 0 : id === 'AL2' ? 1 : 2;
  for (const month of airMonths) {
    const fs = source.filter((f) => f.month === month),
      m = Number(month.slice(5)) - 1;
    const pWeights = fs.map(
      (f) =>
        f.planMinutes *
        airProfiles[f.fleet as keyof typeof airProfiles].payload,
    );
    const fWeights = fs.map(
      (f) =>
        (f.actualMinutes ?? f.forecastMinutes ?? 0) *
        airProfiles[f.fleet as keyof typeof airProfiles].payload,
    );
    const R = e.monthly.revenue[m],
      O = e.monthly.op[m],
      D = e.monthly.da[m];
    const budgets = [
      split(R.plan, pWeights),
      split(R.actual ?? R.forecast!, fWeights),
      split(R.plan - O.plan, pWeights),
      split((R.actual ?? R.forecast!) - (O.actual ?? O.forecast!), fWeights),
      split(D.plan, pWeights),
      split(D.actual ?? D.forecast!, fWeights),
    ];
    fs.forEach((f, i) => {
      const old =
        id === 'AL1'
          ? ex.al1?.ledger.find((x) => x.flightId === f.id)
          : undefined;
      const profile = airProfiles[f.fleet as keyof typeof airProfiles];
      if (!profile) throw Error('Missing aircraft profile');
      const revenuePlan = old?.revenuePlan ?? budgets[0][i],
        revenue = old?.revenue ?? budgets[1][i],
        costPlan = old?.costPlan ?? budgets[2][i],
        cost = old?.cost ?? budgets[3][i],
        daPlan = old?.depreciationPlan ?? budgets[4][i],
        da = old?.depreciation ?? budgets[5][i];
      const costs: AirLeg['costs'] = { da: { plan: daPlan, value: da } };
      const pools = ex.commercial?.rows.find(
        (x) => id === 'AL1' && x.flightId === f.id,
      )?.costBreakdown;
      const cp = split(costPlan - daPlan, [40, 15, 18, 17, 10]),
        cv = split(cost - da, [43 + code, 16, 18, 16, 7 - code]);
      Object.keys(labels)
        .filter((x) => x !== 'da')
        .forEach((key, j) => {
          const pool = pools?.find((x) => x.id === key);
          costs[key] = pool
            ? {
                plan: pool.plan - (key === 'other' ? daPlan : 0),
                value: pool.forecast - (key === 'other' ? da : 0),
              }
            : { plan: cp[j], value: cv[j] };
        });
      const legacyOps =
        id === 'AL1'
          ? ex.operations!.rows.find((r) => r.flightId === f.id)
          : undefined;
      const hours = (f.actualMinutes ?? f.forecastMinutes ?? 0) / 60,
        ferry = legacyOps?.positioning ?? (i + code * 3) % 17 === 0;
      legs.push({
        ...f,
        fdmObserved:
          legacyOps?.fdmValid ??
          (f.status === 'COMPLETED' && (i + code) % 19 !== 0),
        spiFlag:
          legacyOps?.event ??
          (f.status === 'COMPLETED' &&
            (i + code) % 19 !== 0 &&
            (i + m + code) % 101 === 0),
        serviceFailure:
          legacyOps?.commitmentMiss ??
          (f.status === 'CANCELLED' || (i + code) % 13 === 0),
        cargoDamage:
          id === 'AL1'
            ? !!ex.safety?.records.some(
                (r) => r.kind === 'damage' && r.flightId === f.id,
              )
            : f.status === 'COMPLETED' && !ferry && (i + code * 11) % 137 === 0,
        revenuePlan,
        revenue,
        costPlan,
        cost,
        daPlan,
        da,
        costs,
        delay:
          f.status === 'FORECAST'
            ? null
            : (old?.delayMinutes ??
              ((i + code) % 13 === 0 ? 75 : (i + code) % 7 === 0 ? 25 : 0)),
        techDelay: legacyOps
          ? legacyOps.delayCause === 'Техническая причина'
          : (i + code) % 13 === 0,
        ferry,
        tonnesPlan: legacyOps
          ? legacyOps.cargoPlanKg / 1000
          : ferry
            ? 0
            : profile.payload * 0.76,
        tonnes: legacyOps
          ? legacyOps.cargoKg / 1000
          : f.status === 'CANCELLED' || ferry
            ? 0
            : profile.payload * (0.55 + ((i * 7 + m + code) % 28) / 100),
        distance:
          legacyOps?.distanceKm ??
          Math.round((f.planMinutes / 60) * profile.speed),
        fuelPlan: legacyOps
          ? legacyOps.ofpKg / 1000
          : (f.planMinutes / 60) * profile.fuel,
        fuel: legacyOps
          ? legacyOps.fuelKg / 1000
          : hours * profile.fuel * (0.97 + ((i + code) % 9) / 100),
      });
    });
  }
  for (const [i, month] of airMonths.entries()) {
    const rows = legs.filter((f) => f.month === month);
    for (const view of ['plan', 'value'] as const) {
      const r = airSum(
          rows.map((f) => (view === 'plan' ? f.revenuePlan : f.revenue)),
        ),
        c = airSum(rows.map((f) => (view === 'plan' ? f.costPlan : f.cost))),
        d = airSum(rows.map((f) => (view === 'plan' ? f.daPlan : f.da)));
      const source = (key: 'revenue' | 'op' | 'da') =>
        view === 'plan'
          ? e.monthly[key][i].plan
          : (e.monthly[key][i].actual ?? e.monthly[key][i].forecast!);
      if (
        Math.abs(r - source('revenue')) > 1e-7 ||
        Math.abs(r - c - source('op')) > 1e-7 ||
        Math.abs(d - source('da')) > 1e-7
      )
        throw Error('Airline monthly reconciliation failed');
    }
  }
  const planes: AirPlane[] = fleets.flatMap((f) =>
    Array.from({ length: f.demoAircraftCount }, (_, i) => ({
      id: `DEMO-${f.id}-${String(i + 1).padStart(2, '0')}`,
      fleet: f.id,
      name: f.aircraft,
      status: 'READY' as const,
      evidence: `STATE-${id}-${f.id}-${i + 1}`,
    })),
  );
  const repairs: AirRepair[] =
    id === 'AL1'
      ? (ex.al1?.repairs ?? []).map((r) => ({
          id: r.id,
          aircraft: r.aircraftId,
          fleet: planes.find((p) => p.id === r.aircraftId)!.fleet,
          title: r.title,
          start: r.start,
          planReturn: r.planReturn,
          eta: r.expectedReturn,
          kind: r.status === 'AOG' ? 'AOG' : 'TO',
          cost: r.cost,
        }))
      : [
          {
            id: `MX-${id}-01`,
            aircraft: planes[0].id,
            fleet: planes[0].fleet,
            title:
              code === 1
                ? 'Устранение дефекта гидросистемы'
                : 'Замена агрегата двигателя',
            start: '2026-08-29',
            planReturn: '2026-09-04',
            eta: code === 1 ? '2026-09-09' : '2026-09-12',
            kind: 'AOG',
            cost: code === 1 ? 4.5 : 22,
          },
          {
            id: `MX-${id}-02`,
            aircraft: planes[1].id,
            fleet: planes[1].fleet,
            title: 'Плановая форма технического обслуживания',
            start: '2026-10-03',
            planReturn: '2026-10-11',
            eta: '2026-10-13',
            kind: 'TO',
            cost: code === 1 ? 3.2 : 15,
          },
        ];
  // Completed work orders supply real denominators for the demo maintenance trend.
  planes.forEach((p, i) =>
    repairs.push({
      id: `MX-${id}-H${i + 1}`,
      aircraft: p.id,
      fleet: p.fleet,
      title: 'Завершённое плановое ТО · учебный заказ',
      start: `2026-0${(i % 6) + 1}-10`,
      planReturn: `2026-0${(i % 6) + 1}-13`,
      eta: `2026-0${(i % 6) + 1}-${i % 4 === 0 ? '15' : '13'}`,
      actualReturn: `2026-0${(i % 6) + 1}-${i % 4 === 0 ? '15' : '13'}`,
      kind: 'TO',
      cost: 0.6 + code,
    }),
  );
  const requirements: AirRequirement[] = [];
  planes.forEach((p, i) => {
    const repair = repairs.find(
      (r) =>
        r.aircraft === p.id &&
        r.start <= ex.asOf &&
        (r.actualReturn ?? r.eta) > ex.asOf,
    );
    p.status = repair
      ? repair.kind
      : id === 'AL1'
        ? 'READY'
        : i === planes.length - 1
          ? 'MEL'
          : 'READY';
    requirements.push({
      id: `REQ-${id}-${i + 1}`,
      aircraft: p.id,
      fleet: p.fleet,
      kind: i % 3 === 0 ? 'LLP' : i % 3 === 1 ? 'AD' : 'MEL',
      due: `2026-${i % 3 === 0 ? '09-08' : i % 3 === 1 ? '10-20' : '09-18'}`,
      status: i === 1 ? 'UNKNOWN' : 'OPEN',
      title:
        i % 3 === 0
          ? 'Проверка остаточного ресурса компонента'
          : i % 3 === 1
            ? 'Подтверждение применимости директивы'
            : 'Срок устранения отложенного дефекта / проверка перечня',
    });
  });
  const departments: AirDepartment[] =
    id === 'AL1'
      ? (ex.al1?.staff ?? []).map((d) => ({
          id: d.id,
          name: d.name,
          plan: d.plan,
          actual: d.actual,
          forecast: d.forecast,
        }))
      : [
          {
            id: `HR-${id}-CREW`,
            name: 'Лётная служба',
            plan: code === 1 ? 36 : 80,
            actual: code === 1 ? 32 : 74,
            forecast: code === 1 ? 35 : 79,
          },
          {
            id: `HR-${id}-TECH`,
            name: 'Техническая служба',
            plan: code === 1 ? 28 : 55,
            actual: code === 1 ? 26 : 51,
            forecast: code === 1 ? 28 : 54,
          },
          {
            id: `HR-${id}-GROUND`,
            name: 'Наземное обеспечение',
            plan: code === 1 ? 22 : 40,
            actual: code === 1 ? 20 : 38,
            forecast: code === 1 ? 22 : 40,
          },
          {
            id: `HR-${id}-OFFICE`,
            name: 'Управление и поддержка',
            plan: code === 1 ? 24 : 35,
            actual: code === 1 ? 23 : 33,
            forecast: code === 1 ? 24 : 35,
          },
        ];
  const staff: AirStaff[] = departments.flatMap((d, j) =>
    Array.from({ length: d.actual }, (_, i) => ({
      id: `EMP-${id}-${j + 1}-${String(i + 1).padStart(3, '0')}`,
      department: d.id,
      role:
        j === 0
          ? i % 2 === 0
            ? 'КВС / командир экипажа'
            : 'Лётный состав'
          : j === 1
            ? 'Технический специалист'
            : j === 2
              ? 'Специалист наземного обеспечения'
              : 'Специалист управления',
      fleet: j < 2 ? fleets[i % fleets.length].id : undefined,
      fte: i % 13 === 0 ? 0.5 : 1,
      qualification:
        i % 29 === 0
          ? ('EXPIRED' as const)
          : i % 23 === 0
            ? ('UNKNOWN' as const)
            : ('VALID' as const),
      expires:
        i % 29 === 0 ? '2026-08-25' : i % 7 === 0 ? '2026-09-08' : '2027-02-01',
      active: true as const,
    })),
  );
  const crew: AirCrewCheck[] = legs
    .filter((f) => f.status === 'FORECAST')
    .map((f, i) => {
      const pool = staff.filter(
          (p) => p.department === departments[0].id && p.fleet === f.fleet,
        ),
        need = airProfiles[f.fleet as keyof typeof airProfiles].crew;
      const members = Array.from(
        { length: need },
        (_, j) => pool[(i * need + j) % pool.length],
      );
      const assigned =
        id === 'AL1' ? !ex.al1!.crewRisk.includes(f.id) : i % 31 !== 0;
      const checks: AirCrewCheck['checks'] = [
        {
          name: 'Полный состав учебного комплекта',
          status: assigned ? 'PASS' : 'FAIL',
          evidence: 'Профиль состава DEMO, не РЛЭ',
        },
        {
          name: 'Квалификация и срок проверки на вылет',
          status: members.some(
            (p) => p.qualification === 'EXPIRED' || p.expires < f.date,
          )
            ? 'FAIL'
            : members.some((p) => p.qualification === 'UNKNOWN')
              ? 'UNKNOWN'
              : 'PASS',
          evidence: 'Учебные карточки подготовки членов комплекта',
        },
        {
          name: 'Медицинское подтверждение без диагноза',
          status: i % 19 === 0 ? 'UNKNOWN' : 'PASS',
          evidence: 'Учебный статус подтверждения, не медицинское заключение',
        },
        {
          name: 'Duty / rest / FTL и другие назначения',
          status: i % 17 === 0 ? 'UNKNOWN' : 'PASS',
          evidence:
            'Учебная отметка планировщика; исходные журналы FTL не подключены',
        },
        {
          name: 'Актуальность проверки расписания',
          status: i % 23 === 0 ? 'STALE' : 'PASS',
          evidence:
            'Версия назначения DEMO-R1; при изменении требуется перепроверка',
        },
      ];
      // Date-level duplicate assignment is detectable even without a full duty log.
      return {
        id: `CREW-${f.id}`,
        flightId: f.id,
        fleet: f.fleet,
        aircraft: f.aircraftId,
        date: f.date,
        members: assigned ? members.map((p) => p.id) : [],
        assigned,
        status: checks.some((c) => c.status === 'FAIL')
          ? 'BLOCKED'
          : checks.some((c) => c.status === 'UNKNOWN')
            ? 'UNKNOWN'
            : checks.some((c) => c.status === 'STALE')
              ? 'STALE'
              : 'CONFIRMED',
        checks,
        legalRelease: 'NOT_EVALUATED',
      };
    });
  const assignments = new Map<string, number>();
  crew.forEach((c) =>
    c.members.forEach((p) =>
      assignments.set(p + c.date, (assignments.get(p + c.date) ?? 0) + 1),
    ),
  );
  crew.forEach((c) => {
    const conflict = c.members.some((p) => assignments.get(p + c.date)! > 1);
    c.checks.push({
      name: 'Повторное назначение в тот же день',
      status: conflict ? 'UNKNOWN' : 'PASS',
      evidence: conflict
        ? 'Несколько назначений: нужны времена duty и позиционирования'
        : 'Повторений в дневном реестре не найдено; точные времена не подключены',
    });
    if (conflict && c.status === 'CONFIRMED') c.status = 'UNKNOWN';
  });
  const target = airSum(departments.map((d) => d.actual)),
    planHC = airSum(departments.map((d) => d.plan)),
    forecastHC = airSum(departments.map((d) => d.forecast));
  let head = target - 8;
  const hrMonths: AirlineBundle['hrMonths'] = airMonths.map((month, i) => {
    const opening = head,
      leavers = i < 8 ? 2 : 1,
      joins =
        i < 8
          ? 3
          : 1 +
            Math.floor((forecastHC - target) / 4) +
            (i % 4 < (forecastHC - target) % 4 ? 1 : 0);
    head += joins - leavers;
    return {
      month,
      opening,
      joins,
      leavers,
      voluntary: i % 3 === 0 ? 1 : leavers,
      closing: head,
      plan: planHC,
      future: i >= 8,
    };
  });
  const transactions: AirTransaction[] = [];
  if (id !== 'AL1')
    for (const [i, month] of airMonths.entries()) {
      const R = e.monthly.revenue[i],
        O = e.monthly.ocf[i],
        C = e.monthly.capex[i];
      const receiptsPlan = Math.round(R.plan * 0.93 * 100) / 100,
        receipts = Math.round((R.actual ?? R.forecast!) * 0.9 * 100) / 100;
      const outPlan = split(
          receiptsPlan - O.plan,
          [28, 18, 18, 12, 8, 6, 5, 3, 2],
        ),
        out = split(
          receipts - (O.actual ?? O.forecast!),
          [31, 17, 17, 12, 7, 6, 5, 3, 2],
        );
      const cats = [
        'Топливо',
        'Аэропорты',
        'Персонал',
        'Техническое обслуживание',
        'Налоги уплаченные',
        'Проценты уплаченные',
        'Комиссии агентам',
        'Штрафы и неустойки',
        'Прочие платежи',
      ];
      const paidInterest = code === 1 ? 1.5 : 6,
        receivedInterest = code === 1 ? 0.2 : 0.6;
      outPlan[0] =
        Math.round((outPlan[0] + outPlan[5] - paidInterest) * 100) / 100;
      out[0] = Math.round((out[0] + out[5] - paidInterest) * 100) / 100;
      outPlan[5] = paidInterest;
      out[5] = paidInterest;
      const items = [
        {
          category: 'Поступления от заказчиков',
          plan: Math.round((receiptsPlan - receivedInterest) * 100) / 100,
          value: Math.round((receipts - receivedInterest) * 100) / 100,
          flow: 'OPERATING' as const,
        },
        {
          category: 'Проценты полученные',
          plan: receivedInterest,
          value: receivedInterest,
          flow: 'OPERATING' as const,
        },
        ...cats.map((category, j) => ({
          category,
          plan: -outPlan[j],
          value: -out[j],
          flow: 'OPERATING' as const,
        })),
        {
          category: 'Капитальные платежи',
          plan: -C.plan,
          value: -(C.actual ?? C.forecast!),
          flow: 'INVESTING' as const,
        },
      ];
      const dates =
        i < 8
          ? [month + '-20']
          : i < 11
            ? e.weeks.filter((w) => w.date.startsWith(month)).map((w) => w.date)
            : ['2026-12-07', '2026-12-14', '2026-12-21', '2026-12-28'];
      const monthlyTransactions: AirTransaction[] = [];
      items.forEach((item, j) => {
        const pp = split(item.plan, [65, 35]),
          vv = split(item.value, [65, 35]);
        [0, 1].forEach((b) => {
          const wp = split(
              pp[b],
              dates.map(() => 1),
            ),
            wv = split(
              vv[b],
              dates.map(() => 1),
            );
          dates.forEach((date, w) =>
            monthlyTransactions.push({
              id: `PAY-${id}-${month}-${j + 1}-${b + 1}-${w + 1}`,
              month,
              date,
              category: item.category,
              bank: `DEMO-BANK-${id}-${b + 1}`,
              plan: wp[w],
              value: wv[w],
              future: i >= 8,
              flow: item.flow,
            }),
          );
        });
      });
      // Preserve the already approved weekly net movement; redistribute rounding
      // within monthly receipts rather than invent another cash trajectory.
      if (i >= 8 && i < 11)
        for (const date of dates) {
          const target = e.weeks.find((w) => w.date === date)!.movement,
            current = airSum(
              monthlyTransactions
                .filter((t) => t.date === date)
                .map((t) => t.value),
            );
          const first = monthlyTransactions.find(
            (t) =>
              t.date === date && t.category === 'Поступления от заказчиков',
          )!;
          first.value =
            Math.round((first.value + target - current) * 100) / 100;
        }
      transactions.push(...monthlyTransactions);
    }
  const records: AirRecord[] = [];
  const add = (r: AirRecord) => records.push(r);
  planes.forEach((p) =>
    add({
      id: p.id,
      kind: 'aircraft',
      title: p.name + ' · ' + p.id,
      date: ex.asOf,
      owner: 'Технический директор · ' + e.name,
      status: p.status,
      cause:
        'Явная учебная запись состояния на дату, не вывод из отсутствия ремонтов.',
      action:
        'Сверить статус выпуска, ограничения миссии и рейсовую программу.',
      fields: [
        ['Основание', p.evidence],
        ['Тип', p.name],
      ],
      links: [
        ...repairs.filter((r) => r.aircraft === p.id).map((r) => r.id),
        ...requirements.filter((r) => r.aircraft === p.id).map((r) => r.id),
      ],
      fleet: p.fleet,
      aircraft: p.id,
    }),
  );
  repairs.forEach((r) =>
    add({
      id: r.id,
      kind: 'repair',
      title: r.title,
      date: r.start,
      due: r.planReturn,
      owner: 'Технический директор · ' + e.name,
      status: r.actualReturn
        ? 'Выполнено'
        : r.start > ex.asOf
          ? 'План'
          : 'В работе',
      cause:
        r.kind === 'AOG'
          ? 'Внеплановый дефект; срок зависит от поставки агрегата.'
          : 'Плановая программа ТО; требуется подтверждение слота.',
      action: r.actualReturn
        ? 'Проверить качество возврата и повторные дефекты.'
        : 'Подтвердить запчасти и срок возврата; согласовать замену борта с OCC.',
      fields: [
        ['План возврата', r.planReturn],
        ['Текущий ETA', r.eta],
        ['Факт возврата', r.actualReturn ?? 'Нет'],
        ['Оценка заказа, млн ₽', String(r.cost)],
        [
          'Учёт стоимости',
          'Справочная оценка заказа. НЕ дополнительный расход к P&L; проводки не распределены на заказ.',
        ],
      ],
      links: [
        r.aircraft,
        ...legs
          .filter(
            (f) =>
              f.aircraftId === r.aircraft &&
              f.date >= r.start &&
              f.date < (r.actualReturn ?? r.eta),
          )
          .map((f) => f.id),
      ],
      fleet: r.fleet,
      aircraft: r.aircraft,
    }),
  );
  requirements.forEach((r) =>
    add({
      id: r.id,
      kind: 'requirement',
      title: r.kind + ' · ' + r.title,
      date: ex.asOf,
      due: r.due,
      owner: 'Управление лётной годностью · ' + e.name,
      status: r.status,
      cause:
        r.status === 'UNKNOWN'
          ? 'Не подтверждена применимость / редакция.'
          : 'Учебный срок из демонстрационного реестра.',
      action:
        'Получить применимый документ и проверить календарный срок, FH и FC. Не продлевать автоматически.',
      fields: [
        ['Срок календарный', r.due],
        ['Остаток FH / FC', 'Не подтверждён: требуется паспорт компонента'],
        [
          'Юридическая применимость',
          'Не оценена; это не реальная AD / MEL / LLP',
        ],
      ],
      links: [r.aircraft],
      fleet: r.fleet,
      aircraft: r.aircraft,
    }),
  );
  departments.forEach((d) =>
    add({
      id: d.id,
      kind: 'department',
      title: d.name,
      date: ex.asOf,
      owner: 'HR-директор · ' + e.name,
      status: d.actual < d.plan ? 'Дефицит' : 'По плану',
      cause: 'Учебное штатное расписание и кадровый реестр.',
      action:
        'Приоритизировать дефицитные роли; не взаимозачитывать разные квалификации.',
      fields: [
        ['План HC', String(d.plan)],
        ['Факт HC', String(d.actual)],
        ['Прогноз HC на 31.12', String(d.forecast)],
      ],
      links: staff.filter((p) => p.department === d.id).map((p) => p.id),
    }),
  );
  staff.forEach((p) =>
    add({
      id: p.id,
      kind: 'employee',
      title: p.id + ' · ' + p.role,
      date: ex.asOf,
      due: p.expires,
      owner: 'Руководитель функции и HR · ' + e.name,
      status: p.qualification,
      cause:
        'Обезличенный учебный сотрудник. Карточка допуска — отдельное требование, не универсальная оценка человека.',
      action:
        p.qualification === 'VALID'
          ? 'Запланировать подготовку до истечения срока.'
          : 'Проверить подтверждение / назначить подготовку, пересмотреть задания.',
      fields: [
        ['FTE', String(p.fte)],
        ['Срок выбранного требования', p.expires],
        [
          'Полнота',
          'Один учебный профиль подготовки; не полный комплект лицензий',
        ],
      ],
      links: [
        p.department,
        ...crew.filter((c) => c.members.includes(p.id)).map((c) => c.id),
      ],
      fleet: p.fleet,
    }),
  );
  crew.forEach((c) =>
    add({
      id: c.id,
      kind: 'crew',
      title: 'Проверка комплекта · ' + c.flightId,
      date: c.date,
      due: c.date,
      owner: 'Производственный директор / crew planning · ' + e.name,
      status: c.status,
      cause: 'Назначение не является разрешением на вылет.',
      action:
        'Закрыть недостающие подтверждения, проверить полный duty/rest, допуски и позиционирование; затем повторить проверку.',
      fields: [
        ...c.checks.map((ch): [string, string] => [
          ch.name,
          ch.status + ' · ' + ch.evidence,
        ]),
        [
          'Юридический допуск',
          'NOT_EVALUATED — учебная проверка не разрешает полёт',
        ],
      ],
      links: [c.flightId, ...c.members],
      fleet: c.fleet,
      aircraft: c.aircraft,
      flightId: c.flightId,
    }),
  );
  if (id !== 'AL1') {
    transactions.forEach((t) =>
      add({
        id: t.id,
        kind: 'payment',
        title: t.category + ' · ' + t.bank,
        date: t.date,
        owner: 'Казначейство · ' + e.name,
        status: t.future ? 'Прогноз' : 'Учебный факт',
        cause:
          'Декомпозиция согласованных месячных OCF / CAPEX. Это денежное движение, не начисление P&L.',
        action:
          t.value < 0
            ? 'Сверить срок и приоритет платежа с доступной ликвидностью.'
            : 'Сверить получение с обязательством заказчика.',
        fields: [
          ['План, млн ₽', String(t.plan)],
          ['Факт / прогноз, млн ₽', String(t.value)],
          ['Раздел потока', t.flow],
        ],
        links: [],
      }),
    );
    for (const f of legs.filter((f) => f.spiFlag || f.cargoDamage))
      for (const kind of [
        ...(f.spiFlag ? ['spi'] : []),
        ...(f.cargoDamage ? ['cargo-damage'] : []),
      ])
        add({
          id: `OBS-${kind}-${f.id}`,
          kind,
          title:
            kind === 'spi'
              ? 'Срабатывание учебного FDM-индикатора'
              : 'Акт нарушения сохранности груза',
          date: f.date,
          owner:
            (kind === 'spi' ? 'Лётная служба / СУБП' : 'Директор по качеству') +
            ' · ' +
            e.name,
          status: 'Требует проверки',
          cause:
            'Учебное наблюдение по конкретному рейсу; не равно официальному авиационному инциденту или признанному ущербу.',
          action:
            'Проверить первичные материалы; оценить риск и назначить корректирующую меру.',
          fields: [
            ['Подтверждение источника', 'DEMO · FDM / акт обработки груза'],
          ],
          links: [f.id],
          fleet: f.fleet,
          aircraft: f.aircraftId,
          flightId: f.id,
        });
    const flown = legs.filter((f) => f.status === 'COMPLETED');
    const eventConfig = [
      ['event', 'Авиационный инцидент', 'Открыто'],
      ['deviation', 'Отклонение от условий эксплуатации', 'В работе'],
      ['ground', 'Повреждение на земле', 'Закрыто'],
      ['claim', 'Претензия по исполнению обязательства', 'В работе'],
      ['finding', 'Замечание надзорной проверки', 'В работе'],
      ['inspection', 'Наземная инспекция · SAFA', 'Завершена'],
      ['action', 'Корректирующая мера', 'В работе'],
      ['risk', 'Риск технического прерывания программы', 'Требует решения'],
    ];
    eventConfig.forEach(([kind, title, status], i) => {
      const f = flown[Math.max(0, flown.length - 1 - i * 23)];
      add({
        id: `SQ-${id}-${i + 1}`,
        kind,
        title,
        date: f.date,
        due: i === 4 ? '2026-08-28' : '2026-09-12',
        owner:
          (['event', 'deviation', 'ground', 'risk'].includes(kind)
            ? 'Руководитель СУБП'
            : 'Директор по качеству') +
          ' · ' +
          e.name,
        status,
        cause:
          'Синтетический кейс ' +
          id +
          '. Причина требует проверки и не означает персональной виновности.',
        action:
          kind === 'inspection'
            ? 'Проверить закрытие замечаний по акту инспекции.'
            : 'Подтвердить причины, назначить меру и отдельно проверить результативность.',
        fields: [
          ['Классификация', 'Учебная; не официальное решение расследования'],
          [
            'SAFA ratio / единый индекс',
            'Не рассчитан: методика и полный массив не подключены',
          ],
        ],
        links: [f.id],
        fleet: f.fleet,
        aircraft: f.aircraftId,
        flightId: f.id,
      });
    });
    for (const domain of ['safety', 'quality'] as const)
      for (let i = 0; i < 2; i++)
        add({
          id: `CAPA-${id}-${domain}-${i + 1}`,
          kind: domain === 'safety' ? 'safety-action' : 'quality-action',
          title:
            'Проверка результативности · ' +
            (domain === 'safety' ? 'СУБП' : 'качество') +
            ' · ' +
            (i + 1),
          date: '2026-08-10',
          due: '2026-08-20',
          owner:
            (domain === 'safety'
              ? 'Руководитель СУБП'
              : 'Директор по качеству') +
            ' · ' +
            e.name,
          status: 'Выполнено',
          cause:
            'Выполнение мероприятия и подтверждение эффекта — разные этапы.',
          action:
            i === 0
              ? 'Контролировать устойчивость результата.'
              : 'Получить проверку эффекта; закрытие исполнения не закрывает риск.',
          verification: {
            domain,
            due: '2026-08-28',
            verifiedDate: i === 0 ? '2026-08-27' : undefined,
          },
          fields: [
            ['Исполнение', 'Завершено 20.08'],
            ['Проверить результат до', '2026-08-28'],
            ['Подтверждение эффекта', i === 0 ? '2026-08-27' : 'Не получено'],
          ],
          links: [`SQ-${id}-${domain === 'safety' ? 1 : 5}`],
        });
    [
      {
        kind: 'debt',
        title: 'Кредитный портфель',
        amount: code === 1 ? 120 : 650,
      },
      {
        kind: 'deposit',
        title: 'Размещение денежных средств',
        amount: code === 1 ? 12 : 35,
      },
      {
        kind: 'receivable',
        title: 'Дебиторская задолженность',
        amount: code === 1 ? 65 : 280,
      },
      {
        kind: 'overdue-ar',
        title: 'В том числе просроченная ДЗ',
        amount: code === 1 ? 18 : 75,
      },
      {
        kind: 'payable',
        title: 'Кредиторская задолженность',
        amount: code === 1 ? 90 : 360,
      },
    ].forEach((x) =>
      add({
        id: `STOCK-${id}-${x.kind}`,
        kind: x.kind,
        title: x.title,
        date: ex.asOf,
        owner: 'Финансовый директор · ' + e.name,
        status: 'Учебный остаток',
        cause:
          'Отдельное новое допущение компании, не масштабирование счетов АК1.',
        action: 'При подключении подтвердить договоры, сроки и ограничения.',
        fields: [
          ['Остаток, млн ₽', String(x.amount)],
          [
            'Учёт',
            'На дату; не суммируется по месяцам. Депозит показан вне денежного остатка текущих счетов.',
          ],
        ],
        links: [],
      }),
    );
  }
  return {
    companyId: id,
    name: e.name,
    snapshotId: ex.snapshotId,
    asOf: ex.asOf,
    classification: 'DEMO_SYNTHETIC',
    method: 'AIRLINES-v0.23',
    entity: e,
    fleets,
    legs,
    planes,
    repairs,
    requirements,
    departments,
    staff,
    crew,
    records,
    transactions,
    openingCash:
      Math.round((e.cash - e.flows.ocf.actual + e.flows.capex.actual) * 100) /
      100,
    bankShares: [0.65, 0.35],
    hrMonths,
  };
}
export function buildAirlines(
  ex: ExecutiveSnapshot,
  prod: ProductionSnapshot,
): Record<AirlineId, AirlineBundle> {
  return Object.fromEntries(
    airlineIds.map((id) => [id, buildAirline(ex, prod, id)]),
  ) as Record<AirlineId, AirlineBundle>;
}
export function airMatch(
  r: { fleet?: string; aircraftId?: string; aircraft?: string },
  s: AirScope,
) {
  return (
    (!s.fleet || r.fleet === s.fleet) &&
    (!s.aircraft || (r.aircraftId ?? r.aircraft) === s.aircraft)
  );
}
export function airLegs(a: AirlineBundle, s: AirScope) {
  return a.legs.filter(
    (r) =>
      r.month >= s.start &&
      r.month <= s.end &&
      airMatch(r, s) &&
      (!s.category || s.category === 'ALL' || r.service === s.category),
  );
}
export function airTechnicalRisk(a: AirlineBundle, f: AirLeg) {
  return (
    f.status === 'FORECAST' &&
    a.repairs.some(
      (r) =>
        r.aircraft === f.aircraftId &&
        r.start <= f.date &&
        (r.actualReturn ?? r.eta) > f.date,
    )
  );
}
export function airResourceSummary(a: AirlineBundle, s: AirScope) {
  const planes = a.planes.filter((p) => airMatch(p, s)),
    rs = a.repairs.filter((r) => airMatch(r, s)),
    closedEnd = s.end < '2026-08' ? s.end + '-31' : a.asOf;
  const start = s.start + '-01',
    hasClosed = start <= a.asOf;
  const endExclusive = hasClosed
    ? s.end < '2026-08'
      ? new Date(Date.UTC(2026, Number(s.end.slice(5)), 1))
          .toISOString()
          .slice(0, 10)
      : '2026-09-01'
    : start;
  const calendar = hasClosed
    ? Math.max(0, days(start, endExclusive)) * 24 * planes.length
    : 0;
  // Union unavailable calendar intervals per aircraft; overlapping orders never double-count.
  let unavailable = 0,
    planned = 0;
  for (const p of planes)
    for (
      let d = Date.parse(start + 'T00:00:00Z');
      d < Date.parse(endExclusive + 'T00:00:00Z');
      d += 86400000
    ) {
      const date = new Date(d).toISOString().slice(0, 10);
      const active = rs.filter(
        (r) =>
          r.aircraft === p.id &&
          r.start <= date &&
          (r.actualReturn ?? r.eta) > date,
      );
      if (active.length) {
        unavailable += 24;
        if (active.every((r) => r.kind === 'TO')) planned += 24;
      }
    }
  const due = rs.filter(
      (r) => r.planReturn >= start && r.planReturn <= closedEnd,
    ),
    ontime = due.filter(
      (r) => r.actualReturn && r.actualReturn <= r.planReturn,
    ).length;
  const flights = airLegs(a, s),
    closed = flights.filter((f) => f.status !== 'FORECAST'),
    techBad = closed.filter(
      (f) => f.techDelay && (f.status === 'CANCELLED' || (f.delay ?? 0) > 15),
    );
  const future = flights.filter((f) => f.status === 'FORECAST'),
    risk = future.filter((f) => airTechnicalRisk(a, f));
  const crew = a.crew.filter((c) => future.some((f) => f.id === c.flightId));
  const staff = a.staff.filter((p) => !s.fleet || p.fleet === s.fleet);
  return {
    planes,
    ready: planes.filter((p) => p.status === 'READY').length,
    limited: planes.filter((p) => p.status === 'MEL').length,
    calendar,
    unavailable,
    planned,
    availability: airRatio(calendar - unavailable, calendar),
    dispatch: airRatio(closed.length - techBad.length, closed.length),
    techBad,
    maintenance: airRatio(ontime, due.length),
    due,
    ontime,
    risk,
    future,
    crew,
    confirmed: crew.filter((c) => c.status === 'CONFIRMED').length,
    blocked: crew.filter((c) => c.status === 'BLOCKED').length,
    unknown: crew.filter((c) => c.status === 'UNKNOWN').length,
    stale: crew.filter((c) => c.status === 'STALE').length,
    staff,
    hc: staff.length,
    fte: airSum(staff.map((p) => p.fte)),
    valid: staff.filter(
      (p) => p.qualification === 'VALID' && p.expires >= a.asOf,
    ).length,
  };
}
export type AirView = 'plan' | 'actual' | 'forecast';
export function airSafetySummary(a: AirlineBundle, s: AirScope) {
  const closed = airLegs(a, s).filter((f) => f.status !== 'FORECAST'),
    flown = closed.filter((f) => f.status === 'COMPLETED'),
    observed = flown.filter((f) => f.fdmObserved),
    commercial = closed.filter((f) => !f.ferry),
    failures = commercial.filter((f) => f.serviceFailure),
    damaged = commercial.filter((f) => f.cargoDamage);
  const effects = (domain: 'safety' | 'quality') => {
    const due = a.records.filter(
      (r) =>
        airMatch(r, s) &&
        r.verification?.domain === domain &&
        r.verification.due <= a.asOf,
    );
    return {
      due: due.length,
      verified: due.filter(
        (r) =>
          r.verification?.verifiedDate && r.verification.verifiedDate <= a.asOf,
      ).length,
    };
  };
  return {
    closed,
    flown,
    observed,
    commercial,
    failures,
    damaged,
    fdm: airRatio(observed.length, flown.length),
    spi: observed.length
      ? (1000 * observed.filter((f) => f.spiFlag).length) / observed.length
      : null,
    service: airRatio(commercial.length - failures.length, commercial.length),
    integrity: closed.length ? damaged.length : null,
    safetyEffect: effects('safety'),
    qualityEffect: effects('quality'),
  };
}
export function airValue(
  a: AirlineBundle,
  s: AirScope,
  key: string,
  view: AirView,
): number | null {
  // AL1 keeps its existing canonical operations/economics calculators. This
  // resource extension must not silently publish a competing M2/M3/tax method.
  if (
    a.companyId === 'AL1' &&
    ![
      'revenue',
      'op',
      'opex',
      'hours',
      'da',
      'ocf',
      'capex',
      'fcf',
      'personnelCost',
      'maintenanceCost',
    ].includes(key) &&
    !key.startsWith('expense-')
  )
    return null;
  let fs = airLegs(a, s);
  if (view === 'actual') fs = fs.filter((f) => f.status !== 'FORECAST');
  if (!fs.length) return null;
  // No implicit prediction of punctuality from a missing future delay.
  if (
    key === 'punctuality' &&
    view === 'forecast' &&
    fs.some((f) => f.status === 'FORECAST')
  )
    return null;
  const P = view === 'plan',
    R = airSum(fs.map((f) => (P ? f.revenuePlan : f.revenue))),
    C = airSum(fs.map((f) => (P ? f.costPlan : f.cost))),
    H =
      airSum(
        fs.map((f) =>
          P ? f.planMinutes : (f.actualMinutes ?? f.forecastMinutes ?? 0),
        ),
      ) / 60;
  const done = P ? fs : fs.filter((f) => f.status !== 'CANCELLED'),
    T = airSum(done.map((f) => (P ? f.tonnesPlan : f.tonnes))),
    RTK = airSum(done.map((f) => (P ? f.tonnesPlan : f.tonnes) * f.distance)),
    ATK = airSum(
      done.map(
        (f) =>
          airProfiles[f.fleet as keyof typeof airProfiles].payload * f.distance,
      ),
    );
  const cost = (k: string) =>
    airSum(fs.map((f) => f.costs[k]?.[P ? 'plan' : 'value'] ?? 0));
  const vals: Record<string, number | null> = {
    revenue: R,
    op: R - C,
    opex: C,
    margin: airRatio(R - C, R),
    hours: H,
    flights: done.length,
    tonnes: T,
    rtk: RTK / 1e6,
    atk: ATK / 1e6,
    load: airRatio(RTK, ATK),
    yield: RTK ? (R * 1e6) / RTK : null,
    revenueHour: H ? (R * 1e6) / H : null,
    costHour: H ? (C * 1e6) / H : null,
    costRtk: RTK ? (C * 1e6) / RTK : null,
    price: done.length ? (R * 1e6) / done.length : null,
    coverage: C ? R / C : null,
    punctuality: airRatio(
      done.filter((f) => P || (f.delay ?? 0) <= 15).length,
      done.length,
    ),
    regularity: airRatio(done.length, fs.length),
    ferry: done.filter((f) => f.ferry).length,
    fuel: airSum(fs.map((f) => (P ? f.fuelPlan : f.fuel))),
    da: cost('da'),
    m1: R - cost('fuel') - cost('airport'),
    m2:
      R -
      cost('fuel') -
      cost('airport') -
      cost('maintenance') * 0.65 -
      cost('personnel') * 0.2,
    m3: R - C + cost('other') * 0.4 + cost('personnel') * 0.2 + cost('da'),
    indirect: cost('other') * 0.4 + cost('personnel') * 0.2,
    acmi: cost('maintenance') + cost('personnel') * 0.8 + cost('other') * 0.5,
    maintenanceCost: cost('maintenance'),
    personnelCost: cost('personnel'),
  };
  if (key.startsWith('expense-') && key.slice(8) in labels)
    return cost(key.slice(8));
  if (key in vals) return vals[key];
  if (
    [
      'ocf',
      'capex',
      'fcf',
      'financeCost',
      'interestIncome',
      'tax',
      'pbt',
      'net',
    ].includes(key)
  ) {
    if (s.fleet || s.aircraft || (s.category && s.category !== 'ALL'))
      return null;
    if (['ocf', 'capex', 'fcf'].includes(key)) {
      const rows = a.entity.monthly[key as 'ocf'].filter(
        (m) =>
          m.month >= s.start &&
          m.month <= s.end &&
          (view !== 'actual' || m.actual !== null),
      );
      return rows.length
        ? airSum(rows.map((m) => (P ? m.plan : (m.actual ?? m.forecast!))))
        : null;
    }
    // Separate below-OP scenario, not a claim about Russian statutory taxation.
    let cumulative = 0,
      previousTax = 0,
      total = 0;
    for (const [i, month] of airMonths.entries()) {
      const op = a.entity.monthly.op[i],
        interest = a.companyId === 'AL2' ? 0.2 : 0.6,
        expense = a.companyId === 'AL2' ? 1.5 : 6;
      const pbt =
        (P ? op.plan : (op.actual ?? op.forecast!)) + interest - expense;
      cumulative += pbt;
      const tax = Math.max(0, cumulative) * 0.2,
        charge = tax - previousTax;
      previousTax = tax;
      if (month >= s.start && month <= s.end && (view !== 'actual' || i < 8))
        total +=
          key === 'financeCost'
            ? expense
            : key === 'interestIncome'
              ? interest
              : key === 'tax'
                ? charge
                : key === 'pbt'
                  ? pbt
                  : pbt - charge;
    }
    return total;
  }
  return null;
}
