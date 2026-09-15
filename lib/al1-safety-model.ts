import type { ExecutiveSnapshot } from './executive-model';
import { opsMeasure, type OpsRow } from './al1-operations-model';

export const sqMethod = 'SQ-AL1-v0.22';
export type SqKind =
  | 'event'
  | 'risk'
  | 'action'
  | 'inspection'
  | 'finding'
  | 'damage'
  | 'claim';
export type SqRecord = {
  id: string;
  kind: SqKind;
  domain: 'safety' | 'quality';
  title: string;
  date: string;
  fleet?: string;
  aircraftId?: string;
  flightId?: string;
  category: string;
  status: string;
  owner: string;
  cause: string;
  next: string;
  source: string;
  links: string[];
  due?: string;
  critical?: boolean;
  implemented?: boolean;
  verified?: boolean;
  verifiedDate?: string;
  verificationDue?: string;
  inspectionId?: string;
  grade?: number;
  repeated?: boolean;
  amount?: number;
  legacy?: boolean;
};
export type SqScope = {
  start: string;
  end: string;
  fleet?: string;
  aircraft?: string;
};
export const sqMonths = Array.from(
  { length: 12 },
  (_, i) => `2026-${String(i + 1).padStart(2, '0')}`,
);
const percent = (n: number, d: number) => (d ? (n / d) * 100 : null);
export const sqMetrics: Record<
  string,
  { name: string; unit: string; definition: string; owner: string }
