import type { MetricId, MetricUnit } from './data-contract';

export type MetricDefinition = {
  id: MetricId;
  label: string;
  description: string;
  unit: MetricUnit;
  resultOwner: string;
  dataOwner: string;
  actionOwner: string;
};

export const METRIC_REGISTRY: Record<MetricId, MetricDefinition> = {
  GROUP_RESULT_FORECAST: {
    id: 'GROUP_RESULT_FORECAST',
    label: 'Прогноз результата группы',
    description: 'Контрольный синтетический прогноз к плану с полным мостом вкладов компаний и групповых корректировок.',
    unit: 'RUB_MLN',
    resultOwner: 'ГД группы · роль TO_APPROVE',
    dataOwner: 'Финансы / экономика УК · TO_ASSIGN',
    actionOwner: 'Владелец group recovery · TO_ASSIGN',
  },
  GROUP_LIQUIDITY_MIN_13W: {
    id: 'GROUP_LIQUIDITY_MIN_13W',
    label: 'Минимум ликвидности · 13 недель',
    description: 'Минимальный прогнозный денежный остаток на 13-недельном синтетическом горизонте; порог не утверждён.',
    unit: 'RUB_MLN',
    resultOwner: 'ГД группы · роль TO_APPROVE',
    dataOwner: 'Казначейство / финансы · TO_ASSIGN',
    actionOwner: 'Владелец liquidity recovery · TO_ASSIGN',
  },
  AL1_GROUP_CONTRIBUTION: {
    id: 'AL1_GROUP_CONTRIBUTION',
    label: 'Вклад АК «Авиакомпания 1» в группу',
    description: 'Синтетический вклад после атрибутивной элиминации; драйверы полностью сверяют отклонение −42 млн ₽.',
    unit: 'RUB_MLN',
    resultOwner: 'ГД АК «Авиакомпания 1» · ФИО TO_ASSIGN',
    dataOwner: 'Финансы / экономика авиакомпании · TO_ASSIGN',
    actionOwner: 'Владельцы функциональных recovery · TO_ASSIGN',
  },
  AL1_STANDALONE_FORECAST: {
    id: 'AL1_STANDALONE_FORECAST',
    label: 'Standalone-прогноз АК «Авиакомпания 1»',
    description: 'Синтетический результат юридического лица до групповых корректировок и элиминаций.',
    unit: 'RUB_MLN',
    resultOwner: 'ГД АК «Авиакомпания 1» · ФИО TO_ASSIGN',
    dataOwner: 'Финансы / экономика авиакомпании · TO_ASSIGN',
    actionOwner: 'ГД авиакомпании · ФИО TO_ASSIGN',
  },
  AL1_ATTRIBUTED_ELIMINATIONS: {
    id: 'AL1_ATTRIBUTED_ELIMINATIONS',
    label: 'Атрибутивная элиминация АК «Авиакомпания 1»',
    description: 'Отдельная синтетическая корректировка между standalone-результатом и вкладом в группу.',
    unit: 'RUB_MLN',
    resultOwner: 'Финансы / экономика УК · TO_ASSIGN',
    dataOwner: 'Владелец intercompany reconciliation · TO_ASSIGN',
    actionOwner: 'Владелец reconciliation · TO_ASSIGN',
  },
  GROUP_RECOVERY_EXPECTED: {
    id: 'GROUP_RECOVERY_EXPECTED',
    label: 'Ожидаемый эффект recovery',
    description: 'Сценарная оценка трёх демо-действий; это не обещание эффекта и не финансовый факт.',
    unit: 'RUB_MLN',
    resultOwner: 'ГД группы · роль TO_APPROVE',
    dataOwner: 'Владельцы расчёта эффекта · TO_ASSIGN',
    actionOwner: 'Единый владелец group recovery · TO_ASSIGN',
  },
  GROUP_RESIDUAL_GAP: {
    id: 'GROUP_RESIDUAL_GAP',
    label: 'Остаточный разрыв после recovery',
    description: 'Отклонение группы после вычета сценарного ожидаемого эффекта recovery; непокрытый остаток нельзя скрывать.',
    unit: 'RUB_MLN',
    resultOwner: 'ГД группы · роль TO_APPROVE',
    dataOwner: 'Финансы / экономика УК · TO_ASSIGN',
    actionOwner: 'Владелец решения MD-02 · TO_ASSIGN',
  },
  GROUP_EXECUTABLE_CAPACITY_7D: {
    id: 'GROUP_EXECUTABLE_CAPACITY_7D',
    label: 'Исполнимая грузовая мощность · 7 дней',
    description: 'Синтетическая мощность, подтверждённая одновременно флотом, экипажами, ТОиР и наземным обеспечением; разрыв объясняется четырьмя ограничениями.',
    unit: 'TONNES',
    resultOwner: 'ГД группы · роль TO_APPROVE',
    dataOwner: 'Производственный контур группы · TO_ASSIGN',
    actionOwner: 'Владелец capacity recovery · TO_ASSIGN',
  },
  GROUP_CAPACITY_RECOVERY_7D: {
    id: 'GROUP_CAPACITY_RECOVERY_7D',
    label: 'Восстановление мощности · 7 дней',
    description: 'Сумма трёх синтетических действий по восстановлению мощности; это сценарная оценка, а не Operational Release.',
    unit: 'TONNES',
    resultOwner: 'ГД группы · роль TO_APPROVE',
    dataOwner: 'Владельцы recovery · TO_ASSIGN',
    actionOwner: 'Единый владелец capacity recovery · TO_ASSIGN',
  },
  GROUP_CAPACITY_RESIDUAL_GAP_7D: {
    id: 'GROUP_CAPACITY_RESIDUAL_GAP_7D',
    label: 'Остаточный разрыв мощности · 7 дней',
    description: 'Непокрытая часть разрыва после сценарных действий восстановления; остаток нельзя скрывать или считать закрытым без release.',
    unit: 'TONNES',
    resultOwner: 'ГД группы · роль TO_APPROVE',
    dataOwner: 'Производственный контур группы · TO_ASSIGN',
    actionOwner: 'Владелец решения MD-04 · TO_ASSIGN',
  },
  GROUP_FLEET_READY_72H: {
    id: 'GROUP_FLEET_READY_72H',
    label: 'Готовые воздушные суда · 72 часа',
    description: 'Количество синтетических бортов, прошедших контроль технической готовности на горизонте 72 часов.',
    unit: 'COUNT',
    resultOwner: 'ГД группы · роль TO_APPROVE',
    dataOwner: 'Технический / производственный контур · TO_ASSIGN',
    actionOwner: 'Владелец fleet recovery · TO_ASSIGN',
  },
  GROUP_CREW_COVERAGE_7D: {
    id: 'GROUP_CREW_COVERAGE_7D',
    label: 'Покрытие экипажами · 7 дней',
    description: 'Синтетическая доля исполнимой программы, обеспеченная легальными экипажами; агрегируется как взвешенная доля.',
    unit: 'PERCENT',
    resultOwner: 'ГД группы · роль TO_APPROVE',
    dataOwner: 'Лётный / производственный контур · TO_ASSIGN',
    actionOwner: 'Владелец crew recovery · TO_ASSIGN',
  },
  GROUP_INTERCOMPANY_SLA_AT_RISK: {
    id: 'GROUP_INTERCOMPANY_SLA_AT_RISK',
    label: 'Внутригрупповые SLA под риском',
    description: 'Количество синтетических межкомпанейских заказов, которые могут ограничить выпуск на горизонте семи дней.',
    unit: 'COUNT',
    resultOwner: 'ГД группы · роль TO_APPROVE',
    dataOwner: 'Владельцы service orders · TO_ASSIGN',
    actionOwner: 'Владелец intercompany recovery · TO_ASSIGN',
  },
  GROUP_CAPACITY_RESULT_EFFECT: {
    id: 'GROUP_CAPACITY_RESULT_EFFECT',
    label: 'Эффект восстановления мощности на результат',
    description: 'Тот же сценарный эффект +4 млн ₽, который входит в общий recovery результата группы; отдельной версии цифры нет.',
    unit: 'RUB_MLN',
    resultOwner: 'ГД группы · роль TO_APPROVE',
    dataOwner: 'Финансы / экономика УК · TO_ASSIGN',
    actionOwner: 'Владелец capacity recovery · TO_ASSIGN',
  },
  GROUP_REVENUE_TOTAL: {
    id: 'GROUP_REVENUE_TOTAL',
    label: 'Демо-выручка',
    description: 'Расчёт генератора по оплачиваемому весу и yield; не Finance actual и не признанная корпоративная выручка.',
    unit: 'USD',
    resultOwner: 'Руководитель результата · TO_ASSIGN',
    dataOwner: 'Владелец источника · TO_ASSIGN',
    actionOwner: 'Ответственный за действие · TO_ASSIGN',
  },
  GROUP_CONTRIBUTION_TOTAL: {
    id: 'GROUP_CONTRIBUTION_TOTAL',
    label: 'Вклад после прямых затрат',
    description: 'Демо-выручка минус демо-прямые затраты; показатель не является M4, БДР или консолидированным финансовым результатом.',
    unit: 'USD',
    resultOwner: 'Руководитель результата · TO_ASSIGN',
    dataOwner: 'Владелец источника · TO_ASSIGN',
    actionOwner: 'Ответственный за действие · TO_ASSIGN',
  },
  GROUP_LOAD_FACTOR: {
    id: 'GROUP_LOAD_FACTOR',
    label: 'Коммерческая загрузка',
    description: 'Оплачиваемый вес / доступная ёмкость по синтетическому набору.',
    unit: 'PERCENT',
    resultOwner: 'Коммерческий руководитель · TO_ASSIGN',
    dataOwner: 'Владелец источника · TO_ASSIGN',
    actionOwner: 'Ответственный за действие · TO_ASSIGN',
  },
  GROUP_FLIGHTS_TOTAL: {
    id: 'GROUP_FLIGHTS_TOTAL',
    label: 'Выполненные рейсы',
    description: 'Количество строк выполненных рейсов в синтетическом генераторе; не операционный корпоративный факт.',
    unit: 'COUNT',
    resultOwner: 'Производственный руководитель · TO_ASSIGN',
    dataOwner: 'Владелец источника · TO_ASSIGN',
    actionOwner: 'Ответственный за действие · TO_ASSIGN',
  },
};

export const METRIC_IDS = Object.keys(METRIC_REGISTRY) as MetricId[];

export function isMetricId(value: string): value is MetricId {
  return value in METRIC_REGISTRY;
}
