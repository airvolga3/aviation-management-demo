import type { AirlineBundle, AirLeg } from './airline-model';

// A bounded synthetic reconstruction, NOT historical bookings or a demand model.
// Existing AirLeg totals remain the authority; this layer never changes them.
export const regularStages = [
  { id: 'd28', label: 'За 28 дней', day: -28, hour: 8 },
  { id: 'd14', label: 'За 14 дней', day: -14, hour: 8 },
  { id: 'd7', label: 'За 7 дней', day: -7, hour: 8 },
  { id: 'd3', label: 'За 3 дня', day: -3, hour: 8 },
  { id: 'd1', label: 'За 1 день', day: -1, hour: 8 },
  { id: 'rcs', label: 'Приёмка', day: 0, hour: 8 },
  { id: 'load', label: 'Погрузка', day: 0, hour: 12 },
  { id: 'closed', label: 'Итог рейса', day: 2, hour: 12 },
] as const;
export type RegularStage = (typeof regularStages)[number]['id'];
export type ShipmentOutcome =
  | 'FLOWN'
  | 'NO_SHOW'
  | 'DOC_HOLD'
  | 'OFFLOAD'
  | 'CANCELLED';
export type RegularShipment = {
  id: string;
  client: string;
  cargo: string;
  channel: string;
  created: number;
  outcome: ShipmentOutcome;
  kg: number;
  volume: number;
  chargeableKg: number;
  bookedRub: number;
  recognisedRub: number;
  owner: string;
  reason: string;
  action: string;
};
export type RegularFlight = {
  classification: 'DEMO_SYNTHETIC';
  method: string;
  snapshotId: string;
  leg: AirLeg;
  companyName: string;
  capacityKg: number;
  capacityM3: number;
  planChargeableKg: number;
  shipments: RegularShipment[];
};
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const round = (x: number) => Math.round(x * 100) / 100;
const allocate = (total: number, weights: number[]) => {
  const scale = sum(weights),
    raw = weights.map((w) => (total * w) / scale),
    out = raw.map(Math.floor);
  const ranks = raw
    .map((x, i) => ({ i, tail: x - out[i] }))
    .sort((a, b) => b.tail - a.tail || a.i - b.i);
  for (let i = 0, left = total - sum(out); i < left; i++) out[ranks[i].i]++;
  return out;
};
export const regularDefinitions: Record<
  string,
  { name: string; unit: string; definition: string; owner: string }
> = {
  booked: {
    name: 'Подтверждённые бронирования',
    unit: 'т / ₽',
    definition:
      'Уникальные действующие отправки на выбранный момент. Отменённая бронь исключается с момента отмены. Сумма бронирований — коммерческое обязательство, а не признанная выручка или полученные деньги.',
    owner: 'Коммерческая служба · бронирование',
  },
  capacity: {
    name: 'Физическая ёмкость вылета',
    unit: 'кг и м³ отдельно',
    definition:
      'Рабочая весовая и объёмная ёмкость этого синтетического вылета. Остаток = ёмкость − активные брони (после вылета: минус перевезено). Свободный вес не доказывает загрузимость: ULD, контур, размеры, центровка и ограничения требуют проверки производства. Не сертифицированная характеристика ВС.',
    owner: 'Производство / планирование',
  },
  chargeable: {
    name: 'Платный вес',
    unit: 'кг',
    definition:
      'Для каждой отправки max(физический вес, объём × 1000/6), затем сумма по отправкам. Коэффициент 166,67 кг/м³ — настройка базового примера; специальные тарифы, округления и минимальный сбор требуют договорного профиля. Платный вес не используется в физической загрузке.',
    owner: 'Коммерция / тарифная политика',
  },
  rate: {
    name: 'Средняя ставка',
    unit: '₽ / платный кг',
    definition:
      'Сумма сопоставимых бронирований / их суммарный платный вес. После закрытия: признанная выручка перевезённых отправок / их платный вес. Не среднее арифметическое тарифов и не Cargo Yield в ₽/тонно-км. В примере нет отдельных надбавок и минимальных сборов.',
    owner: 'Коммерция / финансовая служба',
  },
  forecast: {
    name: 'Прогноз выручки рейса',
    unit: 'млн ₽',
    definition:
      'Иллюстративная оценка из броней выбранного этапа, ожидаемой сохранности и добора к плану. Сама история реконструирована с согласованием конечных итогов. Это не независимый исторический прогноз и не проверенная модель спроса. Выручка не равна сумме броней.',
    owner: 'Коммерческий директор / финансовая служба',
  },
  revenue: {
    name: 'Выручка рейса',
    unit: 'млн ₽',
    definition:
      'После закрытия берётся из существующей строки рейса единого среза AG. Для наглядности распределена по перевезённым отправкам; не создана фактом бронирования или flown и не добавляется к выручке компании повторно. Корпоративного revenue accounting нет.',
    owner: 'Финансовая служба',
  },
  op: {
    name: 'Операционная прибыль · M4',
    unit: 'млн ₽',
    definition:
      'Выручка минус все операционные расходы, включая распределённые расходы и амортизацию, в действующем профиле рейса AG. До закрытия — прогноз выручки минус план расходов; после — исходные суммы рейса. Это не маржинальный вклад дополнительной отправки и не прибыль до налога.',
    owner: 'Финансово-экономическая служба',
  },
  load: {
    name: 'Использование ёмкости',
    unit: '%',
    definition:
      'Физический вес перевезённого груза / весовая ёмкость вылета. До вылета показывается отдельно занятость подтверждёнными бронями, а не фактическая загрузка. Объём считается своим отношением; кг и м³ не складываются.',
    owner: 'Производство и коммерция',
  },
  rcs: {
    name: 'Готовность груза к перевозке · RCS',
    unit: 'т / отправки',
    definition:
      'Отдельное подтверждение приёмки груза как готового к перевозке после необходимых проверок. Не равно физической приёмке, попаданию в манифест, погрузке или вылету. Здесь статусы иллюстрируют процесс, не разрешают реальную перевозку.',
    owner: 'Карго-терминал / производство',
  },
  costs: {
    name: 'Операционные расходы рейса',
    unit: 'млн ₽',
    definition:
      'План и итог берутся из той же строки рейса AG. Расходы по статьям включают амортизацию; отдельной подтверждённой переменной себестоимости отправки нет. Сумма расходов не списывается повторно при раскрытии отправок.',
    owner: 'Финансово-экономическая служба',
  },
};

