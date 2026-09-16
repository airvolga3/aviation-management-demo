'use client';
import {MetricHelp} from './metric-help';
import { useState, type ReactNode } from 'react';
import { ChevronRight, ArrowLeft, ShieldAlert } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ExecutiveSnapshot } from '@/lib/executive-model';
import { ownerHref, type OwnerRoute } from '@/lib/owner-model';
import {
  filterOps,
  opsMeasure,
  opsSeries,
  opsAdvice,
  opsMetrics,
  opsGroups,
  type OpsMetric,
  type OpsScope,
  type OpsRow,
} from '@/lib/al1-operations-model';

const fmt = (v: number | null | undefined, d = 1) =>
  v == null
    ? '—'
    : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: d }).format(v);
const months = Array.from(
  { length: 12 },
  (_, i) => `2026-${String(i + 1).padStart(2, '0')}`,
);
const monthLabel = (m: string) =>
  new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(
    new Date(m + '-15T12:00:00Z'),
  );
const fleetName = (id: string) =>
  id === 'AL1-IL76' ? 'Ил-76' : id === 'AL1-AN124' ? 'Ан-124' : id;
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="ops-table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
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
      {!rows.length && <p>Нет записей в выбранном периоде и периметре.</p>}
    </div>
  );
}

export default function Al1OperationsWorkspace({
  data,
  route,
}: {
  data: ExecutiveSnapshot;
  route: OwnerRoute;
}) {
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(0);
  const model = data.operations,
    al1 = data.al1;
  const scope: OpsScope = {
    start: route.start || route.month || '2026-01',
    end: route.end || route.month || '2026-12',
    fleet: route.fleet,
    aircraft: route.aircraft,
    captain: route.captain,
  };
  const k = route.kpi as OpsMetric | undefined;
  const url = (change: Partial<OwnerRoute> = {}) =>
    ownerHref({
      ...route,
      page: 'company',
      company: 'AL1',
      metric: 'production',
      snapshot: data.snapshotId,
      start: scope.start,
      end: scope.end,
      month: undefined,
      ...change,
    });
  const navigate = (change: Partial<OwnerRoute>) => {
    window.location.assign(url(change));
    setPage(0);
    setSearch('');
  };
  const legacy = (s: string, id?: string) =>
    ownerHref({
      page: 'company',
      company: 'AL1',
      metric: s,
      id,
      snapshot: data.snapshotId,
      start: scope.start,
      end: scope.end,
      fleet: scope.fleet,
      aircraft: scope.aircraft,
    });
  if (
    !model ||
    !al1 ||
    model.snapshotId !== data.snapshotId ||
    !months.includes(scope.start) ||
    !months.includes(scope.end) ||
    scope.start > scope.end ||
    (k && !opsMetrics[k]) ||
    (scope.fleet && !model.rows.some((r) => r.fleet === scope.fleet)) ||
    (scope.aircraft &&
      !model.rows.some(
        (r) =>
          r.aircraftId === scope.aircraft &&
          (!scope.fleet || r.fleet === scope.fleet),
      )) ||
    (scope.captain && !model.rows.some((r) => r.captain === scope.captain))
  ) {
    return (
      <section className="op-panel">
        <h2>Выбранный контекст недоступен</h2>
        <p>Период и источник не подменены значениями по умолчанию.</p>
        <a href={legacy('production')}>Сбросить к производству АК1</a>
      </section>
    );
  }
  const rows = filterOps(model, scope),
    flight = route.id ? rows.find((r) => r.flightId === route.id) : undefined;
  if (route.id && !flight)
    return (
      <section className="op-panel">
        <h2>Рейс вне выбранного контекста</h2>
        <a href={url({ id: undefined })}>Вернуться к показателю</a>
      </section>
    );
  const current = k || 'flights',
    def = opsMetrics[current];
  const lastClosed = scope.end < '2026-08' ? scope.end : '2026-08';
  const closedScope = { ...scope, end: lastClosed };
  const plan = opsMeasure(model, scope, current, 'plan'),
    actual = opsMeasure(model, scope, current, 'actual'),
    forecast = opsMeasure(model, scope, current, 'forecast');
  const planClosed =
    scope.start <= '2026-08'
      ? opsMeasure(model, closedScope, current, 'plan')
      : null;
  const closed = rows.filter((r) => r.status !== 'FORECAST'),
    completed = rows.filter((r) => r.status === 'COMPLETED');
  const future = rows.filter((r) => r.status === 'FORECAST'),
    risk = future.filter((r) => r.repairs.length || !r.crewAssigned);
  const advice = opsAdvice(flight ? [flight] : rows, current);
  const measure = (
    metric: OpsMetric,
    view: 'plan' | 'actual' | 'forecast',
    ss = scope,
  ) => opsMeasure(model, ss, metric, view);
  const selectedCaps = model.capacities.filter(
    (c) =>
      c.month >= scope.start &&
      c.month <= scope.end &&
      (!scope.fleet || c.fleet === scope.fleet) &&
      (!scope.aircraft || c.aircraftId === scope.aircraft),
  );
  const tone = (metric: OpsMetric) => {
    const d = opsMetrics[metric],
      a = measure(metric, 'actual'),
      p =
        scope.start <= '2026-08' ? measure(metric, 'plan', closedScope) : null;
    if (
      metric === 'crew' &&
      rows.some((r) => r.status === 'FORECAST' && !r.crewAssigned)
    )
      return 'warning';
    if (a == null || p == null) return 'unknown';
    if (['fdm', 'd15', 'a15'].includes(metric))
      return a < p ? 'warning' : 'neutral';
    if (metric === 'fuelVariance')
      return Math.abs(a) > 3 ? 'warning' : 'neutral';
    if (d.direction === 'up') return a < p * 0.97 ? 'warning' : 'neutral';
    if (d.direction === 'down') return a > p ? 'warning' : 'neutral';
    return 'neutral';
  };
  const title = flight
    ? 'Рейс ' + flight.flightId
    : k
      ? def.name
      : 'Производственная программа';
  const metrics = Object.keys(opsMetrics) as OpsMetric[];
  const card = (metric: OpsMetric) => {
    const d = opsMetrics[metric],
      a = measure(metric, 'actual'),
      f = measure(metric, 'forecast'),
      p = measure(metric, 'plan'),
      pc =
        scope.start <= '2026-08' ? measure(metric, 'plan', closedScope) : null;
    return (
      <div className="metric-help-wrap" key={metric}><a
        className={'ops-metric ' + tone(metric)}
        href={url({ kpi: metric, id: undefined })}
        key={metric}
      >
        <span>
          {d.name}
          <small>{d.en}</small>
        </span>
        <strong>
          {fmt(a)} <small>{d.unit}</small>
        </strong>
        <div>
          <span>
            Факт{' '}
            {scope.start <= '2026-08'
              ? monthLabel(scope.start) + '–' + monthLabel(lastClosed)
              : 'отсутствует'}{' '}
            · план той же части <b>{fmt(pc)}</b>
          </span>
        </div>
        <div>
          <span>
            План всего периода <b>{fmt(p)}</b>
          </span>
          <span>
            Прогноз <b>{fmt(f)}</b>
          </span>
        </div>
        <ChevronRight size={17} />
      </a><MetricHelp catalog="production" metric={metric}/></div>
    );
  };
  const chart = (metric: OpsMetric = current, mini = false) => {
    const points = opsSeries(model, scope, metric),
      chartDef = opsMetrics[metric];
    const Wrapper = mini ? 'div' : 'section';
    return (
      <Wrapper className={mini ? 'ops-mini-trend' : 'op-panel ops-trend'}>
        {mini ? (
          <p>
            {chartDef.name} · {chartDef.unit}
          </p>
        ) : (
          <h3>Динамика · {chartDef.unit}</h3>
        )}
        <div className="al1-legend">
          <span>— План / ориентир</span>
          <span>● Факт</span>
          <span>┄ Прогноз</span>
        </div>
        <div className="ops-chart">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={1}
            initialDimension={{ width: 620, height: 240 }}
          >
            <LineChart
              data={points}
              margin={{ left: 3, right: 18, top: 15, bottom: 5 }}
              onClick={(state) => {
                const m = points[Number(state?.activeTooltipIndex)]?.month;
                if (m)
                  navigate({ start: m, end: m, id: undefined, kpi: metric });
              }}
            >
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis
                dataKey="month"
                tickFormatter={monthLabel}
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                minTickGap={20}
              />
              <YAxis
                width={65}
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                tickFormatter={(x) => fmt(x, chartDef.unit==='%'||chartDef.unit==='/1000'?1:0)}
                domain={metric==='fuelVariance'?['auto','auto']:chartDef.unit==='%'?[0,100]:[0,'auto']}
              />
              <Tooltip
                labelFormatter={(x) => String(x)}
                formatter={(x) => fmt(Number(x)) + ' ' + chartDef.unit}
                contentStyle={{
                  background: 'var(--glass-strong)',
                  color: 'var(--ink)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                }}
              />
              <Line
                dataKey="plan"
                isAnimationActive={false}
                name="План / ориентир"
                stroke="var(--muted)"
                dot={points.length===1?{r:3}:false}
                strokeWidth={1.5}
              />
              <Line
                dataKey="actual"
                isAnimationActive={false}
                name="Факт"
                stroke="var(--blue)"
                dot={{ r: 3 }}
                strokeWidth={2.5}
              />
              <Line
                dataKey="forecast"
                isAnimationActive={false}
                name="Прогноз"
                stroke="var(--blue)"
                strokeDasharray="6 5"
                dot={{ r: 3 }}
                strokeWidth={2.5}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {!mini && (
          <div className="ops-months" aria-label="Выбрать месяц графика">
            {points.map((p) => (
              <a
                key={p.month}
                href={url({ start: p.month, end: p.month, id: undefined })}
              >
                {monthLabel(p.month)}
              </a>
            ))}
          </div>
        )}
      </Wrapper>
    );
  };
  const partition = scope.aircraft
    ? 'flight'
    : scope.fleet
      ? 'aircraft'
      : 'fleet';
  const breakdown = () => {
    const keys =
      partition === 'fleet'
        ? [...new Set(rows.map((r) => r.fleet))]
        : partition === 'aircraft'
          ? [...new Set(rows.map((r) => r.aircraftId))]
          : rows
              .filter(
                (r) =>
                  !search ||
                  (r.flightId + ' ' + r.client + ' ' + r.captain)
                    .toLowerCase()
                    .includes(search.toLowerCase()),
              )
              .map((r) => r.flightId);
    const isFlight = partition === 'flight',
      visible = isFlight ? keys.slice(page * 20, page * 20 + 20) : keys;
    return (
      <section className="op-panel">
        <h3>
          {isFlight && ['capacity', 'ground', 'utilization'].includes(current)
            ? 'Расход ресурса заданиями · ч'
            : (isFlight
                ? 'Рейсы'
                : partition === 'fleet'
                  ? 'Вклад типов ВС'
                  : 'Вклад бортов') +
              ' · ' +
              def.unit}
        </h3>
        <p>
          {['capacity', 'ground', 'utilization'].includes(current) && isFlight
            ? 'Мощность и календарное время принадлежат борту за период, не отдельному рейсу. Ниже — расход ресурса заданиями.'
            : 'Нажмите на строку: тип → борт → рейс. Проценты пересчитываются из сумм числителей и знаменателей.'}
        </p>
        {isFlight && (
          <label className="ops-search">
            Поиск рейса / заказчика
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </label>
        )}
        <Table
          headers={[
            isFlight
              ? 'Рейс · статус'
              : partition === 'fleet'
                ? 'Тип ВС'
                : 'Борт',
            'План периода',
            'План закрытой части',
            'Факт',
            'Прогноз',
          ]}
          rows={visible.map((id) => {
            const rs = rows.filter((r) =>
              partition === 'fleet'
                ? r.fleet === id
                : partition === 'aircraft'
                  ? r.aircraftId === id
                  : r.flightId === id,
            );
            const ss = {
              ...scope,
              ...(partition === 'fleet'
                ? { fleet: id }
                : partition === 'aircraft'
                  ? { aircraft: id }
                  : {}),
            };
            const metric =
              isFlight &&
              ['capacity', 'ground', 'utilization'].includes(current)
                ? 'hours'
                : current;
            const href = url(
              partition === 'fleet'
                ? { fleet: id, aircraft: undefined, id: undefined }
                : partition === 'aircraft'
                  ? { aircraft: id, id: undefined }
                  : { id },
            );
            const val = (view: 'plan' | 'actual' | 'forecast') =>
              opsMeasure(model, ss, metric, view, isFlight ? rs : undefined);
            return [
              <a href={href}>
                {partition === 'fleet' ? fleetName(id) : id}
                {isFlight && (
                  <small>
                    {rs[0].date +
                      ' · ' +
                      (rs[0].status === 'FORECAST'
                        ? 'будущее'
                        : rs[0].status === 'CANCELLED'
                          ? 'отмена'
                          : 'выполнен')}
                  </small>
                )}
              </a>,
              fmt(val('plan')),
              fmt(
                scope.start > '2026-08'
                  ? null
                  : isFlight
                    ? rs[0].status === 'FORECAST'
                      ? null
                      : val('plan')
                    : opsMeasure(
                        model,
                        { ...ss, end: lastClosed },
                        metric,
                        'plan',
                      ),
              ),
              fmt(val('actual')),
              fmt(val('forecast')),
            ];
          })}
        />
        {isFlight && (
          <div className="al1-pagination">
            <button disabled={!page} onClick={() => setPage(page - 1)}>
              Назад
            </button>
            <span>
              {keys.length} записей · страница {page + 1}
            </span>
            <button
              disabled={(page + 1) * 20 >= keys.length}
              onClick={() => setPage(page + 1)}
            >
              Далее
            </button>
          </div>
        )}
      </section>
    );
  };
  const capacityPanel = () => {
    const cap = sum(selectedCaps.map((c) => c.base)),
      tech = sum(selectedCaps.map((c) => c.technical)),
      crew = sum(selectedCaps.map((c) => c.crew)),
      usable = sum(selectedCaps.map((c) => c.executable));
    return (
      <section className="op-panel">
        <h3>От располагаемого ресурса к выполнению · ч</h3>
        <p>
          мощность по месяцам выбранного периода. Это модель ресурса, не
          технический максимум и не расчёт допустимого расписания.
        </p>
        <div className="ops-capacity">
          {[
            ['Располагаемый ресурс', cap],
            ['Технические ограничения', tech],
            ['Кадровый дефицит, без пересечения с ТО', crew],
            ['Обеспеченный ресурс', usable],
            ['План налёта', measure('hours', 'plan')],
            ['Факт налёта', measure('hours', 'actual')],
            ['Базовый прогноз налёта', measure('hours', 'forecast')],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <span>{label}</span>
              <i>
                <b
                  style={{
                    width: `${Math.min(100, (Number(value || 0) / Math.max(cap, 1)) * 100)}%`,
                  }}
                />
              </i>
              <strong>{fmt(Number(value))}</strong>
            </div>
          ))}
        </div>
        <p>
          Факт относится только к закрытым месяцам. Для оценки загрузки факта
          используется обеспеченная мощность тех же месяцев; весь будущий ресурс
          не попадает в знаменатель.
        </p>
        {scope.aircraft && (
          <Table
            headers={[
              'Месяц',
              'Располагаемо',
              'ТО / AOG',
              'Экипажи',
              'Обеспечено',
            ]}
            rows={selectedCaps.map((c) => [
              <a href={url({ start: c.month, end: c.month })}>
                {monthLabel(c.month)}
              </a>,
              fmt(c.base),
              fmt(c.technical),
              fmt(c.crew),
              fmt(c.executable),
            ])}
          />
        )}
      </section>
    );
  };
  const actionPanel = () => (
    <section className="op-panel ops-actions">
      <h3>Отклонения → разбор → действие</h3>
      <p>
        Правила ниже дают предложения для проверки, не команды к выпуску рейса.
        Ответственный за разбор не объявляется виновным. Меры не согласованы и
        не изменяют прогноз автоматически.
      </p>
      {advice.length ? (
        advice.map((a, i) => (
          <details key={a.reason}>
            <summary>
              <span>{a.reason}</span>
              <b>{a.ids.length} рейсов</b>
            </summary>
            <p>
              <b>{a.owner}</b> · ответственный AL1-OPS-A{i + 1}
            </p>
            <p>{a.action}</p>
            <p>
              Срок: до исполнения затронутого будущего задания; для закрытых —
              назначить при разборе. {a.status}
            </p>
            <div className="ops-related">
              {a.ids.slice(0, 10).map((id) => (
                <a key={id} href={url({ id })}>
                  {id}
                </a>
              ))}
            </div>
            {a.ids.length > 10 && (
              <p>
                Первые 10 оснований; все рейсы доступны в раскрытии по борту.
              </p>
            )}
          </details>
        ))
      ) : (
        <p>
          По имеющимся правилам исключения не выделены. Это не подтверждение
          отсутствия риска.
        </p>
      )}
    </section>
  );
  const flightPanel = (r: OpsRow) => (
    <section className="op-panel al1-record">
      <a className="al1-return" href={url({ id: undefined })}>
        <ArrowLeft size={16} />К выбранному показателю
      </a>
      <h3>{r.flightId}</h3>
      <p>
        {r.date} · {fleetName(r.fleet)} · {r.aircraftId} ·{' '}
        {r.status === 'COMPLETED'
          ? 'выполнен'
          : r.status === 'CANCELLED'
            ? 'отменён'
            : 'планируемый'}{' '}
        · {r.positioning ? 'пустой перегон' : 'грузовой участок'}
      </p>
      <Table
        headers={[
          'Параметр',
          'План / основание',
          r.status === 'FORECAST' ? 'Прогноз' : 'Факт',
        ]}
        rows={[
          [
            def.name + ' · ' + def.unit,
            fmt(opsMeasure(model, scope, current, 'plan', [r])),
            fmt(
              opsMeasure(
                model,
                scope,
                current,
                r.status === 'FORECAST' ? 'forecast' : 'actual',
                [r],
              ),
            ),
          ],
          ['Налёт, ч', fmt(r.planHours), fmt(r.actualHours ?? r.forecastHours)],
          ['Block hours', fmt(r.blockPlan), fmt(r.block)],
          ['Груз, т', fmt(r.cargoPlanKg / 1000), fmt(r.cargoKg / 1000)],
          [
            'Забронировано, т',
            'Заявка / месячная программа',
            fmt(r.bookedKg / 1000),
          ],
          [
            'Не представлено груза, т',
            'Не относится к offload',
            r.status === 'CANCELLED' ? 'Не оценено' : fmt(r.absentKg / 1000),
          ],
          [
            'Готово к погрузке, т',
            'После готовности и ограничений',
            r.status === 'CANCELLED' ? 'Не оценено' : fmt(r.readyKg / 1000),
          ],
          ['Занятый объём, м³', fmt(r.volumePlan), fmt(r.volumeUsed)],
          [
            'Полезная ёмкость, т / м³',
            fmt(r.payloadKg / 1000) + ' / ' + fmt(r.volumeM3),
            'Маршрутное допущение, не паспорт ВС',
          ],
          ['OFP / расход, т', fmt(r.ofpKg / 1000, 2), fmt(r.fuelKg / 1000, 2)],
          [
            'Отклонение вылета / прибытия, мин',
            'Исходный план без переписывания',
            fmt(r.delayMinutes) + ' / ' + fmt(r.arrivalDelay),
          ],
          ['Не погружен готовый груз, т', '0', fmt(r.offloadKg / 1000)],
          [
            'Расстояние, км',
            fmt(r.distanceKm),
            'Одна модельная база для CTK и ACTK',
          ],
          ['КВС', 'Обезличенный ID', r.captain],
          [
            'Экипажный комплект',
            'Назначение на задание',
            r.crewAssigned
              ? 'Назначен; допуск / отдых не проверены'
              : 'Не назначен',
          ],
          [
            'Покрытие FDM',
            r.status === 'FORECAST'
              ? 'Будущий рейс'
              : r.status === 'CANCELLED'
                ? 'Не применимо'
                : 'Выполненный рейс',
            r.status === 'COMPLETED'
              ? r.fdmValid
                ? 'Запись пригодна'
                : 'Нет пригодной записи'
              : '—',
          ],
          [
            'SPI-событие',
            'Условная категория профиля',
            r.status !== 'COMPLETED' || !r.fdmValid
              ? 'Не оценено'
              : r.event
                ? 'Есть подтверждённое событие'
                : 'В пригодной записи не выделено',
          ],
          [
            'Выручка / расходы, млн ₽',
            fmt(r.revenuePlan, 2) + ' / ' + fmt(r.costPlan, 2),
            fmt(r.revenue, 2) + ' / ' + fmt(r.cost, 2),
          ],
        ]}
      />
      <div className="ops-flight-evidence">
        <h4>Причины и обязательство</h4>
        <p>
          {r.client} · {r.orderId}
        </p>
        <p>
          {r.delayCause || 'Причина задержки не выделена'}
          {r.offloadCause ? ' · ' + r.offloadCause : ''}
        </p>
        <p>
          {r.deliveryMiss
            ? 'Срок выдачи груза нарушен в расчёте.'
            : r.status === 'FORECAST'
              ? 'Соблюдение срока выдачи ещё не оценено.'
              : 'Нарушение срока выдачи не выделено.'}{' '}
          Перенос согласовывается с клиентом, исходный план сохраняется.
        </p>
        <p>
          Финансы — распределённая экономика программы, не самостоятельная
          прибыль миссии. Перегон может получать распределённую выручку
          оплаченной миссии.
        </p>
        <a href={legacy('commerce', r.orderId)}>
          Программа и её экономика · фиксированный финансовый период →
        </a>
        {r.repairs.map((id) => (
          <a key={id} href={legacy('technical', id)}>
            Ремонт {id} →
          </a>
        ))}
        {r.claims.map((id) => (
          <a key={id} href={legacy('safety', id)}>
            Претензия {id} →
          </a>
        ))}
      </div>
      <details>
        <summary>Какие первичные источники нужны IT</summary>
        <p>
          План / ревизии расписания, движение ВС OOOI, OFP принятой версии и
          fuel log, load sheet / manifest, записи offload, договорные milestone,
          roster и допуски, техжурнал и обезличенный FDM. Сейчас здесь конечная
          запись, корпоративных документов нет.
        </p>
      </details>
    </section>
  );

  return (
    <div className="ops-workspace">
      <div className="ops-heading">
        <div>
          <span className="ops-eyebrow">OPERATIONS · AIRLINE 1</span>
          <h2>{title} {k&&<MetricHelp catalog="production" metric={k}/>}</h2>
        </div>
        <span className="ops-asof">
          Факт закрыт по 31.08.2026
          <br />
          Параметры расчёта
        </span>
      </div>
      <section
        className="ops-controls"
        aria-label="Период и периметр производства"
      >
        <label>
          Период с
          <select
            aria-label="Период с"
            value={scope.start}
            onChange={(e) =>
              navigate({
                start: e.target.value,
                end: scope.end < e.target.value ? e.target.value : scope.end,
                id: undefined,
              })
            }
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)} 2026
              </option>
            ))}
          </select>
        </label>
        <label>
          По
          <select
            aria-label="Период по"
            value={scope.end}
            onChange={(e) =>
              navigate({
                end: e.target.value,
                start:
                  scope.start > e.target.value ? e.target.value : scope.start,
                id: undefined,
              })
            }
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)} 2026
              </option>
            ))}
          </select>
        </label>
        <label>
          Тип ВС
          <select
            aria-label="Тип ВС"
            value={scope.fleet || ''}
            onChange={(e) =>
              navigate({
                fleet: e.target.value || undefined,
                aircraft: undefined,
                captain: undefined,
                id: undefined,
              })
            }
          >
            <option value="">Все типы</option>
            {[...new Set(model.rows.map((r) => r.fleet))].map((f) => (
              <option key={f} value={f}>
                {fleetName(f)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Борт
          <select
            aria-label="Борт"
            value={scope.aircraft || ''}
            onChange={(e) =>
              navigate({ aircraft: e.target.value || undefined, id: undefined })
            }
          >
            <option value="">Все борта</option>
            {[
              ...new Set(
                model.rows
                  .filter((r) => !scope.fleet || r.fleet === scope.fleet)
                  .map((r) => r.aircraftId),
              ),
            ].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <a href={legacy('production')}>Сбросить</a>
      </section>
      <nav className="ops-context" aria-label="Раскрытие производства">
        <a
          href={url({
            kpi: undefined,
            id: undefined,
            fleet: undefined,
            aircraft: undefined,
            captain: undefined,
          })}
        >
          АК1 · все показатели
        </a>
        {k && (
          <>
            <ChevronRight size={14} />
            <a
              href={url({
                id: undefined,
                fleet: undefined,
                aircraft: undefined,
                captain: undefined,
              })}
            >
              {def.name}
            </a>
          </>
        )}
        {scope.fleet && (
          <>
            <ChevronRight size={14} />
            <a href={url({ aircraft: undefined, id: undefined })}>
              {fleetName(scope.fleet)}
            </a>
          </>
        )}
        {scope.aircraft && (
          <>
            <ChevronRight size={14} />
            <a href={url({ id: undefined })}>{scope.aircraft}</a>
          </>
        )}
      </nav>
      <p className="ops-context-note">
        {monthLabel(scope.start)}–{monthLabel(scope.end)} 2026 · {rows.length}{' '}
        плановых записей · {completed.length} выполнено ·{' '}
        {closed.length - completed.length} отменено · {future.length} будущих.
      </p>
      {!k && !flight ? (
        <>
          <div className="ops-guardrail">
            <ShieldAlert size={22} />
            <div>
              <b>Безопасность · справочно АК1 в целом</b>
              <p>
                На дату среза:{' '}
                {
                  al1.issues.filter(
                    (x) => x.critical && x.status !== 'Выполнено',
                  ).length
                }{' '}
                значимое ограничение,{' '}
                {al1.issues.filter((x) => x.status === 'Просрочено').length}{' '}
                просроченная мера на 31 августа. Не общий балл безопасности.
              </p>
              <a href={legacy('safety')}>Ограничения и меры →</a>
            </div>
          </div>
          {risk.length > 0 && (
            <a className="ops-risk" href={url({ kpi: 'capacity' })}>
              {risk.length} уникальных будущих рейсов: пересечение с ремонтом
              или не назначен экипаж · проверить программу →
            </a>
          )}
          <div className="ops-domain-grid">
            {opsGroups.map((g, i) => (
              <section className="op-panel ops-domain" key={g}>
                <h3>
                  <span>0{i + 1}</span>
                  {g}
                </h3>
                {chart(
                  (
                    [
                      'flights',
                      'capacity',
                      'tonnes',
                      'fuel',
                      'crew',
                    ] as OpsMetric[]
                  )[i],
                  true,
                )}
                {metrics.filter((m) => opsMetrics[m].group === i).map(card)}
              </section>
            ))}
          </div>
          <p className="ops-footnote">
            85% D15/A15, 95% FDM и ±3% OFP — сигнальные ориентиры, не
            нормы отрасли или Авиагруппа. Серый цвет не означает «безопасно»;
            отсутствующий прогноз показан прочерком.
          </p>
        </>
      ) : flight ? (
        <>
          {flightPanel(flight)}
          {actionPanel()}
        </>
      ) : (
        <>
          <section className="op-panel ops-definition">
            <div>
              <span>{def.en}</span>
              <h3>
                {def.name} · {def.unit}
              </h3>
              <p>{def.formula}</p>
            </div>
            <aside>
              <b>Владелец результата</b>
              <p>{def.owner}</p>
              <small>
                Роль и назначение проектные. Данные: ЦУП / грузовая служба /
                лётная служба по предмету показателя.
              </small>
            </aside>
          </section>
          <div className="ops-score">
            {[
              ['План / ориентир периода', plan],
              ['План закрытой части', planClosed],
              ['Факт закрытой части', actual],
              ['Прогноз конца периода', forecast],
            ].map(([label, val]) => (
              <button
                key={String(label)}
                type="button"
                onClick={() =>
                  document
                    .getElementById('ops-breakdown')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              >
                <span>{label}</span>
                <strong>
                  {fmt(val as number | null)} <small>{def.unit}</small>
                </strong>
              </button>
            ))}
          </div>
          <p className="ops-footnote">
            {forecast == null
              ? 'Прогноз не рассчитан: для этого показателя нет надёжной модели будущих событий. Отсутствие прогноза не равно нулю.'
              : 'Для будущих месяцев применены параметры к программе; ресурсные исключения показаны отдельно.'}{' '}
            {['d15', 'a15', 'fdm', 'fuelVariance'].includes(current)
              ? 'Сигнальные ориентиры требуют утверждения; это не нормативы.'
              : ''}{' '}
            {completed.length < 30
              ? 'Малая выборка: менее 30 выполненных рейсов; проценты нестабильны.'
              : ''}
          </p>
          {chart()}
          {['capacity', 'utilization', 'ground', 'block'].includes(current) &&
            !scope.captain &&
            capacityPanel()}
          {['fuel', 'fuelVariance'].includes(current) && (
            <section className="op-panel">
              <h3>Разбор по КВС — только обезличенные записи</h3>
              <p>
                Не рейтинг экономичности: условия и миссии не нормализованы.
                Выбор КВС ограничивает все значения и знаменатели этого экрана.
              </p>
              <label className="ops-pilot">
                КВС
                <select
                  aria-label="КВС"
                  value={scope.captain || ''}
                  onChange={(e) =>
                    navigate({
                      captain: e.target.value || undefined,
                      id: undefined,
                    })
                  }
                >
                  <option value="">Все комплекты</option>
                  {[
                    ...new Set(
                      model.rows
                        .filter((r) => !scope.fleet || r.fleet === scope.fleet)
                        .map((r) => r.captain),
                    ),
                  ]
                    .sort()
                    .map((id) => (
                      <option key={id}>{id}</option>
                    ))}
                </select>
              </label>
              <p>
                Источники сравнения: OFP принятой версии и фактический расход
                одной фазы. Не включает рекомендации по уменьшению запасов или
                изменению процедур.
              </p>
            </section>
          )}
          {current === 'commitments' && (
            <section className="op-panel">
              <h3>Претензии по рейсам выбранного периода</h3>
              <p>
                Фильтр применяется к дате связанного рейса, не дате поступления
                претензии. Наличие претензии само по себе не подтверждает
                нарушение и не создаёт расход.
              </p>
              <Table
                headers={[
                  'Претензия',
                  'Рейс / заказчик',
                  'Статус',
                  'Требование, млн ₽',
                ]}
                rows={al1.claims
                  .filter((c) => rows.some((r) => r.flightId === c.flightId))
                  .map((c) => {
                    const r = rows.find((r) => r.flightId === c.flightId)!;
                    return [
                      <a href={legacy('safety', c.id)}>
                        {c.id + ' · ' + c.title}
                      </a>,
                      <a href={url({ id: r.flightId })}>
                        {r.flightId}
                        <small>{r.client}</small>
                      </a>,
                      c.status,
                      fmt(c.amount, 2),
                    ];
                  })}
              />
              <p>
                История согласованных переносов с версиями обещаний пока не
                ведётся. Исходная программа не переписывается; точные нарушения
                договорных milestone требуют договора и журнала изменений.
              </p>
            </section>
          )}
          {current === 'ferry' && (
            <section className="op-panel">
              <h3>Позиционирование в общей программе</h3>
              <p>
                {completed.filter((r) => r.positioning).length} выполненных
                перегонных участков ·{' '}
                {fmt(
                  (100 *
                    sum(
                      completed
                        .filter((r) => r.positioning)
                        .map((r) => r.actualHours || 0),
                    )) /
                    Math.max(sum(completed.map((r) => r.actualHours || 0)), 1),
                )}
                % фактического налёта выбранного периода. Их налёт и расход
                включены в общий итог, не прибавляются повторно.
              </p>
            </section>
          )}
          {current === 'crew' && (
            <section className="op-panel">
              <h3>Лётная служба: ресурс ≠ допуск к исполнению</h3>
              <Table
                headers={[
                  'Тип',
                  'Комплектов на 31.08',
                  'Нужно на 1–14.09',
                  'После подготовки',
                ]}
                rows={al1.crews.map((c) => [
                  c.type,
                  c.available,
                  c.need,
                  c.afterTraining,
                ])}
              />
              <p>
                Этот справочный кадровый срез фиксирован и не зависит от
                выбранного периода. Процент выше считается по назначениям
                каждого задания выбранного периода, не по численности штата.
              </p>
              <a href={legacy('people', 'HR-CREW')}>
                Подготовка двух комплектов Ил-76 и ответственное действие →
              </a>
              <p>
                Истечение индивидуальных допусков, своевременность тренажёрной
                подготовки, FTL/отдых и оценка утомляемости: данных нет,
                готовность не подтверждена. В IT-контракте это обязательные
                отдельные источники.
              </p>
            </section>
          )}
          {['fdm', 'events'].includes(current) && (
            <section className="op-panel">
              <h3>Наблюдение и защита данных</h3>
              <p>
                {completed.length} выполненных рейсов;{' '}
                {completed.filter((r) => r.fdmValid).length} пригодных записей;{' '}
                {completed.filter((r) => r.event).length} подтверждённых событий. Общее число мер безопасности не используется вместо
                числа событий.
              </p>
              <p>
                Нестабилизированные заходы требуют отдельного реестра заходов и
                критериев SOP: сейчас не рассчитываются. Прогноз происшествий не
                экстраполируется. Защищённый FDM в корпоративной версии доступен
                только уполномоченным ролям; право владельца видеть финансы не
                даёт неограниченного доступа к личности экипажа.
              </p>
              <a href={legacy('safety')}>
                Просроченные меры и проверка закрытия →
              </a>
            </section>
          )}
          <div id="ops-breakdown">{breakdown()}</div>
          {actionPanel()}
        </>
      )}
      <details className="op-panel ops-method">
        <summary>Методика, источники и ограничения</summary>
        <p>
          Все записи синтетические и производны от одного реестра АК1. Финансовые
          итоги сохранены. Прогноз событий безопасности, задержек и нарушений
          клиентских сроков не выдумывается. База мощности зафиксирована
          независимо от налёта: 4 ч в сутки для Ил-76 и 3 ч для Ан-124
          до ограничений, не нормативы. План использует плановые сроки ремонта,
          прогноз — ожидаемые сроки и назначения экипажей. Налёт сопоставляется
          с этим ресурсом. Максимум полёта и эксплуатационный допуск не
          рассчитаны.
        </p>
        <p>
          Тоннаж — по участкам; ACTK исключает некоммерческие перегоны. Полезная
          масса и объём — маршрутные допущения, не характеристики
          производителя. Оценка причин не устанавливает виновность. Рекомендации
          основаны на прозрачных правилах и не сохраняют управленческое решение.
        </p>
        <ul>
          <li>
            <a
              href="https://www.iata.org/en/publications/newsletters/iata-knowledge-hub/understanding-air-traffic-metrics/"
              target="_blank"
              rel="noreferrer"
            >
              IATA · CTK, ACTK, CLF
            </a>
          </li>
          <li>
            <a
              href="https://www.eurocontrol.int/publication/all-causes-delays-air-transport-europe-quarter-3-2023"
              target="_blank"
              rel="noreferrer"
            >
              EUROCONTROL · пунктуальность и причины задержек
            </a>
          </li>
          <li>
            <a
              href="https://www.icao.int/safety-management/SMI/SMM/Chapter%204"
              target="_blank"
              rel="noreferrer"
            >
              ICAO · управление показателями безопасности
            </a>
          </li>
          <li>
            <a
              href="https://www.iata.org/en/programs/safety/operational-safety/fatigue-risk/"
              target="_blank"
              rel="noreferrer"
            >
              IATA · управление риском утомляемости
            </a>
          </li>
        </ul>
      </details>
    </div>
  );
}
