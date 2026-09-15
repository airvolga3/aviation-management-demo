import type { Al1CeoSnapshot } from './al1-ceo-model';
import {
  opsMeasure,
  type OpsRow,
  type OpsScope,
  type Al1Operations,
} from './al1-operations-model';

export const cmRound = (n: number) => Math.round(n * 100) / 100;
export const cmSum = (a: number[]) =>
  Math.round(a.reduce((s, n) => s + n, 0) * 1e6) / 1e6;
const ratio = (a: number, b: number, scale = 1) =>
  b === 0 ? null : (a / b) * scale;
export const commercialMetrics = {
  revenue: [
    'Выручка',
    'Revenue',
    'млн ₽',
    'Признанная выручка закрытой части и прогноз будущих месяцев из общего финансового сценария.',
  ],
  contribution: [
    'Коммерческий вклад',
    'Contribution',
    'млн ₽',
    'Выручка минус учебные переменные расходы. В этой демонстрации переменные = 70% операционных расходов, без промежуточного округления долей строк. Это не утверждённый M2.',
  ],
  cost: [
    'Операционные затраты',
    'Operating costs',
    'млн ₽',
    'Те же расходы, что в экономике компании: выручка минус OP. Деление на статьи учебное, не реальные проводки.',
  ],
  op: [
    'Операционная прибыль · M4',
    'Operating profit',
    'млн ₽',
    'Выручка минус все операционные расходы, включая амортизацию. M4 и Operating profit — один показатель. Прибыль до налогообложения (PBT) рассчитывается отдельно после финансовых статей.',
  ],
  margin: [
    'Маржа коммерческого вклада',
    'Contribution margin',
    '%',
    'Сумма коммерческого вклада / сумма выручки. Не среднее процентов рейсов.',
  ],
  revenueFH: [
    'Выручка на лётный час',
    'Revenue / airborne hour',
    'тыс. ₽/ч',
    'Вся выручка выбранных строк / весь налёт, включая перегоны. Рейсовая выручка распределена из месячного бюджета.',
  ],
  revenueBH: [
    'Выручка на block hour',
    'Revenue / block hour',
    'тыс. ₽/ч',
    'Выручка / время от колодок до колодок. Не оплачиваемый договорный час.',
  ],
  yield: [
    'Грузовая доходность',
    'Cargo yield',
    '₽/ткм',
    'Вся перевозочная выручка учебного периметра / физические CTK. Допущение: вся выручка АК1 здесь перевозочная. Для реальных данных нужен отдельный состав числителя.',
  ],
  costFH: [
    'Полная стоимость часа',
    'Operating cost / airborne hour',
    'тыс. ₽/ч',
    'Все операционные расходы выбранной программы / налёт, включая перегоны. Не минимальная цена продажи.',
  ],
  costCTK: [
    'Затраты на тонно-километр',
    'Cost / CTK',
    '₽/ткм',
    'Все операционные расходы программы / физические CTK. При нулевом грузообороте не определено; затраты перегонов не исчезают.',
  ],
  revenueACTK: [
    'Доход на предложенную ёмкость',
    'Revenue / ACTK',
    '₽/ткм',
    'Выручка / ACTK на том же периметре, что производство. Непродаваемые перегоны не добавляются в ACTK.',
  ],
  costACTK: [
    'Затраты на предложенную ёмкость',
    'Cost / ACTK',
    '₽/ткм',
    'Операционные расходы / ACTK. Это не затраты на фактически перевезённый тонно-километр.',
  ],
  coverage: [
    'Покрытие затрат доходами',
    'Revenue / cost',
    '×',
    'Выручка / операционные расходы. Это также (Revenue/CTK)/(Cost/CTK) при общем ненулевом CTK.',
  ],
  revenueFlight: [
    'Доход на выполненный участок',
    'Revenue / flown sector',
    'млн ₽/рейс',
    'Распределённая выручка выполненных участков / их количество. Не средняя цена полной миссии или стоимость договора.',
  ],
  clf: [
    'Весовая загрузка',
    'Cargo load factor',
    '%',
    'Σ CTK / Σ ACTK. Тот же показатель, что в производстве; для специального груза не является самостоятельной оценкой качества продаж.',
  ],
  volume: [
    'Объёмная загрузка',
    'Volume utilization',
    '%',
    'Занятый объём / доступный объём выполненных грузовых участков; та же физика, что в производстве.',
  ],
  ferry: [
    'Пустые перегоны',
    'Positioning hours',
    'ч',
    'Налёт участков, обозначенных как позиционирование. Нужность и виновник автоматически не определяются.',
  ],
  capacity: [
    'Располагаемый ресурс',
    'Modelled capacity',
    'ч',
    'Мощность борт–месяц из производства после модельных ТО и отсутствующих назначений. Не результат полной проверки экипажей/разрешений.',
  ],
  utilization: [
    'Использование ресурса',
    'Resource utilization',
    '%',
    'Налёт / модельный располагаемый ресурс. 100% не является автоматической целью; нужен резерв устойчивости.',
  ],
} as const;
export type CommercialMetric = keyof typeof commercialMetrics;
export type CommercialRow = OpsRow & {
  variablePlan: number;
  variable: number;
  fixedPlan: number;
  fixed: number;
  costBreakdown: {
    id: string;
    name: string;
    owner: string;
    plan: number;
    forecast: number;
  }[];
};
export type CommercialView = 'plan' | 'actual' | 'forecast';
export function buildAl1Commercial(v: Al1CeoSnapshot, ops: Al1Operations) {
  if (
    v.snapshotId !== ops.snapshotId ||
    ops.classification !== 'DEMO_SYNTHETIC'
  )
    throw Error('Commercial source mismatch');
  const rows: CommercialRow[] = ops.rows.map((l) => {
    const variablePlan = l.costPlan * 0.7,
      variable = l.cost * 0.7;
    return {
      ...l,
      variablePlan,
      variable,
      fixedPlan: l.costPlan - variablePlan,
      fixed: l.cost - variable,
      costBreakdown: v.costs.map((x, i) => ({
        id: ['fuel', 'airport', 'maintenance', 'personnel', 'other'][i],
        name: x.name,
        owner: [
          'Производство + закупки',
          'Закупки + производство',
          'Технический директор',
          'HR + владельцы подразделений',
          'Финансы + владельцы бюджетов',
        ][i],
        plan: l.costPlan * x.share,
        forecast: l.cost * x.share,
      })),
    };
  });
  const opportunities = v.orders.flatMap((o, i) => {
    const plan = cmSum(
      rows.filter((r) => r.orderId === o.id).map((r) => r.revenuePlan),
    );
    const base = {
      programId: o.id,
      month: o.month,
      fleet: o.fleet,
      owner: `Учебный менеджер ${(i % 3) + 1}`,
      client: `Учебный заказчик ${String.fromCharCode(65 + (i % 5))}`,
      replyHours: [2, 5, 9, 18, 30][i % 5],
    };
    return o.future
      ? [
          {
            ...base,
            id: `Q-${o.id}-W`,
            status: 'WON',
            amount: o.confirmed,
            probability: 1,
            weighted: o.confirmed,
            reason: 'Подтверждённая часть учебной программы',
          },
          {
            ...base,
            id: `Q-${o.id}-O`,
            status: 'OPEN',
            amount: cmRound(o.pipeline / 0.5),
            probability: 0.5,
            weighted: o.pipeline,
            reason:
              'Открытая возможность · вероятность 50% — допущение, не модель ML',
          },
        ]
      : [
          {
            ...base,
            id: `Q-${o.id}-W`,
            status: 'WON',
            amount: plan,
            probability: 1,
            weighted: plan,
            reason:
              'Учебное КП на программу; цена КП не равна признанной выручке',
          },
          {
            ...base,
            id: `Q-${o.id}-L`,
            status: 'LOST',
            amount: cmRound(plan * 0.35),
            probability: 0,
            weighted: 0,
            reason: [
              'Цена конкурента',
              'Нет совместимого окна ВС',
              'Заказчик отменил потребность',
              'Не согласованы условия оплаты',
            ][i % 4],
          },
        ];
  });
  return {
    snapshotId: v.snapshotId,
    asOf: v.asOf,
    method: 'commercial-demo-0.1',
    classification: 'DEMO_SYNTHETIC',
    rows,
    opportunities,
  };
}
export type Al1Commercial = ReturnType<typeof buildAl1Commercial>;
export function commercialRows(data: Al1Commercial, s: OpsScope) {
  return data.rows.filter(
    (r) =>
      r.month >= s.start &&
      r.month <= s.end &&
      (!s.fleet || r.fleet === s.fleet) &&
      (!s.aircraft || r.aircraftId === s.aircraft),
  );
}
export function commercialMeasure(
  ops: Al1Operations,
  rows: CommercialRow[],
  s: OpsScope,
  k: CommercialMetric,
  view: CommercialView,
): number | null {
  const selected =
    view === 'actual' ? rows.filter((r) => r.status !== 'FORECAST') : rows;
  if (!selected.length) return null;
  const R = cmSum(
    selected.map((r) => (view === 'plan' ? r.revenuePlan : r.revenue)),
  );
  const C = cmSum(selected.map((r) => (view === 'plan' ? r.costPlan : r.cost)));
  const V = cmSum(
    selected.map((r) => (view === 'plan' ? r.variablePlan : r.variable)),
  );
  const H = selected.reduce(
    (a, r) =>
      a +
      (view === 'plan' ? r.planHours : (r.actualHours ?? r.forecastHours ?? 0)),
    0,
  );
  const physical = (key: Parameters<typeof opsMeasure>[2]) =>
    opsMeasure(ops, s, key, view, selected);
  switch (k) {
    case 'revenue':
      return R;
    case 'cost':
      return C;
    case 'op':
      return cmRound(R - C);
    case 'contribution':
      return cmSum([R, -V]);
    case 'margin':
      return ratio(R - V, R, 100);
    case 'revenueFH':
      return ratio(R, H, 1000);
    case 'costFH':
      return ratio(C, H, 1000);
    case 'revenueBH':
      return ratio(R, physical('block') ?? 0, 1000);
    case 'yield':
      return ratio(R, physical('ctk') ?? 0, 1000);
    case 'costCTK':
      return ratio(C, physical('ctk') ?? 0, 1000);
    case 'revenueACTK':
      return ratio(R, physical('actk') ?? 0, 1000);
    case 'costACTK':
      return ratio(C, physical('actk') ?? 0, 1000);
    case 'coverage':
      return ratio(R, C);
    case 'revenueFlight': {
      const flown = selected.filter(
        (r) => view === 'plan' || r.status !== 'CANCELLED',
      );
      return ratio(
        cmSum(flown.map((r) => (view === 'plan' ? r.revenuePlan : r.revenue))),
        flown.length,
      );
    }
    case 'capacity':
    case 'utilization':
      return opsMeasure(ops, s, k, view);
    default:
      return physical(k);
  }
}
export function commercialPortfolio(v: Al1CeoSnapshot, rows: CommercialRow[]) {
  const selected = rows.filter((r) => r.status === 'FORECAST');
  const ids = new Set(selected.map((r) => r.orderId));
  // Whole month/type programs only: partial aircraft filters cannot allocate contract coverage.
  const orders = v.orders.filter((o) => o.future && ids.has(o.id));
  return {
    plan: cmSum(selected.map((r) => r.revenuePlan)),
    forecast: cmSum(selected.map((r) => r.revenue)),
    confirmed: cmSum(orders.map((o) => o.confirmed)),
    pipeline: cmSum(orders.map((o) => o.pipeline)),
    gap: cmSum(orders.map((o) => o.gap)),
    orders,
  };
}
export function commercialCostLines(r: CommercialRow, view: CommercialView) {
  // Same accounting categories as AL1 economics; cost behaviour is a separate dimension.
  return r.costBreakdown.map((c) => ({
    ...c,
    amount: view === 'plan' ? c.plan : c.forecast,
  }));
}