> = {
  severe: {
    name: 'События высокой серьёзности',
    unit: 'событий',
    definition:
      'Авиационные происшествия и серьёзные инциденты раздельно. Учебная классификация нового регистра не переименовывает существующие SPI-отклонения в инциденты. Ноль отличается от отсутствия данных; прогноз аварий не строится.',
    owner: 'Служба безопасности полётов',
  },
  events: {
    name: 'Авиационные события',
    unit: 'событий',
    definition:
      'Происшествия, обычные инциденты и серьёзные инциденты — непересекающиеся категории в этом регистре. Инциденты всего включают серьёзные. Классификация в демо условная; не юридический вывод по реальному событию.',
    owner: 'Служба безопасности полётов',
  },
  deviations: {
    name: 'Отклонения профиля полёта · SPI',
    unit: 'на 1000 пригодных записей',
    definition:
      'Число подтверждённых условных SPI-отклонений / рейсы с пригодными FDM ×1000. Тот же числитель и знаменатель, что в производстве. Это одна учебная категория, не общий индекс безопасности и не частота авиационных происшествий.',
    owner: 'Служба безопасности полётов',
  },
  coverage: {
    name: 'Полнота FDM',
    unit: '%',
    definition:
      'Пригодные записи / все выполненные участки, включая перегоны ×100%. Отсутствие записи не доказывает отсутствие события. Будущий факт не оценивается.',
    owner: 'Служба безопасности полётов / объективный контроль',
  },
  risks: {
    name: 'Неприемлемые риски',
    unit: 'рисков на дату среза',
    definition:
      'Открытые записи с неприемлемым остаточным риском по явной учебной оценке. Риски, события и меры не суммируются. Это состояние на 31.08, не число рисков, возникших за выбранный период. Корпоративная матрица не утверждена.',
    owner: 'ГД / владелец риска / служба безопасности',
  },
  ground: {
    name: 'Повреждения на земле',
    unit: 'событий',
    definition:
      'Подтверждённые учебные наземные повреждения ВС. Событие может иметь другие теги, поэтому итоги разных реестров не складываются. Частота на обслуживания не рассчитывается без их отдельного знаменателя.',
    owner: 'Производство / наземное обслуживание',
  },
  inspections: {
    name: 'Инспекции и проверки',
    unit: 'проверок',
    definition:
      'Отдельные учебные проверки SAFA, регулятора и внутреннего аудита за период. Количество замечаний оценивается вместе с охватом, серьёзностью и повторяемостью, не само по себе.',
    owner: 'Руководитель качества / compliance',
  },
  safa: {
    name: 'SAFA ratio',
    unit: 'нет подтверждённой оценки',
    definition:
      'Подтверждённого отчёта и применимого профиля расчёта ratio нет. Условные инспекции и категории 1/2/3 можно раскрыть; они не являются реальным SAFA-рейтингом АК1. Нет инспекций — не нулевой рейтинг.',
    owner: 'Служба безопасности / координатор инспекций',
  },
  index: {
    name: 'Корпоративный индекс безопасности',
    unit: 'методика не утверждена',
    definition:
      'Формула, веса, классификация, допустимый риск и корпоративные цели не предоставлены. Общий балл не рассчитывается; критическое ограничение не может компенсироваться хорошими средними значениями.',
    owner: 'ГД / служба безопасности полётов',
  },
  service: {
    name: 'Срок и полнота исполнения программы',
    unit: '%',
    definition:
      'Коммерческие участки без отмены, нарушения условного клиентского окна и недогруза при наличии груза / все коммерческие задания закрытой части периода ×100%. Перегоны исключены. Это рейсовый прокси из производства, не договорный DAP по AWB или полной чартерной миссии. Претензии не добавляются автоматически к нарушениям.',
    owner: 'Коммерческий директор + производственный директор',
  },
  dap: {
    name: 'Договорный DAP',
    unit: 'нет договорных milestones',
    definition:
      'Своевременность обязательства должна измеряться относительно исходного обещания, его версии и подтверждённого факта. Корпоративное значение DAP и конечный milestone не утверждены. Пунктуальность вылета или рейсовый прокси не выдаются за этот KPI.',
    owner: 'Коммерческий директор / руководитель качества',
  },
  integrity: {
    name: 'Подтверждённые нарушения сохранности',
    unit: 'случаев',
    definition:
      'Отдельные учебные акты о нарушении сохранности. Претензия о повреждении упаковки сама по себе не считается подтверждённым повреждением груза. Частота на отправки не рассчитывается: полного реестра AWB и их экспозиции нет.',
    owner: 'Руководитель качества / грузовой комплекс',
  },
  claims: {
    name: 'Претензии заказчиков',
    unit: 'претензий; млн ₽ требований',
    definition:
      'Существующие CLAIM-1…6 сохранены с теми же рейсами, статусами и заявленными суммами. Требование не равно признанному расходу, акту повреждения или оплате; не прибавляется к финансовым неустойкам.',
    owner: 'Коммерческий директор / юридическая служба',
  },
  findings: {
    name: 'Существенные открытые несоответствия',
    unit: 'замечаний на дату среза',
    definition:
      'Открытые замечания учебных проверок категорий 2/3 по выбранному типу и домену. Регуляторные, SAFA и внутренние замечания различаются. Повторное замечание, исполнение меры и подтверждение закрытия — разные статусы.',
    owner: 'Качество / владелец процесса',
  },
  'safety-actions': {
    name: 'Меры безопасности',
    unit: 'мер на дату среза',
    definition:
      'SAFE-01…04 сохраняют исходные статусы. Выполненная SAFE-04 не имеет подтверждённой проверки эффекта. Дополнительно заведены две явно учебные SQ-SA меры для новых событий; они не меняют исходный SAFE-реестр. Открытость и просрочка сравниваются на 31.08, история статусов не моделируется. Корпоративные ответственные пока обозначены ролями.',
    owner: 'Служба безопасности / владелец меры',
  },
  'quality-actions': {
    name: 'Меры качества',
    unit: 'мер на дату среза',
    definition:
      'Отдельные учебные меры: решение, срок, исполнение и подтверждение эффекта. Доля проверенных в срок = меры с подтверждённым эффектом к сроку / меры, срок проверки которых наступил ×100%. Перенос срока не стирает исходное обязательство.',
    owner: 'Руководитель качества / владелец процесса',
  },
  overdue: {
    name: 'Просроченные критические меры',
    unit: 'мер',
    definition:
      'Критические меры, ещё не исполненные на 31.08, с контрольным сроком раньше этой даты. SAFE-01 критическая, но на дату среза ещё не просрочена. Ноль просроченных не отменяет действующее ограничение.',
    owner: 'ГД / служба безопасности',
  },
  effectiveness: {
    name: 'Эффект мер подтверждён в срок',
    unit: '%',
    definition:
      'Числитель: меры с подтверждённой проверкой эффекта не позже контрольного срока. Знаменатель: меры, срок проверки которых наступил. Неизвестный результат не считается успешным; при отсутствии применимых мер — нет оценки.',
    owner: 'Независимый проверяющий / руководитель качества',
  },
  forecast: {
    name: 'Риск будущих коммерческих рейсов',
    unit: 'коммерческих заданий',
    definition:
      'Уникальные будущие коммерческие задания, затронутые ремонтами или неподтверждённым назначением экипажа. Перегоны исключены: в полном срезе 17 из 638 коммерческих, тогда как в производстве с перегонами 18 из 718. Это сигнал для проверки выполнимости, не прогноз инцидента или достоверная отмена. Не складывать пересекающиеся причины.',
    owner: 'Производственный директор / коммерческий директор',
  },
};

