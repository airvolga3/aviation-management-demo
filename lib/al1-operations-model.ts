import type { Al1CeoSnapshot } from './al1-ceo-model';

export type OpsScope = {
  start: string;
  end: string;
  fleet?: string;
  aircraft?: string;
  captain?: string;
};
export const opsGroups = [
  'Исполнение программы',
  'Мощность и время',
  'Груз и обязательства',
  'Топливо и перегоны',
  'Экипажи и безопасность',
] as const;
export const opsMetrics = {
  flights: {
    name: 'Выполненные рейсы',
    en: 'Completed sectors',
    unit: 'рейсов',
    group: 0,
    owner: 'Производственный директор',
    formula:
      'Число выполненных участков. Отмены не считаются рейсами; будущая программа — не факт.',
    direction: 'up',
  },
  hours: {
    name: 'Общий налёт',
    en: 'Airborne hours',
    unit: 'ч',
    group: 0,
    owner: 'Производственный директор',
    formula:
      'Сумма времени от взлёта до посадки, включая пустые перегоны. Не block hours.',
    direction: 'up',
  },
  completion: {
    name: 'Выполнение программы',
    en: 'Completion factor',
    unit: '%',
    group: 0,
    owner: 'Руководитель ЦУП',
    formula:
      'Выполненные / рейсы замороженного плана × 100. Для чартеров — подтверждённая программа, а не регулярное расписание. Отмена остаётся в знаменателе.',
    direction: 'up',
  },
  d15: {
    name: 'Пунктуальность вылета D15',
    en: 'Departure punctuality',
    unit: '%',
    group: 0,
    owner: 'Руководитель ЦУП',
    formula:
      'Вылет с отклонением не более +15 минут / выполненные рейсы с отметками × 100. Отмены учитываются отдельно.',
    direction: 'up',
  },
  a15: {
    name: 'Пунктуальность прибытия A15',
    en: 'Arrival punctuality',
    unit: '%',
    group: 0,
    owner: 'Руководитель ЦУП',
    formula:
      'Прибытие не позднее +15 минут от исходного плана / выполненные рейсы × 100. Не равно сроку выдачи груза клиенту.',
    direction: 'up',
  },
  capacity: {
    name: 'Обеспеченная мощность',
    en: 'Executable capacity',
    unit: 'ч',
    group: 1,
    owner: 'Производственный директор',
    formula:
      'Модельная располагаемая мощность минус технические и кадровые ограничения без двойного счёта. План использует плановые сроки ремонта, факт / прогноз — ожидаемые сроки и назначение экипажей. Это ресурс ВС за период, не величина рейса и не сертифицированный максимум.',
    direction: 'up',
  },
  utilization: {
    name: 'Использование мощности',
    en: 'Capacity utilization',
    unit: '%',
    group: 1,
    owner: 'Производственный директор',
    formula:
      'Налёт / обеспеченная мощность × 100. Загрузка выше 100% — конфликт программы и ресурсов, а не успех. Рост не является самоцелью.',
    direction: 'neutral',
  },
  block: {
    name: 'Время от колодок до колодок',
    en: 'Block hours',
    unit: 'ч',
    group: 1,
    owner: 'Руководитель ЦУП',
    formula:
      'Время в воздухе + руление до взлёта и после посадки. Не равно сумме времени на стоянках.',
    direction: 'neutral',
  },
  ground: {
    name: 'Время ВС на земле',
    en: 'Ground time',
    unit: 'ч',
    group: 1,
    owner: 'Руководитель ЦУП',
    formula:
      'Календарные самолёто-часы выбранных бортов минус налёт. Включает руление, ТО, ожидания и стоянки; это не всё потерянное время.',
    direction: 'neutral',
  },
  tonnes: {
    name: 'Перевезённый груз',
    en: 'Freight tonnes by sector',
    unit: 'т',
    group: 2,
    owner: 'Коммерческий директор + грузовая служба',
    formula:
      'Фактически перевезённая масса по участкам, не платный вес. Повторный участок одного отправления учитывается повторно; это не уникальные тонны отправлений.',
    direction: 'up',
  },
  clf: {
    name: 'Весовая загрузка CLF',
    en: 'Cargo load factor',
    unit: '%',
    group: 2,
    owner: 'Коммерческий директор',
    formula:
      'Σ CTK / Σ ACTK × 100, а не среднее процентов рейсов. Отдельно проверяются объём, геометрия груза и маршрутные ограничения.',
    direction: 'neutral',
  },
  volume: {
    name: 'Объёмная загрузка',
    en: 'Volume utilization',
    unit: '%',
    group: 2,
    owner: 'Грузовая служба',
    formula:
      'Σ занятого полезного объёма / Σ доступного объёма выполненных грузовых участков × 100. Внутренняя метрика, не замена CLF.',
    direction: 'neutral',
  },
  ctk: {
    name: 'Грузооборот CTK',
    en: 'Cargo tonne-kilometres',
    unit: 'тыс. т·км',
    group: 2,
    owner: 'Коммерческий директор',
    formula:
      'Σ перевезённых тонн × расстояние участка / 1000. В демо расстояния модельные; одна база расстояний у плана и факта.',
    direction: 'up',
  },
  actk: {
    name: 'Предложенная ёмкость ACTK',
    en: 'Available cargo tonne-kilometres',
    unit: 'тыс. т·км',
    group: 2,
    owner: 'Производство + коммерция',
    formula:
      'Σ доступной маршрутной грузоподъёмности × расстояние / 1000 только выполненных коммерческих грузовых участков. Отмены и некоммерческие перегоны исключены из факта.',
    direction: 'neutral',
  },
  offload: {
    name: 'Не погружен готовый груз',
    en: 'Ready cargo offload',
    unit: 'т',
    group: 2,
    owner: 'Руководитель грузовой службы',
    formula:
      'Готовая к погрузке масса минус погруженная. Недостаток спроса и неявка груза сюда не входят. Причина и ответственность подтверждаются расследованием.',
    direction: 'down',
  },
  commitments: {
    name: 'Нарушения обязательств',
    en: 'Customer commitments missed',
    unit: 'рейсов',
    group: 2,
    owner: 'Коммерческий директор + ЦУП',
    formula:
      'Уникальные коммерческие рейсы с отменой, недогрузом готового груза или нарушенным сроком выдачи. Одна строка с несколькими причинами считается один раз. Претензия — отдельный объект.',
    direction: 'down',
  },
  fuel: {
    name: 'Расход топлива',
    en: 'Fuel used',
    unit: 'т',
    group: 3,
    owner: 'Начальник лётной службы',
    formula:
      'Сумма расхода на том же участке от колодок до колодок. OFP — план расхода, не заправка и не весь запас с резервами. Пустые перегоны включены.',
    direction: 'neutral',
  },
  fuelVariance: {
    name: 'Отклонение от OFP',
    en: 'Fuel variance vs OFP',
    unit: '%',
    group: 3,
    owner: 'Лётная служба + диспетчерское планирование',
    formula:
      '(Σ фактического расхода − Σ OFP-расхода тех же выполненных рейсов) / Σ OFP × 100. Сырой разрыв требует разбора маршрута, погоды, массы, ВС и руления; не оценка КВС.',
    direction: 'neutral',
  },
  ferry: {
    name: 'Налёт пустых перегонов',
    en: 'Positioning hours',
    unit: 'ч',
    group: 3,
    owner: 'Коммерческий директор + ЦУП',
    formula:
      'Налёт выделенных некоммерческих перегонных участков; включён в общий налёт и топливо, исключён из грузового ACTK. Перегон может быть необходимой частью оплаченной миссии.',
    direction: 'down',
  },
  crew: {
    name: 'Покрытие заданий экипажами',
    en: 'Crew assignment coverage',
    unit: '%',
    group: 4,
    owner: 'Начальник лётной службы',
    formula:
      'Задания с назначенным комплектом / планируемые к выполнению задания × 100. Это покрытие назначением, не подтверждение FTL, отдыха, квалификации и законности выпуска.',
    direction: 'up',
  },
  fdm: {
    name: 'Полнота данных FDM',
    en: 'FDM data coverage',
    unit: '%',
    group: 4,
    owner: 'Руководитель безопасности полётов',
    formula:
      'Пригодные для анализа записи FDM / выполненные рейсы × 100. Неполное наблюдение не превращается в нулевой риск. Порог в демо проектный, не требование регулятора.',
    direction: 'up',
  },
  events: {
    name: 'События на 1000 рейсов',
    en: 'Validated SPI event rate',
    unit: '/1000',
    group: 4,
    owner: 'Руководитель безопасности полётов',
    formula:
      'Подтверждённые события выбранной категории / рейсы с пригодными записями × 1000. В демо одна условная категория отклонений профиля. Это не общий балл безопасности; малая выборка нестабильна.',
    direction: 'neutral',
  },
} as const;
export type OpsMetric = keyof typeof opsMetrics;
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
const round = (v: number) => Math.round(v * 100) / 100;
const pct = (n: number, d: number) => (d ? (100 * n) / d : null);
const monthOf = (d: string) => d.slice(0, 7);
const days = (m: string) =>
  new Date(
    Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0),
  ).getUTCDate();