export function regularPilot(a: AirlineBundle): AirLeg | undefined {
  if (
    a.classification !== 'DEMO_SYNTHETIC' ||
    !['AL3', 'AL2'].includes(a.companyId)
  )
    return;
  return a.legs
    .filter(
      (f) =>
        f.month === '2026-08' &&
        f.status === 'COMPLETED' &&
        f.service === 'REGULAR' &&
        !f.ferry,
    )
    .at(-1);
}
export function regularTime(f: RegularFlight, stage: number): string {
  const s = regularStages[stage],
    d = new Date(f.leg.date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + s.day);
  d.setUTCHours(s.hour);
  return d.toISOString();
}
export function buildRegularFlight(
  a: AirlineBundle,
  id?: string,
): RegularFlight | null {
  const leg = regularPilot(a);
  if (!leg || (id && id !== leg.id)) return null;
  const capacityKg = a.companyId === 'AL3' ? 105000 : 18000;
  const capacityM3 = a.companyId === 'AL3' ? 650 : 120;
  const weights = allocate(
    Math.round(leg.tonnes * 1000),
    [23, 20, 18, 16, 13, 10],
  );
  const rub = allocate(
    Math.round(leg.revenue * 1e8),
    [20, 23, 17, 17, 14, 9],
  ).map((c) => c / 100);
  const names = [
    'Агент Север',
    'Агент Восток',
    'Промышленный клиент',
    'Агент Центр',
    'Экспресс-партнёр',
    'Прямой клиент',
  ];
  const cargos = [
    'Лёгкий сборный груз',
    'Электроника',
    'Комплектующие',
    'Запасные части',
    'Промышленный груз',
    'Сборный груз',
  ];
  const shipments: RegularShipment[] = weights.map((kg, i) => {
    const volume = round(kg / [90, 130, 220, 320, 500, 180][i]);
    return {
      id: `SYN-${a.companyId}-S${i + 1}`,
      client: names[i],
      cargo: cargos[i],
      channel: i === 2 || i === 5 ? 'Прямой клиент' : 'Агент',
      created: [0, 1, 2, 3, 4, 4][i],
      outcome: 'FLOWN',
      kg,
      volume,
      chargeableKg: round(Math.max(kg, (volume * 1000) / 6)),
      bookedRub: rub[i],
      recognisedRub: rub[i],
      owner: 'Менеджер регулярных продаж',
      reason: 'Перевозка выполнена',
      action: 'Сверить исполнение с финансовой строкой',
    };
  });
  const avg = sum(rub) / sum(shipments.map((s) => s.chargeableKg));
  const extra: [ShipmentOutcome, number, number, string, string, string][] = [
    [
      'NO_SHOW',
      0.045,
      1,
      'Груз не предъявлен к сроку',
      'Менеджер по работе с агентом',
      'Подтвердить причины с агентом; проверить договорные условия непредъявления',
    ],
    [
      'DOC_HOLD',
      0.027,
      2,
      'Приёмка выполнена, комплект документов не закрыт',
      'Координатор грузового обслуживания',
      'Закрыть расхождение документов; согласовать дальнейшую перевозку',
    ],
    [
      'OFFLOAD',
      0.018,
      3,
      'Груз погружен и затем снят с этого вылета',
      'Производство / координатор загрузки',
      'Установить причину снятия; согласовать восстановление обязательства',
    ],
    [
      'CANCELLED',
      0.035,
      0,
      'Бронь отменена за 7 дней',
      'Менеджер регулярных продаж',
      'Освободить ёмкость; сохранить причину отмены',
    ],
  ];
  extra.forEach(([outcome, share, created, reason, owner, action], i) => {
    const kg = Math.round(capacityKg * share),
      volume = round(kg / 160),
      chargeableKg = round(Math.max(kg, (volume * 1000) / 6));
    shipments.push({
      id: `SYN-${a.companyId}-S${i + 7}`,
      client: ['Агент Запад', 'Проектный клиент', 'Агент Юг', 'Разовый клиент'][
        i
      ],
      cargo: 'Сборный груз',
      channel: 'Агент',
      created,
      outcome,
      kg,
      volume,
      chargeableKg,
      bookedRub: round(chargeableKg * avg * (0.9 + i * 0.04)),
      recognisedRub: 0,
      owner,
      reason,
      action,
    });
  });
  return {
    classification: 'DEMO_SYNTHETIC',
    method: 'REGULAR-FLIGHT-v0.25',
    snapshotId: a.snapshotId,
    leg,
    companyName: a.name,
    capacityKg,
    capacityM3,
    planChargeableKg: leg.tonnesPlan * 1000 * 1.15,
    shipments,
  };
}
export function regularShipmentState(s: RegularShipment, stage: number) {
  if (s.created > stage) return 'Ещё нет брони';
  if (s.outcome === 'CANCELLED' && stage >= 2) return 'Отменена';
  if (stage < 5) return 'Подтверждена';
  if (s.outcome === 'NO_SHOW') return 'Не предъявлен';
  if (s.outcome === 'DOC_HOLD') return 'Документы не закрыты';
  if (stage === 5) return 'RCS подтверждён';
  if (stage === 6) return 'Погружен';
  return s.outcome === 'OFFLOAD' ? 'Снят с рейса' : 'Перевезён';
}
export function regularNextAction(s: RegularShipment, stage: number) {
  if (s.created > stage)
    return {
      owner: 'Не определён',
      reason: 'Бронь ещё не создана',
      action: 'Нет доступного действия',
    };
  if (
    (s.outcome === 'CANCELLED' && stage >= 2) ||
    stage >= 7 ||
    (stage >= 5 && ['NO_SHOW', 'DOC_HOLD'].includes(s.outcome))
  )
    return { owner: s.owner, reason: s.reason, action: s.action };
  if (stage < 5)
    return {
      owner: 'Менеджер регулярных продаж',
      reason: 'Подтверждённая бронь; исход перевозки ещё неизвестен',
      action: 'Подтвердить предъявление и состав груза до приёмки',
    };
  return {
    owner: 'Координатор грузового обслуживания',
    reason:
      stage === 5
        ? 'Груз готов к перевозке; погрузка ещё не подтверждена'
        : 'Погрузка подтверждена; итог перевозки ещё неизвестен',
    action:
      stage === 5
        ? 'Сверить готовый груз с манифестом и планом погрузки'
        : 'Получить подтверждение перевозки или сведения об отклонении',
  };
}
export function regularView(f: RegularFlight, stage: number) {
  if (!Number.isInteger(stage) || stage < 0 || stage >= regularStages.length)
    throw Error('Unknown departure stage');
  const known = f.shipments.filter((s) => s.created <= stage);
  const booked = known.filter(
    (s) => !(s.outcome === 'CANCELLED' && stage >= 2),
  );
  const accepted =
    stage >= 5 ? booked.filter((s) => s.outcome !== 'NO_SHOW') : [];
  const ready = accepted.filter((s) => s.outcome !== 'DOC_HOLD');
  const loaded = stage >= 6 ? ready : [];
  const flown = stage >= 7 ? loaded.filter((s) => s.outcome === 'FLOWN') : [];
  const bKg = sum(booked.map((s) => s.kg)),
    bRub = sum(booked.map((s) => s.bookedRub));
  const survival = [0.88, 0.89, 0.9, 0.92, 0.94, 0.98, 1, 1][stage];
  const pickup = [0.65, 0.65, 0.55, 0.42, 0.25, 0, 0, 0][stage];
  const basis = stage >= 5 ? (stage >= 6 ? loaded : ready) : booked;
  const basisKg = sum(basis.map((s) => s.kg));
  const extraKg =
    stage < 5 ? Math.max(0, f.leg.tonnesPlan * 1000 - bKg) * pickup : 0;
  const forecastKg = Math.min(f.capacityKg, basisKg * survival + extraKg);
  const estimateRub =
    sum(basis.map((s) => s.bookedRub)) * survival +
    extraKg * 1.15 * ((f.leg.revenuePlan * 1e6) / f.planChargeableKg);
  const revenue = stage === 7 ? f.leg.revenue : estimateRub / 1e6;
  const cost = stage === 7 ? f.leg.cost : f.leg.costPlan;
  const carriedKg = stage === 7 ? sum(flown.map((s) => s.kg)) : null;
  const current = stage === 7 ? flown : booked;
  const weight = sum(current.map((s) => s.kg)),
    volume = sum(current.map((s) => s.volume));
  const chargeable = sum(current.map((s) => s.chargeableKg));
  const currentRub = sum(
    current.map((s) => (stage === 7 ? s.recognisedRub : s.bookedRub)),
  );
  return {
    known,
    booked,
    accepted,
    ready: stage >= 5 ? ready : [],
    loaded,
    flown,
    bKg,
    bRub,
    forecastKg,
    revenue,
    cost,
    op: revenue - cost,
    carriedKg,
    freeKg: f.capacityKg - weight,
    freeM3: f.capacityM3 - volume,
    weight,
    volume,
    chargeable,
    rate: chargeable ? currentRub / chargeable : null,
    lossKg: stage === 7 ? bKg - (carriedKg ?? 0) : null,
    survival,
    pickup,
    extraKg,
    reconciliation:
      stage === 7
        ? round(sum(flown.map((s) => s.recognisedRub)) - f.leg.revenue * 1e6)
        : null,
  };
}
export function regularEvents(f: RegularFlight, s: RegularShipment) {
  const events = [
    {
      stage: s.created,
      label: 'Бронь подтверждена',
      source: 'Бронирование',
      detail: `${s.kg} кг; ${s.volume} м³; сумма ${s.bookedRub} ₽`,
    },
  ];
  if (s.outcome === 'CANCELLED')
    events.push({
      stage: 2,
      label: 'Бронь отменена',
      source: 'Журнал бронирований',
      detail: s.reason,
    });
  else if (s.outcome === 'NO_SHOW')
    events.push({
      stage: 5,
      label: 'Непредъявление груза',
      source: 'Контроль приёмки',
      detail: s.reason,
    });
  else {
    events.push({
      stage: 5,
      label: 'Физическая приёмка',
      source: 'Терминальный акт',
      detail: `Принято ${s.kg} кг; ${s.volume} м³`,
    });
    if (s.outcome === 'DOC_HOLD')
      events.push({
        stage: 5,
        label: 'RCS не подтверждён',
        source: 'Контрольный лист',
        detail: s.reason,
      });
    else {
      events.push({
        stage: 5,
        label: 'RCS подтверждён',
        source: 'Контрольный лист',
        detail: 'Проверки готовности завершены в синтетическом реестре',
      });
      events.push({
        stage: 6,
        label: 'Включён в манифест и погружен',
        source: 'Манифест / погрузка',
        detail: `${s.kg} кг`,
      });
      events.push({
        stage: 7,
        label:
          s.outcome === 'OFFLOAD' ? 'Снят с вылета' : 'Перевозка подтверждена',
        source: 'Операционное закрытие',
        detail: s.reason,
      });
      if (s.outcome === 'FLOWN')
        events.push({
          stage: 7,
          label: 'Сверка с финансовой строкой',
          source: 'Распределение исходной выручки AG',
          detail: `${s.recognisedRub} ₽; источник ${f.leg.id}; это распределение, не реальный счёт`,
        });
    }
  }
  return events.map((e, i) => ({
    ...e,
    id: `${s.id}-E${i + 1}`,
    at: regularTime(f, e.stage),
  }));
}
