import type { ExecutiveSnapshot } from './executive-model';
import {
  allocateMinutes,
  productionMonths,
  productionTotals,
  type ProductionSnapshot,
} from './production-model';

const r = (v: number) => Math.round(v * 100) / 100;
export const al1Sections = {
  economics: ['Экономика', 'Economics', 'Финансовый директор', 'AL1-FIN-01'],
  commerce: ['Коммерция', 'Commercial', 'Коммерческий директор', 'AL1-COM-01'],
  production: [
    'Производство',
    'Operations',
    'Производственный директор',
    'AL1-OPS-01',
  ],
  technical: [
    'Флот и техника',
    'Fleet & Maintenance',
    'Технический директор',
    'AL1-TECH-01',
  ],
  finance: [
    'Финансы',
    'Cash & Collections',
    'Руководитель казначейства',
    'AL1-CASH-01',
  ],
  people: ['Персонал', 'People & Crew', 'Директор по персоналу', 'AL1-HR-01'],
  safety: [
    'Безопасность и качество',
    'Safety & Quality',
    'Руководитель по безопасности',
    'AL1-SAFE-01',
  ],
} as const;
export type Al1Section = keyof typeof al1Sections;
export type Al1Record = {
  id: string;
  section: Al1Section;
  title: string;
  period: string;
  status: string;
  values: { label: string; value: string }[];
  links: { id: string; label: string }[];
  action?: string;
  due?: string;
  owner?: string;
  assignee?: string;
};
export type Al1Ledger = {
  flightId: string;
  aircraftId: string;
  fleet: string;
  date: string;
  month: string;
  status: string;
  planHours: number;
  actualHours: number | null;
  forecastHours: number | null;
  revenuePlan: number;
  revenue: number;
  costPlan: number;
  cost: number;
  depreciationPlan: number;
  depreciation: number;
  delayMinutes: number | null;
  orderId: string;
};
const num = (v: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(v);
const money = (v: number) => num(v) + ' млн ₽';
const day = (d: string) => d.slice(8, 10) + '.' + d.slice(5, 7);

// Synthetic extension of the SAME executive and production snapshots. No corporate fallbacks.
export function buildAl1Ceo(ex: ExecutiveSnapshot, prod: ProductionSnapshot) {
  if (
    ex.classification !== 'DEMO_SYNTHETIC' ||
    prod.version !== ex.productionSnapshotId ||
    prod.asOf !== ex.asOf
  )
    throw Error('AL1 source mismatch');
  const e = ex.entities.find((x) => x.id === 'AL1');
  if (!e) throw Error('AL1 unavailable');
  const flights = prod.flights.filter((x) => x.company === 'AL1');
  const sum = (a: number[]) => r(a.reduce((s, x) => s + x, 0));
  const alloc = (total: number, weights: number[]) =>
    allocateMinutes(Math.round(total * 100), weights).map((x) => x / 100);
  const ledger: Al1Ledger[] = [];
  e.monthly.revenue.forEach((m, i) => {
    const rows = flights.filter((f) => f.month === m.month),
      om = e.monthly.op[i];
    const weights = rows.map(
      (f) => f.planMinutes * (f.fleet === 'AL1-AN124' ? 2.5 : 1),
    );
    const observed = rows.map((f, j) =>
      f.status === 'CANCELLED' ? 0 : weights[j],
    );
    const revenuePlan = alloc(m.plan, weights),
      revenue = alloc(m.actual ?? m.forecast!, observed);
    const costPlan = alloc(r(m.plan - om.plan), weights),
      cost = alloc(
        r((m.actual ?? m.forecast!) - (om.actual ?? om.forecast!)),
        weights,
      );
    const dm = e.monthly.da[i];
    const depreciationPlan = alloc(dm.plan, weights);
    const depreciation = alloc(dm.actual ?? dm.forecast!, weights);
    rows.forEach((f, j) =>
      ledger.push({
        flightId: f.id,
        aircraftId: f.aircraftId,
        fleet: f.fleet,
        date: f.date,
        month: f.month,
        status: f.status,
        planHours: f.planMinutes / 60,
        actualHours: f.actualMinutes === null ? null : f.actualMinutes / 60,
        forecastHours:
          f.forecastMinutes === null ? null : f.forecastMinutes / 60,
        revenuePlan: revenuePlan[j],
        revenue: revenue[j],
        costPlan: costPlan[j],
        cost: cost[j],
        depreciationPlan: depreciationPlan[j],
        depreciation: depreciation[j],
        delayMinutes:
          f.status === 'COMPLETED'
            ? j % 13 === 0
              ? 75
              : j % 7 === 0
                ? 25
                : 0
            : null,
        orderId: 'ORDER-' + f.month + '-' + f.fleet,
      }),
    );
  });
  const totals = productionTotals(flights),
    months = productionMonths(flights, prod.year);
  const complete = ledger.filter((l) => l.status === 'COMPLETED'),
    late = complete.filter((l) => l.delayMinutes! > 15);
  const future = ledger.filter((l) => l.status === 'FORECAST');
  const repairs = [
    {
      id: 'MX-01',
      aircraftId: 'DEMO-AL1-AN124-03',
      title: 'Ан-124 · устранение дефекта гидросистемы',
      start: '2026-08-29',
      planReturn: '2026-09-05',
      expectedReturn: '2026-09-15',
      status: 'AOG',
      cost: 18,
    },
    {
      id: 'MX-02',
      aircraftId: 'DEMO-AL1-IL76-06',
      title: 'Ил-76 · плановое техническое обслуживание',
      start: '2026-08-29',
      planReturn: '2026-09-04',
      expectedReturn: '2026-09-04',
      status: 'Плановое ТО',
      cost: 7,
    },
    {
      id: 'MX-03',
      aircraftId: 'DEMO-AL1-AN124-02',
      title: 'Ан-124 · плановое обслуживание октября',
      start: '2026-10-03',
      planReturn: '2026-10-13',
      expectedReturn: '2026-10-13',
      status: 'Запланировано',
      cost: 11,
    },
  ].map((x) => ({
    ...x,
    flights: future
      .filter(
        (l) =>
          l.aircraftId === x.aircraftId &&
          l.date >= x.start &&
          l.date < x.expectedReturn,
      )
      .map((l) => l.flightId),
  }));
  const planes = prod.fleets
    .filter((f) => f.company === 'AL1')
    .flatMap((f) =>
      Array.from({ length: f.demoAircraftCount }, (_, i) => {
        const id = `DEMO-${f.id}-${String(i + 1).padStart(2, '0')}`;
        const mx = repairs.find(
          (x) =>
            x.aircraftId === id &&
            x.start <= ex.asOf &&
            x.expectedReturn > ex.asOf,
        );
        return {
          id,
          type: f.aircraft,
          status: mx?.status || 'Исправен',
          returnDate: mx?.expectedReturn || null,
          repairId: mx?.id || null,
        };
      }),
    );
  const staff = [
    {
      id: 'HR-CREW',
      name: 'Лётный состав',
      plan: 148,
      actual: 146,
      forecast: 148,
    },
    {
      id: 'HR-TECH',
      name: 'Технический персонал',
      plan: 82,
      actual: 78,
      forecast: 80,
    },
    {
      id: 'HR-GROUND',
      name: 'Наземные службы',
      plan: 52,
      actual: 49,
      forecast: 51,
    },
    {
      id: 'HR-OFFICE',
      name: 'Управление и поддержка',
      plan: 48,
      actual: 46,
      forecast: 48,
    },
  ];
  const crews = [
    { type: 'Ил-76', need: 18, available: 16, afterTraining: 18 },
    { type: 'Ан-124', need: 8, available: 8, afterTraining: 8 },
  ];
  const crewRisk = future
    .filter(
      (l) =>
        l.fleet === 'AL1-IL76' &&
        l.date < '2026-09-10' &&
        l.aircraftId.endsWith('-05'),
    )
    .map((l) => l.flightId);
  const debt = [
    {
      id: 'AR-01',
      name: 'Заказчик A',
      amount: 55,
      overdue: 40,
      due: '2026-08-20',
    },
    {
      id: 'AR-02',
      name: 'Заказчик B',
      amount: 45,
      overdue: 20,
      due: '2026-08-25',
    },
    {
      id: 'AR-03',
      name: 'Заказчик C',
      amount: 30,
      overdue: 10,
      due: '2026-08-28',
    },
    {
      id: 'AR-04',
      name: 'Заказчик D',
      amount: 60,
      overdue: 0,
      due: '2026-09-15',
    },
    {
      id: 'AR-05',
      name: 'Заказчик E',
      amount: 50,
      overdue: 0,
      due: '2026-09-22',
    },
  ];
  // Gross receipts are an explicit synthetic assumption. Payments are reconciled to the existing FCF bridge.
  const receipts = alloc(
    sum(e.monthly.revenue.slice(8, 11).map((m) => m.forecast!)) * 0.9,
    e.weeks.map(() => 1),
  );
  const payments = e.weeks.map((w, i) => ({
    id: `PAY-${i + 1}`,
    date: w.date,
    opening: i === 0 ? e.cash : e.weeks[i - 1].balance,
    receipts: receipts[i],
    payments: r(receipts[i] - w.movement),
    closing: w.balance,
  }));
  const claims = [0.8, 0.35, 0.2, 0.7, 0.45, 0.6].map((amount, i) => ({
    id: 'CLAIM-' + (i + 1),
    flightId: complete[complete.length - 1 - i * 17].flightId,
    title: i % 2 ? 'Нарушение клиентского срока' : 'Повреждение упаковки',
    amount,
    status: i < 2 ? 'В работе' : 'Рассмотрено',
    due: '2026-09-07',
  }));
  const issues = [
    {
      id: 'SAFE-01',
      title: 'Подтвердить закрытие дефекта Ан-124',
      status: 'Открыто',
      due: '2026-09-05',
      critical: true,
      link: 'MX-01',
    },
    {
      id: 'SAFE-02',
      title: 'Закрыть корректирующее мероприятие по креплению груза',
      status: 'Просрочено',
      due: '2026-08-28',
      critical: false,
      link: '',
    },
    {
      id: 'SAFE-03',
      title: 'Обновить подготовку двух экипажных комплектов',
      status: 'В работе',
      due: '2026-09-10',
      critical: false,
      link: 'HR-CREW',
    },
    {
      id: 'SAFE-04',
      title: 'Закрыть мероприятие по передаче смены',
      status: 'Выполнено',
      due: '2026-08-25',
      critical: false,
      link: '',
    },
  ];
  const riskIds = [
    ...new Set([...repairs.flatMap((x) => x.flights), ...crewRisk]),
  ];
  const affected = future.filter((l) => riskIds.includes(l.flightId));
  const records: Al1Record[] = [];
  const put = (x: Al1Record) => records.push(x);
  for (const m of e.monthly.revenue) {
    const rows = ledger.filter((l) => l.month === m.month),
      futureMonth = rows[0].status === 'FORECAST';
    const rev = sum(rows.map((x) => x.revenue)),
      cost = sum(rows.map((x) => x.cost));
    put({
      id: 'ECON-' + m.month,
      section: 'economics',
      title: 'Экономика · ' + m.month,
      period: futureMonth ? 'Будущий прогноз' : 'Учебный факт',
      status: 'Распределение общего бюджета',
      values: [
        { label: 'Выручка', value: money(rev) },
        { label: 'Операционные расходы', value: money(cost) },
        { label: 'Операционная прибыль · M4', value: money(r(rev - cost)) },
        {
          label: 'Метод',
          value:
            'Месячные суммы общего сценария распределены по плановым минутам; вес Ан-124 ×2,5. Это распределённый OP, не маржа миссии.',
        },
      ],
      links: [...new Set(rows.map((l) => l.orderId))].map((id) => ({
        id,
        label: 'Программа ' + id.replace('ORDER-', ''),
      })),
    });
  }
  const orders = [...new Set(ledger.map((l) => l.orderId))].map((id) => {
    const rows = ledger.filter((l) => l.orderId === id),
      rev = sum(rows.map((l) => l.revenue)),
      cost = sum(rows.map((l) => l.cost)),
      isFuture = rows[0].status === 'FORECAST';
    const confirmed = isFuture ? r(rev * 0.72) : 0,
      pipeline = isFuture ? r(rev * 0.18) : 0;
    return {
      id,
      month: rows[0].month,
      fleet: rows[0].fleet,
      future: isFuture,
      revenue: rev,
      cost,
      confirmed,
      pipeline,
      gap: isFuture ? r(rev - confirmed - pipeline) : 0,
      flights: rows.map((l) => l.flightId),
    };
  });
  // Adjust rounding cents in the last future program to retain the existing portfolio exactly.
  const fo = orders.filter((o) => o.future),
    last = fo.at(-1)!;
  last.confirmed = r(
    last.confirmed + e.portfolio.confirmed - sum(fo.map((o) => o.confirmed)),
  );
  last.pipeline = r(
    last.pipeline + e.portfolio.pipeline - sum(fo.map((o) => o.pipeline)),
  );
  last.gap = r(last.revenue - last.confirmed - last.pipeline);
  for (const o of orders)
    put({
      id: o.id,
      section: 'commerce',
      title:
        (o.fleet === 'AL1-IL76' ? 'Ил-76' : 'Ан-124') +
        ' · программа ' +
        o.month,
      period: o.future ? 'Будущая программа' : 'Учебный факт',
      status: o.future
        ? 'Подтверждённая часть + продажи + разрыв'
        : 'Исполненная часть программы',
      values: [
        { label: 'Выручка', value: money(o.revenue) },
        { label: 'Распределённый OP', value: money(r(o.revenue - o.cost)) },
        ...(o.future
          ? [
              { label: 'Подтверждено', value: money(o.confirmed) },
              { label: 'Взвешенные продажи', value: money(o.pipeline) },
              { label: 'Не обеспечено', value: money(o.gap) },
            ]
          : []),
        {
          label: 'Основание',
          value:
            'Учебная месячная программа. Отдельные договоры и полные чартерные миссии не смоделированы.',
        },
      ],
      links: [
        { id: 'ECON-' + o.month, label: 'Экономика месяца' },
        ...o.flights.map((id) => ({ id, label: id })),
      ],
    });
  for (const l of ledger) {
    const mx = repairs.filter((x) => x.flights.includes(l.flightId));
    put({
      id: l.flightId,
      section: 'production',
      title: l.flightId,
      period: l.date,
      status:
        l.status === 'FORECAST'
          ? 'Прогноз'
          : l.status === 'CANCELLED'
            ? 'Отменён'
            : 'Выполнен',
      values: [
        { label: 'Борт', value: l.aircraftId },
        { label: 'Плановый налёт', value: num(l.planHours) + ' ч' },
        {
          label: l.actualHours === null ? 'Будущий налёт' : 'Фактический налёт',
          value: num(l.actualHours ?? l.forecastHours!) + ' ч',
        },
        { label: 'Распределённая выручка', value: money(l.revenue) },
        { label: 'Распределённые расходы', value: money(l.cost) },
        { label: 'Распределённый OP', value: money(r(l.revenue - l.cost)) },
        ...(l.delayMinutes === null
          ? []
          : [
              {
                label: 'Задержка вылета (дополнительная учебная запись)',
                value: l.delayMinutes + ' мин',
              },
            ]),
      ],
      links: [
        { id: l.orderId, label: 'Коммерческая программа' },
        ...mx.map((x) => ({ id: x.id, label: x.title })),
        ...(crewRisk.includes(l.flightId)
          ? [{ id: 'HR-CREW', label: 'Не закрытая потребность в экипаже' }]
          : []),
      ],
    });
  }
  for (const x of repairs)
    put({
      id: x.id,
      section: 'technical',
      title: x.title,
      period: x.start + ' — ' + x.expectedReturn,
      status: x.status,
      values: [
        { label: 'Борт', value: x.aircraftId },
        { label: 'План возврата', value: day(x.planReturn) },
        { label: 'Ожидаемый возврат', value: day(x.expectedReturn) },
        {
          label: 'Оценка ремонта',
          value: money(x.cost) + ' · внутри бюджета, не добавлять к OP',
        },
        { label: 'Связанные задания', value: String(x.flights.length) },
        {
          label: 'Выручка этих заданий',
          value:
            money(
              sum(
                future
                  .filter((l) => x.flights.includes(l.flightId))
                  .map((l) => l.revenue),
              ),
            ) + ' · экспозиция, не сумма потери',
        },
      ],
      links: [
        {
          id: x.id === 'MX-03' ? 'PAY-5' : 'PAY-1',
          label: 'Платёжная неделя и бюджет ремонта',
        },
        ...x.flights.map((id) => ({ id, label: id })),
      ],
      action:
        'Подтвердить срок возврата; проверить перенос заданий или замену борта. Экран не выдаёт допуск к полёту.',
      due: x.planReturn,
    });
  for (const s of staff)
    put({
      id: s.id,
      section: 'people',
      title: s.name,
      period: 'На 31.08.2026 · прогноз на 31.12',
      status: 'Учебная потребность',
      values: [
        { label: 'План численности', value: String(s.plan) },
        { label: 'Факт численности', value: String(s.actual) },
        { label: 'Прогноз численности', value: String(s.forecast) },
        ...(s.id === 'HR-CREW'
          ? [
              {
                label: 'Готовые экипажные комплекты',
                value: '24 из 26 на программу 1–14 сентября',
              },
              {
                label: 'План подготовки',
                value: '2 комплекта Ил-76 — до 10 сентября',
              },
            ]
          : []),
      ],
      links:
        s.id === 'HR-CREW' ? crewRisk.map((id) => ({ id, label: id })) : [],
      action:
        s.id === 'HR-CREW'
          ? 'Завершить подготовку и проверить допуски на даты заданий. Не заменяет диспетчерское планирование.'
          : 'Закрыть критические вакансии по квалификациям.',
      due: '2026-09-10',
    });
  for (const p of payments)
    put({
      id: p.id,
      section: 'finance',
      title: 'Денежная неделя до ' + day(p.date),
      period: p.date,
      status: 'Будущий прогноз',
      values: [
        { label: 'Начальный остаток', value: money(p.opening) },
        { label: 'Поступления', value: money(p.receipts) },
        { label: 'Все платежи', value: money(p.payments) },
        { label: 'Конечный остаток', value: money(p.closing) },
        ...(p.id === 'PAY-1'
          ? [
              { label: 'Из платежей: ремонт MX-01', value: money(18) },
              { label: 'Из платежей: ремонт MX-02', value: money(7) },
              { label: 'Остальные платежи', value: money(r(p.payments - 25)) },
            ]
          : p.id === 'PAY-5'
            ? [
                { label: 'Из платежей: ремонт MX-03', value: money(11) },
                {
                  label: 'Остальные платежи',
                  value: money(r(p.payments - 11)),
                },
              ]
            : []),
        {
          label: 'Метод',
          value:
            'Поступления: 90% выручки сентября–ноября, равными долями. Платежи — балансирующая детализация существующего FCF; не реестр банковских операций.',
        },
      ],
      links:
        p.id === 'PAY-1'
          ? [
              { id: 'MX-01', label: 'Ремонт Ан-124' },
              { id: 'MX-02', label: 'ТО Ил-76' },
            ]
          : p.id === 'PAY-5'
            ? [{ id: 'MX-03', label: 'ТО Ан-124 в октябре' }]
            : [],
    });
  for (const d of debt)
    put({
      id: d.id,
      section: 'finance',
      title: d.name + ' · расчёты',
      period: 'Остаток на 31.08.2026',
      status: d.overdue ? 'Есть просрочка' : 'В срок',
      values: [
        { label: 'Дебиторская задолженность', value: money(d.amount) },
        { label: 'Просрочено', value: money(d.overdue) },
        {
          label: d.overdue
            ? 'Срок просроченной части'
            : 'Ближайший срок оплаты',
          value: day(d.due),
        },
        {
          label: 'Непросроченная часть',
          value:
            money(d.amount - d.overdue) +
            (d.overdue
              ? ' · другие сроки; по учебному допущению после 31 августа'
              : ''),
        },
        {
          label: 'Связь с календарём',
          value:
            'Не прибавляется к прогнозу поступлений. Привязка остатков к договорам ещё не выполнена.',
        },
      ],
      links: [],
      action: 'Согласовать оплату и подтвердить срок с заказчиком.',
      due: d.due,
    });
  for (const c of claims)
    put({
      id: c.id,
      section: 'safety',
      title: 'Претензия ' + c.id + ' · ' + c.title,
      owner: 'Коммерческий директор + руководитель качества',
      assignee: 'AL1-COM-CLAIMS-01',
      period: 'Реестр на 31.08.2026',
      status: c.status,
      values: [
        { label: 'Связанный рейс', value: c.flightId },
        { label: 'Заявленная сумма', value: money(c.amount) },
        {
          label: 'Финансовый статус',
          value:
            'Сумма требования, не признанный расход и не платёж. Повторно в OP и календарь не включается.',
        },
        {
          label: 'Итог рассмотрения',
          value:
            c.status === 'В работе'
              ? 'Решение не принято'
              : 'Учебное рассмотрение завершено; выплата не предполагается автоматически',
        },
      ],
      links: [{ id: c.flightId, label: 'Рейс и коммерческая программа' }],
      action:
        'Проверить условия договора, основания претензии и согласовать ответ клиенту.',
      due: c.due,
    });
  for (const x of issues)
    put({
      id: x.id,
      section: 'safety',
      title: x.title,
      period: 'На 31.08.2026',
      status: x.status,
      values: [
        {
          label: 'Критичность',
          value: x.critical
            ? 'Ограничение конкретного борта'
            : 'Корректирующее мероприятие',
        },
        { label: 'Контрольный срок', value: day(x.due) },
        {
          label: 'Классификация',
          value: 'Полностью синтетическое событие, не реальный инцидент',
        },
      ],
      links: x.link ? [{ id: x.link, label: 'Связанное основание' }] : [],
      action:
        'Проверить выполнение и основание закрытия; финансовый эффект не снимает ограничение.',
      due: x.due,
    });
  return {
    snapshotId: ex.snapshotId,
    asOf: ex.asOf,
    classification: 'DEMO_SYNTHETIC',
    ledger,
    totals,
    months,
    planes,
    repairs,
    staff,
    crews,
    debt,
    payments,
    issues,
    claims,
    orders,
    records,
    crewRisk,
    riskIds,
    punctuality: {
      completed: complete.length,
      late: late.length,
      onTime: complete.length - late.length,
      percent: r(((complete.length - late.length) / complete.length) * 100),
    },
    riskRevenue: sum(affected.map((l) => l.revenue)),
    riskHours: sum(affected.map((l) => l.forecastHours || 0)),
    costs: [
      { name: 'Топливо', share: 0.28 },
      { name: 'Аэропорты и навигация', share: 0.19 },
      { name: 'Техническое обслуживание', share: 0.18 },
      { name: 'Персонал', share: 0.12 },
      { name: 'Прочие операционные расходы', share: 0.23 },
    ].map((x) => ({
      ...x,
      plan: r((e.flows.revenue.plan - e.flows.op.plan) * x.share),
      actual: r((e.flows.revenue.actual - e.flows.op.actual) * x.share),
      forecast: r((e.flows.revenue.forecast - e.flows.op.forecast) * x.share),
    })),
  };
}
export type Al1CeoSnapshot = ReturnType<typeof buildAl1Ceo>;