// An independent, bounded learning case. Never added to company/Group totals.
export const demoMission = {
  id: 'MISSION-DEMO-01',
  title: 'Ил-76 · подача и перевозка оборудования',
  classification: 'DEMO_ONLY',
  date: '2026-08-15',
  aircraft: 'DEMO-MISSION-IL76',
  client: 'Учебный заказчик «Проект А»',
  owner: 'Коммерческий директор · учебный кейс',
  legs: [
    {
      id: 'DEMO-LEG-01',
      from: 'A',
      to: 'B',
      start: '2026-08-15T08:00:00Z',
      end: '2026-08-15T11:00:00Z',
      kind: 'Подача · пустой участок',
      tonnes: 0,
      revenue: 0,
      direct: 5.5,
    },
    {
      id: 'DEMO-LEG-02',
      from: 'B',
      to: 'A',
      start: '2026-08-15T13:00:00Z',
      end: '2026-08-15T16:00:00Z',
      kind: 'Перевозка · возврат в A',
      tonnes: 30,
      revenue: 20,
      direct: 6.5,
    },
  ],
  lines: [
    {
      id: 'DOC-REV',
      label: 'Перевозка по договору',
      group: 'revenue',
      plan: 22,
      actual: 20,
      unit: 'миссия',
      quantity: 1,
      rate: 20,
      owner: 'Коммерция / финансовый учёт',
      evidence: 'Учебный акт перевозки и согласованная цена',
      reason: 'Согласованная скидка 2 млн ₽',
    },
    {
      id: 'DOC-FUEL',
      label: 'Топливо',
      group: 'direct',
      plan: 7,
      actual: 8,
      unit: 'т',
      quantity: 80,
      rate: 0.1,
      owner: 'Производство + закупки',
      evidence: 'Учебные записи топлива и начисления',
      reason: 'Рост ставки при неизменном объёме',
    },
    {
      id: 'DOC-APT',
      label: 'Аэропорты и навигация',
      group: 'direct',
      plan: 2,
      actual: 2,
      unit: 'пакет',
      quantity: 1,
      rate: 2,
      owner: 'Закупки',
      evidence: 'Учебный реестр сборов',
      reason: 'В пределах калькуляции',
    },
    {
      id: 'DOC-GND',
      label: 'Наземные работы',
      group: 'direct',
      plan: 1,
      actual: 1,
      unit: 'пакет',
      quantity: 1,
      rate: 1,
      owner: 'Грузовая служба',
      evidence: 'Учебный акт наземного обслуживания',
      reason: 'В пределах калькуляции',
    },
    {
      id: 'DOC-TRIP',
      label: 'Поездка экипажа',
      group: 'direct',
      plan: 1,
      actual: 1,
      unit: 'комплект',
      quantity: 1,
      rate: 1,
      owner: 'Производство',
      evidence: 'Учебный реестр поездки',
      reason: 'В пределах калькуляции',
    },
    {
      id: 'DOC-ACMI-V',
      label: 'Переменный ACMI',
      group: 'variableACMI',
      plan: 2,
      actual: 2,
      unit: 'ч',
      quantity: 6,
      rate: 2 / 6,
      owner: 'Экономика',
      evidence: 'Учебная расчётная ставка',
      reason: 'Не включает строки прямых расходов повторно',
    },
    {
      id: 'DOC-ACMI-F',
      label: 'Постоянный ACMI · распределение',
      group: 'fixedACMI',
      plan: 2,
      actual: 2,
      unit: 'доля пула',
      quantity: 1,
      rate: 2,
      owner: 'Финансы',
      evidence: 'Учебный лист распределения',
      reason: 'Для полной экономики; не новый расход решения',
    },
    {
      id: 'DOC-IND',
      label: 'Общие расходы · распределение',
      group: 'indirect',
      plan: 1,
      actual: 1,
      unit: 'доля пула',
      quantity: 1,
      rate: 1,
      owner: 'Финансы',
      evidence: 'Учебный лист распределения',
      reason: 'Не прибавлять к инкременту повторно',
    },
    {
      id: 'DOC-DEP',
      label: 'Амортизация',
      group: 'depreciation',
      plan: 0.5,
      actual: 0.5,
      unit: 'доля',
      quantity: 1,
      rate: 0.5,
      owner: 'Финансы',
      evidence: 'Учебная финансовая строка',
      reason: 'В данном профиле не включена в ACMI',
    },
    {
      id: 'DOC-INT',
      label: 'Проценты',
      group: 'interest',
      plan: 0.3,
      actual: 0.3,
      unit: 'доля',
      quantity: 1,
      rate: 0.3,
      owner: 'Казначейство',
      evidence: 'Учебная финансовая строка',
      reason: 'Ниже операционной прибыли',
    },
  ],
} as const;
export function missionBridge(view: 'plan' | 'actual') {
  const group = (g: string) =>
    cmSum(demoMission.lines.filter((l) => l.group === g).map((l) => l[view]));
  const revenue = group('revenue'),
    m1 = cmRound(revenue - group('direct')),
    m2 = cmRound(m1 - group('variableACMI')),
    m3 = cmRound(m2 - group('fixedACMI')),
    op = cmRound(m3 - group('indirect') - group('depreciation')),
    pbt = cmRound(op - group('interest'));
  return { revenue, m1, m2, m3, m4: op, op, pbt };
}
export type DemoCrewScenario =
  | 'ready'
  | 'qualification'
  | 'rest'
  | 'overlap'
  | 'position'
  | 'unknown'
  | 'stale';
