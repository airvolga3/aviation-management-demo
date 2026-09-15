'use client';
import { useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  PackageCheck,
  Plane,
  CircleAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { ownerHref, type OwnerRoute } from '@/lib/owner-model';
import type { AirlineBundle, AirScope } from '@/lib/airline-model';
import { airCostNames } from '@/lib/airline-model';
import {
  buildRegularFlight,
  regularPilot,
  regularStages,
  regularView,
  regularShipmentState,
  regularEvents,
  regularTime,
  regularNextAction,
} from '@/lib/regular-flight-model';
import { MetricHelp } from './metric-help';
const n = (x: number | null | undefined, d = 2) =>
  x == null
    ? '—'
    : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: d })
        .format(x)
        .replace('-', '−');
const date = (x: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(x));
const short = (x: string) => x.replace(/^DEMO-/, '');
const total = (rows: { kg: number }[]) => rows.reduce((s, r) => s + r.kg, 0);
const Help = ({ metric }: { metric: string }) => (
  <MetricHelp catalog="regular" metric={metric} />
);
function GridTable({
  heads,
  rows,
}: {
  heads: ReactNode[];
  rows: ReactNode[][];
}) {
  return (
    <div className="rf-table">
      <table>
        <thead>
          <tr>
            {heads.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function RegularFlightEntry({
  a,
  route,
  scope,
}: {
  a: AirlineBundle;
  route: OwnerRoute;
  scope: AirScope;
}) {
  const f = regularPilot(a);
  if (!f || scope.category === 'CHARTER') return null;
  const fits =
    f.month >= scope.start &&
    f.month <= scope.end &&
    (!scope.fleet || scope.fleet === f.fleet) &&
    (!scope.aircraft || scope.aircraft === f.aircraftId);
  return (
    <section className="rf-entry op-panel">
      <div className="rf-entry-icon">
        <Plane />
      </div>
      <div>
        <h3>Как продаётся регулярный вылет</h3>
        <p>
          Бронирования, тариф, приёмка, погрузка и финансовый результат — в
          одной истории.
        </p>
        <small>
          Детальный пример: {date(f.date)} ·{' '}
          {a.fleets.find((x) => x.id === f.fleet)?.aircraft} · {short(f.id)}
        </small>
      </div>
      {fits ? (
        <a
          className="ops-primary"
          href={ownerHref({
            ...route,
            metric: 'commerce',
            kpi: 'departure',
            id: f.id,
            row: undefined,
            stage: 'd3',
            category: 'REGULAR',
            snapshot: a.snapshotId,
          })}
        >
          Открыть историю вылета <ArrowRight size={18} />
        </a>
      ) : (
        <p className="rf-muted">
          Этот пример вне выбранного периода или борта. Для просмотра выберите
          август и все борта.
        </p>
      )}
    </section>
  );
}
export default function RegularFlightWorkspace({
  a,
  route,
}: {
  a: AirlineBundle;
  route: OwnerRoute;
}) {
  const [panel, setPanel] = useState('');
  const [chartMetric, setChartMetric] = useState<'weight'|'rate'>('weight');
  const f = buildRegularFlight(a, route.id),
    stage = regularStages.findIndex((s) => s.id === (route.stage || 'd3'));
  const back = ownerHref({
    ...route,
    id: undefined,
    row: undefined,
    kpi: undefined,
    stage: undefined,
  });
  const valid =
    f &&
    stage >= 0 &&
    (!route.start || f.leg.month >= route.start) &&
    (!route.end || f.leg.month <= route.end) &&
    (!route.fleet || route.fleet === f.leg.fleet) &&
    (!route.aircraft || route.aircraft === f.leg.aircraftId) &&
    (!route.category || ['ALL', 'REGULAR'].includes(route.category));
  if (!valid)
    return (
      <section className="op-panel">
        <h2>История вылета недоступна</h2>
        <p>
          Нет подходящего регулярного рейса, этапа или среза в выбранном
          контексте. Другая компания и другой период не подставляются.
        </p>
        <a href={back}>Вернуться в коммерцию</a>
      </section>
    );
  const v = regularView(f, stage),
    closed = stage === 7,
    leg = f.leg;
  const href = (change: Partial<OwnerRoute>) =>
    ownerHref({
      ...route,
      metric: 'commerce',
      kpi: 'departure',
      company: a.companyId,
      id: leg.id,
      snapshot: a.snapshotId,
      stage: regularStages[stage].id,
      ...change,
    });
  const shipment = route.row
    ? f.shipments.find((s) => s.id === route.row && s.created <= stage)
    : null;
  const nextAction = shipment ? regularNextAction(shipment,stage) : null;
  const chartUnit = chartMetric==='weight'?'т':'₽/платный кг';
  const points = regularStages
    .slice(0, 5)
    .map((s, i) => ({
      day: s.day,
      booked: i <= stage ? (chartMetric==='weight'?regularView(f, i).bKg / 1000:regularView(f,i).rate) : null,
      plan: chartMetric==='weight'?leg.tonnesPlan * [0.18, 0.36, 0.6, 0.83, 1][i]:leg.revenuePlan*1e6/f.planChargeableKg,
    }));
  const costs = Object.entries(leg.costs);
  const finalWeight = closed ? total(v.flown) / 1000 : null;
  const show = (id: string) => {
    setPanel(panel === id ? '' : id);
  };
  const card = (
    key: string,
    label: string,
    value: string,
    note: string,
    definition: string,
  ) => (
    <article
      className={'rf-kpi ' + (panel === key ? 'selected ' : '') + (key==='op'&&v.op<0?'rf-attention':'')}
      key={key}
    >
      <div>
        <span>{label}</span>
        <Help metric={definition} />
      </div>
      <button onClick={() => show(key)} aria-expanded={panel === key}>
        {value}
        <ChevronRight size={18} />
      </button>
      <small>{note}</small>
    </article>
  );
  const overview = () => (
    <>
      <div className="rf-kpis">
        {card(
          'booked',
          closed ? 'Перевезено' : 'Подтверждено бронями',
          n(closed ? finalWeight : v.bKg / 1000,3) + ' т',
          `${closed ? v.flown.length : v.booked.length} отправок · план ${n(leg.tonnesPlan)} т`,
          closed ? 'load' : 'booked',
        )}
        {card(
          'revenue',
          closed ? 'Выручка рейса' : 'Прогноз выручки',
          n(v.revenue) + ' млн ₽',
          `План ${n(leg.revenuePlan)} · отклонение ${n(v.revenue - leg.revenuePlan)}`,
          closed ? 'revenue' : 'forecast',
        )}
        {card(
          'capacity',
          closed ? 'Не использовано по весу' : 'Свободно по броням',
          n(v.freeKg / 1000,3) + ' т',
          `По объёму отдельно: ${n(v.freeM3, 1)} м³`,
          'capacity',
        )}
        {card(
          'op',
          closed ? 'Операционная прибыль · M4' : 'Прогноз прибыли · M4',
          n(v.op) + ' млн ₽',
          `План ${n(leg.revenuePlan - leg.costPlan)} млн ₽`,
          'op',
        )}
      </div>
      {panel && (
        <section className="op-panel rf-detail" aria-live="polite">
          <div className="rf-section-title">
            <h3>
              {panel === 'capacity'
                ? 'Вес и объём — разные ограничения'
                : panel === 'booked'
                  ? 'Состав объёма рейса'
                  : panel === 'revenue'
                    ? 'От бронирований к выручке'
                    : 'Из чего складывается результат'}
            </h3>
            <button onClick={() => setPanel('')} className="rf-text-button">
              Свернуть
            </button>
          </div>
          {panel === 'capacity' ? (
            <>
              <GridTable
                heads={[
                  'Ресурс',
                  'Ёмкость',
                  closed ? 'Перевезено' : 'Брони',
                  closed ? 'Не использовано' : 'Осталось',
                ]}
                rows={[
                  [
                    <>
                      Физический вес, т <Help metric="capacity" />
                    </>,
                    n(f.capacityKg / 1000),
                    n(v.weight / 1000,3),
                    n(v.freeKg / 1000,3),
                  ],
                  [
                    <>
                      Объём, м³ <Help metric="capacity" />
                    </>,
                    n(f.capacityM3),
                    n(v.volume),
                    n(v.freeM3),
                  ],
                ]}
              />
              <p className="rf-muted">
                ULD, размеры, контур и центровка не подтверждены. Остаток не
                является разрешением на дополнительную загрузку.
              </p>
            </>
          ) : panel === 'booked' ? (
            <GridTable
              heads={['Показатель', 'На выбранный момент']}
              rows={[
                [
                  <>
                    Физический вес <Help metric="load" />
                  </>,
                  n(v.weight / 1000,3) + ' т',
                ],
                [
                  <>
                    Платный вес <Help metric="chargeable" />
                  </>,
                  n(v.chargeable / 1000) + ' т',
                ],
                [
                  <>
                    Средняя ставка <Help metric="rate" />
                  </>,
                  n(v.rate) + ' ₽/платный кг',
                ],
                [
                  'Отправки',
                  <button
                    className="rf-text-button"
                    onClick={() =>
                      document
                        .getElementById('rf-shipments')
                        ?.scrollIntoView({ block: 'start' })
                    }
                  >
                    Раскрыть каждую отправку ↓
                  </button>,
                ],
              ]}
            />
          ) : (
            <>
              <GridTable
                heads={[
                  'Показатель',
                  'План',
                  closed ? 'Факт' : 'Оценка на выбранный момент',
                  'Отклонение',
                ]}
                rows={[
                  [
                    <>
                      Выручка <Help metric={closed ? 'revenue' : 'forecast'} />
                    </>,
                    n(leg.revenuePlan),
                    n(v.revenue),
                    n(v.revenue - leg.revenuePlan),
                  ],
                  [
                    <>
                      Расходы <Help metric="costs" />
                    </>,
                    n(leg.costPlan),
                    n(v.cost),
                    n(v.cost - leg.costPlan),
                  ],
                  [
                    <>
                      Прибыль · M4 <Help metric="op" />
                    </>,
                    n(leg.revenuePlan - leg.costPlan),
                    n(v.op),
                    n(v.op - (leg.revenuePlan - leg.costPlan)),
                  ],
                ]}
              />
              <p className="rf-muted">
                млн ₽.{' '}
                {closed
                  ? 'Итог из существующей строки рейса AG.'
                  : 'Расходы пока по плану; будущий финансовый факт скрыт.'}{' '}
                Сумма активных броней {n(v.bRub / 1e6)} млн ₽ не добавляется к
                выручке.
              </p>
              {closed && (
                <p>
                  Сверка отправок с выручкой рейса: разница{' '}
                  <strong>{n(v.reconciliation)} ₽</strong>.
                </p>
              )}
            </>
          )}
        </section>
      )}
      <div className="rf-columns">
        <section className="op-panel">
          <div className="rf-section-title">
            <div>
              <h3>{chartMetric==='weight'?'Как набиралась загрузка':'Как менялась средняя ставка'}</h3>
              <p>{chartMetric==='weight'?'Подтверждённый физический вес, т':'Сумма броней / платный вес, ₽/кг'}</p>
            </div>
            <Help metric={chartMetric==='weight'?'booked':'rate'} />
          </div>
          <div className="rf-chart-switch" aria-label="Показатель графика"><button aria-pressed={chartMetric==='weight'} onClick={()=>setChartMetric('weight')}>Загрузка</button><button aria-pressed={chartMetric==='rate'} onClick={()=>setChartMetric('rate')}>Средняя ставка</button></div>
          <div className="rf-legend">
            <span>━ Бронирования</span>
            <span>┄ {chartMetric==='weight'?'План набора':'Плановая ставка'}</span>
          </div>
          <div
            className="rf-chart"
            role="img"
            aria-label={'Динамика бронирований до вылета, '+chartUnit}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={points}
                margin={{ top: 12, right: 24, left: 0, bottom: 12 }}
              >
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  type="number"
                  domain={[-28, -1]}
                  ticks={[-28, -14, -7, -3, -1]}
                  tickFormatter={(x) => 'Д' + x}
                  stroke="var(--muted)"
                />
                <YAxis
                  domain={[0,'auto']}
                  stroke="var(--muted)"
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--paper)',
                    borderColor: 'var(--line)',
                    color: 'var(--ink)',
                  }}
                  labelFormatter={(x) => 'За ' + Math.abs(Number(x)) + ' дней'}
                  formatter={(value) => n(Number(value)) + ' '+chartUnit}
                />
                <Line
                  isAnimationActive={false}
                  name={chartMetric==='weight'?'План набора':'Плановая ставка'}
                  dataKey="plan"
                  type="linear"
                  stroke="var(--muted)"
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  isAnimationActive={false}
                  name="Подтверждено"
                  dataKey="booked"
                  type="linear"
                  stroke="var(--blue)"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <details className="rf-data">
            <summary>Точные значения графика</summary>
            <GridTable
              heads={['До вылета', 'План, '+chartUnit, 'Брони, '+chartUnit]}
              rows={points.map((p) => ['Д' + p.day, n(p.plan), n(p.booked)])}
            />
          </details>
        </section>
        <section className="op-panel rf-decision">
          <div className="rf-section-title">
            <h3>
              {closed
                ? 'Что объясняет итог'
                : 'Что требует внимания на этом этапе'}
            </h3>
            <CircleAlert />
          </div>
          {stage < 5 ? (
            <>
              <strong>
                {v.bKg < leg.tonnesPlan * 1000
                  ? 'Нужно закрыть разрыв к плану загрузки'
                  : 'Весовой план набран — проверить доходность'}
              </strong>
              <p>
                Подтверждено {n(v.bKg / 1000,3)} т при плане перевозки{' '}
                {n(leg.tonnesPlan)} т. Сумма броней — {n(v.bRub / 1e6)} млн ₽.
              </p>
              <p>
                Средняя ставка: <b>{n(v.rate)} ₽/платный кг</b>{' '}
                <Help metric="rate" />. Полный вес ещё не гарантирует плановую
                прибыль.
              </p>
              <ol>
                <li>Подтвердить предъявление груза и сроки у агентов.</li>
                <li>
                  Проверить добор по весу, объёму и доходности; не снижать тариф
                  автоматически.
                </li>
                <li>
                  Согласовать с производством загрузимость оставшейся ёмкости.
                </li>
              </ol>
            </>
          ) : stage < 7 ? (
            <>
              <strong>Не весь забронированный груз готов к перевозке</strong>
              <p>
                Брони {n(v.bKg / 1000,3)} т → принято{' '}
                {n(total(v.accepted) / 1000,3)} т → RCS {n(total(v.ready) / 1000,3)}{' '}
                т.
              </p>
              <p>
                Приоритет: проверить непредъявление и документы. После погрузки
                сохраняется риск снятия груза; будущий исход здесь не показан.
              </p>
            </>
          ) : (
            <>
              <strong>
                {n((v.lossKg ?? 0) / 1000,3)} т из подтверждённых броней не
                перевезены
              </strong>
              <p>
                Итоговая загрузка {n((v.weight / f.capacityKg) * 100, 1)}% по
                весу и {n((v.volume / f.capacityM3) * 100, 1)}% по объёму.
              </p>
              <p>
                Изменение прибыли к плану:{' '}
                <b>{n(v.op - (leg.revenuePlan - leg.costPlan))} млн ₽</b> =
                изменение выручки {n(leg.revenue - leg.revenuePlan)} − изменение
                расходов {n(leg.cost - leg.costPlan)}.
              </p>
              <p>
                Это арифметическое объяснение. Причины и ответственность
                разбираются по отправкам, без автоматического назначения
                виновного.
              </p>
            </>
          )}
          <footer>
            Владелец разбора — коммерческий директор. Исполнители и основания —
            в отправках ниже. Рекомендации не отправляют задания и не меняют
            тариф.
          </footer>
        </section>
      </div>
      <section className="op-panel">
        <div className="rf-section-title">
          <h3>От брони до перевозки</h3>
          <Help metric="rcs" />
        </div>
        <div className="rf-flow">
          {[
            ['Подтверждено', v.booked, true, 'booked'],
            ['Принято', v.accepted, stage >= 5, 'rcs'],
            ['Готово · RCS', v.ready, stage >= 5, 'rcs'],
            ['Погружено', v.loaded, stage >= 6, 'rcs'],
            ['Перевезено', v.flown, closed, 'load'],
          ].map(([label, rows, available, help], i) => (
            <div key={String(label)} className={available ? '' : 'pending'}>
              <small>
                0{i + 1} <Help metric={String(help)} />
              </small>
              <span>{String(label)}</span>
              <strong>
                {available
                  ? n(total(rows as { kg: number }[]) / 1000,3) + ' т'
                  : '—'}
              </strong>
              <small>
                {available
                  ? (rows as unknown[]).length + ' отправок'
                  : 'Событие ещё не наступило'}
              </small>
            </div>
          ))}
        </div>
        <p className="rf-muted">
          Один и тот же груз проходит несколько этапов — объёмы этапов не
          суммируются. «Погружено» включает груз, снятый позднее.
        </p>
      </section>
      <section className="op-panel" id="rf-shipments">
        <div className="rf-section-title">
          <h3>Отправки и отклонения</h3>
          <small>
            {v.known.length} записей на {date(regularTime(f, stage))}
          </small>
        </div>
        <GridTable
          heads={[
            'Отправка / клиент',
            'Статус',
            'Физический вес, т',
            <>
              Платный вес, т <Help metric="chargeable" />
            </>,
            <>
              Ставка, ₽/кг <Help metric="rate" />
            </>,
            'Сумма брони, млн ₽',
            closed ? 'Выручка, млн ₽' : 'Роль',
          ]}
          rows={v.known.map((s) => [
            <a href={href({ row: s.id })}>
              <b>{s.id}</b>
              <small>
                {s.client} · {s.channel}
              </small>
            </a>,
            regularShipmentState(s, stage),
            n(s.kg / 1000,3),
            n(s.chargeableKg / 1000),
            n(s.bookedRub / s.chargeableKg),
            n(s.bookedRub / 1e6),
            closed ? n(s.recognisedRub / 1e6) : 'Регулярные продажи',
          ])}
        />
        <p className="rf-muted">
          Отменённая бронь сохранена в истории, но исключена из действующих
          итогов. Нажмите отправку — откроются события, причины, ответственный и
          основания.
        </p>
      </section>
      {closed && (
        <section className="op-panel">
          <div className="rf-section-title">
            <h3>Расходы и сверка с экономикой</h3>
            <Help metric="costs" />
          </div>
          <GridTable
            heads={['Статья', 'План, млн ₽', 'Факт, млн ₽', 'Отклонение']}
            rows={costs.map(([key, c]) => [
              airCostNames[key] || key,
              n(c.plan),
              n(c.value),
              n(c.value - c.plan),
            ])}
          />
          <div className="rf-reconciliation">
            <span>Выручка отправок = строка рейса</span>
            <strong>{n(leg.revenue)} млн ₽</strong>
            <a
              href={ownerHref({
                ...route,
                metric: 'economics',
                kpi: 'revenue',
                id: leg.id,
                row: undefined,
                stage: undefined,
                field: 'actual',
                category: 'REGULAR',
              })}
            >
              Открыть ту же цифру в экономике <ArrowRight size={17} />
            </a>
          </div>
        </section>
      )}
    </>
  );
  return (
    <div className="regular-workspace">
      <nav className="rf-breadcrumb" aria-label="Путь регулярного вылета">
        <a href={back}>{a.name} · Коммерция</a>
        <ChevronRight />
        <a href={href({ row: undefined })}>Регулярный вылет</a>
        {route.row && (
          <>
            <ChevronRight />
            <span>{route.row}</span>
          </>
        )}
      </nav>
      <a
        className="air-back"
        href={route.row ? href({ row: undefined }) : back}
      >
        <ArrowLeft size={17} />
        {route.row ? 'К истории вылета' : 'К коммерческому экрану'}
      </a>
      <header className="rf-heading">
        <div>
          <span>Регулярная программа · {a.name}</span>
          <h1>Коммерческая история вылета</h1>
          <p>
            {date(leg.date)} 2026 ·{' '}
            {a.fleets.find((x) => x.id === leg.fleet)?.aircraft} · борт{' '}
            {short(leg.aircraftId)}
          </p>
          <small>
            Рейс {short(leg.id)} · маршрут в исходном срезе не задан
          </small>
        </div>
        <div className="rf-stage-now">
          <PackageCheck />
          <span>
            Смотрим на момент
            <strong>
              {date(regularTime(f, stage))} ·{' '}
              {regularStages[stage].label.toLowerCase()}
            </strong>
          </span>
        </div>
      </header>
      <nav className="rf-stages" aria-label="Момент коммерческой истории">
        {regularStages.map((s, i) => (
          <a
            key={s.id}
            aria-current={i === stage ? 'step' : undefined}
            href={href({ stage: s.id, row: undefined })}
          >
            <span>{String(i + 1).padStart(2, '0')}</span>
            {s.label}
          </a>
        ))}
      </nav>
      <p className="rf-time-note">
        {closed
          ? 'Рейс закрыт. Финансовый итог связан с общим срезом AG.'
          : 'Позднейшие записи скрыты. История смоделирована с согласованием конечного итога; оценка на этапе не является проверенным прогнозом спроса.'}
      </p>
      {route.row ? (
        shipment ? (
          <section className="op-panel rf-shipment">
            <h3>
              {shipment.id} · {shipment.client}
            </h3>
            <p>
              {shipment.cargo} · {regularShipmentState(shipment, stage)}
            </p>
            <GridTable
              heads={[
                'Физический вес',
                'Объём',
                <>
                  Платный вес <Help metric="chargeable" />
                </>,
                'Договорная сумма',
              ]}
              rows={[
                [
                  n(shipment.kg) + ' кг',
                  n(shipment.volume) + ' м³',
                  n(shipment.chargeableKg) + ' кг',
                  n(shipment.bookedRub) + ' ₽',
                ],
              ]}
            />
            <div className="rf-columns">
              <section>
                <h3>Ответственность и следующее действие</h3>
                <p>
                  <b>
                    {nextAction?.owner}
                  </b>
                </p>
                <p>
                  {nextAction?.action}
                </p>
                <p className="rf-muted">
                  {nextAction?.reason}{' '}
                  Роль не заменяет персональное назначение; реальный журнал
                  поручений не подключён.
                </p>
              </section>
              <section>
                <h3>Основания по отправке</h3>
                {regularEvents(f, shipment)
                  .filter((e) => e.stage <= stage)
                  .map((e) => (
                    <details className="rf-event" key={e.id}>
                      <summary>
                        {e.label}
                        <small>
                          Зафиксировано {date(e.at)} · {e.source}
                        </small>
                      </summary>
                      <p>{e.detail}</p>
                      <dl>
                        <dt>Запись</dt>
                        <dd>{e.id}</dd>
                        <dt>Рейс</dt>
                        <dd>{short(leg.id)}</dd>
                        <dt>Срез</dt>
                        <dd>{f.snapshotId}</dd>
                      </dl>
                      <small>
                        Синтетическая структурированная запись. Скан и
                        корпоративный документ отсутствуют.
                      </small>
                    </details>
                  ))}
              </section>
            </div>
          </section>
        ) : (
          <section className="op-panel">
            <h3>Отправка недоступна на выбранный момент</h3>
            <p>Неизвестный ID, другая компания или бронь ещё не создана.</p>
          </section>
        )
      ) : (
        overview()
      )}
      <details className="op-panel rf-method">
        <summary>Определения, источники и границы модели</summary>
        <p>
          План/итог налёта, груза, выручки, расходов и M4: существующая строка{' '}
          {short(leg.id)} из data/executive.json, срез {f.snapshotId}. Ни одна общая
          сумма не изменена. История построена только для одного регулярного
          рейса каждой из двух компаний.
        </p>
        <p>
          Отправки, клиенты, события, ёмкость по объёму и история бронирований
          синтетические. Выручка распределена по перевезённым отправкам, вес
          согласован с исходным рейсом. Это не извлечённая история продаж.
          Реальные AWB, маршрут, allotment, holds, ULD-план, тарифные политики и
          корпоративная интеграция пока отсутствуют.
        </p>
        <p>
          План набора: 18/36/60/83/100% плана веса на Д−28/14/7/3/1. Прогноз:
          действующие брони × коэффициент сохранности + добор незакрытой части
          плана. На этом этапе сохранность {n(v.survival * 100, 0)}%, добор{' '}
          {n(v.pickup * 100, 0)}%; после приёмки используется готовый груз. До
          закрытия расходы по плану. Это рабочие допущения, не прогнозная
          точность.
        </p>
        <p>
          Будущие события скрыты, но сама история реконструирована под конечные
          вес и выручку. Она не подходит для оценки точности прогнозирования. Итоговая
          выручка — отдельная финансовая строка, не сумма всех исторических
          броней. Признание выручки в ERP, кредитные решения и операционный
          допуск этот экран не выполняет.
        </p>
        <p>
          Метод {f.method}. Общая логика:{' '}
          <a
            href="https://www.iata.org/en/programs/cargo/cargoiq/"
            target="_blank"
            rel="noreferrer"
          >
            Cargo iQ · этапы перевозки
          </a>
          ;{' '}
          <a
            href="https://www.iata.org/en/publications/newsletters/iata-knowledge-hub/air-cargo-tariffs-and-rules-what-you-need-to-know/"
            target="_blank"
            rel="noreferrer"
          >
            IATA · тарифы и платный вес
          </a>
          . Это не сертификация соответствия.
        </p>
      </details>
    </div>
  );
}