export function buildAl1Operations(v: Al1CeoSnapshot) {
  if (v.classification !== 'DEMO_SYNTHETIC' || v.asOf !== '2026-08-31')
    throw Error('Unsupported operations basis');
  const rows = v.ledger.map((l, i) => {
    const flown = l.status === 'COMPLETED',
      future = l.status === 'FORECAST',
      cancelled = l.status === 'CANCELLED';
    const relatedClaims = v.claims.filter((c) => c.flightId === l.flightId);
    const an = l.fleet === 'AL1-AN124',
      positioning = i % 9 === 0 && relatedClaims.length === 0;
    const distanceKm = Math.round(l.planHours * (an ? 650 : 560));
    const payloadKg = (an ? 85000 : 36000) + (i % 5) * (an ? 2500 : 1500);
    const volumeM3 = an ? 650 : 170;
    const cargoPlanKg = positioning
      ? 0
      : Math.round(payloadKg * (0.58 + (i % 17) * 0.019));
    const bookedKg = positioning
      ? 0
      : Math.round(cargoPlanKg * (0.96 + (i % 9) * 0.011));
    const absentKg = positioning
      ? 0
      : i % 23 === 0
        ? Math.round(bookedKg * 0.12)
        : 0;
    const readyKg = Math.min(payloadKg, bookedKg - absentKg);
    const offloadKg =
      positioning || cancelled
        ? 0
        : i % 31 === 0
          ? Math.round(readyKg * 0.16)
          : 0;
    const carriedKg = cancelled ? 0 : readyKg - offloadKg;
    const taxiPlan = 0.45 + (i % 4) * 0.04,
      taxiObserved =
        taxiPlan + (flown && (l.delayMinutes || 0) > 15 ? 0.08 : 0);
    const currentHours = l.actualHours ?? l.forecastHours ?? 0;
    const blockPlan = l.planHours + taxiPlan,
      block = cancelled ? 0 : currentHours + taxiObserved;
    const ofpKg = Math.round(
      (l.planHours * (an ? 9300 : 6900) + taxiPlan * 1200) *
        (1 + (i % 6) * 0.006),
    );
    const fuelKg = cancelled
      ? 0
      : Math.round(ofpKg * (0.975 + (i % 13) * 0.006));
    const arrivalDelay = flown
      ? Math.round((l.delayMinutes || 0) + (block - blockPlan) * 60)
      : null;
    const promisedShift = flown && i % 41 === 0 ? 180 : 0;
    const deliveryMiss =
      flown && !positioning && (arrivalDelay || 0) + promisedShift > 120;
    const delayCause =
      (l.delayMinutes || 0) > 15
        ? [
            'Погрузка / наземное обслуживание',
            'Позднее прибытие ВС',
            'Погода / УАК1',
            'Техническая причина',
          ][i % 4]
        : '';
    const offloadCause = offloadKg
      ? i % 2
        ? 'Сбой погрузочного оборудования'
        : 'Ограничение крепления / размещения'
      : '';
    const captain = `DEMO-KVS-${an ? 'AN' : 'IL'}-${String((i % (an ? 8 : 16)) + 1).padStart(2, '0')}`;
    const fdmValid = flown && i % 19 !== 0;
    const event = fdmValid && i % 97 === 0;
    return {
      ...l,
      distanceKm,
      payloadKg,
      volumeM3,
      positioning,
      cargoPlanKg,
      bookedKg,
      absentKg,
      readyKg,
      offloadKg,
      cargoKg: carriedKg,
      volumePlan: positioning ? 0 : round(volumeM3 * (0.72 + (i % 9) * 0.025)),
      volumeUsed:
        positioning || cancelled
          ? 0
          : round(volumeM3 * (0.7 + (i % 9) * 0.025) * (offloadKg ? 0.84 : 1)),
      blockPlan,
      block,
      ofpKg,
      fuelKg,
      arrivalDelay,
      deliveryMiss,
      promisedShift,
      commitmentMiss:
        !positioning && (cancelled || deliveryMiss || offloadKg > 0),
      delayCause,
      offloadCause,
      captain,
      crewAssigned: !future || !v.crewRisk.includes(l.flightId),
      fdmValid,
      event,
      client: positioning
        ? 'Миссия / позиционирование'
        : `Учебный заказчик ${String.fromCharCode(65 + (i % 5))}`,
      claims: relatedClaims.map((c) => c.id),
      repairs: v.repairs
        .filter((x) => x.flights.includes(l.flightId))
        .map((x) => x.id),
      forecastBasis: future
        ? 'Базовая программа без автоматических отмен; ресурсные риски отдельно'
        : 'Закрытая запись',
    };
  });
  const capacities = v.planes.flatMap((p) =>
    Array.from({ length: 12 }, (_, i) => {
      const month = `2026-${String(i + 1).padStart(2, '0')}`;
      const legs = rows.filter(
        (l) => l.aircraftId === p.id && l.month === month,
      );
      const program = sum(legs.map((l) => l.planHours));
      // Fixed synthetic operating regime, independent of plan or observed utilization.
      const base = days(month) * (p.type === 'Ил-76' ? 4 : 3);
      const repairDays = v.repairs.reduce(
        (s, x) =>
          s +
          (x.aircraftId !== p.id
            ? 0
            : Array.from(
                { length: days(month) },
                (_, d) => `${month}-${String(d + 1).padStart(2, '0')}`,
              ).filter((d) => d >= x.start && d < x.expectedReturn).length),
        0,
      );
      const technical = round((base * repairDays) / days(month));
      const planRepairDays = v.repairs.reduce(
        (s, x) =>
          s +
          (x.aircraftId !== p.id
            ? 0
            : Array.from(
                { length: days(month) },
                (_, d) => `${month}-${String(d + 1).padStart(2, '0')}`,
              ).filter((d) => d >= x.start && d < x.planReturn).length),
        0,
      );
      const planned = round(base - (base * planRepairDays) / days(month));
      const crew = round(
        Math.min(
          base - technical,
          sum(
            legs
              .filter((l) => !l.crewAssigned && !l.repairs.length)
              .map((l) => l.forecastHours || 0),
          ),
        ),
      );
      return {
        month,
        aircraftId: p.id,
        fleet: legs[0]?.fleet,
        calendar: days(month) * 24,
        base,
        technical,
        crew,
        executable: round(base - technical - crew),
        planned,
        plan: program,
      };
    }),
  );
  return {
    snapshotId: v.snapshotId,
    asOf: v.asOf,
    classification: 'DEMO_SYNTHETIC',
    rows,
    capacities,
    method: 'operations-proposal-0.1',
  };
}
export type Al1Operations = ReturnType<typeof buildAl1Operations>;
export type OpsRow = Al1Operations['rows'][number];
export function filterOps(data: Al1Operations, s: OpsScope) {
  return data.rows.filter(
    (l) =>
      l.month >= s.start &&
      l.month <= s.end &&
      (!s.fleet || l.fleet === s.fleet) &&
      (!s.aircraft || l.aircraftId === s.aircraft) &&
      (!s.captain || l.captain === s.captain),
  );
}
export function opsMeasure(
  data: Al1Operations,
  s: OpsScope,
  k: OpsMetric,
  view: 'plan' | 'actual' | 'forecast',
  input?: OpsRow[],
): number | null {
  const all = input || filterOps(data, s);
  const selected =
    view === 'actual' ? all.filter((l) => l.status !== 'FORECAST') : all;
  if (!selected.length) return null;
  const flown = selected.filter(
    (l) => view === 'plan' || l.status !== 'CANCELLED',
  );
  const goods = flown.filter((l) => !l.positioning);
  const hours = (l: OpsRow) =>
    view === 'plan' ? l.planHours : (l.actualHours ?? l.forecastHours ?? 0);
  const cargo = (l: OpsRow) => (view === 'plan' ? l.cargoPlanKg : l.cargoKg);
  const ctk = sum(goods.map((l) => (cargo(l) / 1000) * l.distanceKm)) / 1000;
  const actk =
    sum(goods.map((l) => (l.payloadKg / 1000) * l.distanceKm)) / 1000;
  const caps = data.capacities.filter(
    (c) =>
      c.month >= s.start &&
      c.month <= s.end &&
      (!s.fleet || c.fleet === s.fleet) &&
      (!s.aircraft || c.aircraftId === s.aircraft) &&
      (view !== 'actual' || c.month <= monthOf(data.asOf)),
  );
  const actualOnly = selected.every((l) => l.status !== 'FORECAST');
  switch (k) {
    case 'flights':
      return flown.length;
    case 'hours':
      return sum(selected.map(hours));
    case 'completion':
      return pct(flown.length, selected.length);
    case 'd15':
      return view === 'plan'
        ? 85
        : !actualOnly
          ? null
          : pct(
              flown.filter((l) => l.delayMinutes! <= 15).length,
              flown.length,
            );
    case 'a15':
      return view === 'plan'
        ? 85
        : !actualOnly
          ? null
          : pct(
              flown.filter((l) => l.arrivalDelay! <= 15).length,
              flown.length,
            );
    case 'capacity':
      return s.captain || input
        ? null
        : sum(caps.map((c) => (view === 'plan' ? c.planned : c.executable)));
    case 'utilization':
      return s.captain || input
        ? null
        : pct(
            sum(selected.map(hours)),
            sum(caps.map((c) => (view === 'plan' ? c.planned : c.executable))),
          );
    case 'block':
      return sum(flown.map((l) => (view === 'plan' ? l.blockPlan : l.block)));
    case 'ground':
      return s.captain || input
        ? null
        : sum(caps.map((c) => c.calendar)) - sum(selected.map(hours));
    case 'tonnes':
      return sum(goods.map(cargo)) / 1000;
    case 'ctk':
      return ctk;
    case 'actk':
      return actk;
    case 'clf':
      return pct(ctk, actk);
    case 'volume':
      return pct(
        sum(goods.map((l) => (view === 'plan' ? l.volumePlan : l.volumeUsed))),
        sum(goods.map((l) => l.volumeM3)),
      );
    case 'offload':
      return view === 'plan' ? 0 : sum(goods.map((l) => l.offloadKg)) / 1000;
    case 'commitments':
      return view === 'plan'
        ? 0
        : !actualOnly
          ? null
          : selected.filter((l) => l.commitmentMiss).length;
    case 'fuel':
      return (
        sum(flown.map((l) => (view === 'plan' ? l.ofpKg : l.fuelKg))) / 1000
      );
    case 'fuelVariance':
      return view === 'plan'
        ? 0
        : !flown.length
          ? null
          : (100 *
              (sum(flown.map((l) => l.fuelKg)) -
                sum(flown.map((l) => l.ofpKg)))) /
            sum(flown.map((l) => l.ofpKg));
    case 'ferry':
      return sum(flown.filter((l) => l.positioning).map(hours));
    case 'crew':
      return view === 'plan'
        ? 100
        : pct(flown.filter((l) => l.crewAssigned).length, flown.length);
    case 'fdm':
      return view === 'plan'
        ? 95
        : !actualOnly
          ? null
          : pct(flown.filter((l) => l.fdmValid).length, flown.length);
    case 'events':
      return view === 'plan' || !actualOnly
        ? null
        : flown.filter((l) => l.fdmValid).length
          ? (1000 * flown.filter((l) => l.event).length) /
            flown.filter((l) => l.fdmValid).length
          : null;
  }
}
export function opsSeries(data: Al1Operations, s: OpsScope, k: OpsMetric) {
  return Array.from(
    { length: 12 },
    (_, i) => `2026-${String(i + 1).padStart(2, '0')}`,
  )
    .filter((m) => m >= s.start && m <= s.end)
    .map((m) => ({
      month: m,
      label: m.slice(5),
      plan: opsMeasure(data, { ...s, start: m, end: m }, k, 'plan'),
      actual:
        m <= monthOf(data.asOf)
          ? opsMeasure(data, { ...s, start: m, end: m }, k, 'actual')
          : null,
      forecast:
        m > monthOf(data.asOf)
          ? opsMeasure(data, { ...s, start: m, end: m }, k, 'forecast')
          : null,
    }));
}
export function opsAdvice(rows: OpsRow[], k: OpsMetric) {
  const suggestions: {
    reason: string;
    owner: string;
    action: string;
    ids: string[];
    status: string;
  }[] = [];
  const add = (reason: string, owner: string, action: string, rs: OpsRow[]) => {
    if (rs.length)
      suggestions.push({
        reason,
        owner,
        action,
        ids: rs.map((r) => r.flightId),
        status: 'Гипотеза / учебные основания; решение не принято',
      });
  };
  if (
    [
      'flights',
      'hours',
      'completion',
      'capacity',
      'utilization',
      'crew',
      'ground',
      'block',
    ].includes(k)
  ) {
    add(
      'Будущая программа пересекается с ремонтом',
      'Технический директор + ЦУП',
      'Уточнить возврат ВС; проверить замену борта или перенос с согласованием заказчика.',
      rows.filter((r) => r.repairs.length),
    );
    add(
      'Не назначен экипажный комплект',
      'Начальник лётной службы',
      'Проверить назначение, допуски и отдых; оценить подготовку либо перенос задания.',
      rows.filter((r) => !r.crewAssigned),
    );
    add(
      'Отменённое задание',
      'ЦУП',
      'Подтвердить первичную причину отмены и влияние на обязательство; не переписывать исходный план.',
      rows.filter((r) => r.status === 'CANCELLED'),
    );
  }
  if (['d15', 'a15', 'commitments', 'block', 'ground'].includes(k))
    for (const cause of [
      ...new Set(rows.map((r) => r.delayCause).filter(Boolean)),
    ])
      add(
        cause,
        'ЦУП + профильная служба',
        'Разобрать первичную и последующую задержку; подтвердить минуты и корректирующую меру.',
        rows.filter((r) => r.delayCause === cause),
      );
  if (
    [
      'tonnes',
      'clf',
      'volume',
      'ctk',
      'actk',
      'offload',
      'commitments',
    ].includes(k)
  ) {
    add(
      'Готовый груз не погружен',
      'Руководитель грузовой службы',
      'Проверить погрузочное средство, размещение и крепление; согласовать доставку остатка. Не обходить ограничения.',
      rows.filter((r) => r.status === 'COMPLETED' && r.offloadKg > 0),
    );
    add(
      'Груз не представлен к отправке',
      'Коммерческий директор',
      'Подтвердить готовность груза у клиента и условия обязательства; производство не назначается виновным автоматически.',
      rows.filter((r) => r.status === 'COMPLETED' && r.absentKg > 0),
    );
    add(
      'Нарушен согласованный срок выдачи',
      'Коммерческий директор + ЦУП',
      'Согласовать восстановление обязательства, ответ клиенту и подтверждение исполнения.',
      rows.filter((r) => r.deliveryMiss),
    );
  }
  if (['fuel', 'fuelVariance'].includes(k))
    add(
      'Расход выше OFP более чем на 3%',
      'Лётная служба + диспетчерское планирование',
      'Сверить OFP одной версии и фазу измерения, массу, маршрут, ветер, руление и состояние ВС. Не сокращать резервы и не ранжировать КВС.',
      rows.filter((r) => r.status === 'COMPLETED' && r.fuelKg > r.ofpKg * 1.03),
    );
  if (k === 'ferry')
    add(
      'Позиционирование без груза',
      'Коммерческий директор + ЦУП',
      'Оценить связку миссий и обратную загрузку с учётом сроков и разрешений; не считать любой перегон потерей.',
      rows.filter((r) => r.positioning),
    );
  if (['fdm', 'events'].includes(k)) {
    add(
      'Непригодная или отсутствующая запись FDM',
      'Руководитель безопасности полётов',
      'Восстановить покрытие и проверить качество данных; отсутствие записи не считать отсутствием событий.',
      rows.filter((r) => r.status === 'COMPLETED' && !r.fdmValid),
    );
    add(
      'Подтверждённое учебное SPI-событие',
      'Руководитель безопасности полётов',
      'Выполнить защищённый разбор; проверить системные причины и эффективность меры. Не автоматизировать дисциплинарные выводы.',
      rows.filter((r) => r.event),
    );
  }
  return suggestions;
}