export function buildAl1Safety(data: ExecutiveSnapshot) {
  const v = data.al1,
    o = data.operations;
  if (
    !v ||
    !o ||
    data.classification !== 'DEMO_SYNTHETIC' ||
    v.snapshotId !== data.snapshotId ||
    v.asOf !== data.asOf ||
    o.snapshotId !== data.snapshotId ||
    o.asOf !== data.asOf ||
    o.classification !== data.classification ||
    data.asOf !== '2026-08-31'
  )
    throw Error('Safety basis unavailable');
  const records: SqRecord[] = [];
  const fromLeg = (l: OpsRow) => ({
    date: l.date,
    fleet: l.fleet,
    aircraftId: l.aircraftId,
    flightId: l.flightId,
  });
  const flown = o.rows.filter((l) => l.status === 'COMPLETED');
  for (const l of flown.filter((l) => l.event))
    records.push({
      id: 'SPI-' + l.flightId,
      kind: 'event',
      domain: 'safety',
      ...fromLeg(l),
      title: 'Отклонение профиля полёта · ' + l.flightId,
      category: 'deviation',
      status: 'Подтверждено · учебное',
      owner: 'Служба безопасности полётов',
      cause:
        'Условный флаг SPI исходной производственной модели; юридическая классификация не назначена.',
      next: 'Разобрать запись объективного контроля, установить системную причину и меру.',
      source: 'operations.rows.event / ' + l.flightId,
      links: [],
    });
  // Additional demo registries are explicit, and never reinterpret claims or FDM flags.
  for (const [i, category] of [
    'incident',
    'incident',
    'ground',
    'ground',
  ].entries()) {
    const l = flown.filter((l) => !l.event && l.month === `2026-0${i + 3}`)[
      12 + i
    ];
    records.push({
      id: 'SQ-E-' + (i + 1),
      kind: 'event',
      domain: 'safety',
      ...fromLeg(l),
      category,
      title:
        category === 'ground'
          ? 'Наземное повреждение обтекателя · учебный кейс'
          : 'Авиационный инцидент · учебная классификация',
      status: 'Расследовано · демо',
      owner:
        category === 'ground'
          ? 'Руководитель наземного обслуживания'
          : 'Служба безопасности полётов',
      cause:
        category === 'ground'
          ? 'Учебная причина: несоблюдение зоны перемещения оборудования.'
          : 'Учебная причина: нарушение процедуры контроля; не флаг FDM.',
      next: 'Проверить барьеры и повторяемость; сверить классификацию уполномоченной службой.',
      source: 'SQ-DEMO-EVENT-ACT-' + (i + 1),
      links: [],
    });
  }
  for (const x of v.issues) {
    const repair = v.repairs.find((r) => r.id === x.link),
      p = repair
        ? {
            id: repair.aircraftId,
            fleet: o.rows.find((l) => l.aircraftId === repair.aircraftId)
              ?.fleet,
          }
        : undefined;
    records.push({
      id: x.id,
      kind: 'action',
      domain: 'safety',
      date: data.asOf,
      fleet: p?.fleet,
      aircraftId: p?.id,
      title: x.title,
      category: 'measure',
      status: x.status,
      owner:
        x.id === 'SAFE-03'
          ? 'Начальник лётной службы'
          : 'Служба безопасности / владелец меры',
      critical: x.critical,
      implemented: x.status === 'Выполнено',
      verified: false,
      due: x.due,
      cause:
        'Существующее мероприятие АК1; история статусов и проверка эффекта не предоставлены.',
      next:
        x.status === 'Выполнено'
          ? 'Назначить независимую проверку эффекта; исполнение ещё не доказывает устранение причины.'
          : 'Подтвердить выполнение и доказательство; финансовый результат не снимает ограничение.',
      source: 'al1.issues / ' + x.id,
      links: [],
      legacy: true,
    });
  }
  const critical = records.find((r) => r.id === 'SAFE-01')!;
  records.push({
    id: 'SQ-R-01',
    kind: 'risk',
    domain: 'safety',
    date: data.asOf,
    fleet: critical.fleet,
    aircraftId: critical.aircraftId,
    title: 'Эксплуатация до подтверждённого закрытия дефекта',
    category: 'unacceptable',
    status: 'Открыт · неприемлемый в демо',
    owner: 'Технический директор / ГД',
    critical: true,
    cause:
      'Существующее ограничение SAFE-01 и ремонт MX-01. Оценка качественная, без выдуманной корпоративной матрицы.',
    next: 'Проверить устранение дефекта и основание допуска. Дашборд не разрешает выпуск.',
    source: 'SQ-DEMO-RISK-01 + SAFE-01',
    links: ['SAFE-01'],
  });
  records.push({
    id: 'SQ-R-02',
    kind: 'risk',
    domain: 'safety',
    date: data.asOf,
    title: 'Риск повторения ошибки крепления груза',
    category: 'review',
    status: 'Требует переоценки',
    owner: 'Производственный директор / служба безопасности',
    cause: 'Просроченная мера SAFE-02; остаточный риск не оценён.',
    next: 'Обновить оценку и подтвердить барьеры, не считать отсутствие оценки допустимостью.',
    source: 'SQ-DEMO-RISK-02 + SAFE-02',
    links: ['SAFE-02'],
  });
  for (let i = 0; i < 8; i++) {
    const l = flown.filter((l) => l.month === `2026-0${i + 1}`)[20],
      agency = i % 3 === 0 ? 'SAFA' : i % 3 === 1 ? 'REGULATOR' : 'INTERNAL';
    const id = 'SQ-I-' + (i + 1);
    records.push({
      id,
      kind: 'inspection',
      domain: agency === 'SAFA' ? 'safety' : 'quality',
      ...fromLeg(l),
      flightId: undefined,
      category: agency,
      title:
        agency === 'SAFA'
          ? 'SAFA · условная рамповая проверка'
          : agency === 'REGULATOR'
            ? 'Ространснадзор · учебная проверка'
            : 'Внутренний аудит процесса',
      status: 'Проверка завершена · демо',
      owner: 'Координатор инспекций / качество',
      cause:
        'Отдельный синтетический протокол, не утверждение о реальной проверке АК1.',
      next: 'Рассмотреть замечания по тяжести, срокам и повторяемости.',
      source: 'SQ-DEMO-INSPECTION-' + (i + 1),
      links: ['SQ-F-' + (i + 1)],
    });
    records.push({
      id: 'SQ-F-' + (i + 1),
      kind: 'finding',
      domain: agency === 'SAFA' ? 'safety' : 'quality',
      ...fromLeg(l),
      flightId: undefined,
      inspectionId: id,
      category: agency,
      grade: (i % 3) + 1,
      repeated: i === 7,
      title: [
        'Документирование контрольной операции',
        'Полнота передачи информации',
        'Подтверждение корректирующей меры',
      ][i % 3],
      status: i < 3 ? 'Закрыто с проверкой' : 'Открыто',
      verified: i < 3,
      owner: 'Владелец процесса / качество',
      due: `2026-0${i + 1}-28`,
      cause:
        'Учебное несоответствие протокола; категорию и применимое требование подтверждает проверяющая сторона.',
      next: 'Сверить предписание, доказательство устранения и подтверждение закрытия.',
      source: 'SQ-DEMO-FINDING-' + (i + 1),
      links: [id, ...(i === 7 ? ['SQ-QA-02'] : [])],
    });
  }
  for (let i = 0; i < 3; i++) {
    const l = flown.filter(
      (l) => !l.positioning && !l.claims.length && l.month === `2026-0${i + 5}`,
    )[25];
    records.push({
      id: 'SQ-D-' + (i + 1),
      kind: 'damage',
      domain: 'quality',
      ...fromLeg(l),
      category: 'integrity',
      title: [
        'Повреждение грузовой упаковки: дефект подтверждён актом',
        'Недостача места: учебный акт',
        'Нарушение специальных условий: учебный акт',
      ][i],
      status: 'Подтверждено · демо',
      owner: 'Руководитель качества / грузовой комплекс',
      cause:
        'Отдельный учебный акт, не автоматический вывод из CLAIM-реестра. Реального AWB в модели нет.',
      next: 'Установить процесс возникновения и корректирующую меру; отдельно решить вопрос признания требования.',
      source: 'SQ-DEMO-CARGO-ACT-' + (i + 1),
      links: i === 2 ? ['SQ-QA-02'] : [],
    });
  }
  for (const x of v.claims) {
    const l = o.rows.find((l) => l.flightId === x.flightId)!;
    records.push({
      id: x.id,
      kind: 'claim',
      domain: 'quality',
      ...fromLeg(l),
      title: x.title,
      category: 'claim',
      status: x.status,
      owner: 'Коммерческий директор / юридическая служба',
      amount: x.amount,
      due: x.due,
      cause:
        'Заявленная претензия. Сохранён исходный статус; подтверждённый дефект или нарушение автоматически не устанавливаются.',
      next: 'Проверить условия договора, доказательства и согласовать ответ заказчику.',
      source: 'al1.claims / ' + x.id,
      links: [],
      legacy: true,
    });
  }
  for (const [i, x] of [
    [
      'SQ-QA-01',
      'Контроль комплекта документов перед выдачей',
      '2026-07-25',
      true,
      true,
    ],
    [
      'SQ-QA-02',
      'Устранить повторное замечание процесса',
      '2026-08-28',
      false,
      false,
    ],
    [
      'SQ-QA-03',
      'Проверка эффекта обучения обработчиков',
      '2026-09-10',
      true,
      false,
    ],
  ].entries())
    records.push({
      id: x[0] as string,
      kind: 'action',
      domain: 'quality',
      date: data.asOf,
      title: x[1] as string,
      category: 'measure',
      status: x[4]
        ? 'Эффект подтверждён'
        : x[3]
          ? 'Выполнено · эффект не проверен'
          : 'В работе',
      owner: 'Руководитель качества / владелец процесса',
      due: x[2] as string,
      critical: false,
      implemented: x[3] as boolean,
      verified: x[4] as boolean,
      verifiedDate: x[4] ? '2026-07-24' : undefined,
      cause:
        'Отдельная синтетическая мера качества; первоначальный контрольный срок сохранён.',
      next: x[4]
        ? 'Контролировать повторяемость в следующих проверках.'
        : 'Подтвердить исполнение, затем независимо проверить эффект.',
      source: 'SQ-DEMO-CAPA-' + (i + 1),
      links: i === 1 ? ['SQ-F-8', 'SQ-D-3'] : [],
    });
  // Only the new demo CAPA register explicitly supplies a verification deadline.
  for (const [i, ids] of [
    ['SQ-E-1', 'SQ-E-2'],
    ['SQ-E-3', 'SQ-E-4'],
  ].entries()) {
    const id = 'SQ-SA-0' + (i + 1);
    records.push({
      id,
      kind: 'action',
      domain: 'safety',
      date: data.asOf,
      category: 'measure',
      title:
        i === 0
          ? 'Повторная проверка контрольной процедуры'
          : 'Переразметка зоны наземного оборудования',
      status:
        i === 0
          ? 'Выполнено · эффект подтверждён'
          : 'Выполнено · эффект не проверен',
      owner:
        i === 0
          ? 'Служба безопасности / независимый проверяющий'
          : 'Наземное обслуживание / служба безопасности',
      due: i === 0 ? '2026-06-10' : '2026-08-10',
      verificationDue: i === 0 ? '2026-06-15' : '2026-08-25',
      implemented: true,
      verified: i === 0,
      verifiedDate: i === 0 ? '2026-06-12' : undefined,
      critical: false,
      cause:
        'Новая синтетическая мера для новых учебных событий. Не меняет исходные SAFE-01…04.',
      next:
        i === 0
          ? 'Проверять устойчивость эффекта и повторяемость.'
          : 'Проверить эффект: срок проверки истёк; само выполнение не закрывает контроль.',
      source: 'SQ-DEMO-SAFETY-CAPA-' + (i + 1),
      links: ids,
    });
    for (const event of records.filter((r) => ids.includes(r.id)))
      event.links.push(id);
  }
  // Legacy SAFE due dates are execution dates and must not be reinterpreted.
  for (const r of records.filter(
    (r) => r.kind === 'action' && r.domain === 'quality',
  ))
    r.verificationDue = r.due;
  return {
    snapshotId: data.snapshotId,
    fdmTarget: opsMeasure(
      o,
      { start: '2026-01', end: '2026-12' },
      'fdm',
      'plan',
    ),
    asOf: data.asOf,
    method: sqMethod,
    classification: 'DEMO_SYNTHETIC',
    records,
    legs: o.rows,
    legacyIssues: v.issues,
    legacyClaims: v.claims,
  };
}
export type Al1Safety = ReturnType<typeof buildAl1Safety>;
export function sqMatch(
  r: { fleet?: string; aircraftId?: string },
  s: SqScope,
) {
  return (
    (!s.fleet || (s.fleet === 'COMPANY' ? !r.fleet : r.fleet === s.fleet)) &&
    (!s.aircraft || r.aircraftId === s.aircraft)
  );
}
export function sqLegs(f: Al1Safety, s: SqScope) {
  return f.legs.filter(
    (l) => l.month >= s.start && l.month <= s.end && sqMatch(l, s),
  );
}
export function sqRecords(f: Al1Safety, s: SqScope, kind?: SqKind) {
  return f.records.filter(
    (r) =>
      (!kind || r.kind === kind) &&
      sqMatch(r, s) &&
      (['risk', 'action', 'finding'].includes(r.kind) ||
        (r.date.slice(0, 7) >= s.start && r.date.slice(0, 7) <= s.end)),
  );
}
export function sqSummary(f: Al1Safety, s: SqScope) {
  const legs = sqLegs(f, s),
    flown = legs.filter((l) => l.status === 'COMPLETED'),
    observed = flown.filter((l) => l.fdmValid),
    events = sqRecords(f, s, 'event');
  const closed = legs.filter((l) => !l.positioning && l.status !== 'FORECAST'),
    future = legs.filter((l) => !l.positioning && l.status === 'FORECAST');
  const missed = closed.filter((l) => l.commitmentMiss),
    actions = sqRecords(f, s, 'action'),
    findings = sqRecords(f, s, 'finding');
  const noFact = s.start > f.asOf.slice(0, 7);
  return {
    noFact,
    flown: flown.length,
    observed: observed.length,
    missing: flown.length - observed.length,
    fdm: percent(observed.length, flown.length),
    spi: observed.filter((l) => l.event).length,
    spiRate: observed.length
      ? (observed.filter((l) => l.event).length / observed.length) * 1000
      : null,
    accidents: noFact
      ? null
      : events.filter((e) => e.category === 'accident').length,
    serious: noFact
      ? null
      : events.filter((e) => e.category === 'serious').length,
    incidents: noFact
      ? null
      : events.filter((e) => ['incident', 'serious'].includes(e.category))
          .length,
    ground: noFact
      ? null
      : events.filter((e) => e.category === 'ground').length,
    unacceptable: sqRecords(f, s, 'risk').filter(
      (r) => r.category === 'unacceptable',
    ).length,
    unassessed: sqRecords(f, s, 'risk').filter((r) => r.category === 'review')
      .length,
    safetyOpen: actions.filter((r) => r.domain === 'safety' && !r.implemented)
      .length,
    criticalOverdue: actions.filter(
      (r) =>
        r.domain === 'safety' &&
        r.critical &&
        !r.implemented &&
        r.due! < f.asOf,
    ).length,
    obligations: closed.length,
    missed: missed.length,
    service: percent(closed.length - missed.length, closed.length),
    future: future.length,
    futureRisk: future.filter((l) => !l.crewAssigned || l.repairs.length > 0)
      .length,
    damages: noFact ? null : sqRecords(f, s, 'damage').length,
    claims: noFact ? null : sqRecords(f, s, 'claim').length,
    findingsOpen: findings.filter((r) => !r.verified && r.grade! >= 2).length,
    inspections: noFact ? null : sqRecords(f, s, 'inspection').length,
  };
}
export function sqEffectiveness(
  f: Al1Safety,
  s: SqScope,
  domain: 'safety' | 'quality',
) {
  const actions = sqRecords(f, s, 'action').filter((r) => r.domain === domain);
  const due = actions.filter(
    (r) => r.verificationDue && r.verificationDue <= f.asOf,
  );
  const verified = due.filter(
    (r) => r.verified && r.verifiedDate && r.verifiedDate <= r.verificationDue!,
  );
  return {
    due: due.length,
    verified: verified.length,
    value: percent(verified.length, due.length),
    unknown: actions.filter((r) => !r.verificationDue).length,
  };
}
