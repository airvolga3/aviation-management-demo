'use client';
import { presentationText } from '@/lib/presentation-copy';
import { CircleHelp } from 'lucide-react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
  PopoverDescription,
} from './ui/popover';
import { econMetrics, econExpenses } from '@/lib/al1-economics-model';
import {
  commercialMetrics,
  type CommercialMetric,
} from '@/lib/al1-commercial-model';
import { opsMetrics, type OpsMetric } from '@/lib/al1-operations-model';
import { financeMetrics } from '@/lib/al1-finance-model';
import { sqMetrics } from '@/lib/al1-safety-model';
import { airMetrics } from '@/lib/airline-metrics';
import { regularDefinitions } from '@/lib/regular-flight-model';
type Catalog =
  | 'regular'
  | 'airline'
  | 'safety'
  | 'finance'
  | 'economics'
  | 'commercial'
  | 'production'
  | 'executive'
  | 'company';
const executive: Record<string, [string, string, string]> = {
  technicalReady: [
    'Исправные воздушные суда',
    'Количество ВС со статусом «Исправен» на дату / весь парк выбранной компании. Исправность не означает готовность конкретного рейса: отдельно проверяются экипаж, ограничения, разрешения и программа.',
    'ВС',
  ],
  technicalUnavailable: [
    'ВС вне эксплуатации',
    'Воздушные суда, которые на дату не имеют статуса «Исправен». Плановое ТО и незапланированный AOG раскрываются отдельно; это остаток на дату, не сумма по дням.',
    'ВС',
  ],
  overdue: [
    'Просроченная дебиторская задолженность',
    'Неоплаченная часть требований к заказчикам, срок оплаты которой истёк на дату среза. Это часть общей ДЗ, не дополнительная к ней сумма и не расход периода.',
    'млн ₽',
  ],
  crewSets: [
    'Экипажные комплекты',
    'Число доступных комплектов относительно потребности программы. Это планирование ресурса, не подтверждение допусков, отдыха, отсутствия пересечений и законности конкретного вылета.',
    'Комплекты',
  ],
  headcount: [
    'Численность персонала',
    'Фактическая численность относительно плановой по подразделениям. Это не FTE, если источник отдельно не определяет эквивалент полной занятости.',
    'Человек',
  ],
  openActions: [
    'Открытые мероприятия',
    'Количество мероприятий, не имеющих статуса «Выполнено» на дату. Просрочка определяется сроком и статусом; количество мероприятий не является оценкой безопасности.',
    'Мероприятия',
  ],
  claims: [
    'Претензии клиентов',
    'Количество зарегистрированных записей претензий в выбранном периметре. Открытые, закрытые и подтверждённые претензии следует различать; количество не равно сумме ущерба.',
    'Претензии',
  ],
  confirmedShare: [
    'Доля подтверждённой будущей выручки',
    'Подтверждённый портфель / вся прогнозная выручка будущей части периода × 100%. Не доля уже признанной выручки и не подтверждение возможности выполнить программу ресурсами.',
    '%',
  ],
  margin: [
    'Операционная маржа',
    'Операционная прибыль / выручка × 100%. Числитель и знаменатель относятся к одному периоду и сценарию. Изменение маржи — в процентных пунктах.',
    '%',
  ],
  da: [
    'Амортизация',
    'Распределение стоимости амортизируемых активов по периодам. Не платёж за покупку актива. В P&L АК1 и денежном мосте используется одна сумма.',
    'млн ₽',
  ],
  cashBridge: [
    'Переход от прибыли к деньгам',
    'Сводная корректировка начислений и денежных движений в расчёте. OCF = OP + амортизация + эта корректировка. Это не отдельный расход P&L.',
    'млн ₽',
  ],
  ocf: [
    'Операционный денежный поток',
    'Денежный результат операционной деятельности. В текущем профиле: OP + амортизация + корректировка перехода от прибыли к деньгам. Не чистая прибыль.',
    'млн ₽',
  ],
  capex: [
    'Капитальные платежи',
    'Денежные выплаты по капитальной программе. Не списываются целиком в операционные расходы периода; амортизация показана отдельно.',
    'млн ₽',
  ],
  fcf: [
    'Свободный денежный поток',
    'В текущем управленческом профиле: операционный денежный поток − капитальные платежи. Это выбранное определение FCF, не универсальная форма отчётности.',
    'млн ₽',
  ],
  cash: [
    'Денежные средства и ликвидность',
    'Общий остаток денег на дату, до оценки ограничений использования. В финансовом разделе АК1 свободные деньги и НСО раскрываются отдельно. Остатки разных недель не суммируются; деньги разных компаний не обязательно свободно переводимы.',
    'млн ₽',
  ],
  capital: [
    'Отдача на капитал · ROIC',
    'Отношение операционной прибыли после модельного налога к принятой базе инвестированного капитала. Определение капитала и налоговый профиль требуют корпоративного утверждения. Для Страховая компания методика не задана.',
    '%',
  ],
  portfolio: [
    'Обеспеченность будущей выручки',
    'Будущая выручка разделена на подтверждённый портфель, взвешенную воронку и непокрытую часть. Портфель не прибавляется второй раз к прогнозу выручки.',
    'млн ₽',
  ],
  operations: [
    'Исполнение и ресурсы',
    'Исполнение программы оценивается вместе с мощностью, техническим состоянием и экипажами. Подробные формулы отдельных KPI находятся в производственном разделе.',
    'По показателю',
  ],
  safety: [
    'Безопасность',
    'Не единый усреднённый балл. Для каждого SPI необходимы вид события, экспозиция, полнота наблюдений и утверждённые пороги. Отсутствие данных не означает отсутствие риска.',
    'По SPI',
  ],
  decisions: [
    'Решения и поручения',
    'Статусы действий, ответственные и сроки. Ожидаемый эффект не включается в базовый прогноз автоматически; выполнение задачи не доказывает получение эффекта.',
    'Задачи',
  ],
};
export function MetricHelp({
  catalog,
  metric,
}: {
  catalog: Catalog;
  metric: string;
}) {
  if (catalog === 'company') {
    const map: Record<string, [Exclude<Catalog, 'company'>, string]> = {
      'Выручка · прогноз': ['executive', 'revenue'],
      'Прибыль · прогноз': ['executive', 'op'],
      'Маржа · прогноз': ['executive', 'margin'],
      'Будущая выручка': ['executive', 'portfolio'],
      Подтверждено: ['executive', 'confirmedShare'],
      'Общий налёт · прогноз': ['production', 'hours'],
      'Факт янв–авг': ['production', 'hours'],
      'Исправно на 31 августа': ['executive', 'technicalReady'],
      'Вне эксплуатации': ['executive', 'technicalUnavailable'],
      'Доступные деньги': ['executive', 'cash'],
      'Деньги на счетах': ['finance', 'balance'],
      'Просроченная ДЗ': ['executive', 'overdue'],
      'Готовые экипажные комплекты': ['executive', 'crewSets'],
      'Численность / план': ['executive', 'headcount'],
      'Открытые мероприятия': ['executive', 'openActions'],
      'Вылет в пределах +15 минут': ['production', 'd15'],
      'Претензии клиентов': ['executive', 'claims'],
    };
    const alias = map[metric];
    if (alias) return <MetricHelp catalog={alias[0]} metric={alias[1]} />;
  }
  let title = metric,
    definition =
      'Определение пока не согласовано. Показатель нельзя интерпретировать как утверждённый.',
    unit = 'По источнику',
    owner = 'Владелец методики не назначен';
  const canonical =
    catalog === 'commercial'
      ? (
          { cost: 'opex', op: 'op', revenue: 'revenue' } as Record<
            string,
            string
          >
        )[metric]
      : catalog === 'executive'
        ? ({ op: 'op', revenue: 'revenue' } as Record<string, string>)[metric]
        : catalog === 'economics'
          ? metric
          : undefined;
  if (canonical && Object.hasOwn(econMetrics, canonical)) {
    const x = econMetrics[canonical];
    title = x.name;
    definition = x.definition;
    unit = 'млн ₽';
    owner =
      econExpenses.find((x) => x.id === canonical)?.owner ||
      'Финансовый директор / финансово-экономическая служба';
  } else if (
    catalog === 'commercial' &&
    Object.hasOwn(commercialMetrics, metric)
  ) {
    const x = commercialMetrics[metric as CommercialMetric];
    [title, , unit, definition] = x;
    owner = 'Коммерческий директор совместно с владельцем исходных данных';
  } else if (catalog === 'production' && Object.hasOwn(opsMetrics, metric)) {
    const x = opsMetrics[metric as OpsMetric];
    title = x.name;
    definition = x.formula;
    unit = x.unit;
    owner = x.owner;
  } else if (catalog === 'safety' && Object.hasOwn(sqMetrics, metric)) {
    const x = sqMetrics[metric];
    title = x.name; definition = x.definition; unit = x.unit; owner = x.owner;
  } else if (catalog === 'regular' && Object.hasOwn(regularDefinitions, metric)) {
    const x = regularDefinitions[metric]; title=x.name; definition=x.definition; unit=x.unit; owner=x.owner;
  } else if (catalog === 'airline' && Object.hasOwn(airMetrics, metric)) {
    const x = airMetrics[metric]; title=x.name; definition=x.definition; unit=x.unit; owner=x.owner;
  } else if (catalog === 'finance' && Object.hasOwn(financeMetrics, metric)) {
    const x = financeMetrics[metric];
    title = x.name; definition = x.definition; unit = x.unit || 'млн ₽'; owner = x.owner;
  } else if (catalog === 'executive' && Object.hasOwn(executive, metric)) {
    [title, definition, unit] = executive[metric];
    owner = 'Финансовый директор; для отраслевых KPI — функциональный директор';
  }
  return (
    <Popover>
      <PopoverTrigger
        className="metric-help-trigger"
        aria-label={`Что означает «${title}»?`}
        title={`Что означает «${title}»?`}
      >
        <CircleHelp size={18} />
      </PopoverTrigger>
      <PopoverContent className="metric-help-content" align="end">
        <PopoverTitle>{title}</PopoverTitle>
        <PopoverDescription>{presentationText(definition)}</PopoverDescription>
        <dl>
          <div>
            <dt>Единица</dt>
            <dd>{unit}</dd>
          </div>
          <div>
            <dt>За методику и данные</dt>
            <dd>{owner}</dd>
          </div>
          <div>
            <dt>Период и отбор</dt>
            <dd>
              Указаны на экране. План, факт и прогноз показаны раздельно;
              сравниваются одинаковые периоды.
            </dd>
          </div>
          <div>
            <dt>Статус</dt>
            <dd>
              Проектная методика · синтетические данные. Корпоративное
              утверждение и подключение источника ещё не выполнены.
            </dd>
          </div>
        </dl>
        <small>
          Единый справочник AG · определение одинаково на всех уровнях.
          Закрыть: Esc или нажать вне справки.
        </small>
      </PopoverContent>
    </Popover>
  );
}