export const demoCrewScenarios: Record<DemoCrewScenario, string> = {
  ready: 'Исходный состав',
  qualification: 'Истекает допуск',
  rest: 'Не хватает отдыха',
  overlap: 'Двойное назначение',
  position: 'Поздняя доставка',
  unknown: 'Нет истории',
  stale: 'Рейс перенесён',
};
export type CrewCheck = {
  id: string;
  person: string;
  label: string;
  state: 'PASS' | 'FAIL' | 'UNKNOWN';
  observed: string;
  required: string;
  source: string;
};
export function assessDemoCrew(scenario: DemoCrewScenario, recheck = false) {
  const at = (s: string) => Date.parse(s),
    hour = (a: number, b: number) => (b - a) / 3600000;
  const legs = demoMission.legs.map((l, i) => ({
    ...l,
    start: new Date(
      at(l.start) + (scenario === 'stale' && i === 1 ? 3 * 3600000 : 0),
    ).toISOString(),
    end: new Date(
      at(l.end) + (scenario === 'stale' && i === 1 ? 3 * 3600000 : 0),
    ).toISOString(),
  }));
  const report = at(legs[0].start) - 3600000,
    finish = at(legs.at(-1)!.end) + 3600000;
  const programVersion = scenario === 'stale' ? 'mission-v2' : 'mission-v1';
  const duration = (intervals: { start: number; end: number }[]) => {
    const sorted = intervals
      .map((x) => ({
        start: Math.max(x.start, finish - 7 * 24 * 3600000),
        end: Math.min(x.end, finish),
      }))
      .filter((x) => x.end > x.start)
      .sort((a, b) => a.start - b.start);
    let total = 0,
      lastStart = 0,
      lastEnd = 0;
    for (const x of sorted) {
      if (x.start > lastEnd) {
        total += lastEnd - lastStart;
        lastStart = x.start;
        lastEnd = x.end;
      } else lastEnd = Math.max(lastEnd, x.end);
    }
    return (total + lastEnd - lastStart) / 3600000;
  };
  const roles = ['КВС', 'Второй пилот', 'Бортинженер', 'Специалист по грузу'];
  const people = roles.map((role, i) => {
    const history =
      scenario === 'unknown' && i === 1
        ? null
        : [
            {
              start: at('2026-08-10T08:00:00Z'),
              end: at('2026-08-10T14:00:00Z'),
              kind: 'Работа',
            },
            {
              start: at('2026-08-12T08:00:00Z'),
              end: at('2026-08-12T14:00:00Z'),
              kind: 'Работа',
            },
            {
              start: at('2026-08-14T12:00:00Z'),
              end: at('2026-08-14T18:00:00Z'),
              kind: 'Работа с доставкой в A',
            },
            ...(scenario === 'rest' && i === 1
              ? [
                  {
                    start: at('2026-08-14T19:00:00Z'),
                    end: at('2026-08-15T01:00:00Z'),
                    kind: 'Дополнительная работа',
                  },
                ]
              : []),
            ...(scenario === 'position' && i === 1
              ? [
                  {
                    start: at('2026-08-15T05:00:00Z'),
                    end: at('2026-08-15T08:00:00Z'),
                    kind: 'Перенесённая доставка в A',
                  },
                ]
              : []),
          ];
    return {
      id: `DEMO-CREW-${i + 1}`,
      role,
      assigned: true,
      validFrom: at('2026-01-01T00:00:00Z'),
      validTo: at(
        scenario === 'qualification' && i === 1
          ? '2026-08-15T12:00:00Z'
          : '2026-12-31T23:59:59Z',
      ),
      history,
      previousEnd: history ? Math.max(...history.map((x) => x.end)) : null,
      arrival: at(
        scenario === 'position' && i === 1
          ? '2026-08-15T08:00:00Z'
          : '2026-08-14T17:00:00Z',
      ),
      previousDutyHours: history ? duration(history) : null,
      other:
        scenario === 'overlap' && i === 1
          ? {
              start: at('2026-08-15T10:00:00Z'),
              end: at('2026-08-15T14:00:00Z'),
            }
          : null,
    };
  });
  const checks: CrewCheck[] = [];
  const add = (
    p: string,
    id: string,
    label: string,
    state: CrewCheck['state'],
    observed: string,
    required: string,
  ) =>
    checks.push({
      id: `${p}-${id}`,
      person: p,
      label,
      state,
      observed,
      required,
      source: `DEMO-INPUT-${p}-${id}`,
    });
  for (const p of people) {
    add(
      p.id,
      'role',
      'Назначение фиксированной учебной позиции',
      p.assigned ? 'PASS' : 'FAIL',
      p.role,
      'Учебный состав · 4 фиксированные позиции, квалификация к роли здесь не оценена',
    );
    add(
      p.id,
      'valid',
      'Срок действия допуска',
      p.validFrom <= report && p.validTo >= finish ? 'PASS' : 'FAIL',
      new Date(p.validTo).toISOString(),
      'Действует до завершения всей миссии',
    );
    const rest = p.previousEnd === null ? null : hour(p.previousEnd, report);
    add(
      p.id,
      'rest',
      'Отдых перед явкой',
      rest === null ? 'UNKNOWN' : rest >= 12 ? 'PASS' : 'FAIL',
      rest === null
        ? 'История отсутствует'
        : rest < 0
          ? 'Окна отдыха нет: доставка заканчивается после явки'
          : `${rest} ч`,
      '≥12 ч · только условие теста',
    );
    add(
      p.id,
      'duty',
      'Длительность работы',
      hour(report, finish) <= 11 ? 'PASS' : 'FAIL',
      `${hour(report, finish)} ч`,
      '≤11 ч · только условие теста',
    );
    add(
      p.id,
      'arrival',
      'Доставка и время на явку',
      p.arrival + 3600000 <= report ? 'PASS' : 'FAIL',
      new Date(p.arrival).toISOString(),
      'Прибытие в A минимум за 1 ч до явки',
    );
    const collision =
      !!p.other && p.other.start < finish && p.other.end > report;
    add(
      p.id,
      'overlap',
      'Пересечение назначений',
      collision ? 'FAIL' : 'PASS',
      collision ? 'Другое задание 10:00–14:00 UTC' : 'Пересечений нет',
      'Полуоткрытые интервалы, один человек — одно задание',
    );
    const total =
      p.history === null
        ? null
        : duration([...p.history, { start: report, end: finish }]);
    add(
      p.id,
      'history',
      'Накопленная работа за 7 дней',
      total === null ? 'UNKNOWN' : total <= 50 ? 'PASS' : 'FAIL',
      total === null ? 'Полнота не подтверждена' : `${total} ч`,
      '≤50 ч · объединение датированных интервалов учебного окна, не нормативная FTL-проверка',
    );
  }
  const freshness = scenario === 'stale' && !recheck ? 'STALE' : 'CURRENT';
  const result = checks.some((c) => c.state === 'FAIL')
    ? 'FAIL'
    : checks.some((c) => c.state === 'UNKNOWN')
      ? 'UNKNOWN'
      : 'PASS';
  return {
    classification: 'DEMO_ONLY',
    profile: 'DEMO-CREW-0.1',
    programVersion,
    evaluatedVersion: programVersion,
    previousAssessment:
      scenario === 'stale'
        ? {
            version: 'mission-v1',
            result: 'PASS',
            finish: '2026-08-15T17:00:00Z',
          }
        : null,
    legs,
    assessedVersion:
      scenario === 'stale' && !recheck
        ? 'mission-v1'
        : scenario === 'stale'
          ? 'mission-v2'
          : 'mission-v1',
    freshness,
    result,
    checks,
    people,
    report: new Date(report).toISOString(),
    finish: new Date(finish).toISOString(),
    corporateStatus: 'NOT_EVALUATED',
    usable: result === 'PASS' && freshness === 'CURRENT',
  };
}
