'use client';
import { useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Plane,
  TrendingUp,
  Layers,
  Users,
  FileText,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ExecutiveSnapshot } from '@/lib/executive-model';
import {MetricHelp} from './metric-help';
import { ownerHref, type OwnerRoute } from '@/lib/owner-model';
import { opsMeasure, type OpsScope } from '@/lib/al1-operations-model';
import {
  assessDemoCrew,
  cmRound,
  cmSum,
  commercialCostLines,
  commercialMeasure,
  commercialMetrics,
  commercialPortfolio,
  commercialRows,
  demoCrewScenarios,
  demoMission,
  missionBridge,
  type CommercialMetric,
  type CommercialRow,
  type CommercialView,
  type DemoCrewScenario,
} from '@/lib/al1-commercial-model';

const fmt = (v: number | null | undefined, d = 2) =>
  v == null
    ? '—'
    : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: d }).format(v);
const allMonths = Array.from(
  { length: 12 },
  (_, i) => `2026-${String(i + 1).padStart(2, '0')}`,
);
const mon = (m: string) =>
  new Date(m + '-15T12:00:00Z').toLocaleDateString('ru-RU', {
    month: 'short',
    timeZone: 'UTC',
  });
const fleetName = (s: string) =>
  s === 'AL1-IL76' ? 'Ил-76' : s === 'AL1-AN124' ? 'Ан-124' : s;
const sections = [
  ['overview', 'Обзор'],
  ['budget', 'Бюджет и результат'],
  ['pricing', 'Цена и загрузка'],
  ['costs', 'Затраты'],
  ['resource', 'Мощность'],
  ['sales', 'Работа продаж'],
  ['crew', 'Экипажи'],
  ['mission', 'миссия'],
] as const;
function Table({ heads, rows }: { heads: string[]; rows: ReactNode[][] }) {
  return (
    <div className="ops-table-wrap">
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
              {r.map((v, j) => (
                <td key={j}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p>Нет записей для выбранного периода.</p>}
    </div>
  );
}
function Bars({
  rows,
  unit = 'млн ₽',
}: {
  rows: { name: string; value: number }[];
  unit?: string;
}) {
  return (
    <div className="cm-bars">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ left: 12, right: 28, top: 12, bottom: 10 }}
        >
          <CartesianGrid stroke="var(--line)" horizontal={false} />
          <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fill: 'var(--ink)', fontSize: 13 }}
          />
          <Tooltip
            formatter={(v) => [fmt(Number(v)), unit]}
            contentStyle={{
              background: 'var(--panel-solid)',
              border: '1px solid var(--line)',
              borderRadius: 10,
            }}
          />
          <ReferenceLine x={0} stroke="var(--muted)" />
          <Bar dataKey="value" radius={[0, 5, 5, 0]} isAnimationActive={false}>
            {rows.map((r, i) => (
              <Cell
                key={i}
                fill={r.value < 0 ? 'var(--warning)' : 'var(--blue)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Al1CommercialWorkspace({
  data,
  route,
}: {
  data: ExecutiveSnapshot;
  route: OwnerRoute;
}) {
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(0),
    [crewScenario, setCrewScenario] = useState<DemoCrewScenario>('ready'),
    [rechecked, setRechecked] = useState(false),
    [scenarioHours, setScenarioHours] = useState<number | null>(null);
  const c = data.commercial,
    ops = data.operations,
    v = data.al1;
  const start = route.start || '2026-01',
    end = route.end || '2026-12',
    kpi = route.kpi || 'overview';
  const scope: OpsScope = {
    start,
    end,
    fleet: route.fleet,
    aircraft: route.aircraft,
  };
  const link = (key: string, patch: Partial<OwnerRoute> = {}) =>
    ownerHref({
      page: 'company',
      company: 'AL1',
      metric: 'commerce',
      snapshot: data.snapshotId,
      start,
      end,
      fleet: route.fleet,
      aircraft: route.aircraft,
      kpi: key,
      row: key === 'cost' ? route.row : undefined,
      ...patch,
    });
  if (
    !c ||
    !ops ||
    !v ||
    c.snapshotId !== data.snapshotId ||
    ops.snapshotId !== data.snapshotId
  )
    return (
      <section className="op-panel">
        <h2>Коммерческий срез недоступен</h2>
        <p>Другой источник не подставляется.</p>
      </section>
    );
  const knownKpis = new Set([
    ...sections.map((s) => s[0]),
    ...Object.keys(commercialMetrics),
    'portfolio',
  ]);
  const all = commercialRows(c, scope),
    program = route.id ? v.orders.find((o) => o.id === route.id) : undefined,
    flight = route.id ? c.rows.find((r) => r.flightId === route.id) : undefined,
    quote = route.id
      ? c.opportunities.find((q) => q.id === route.id)
      : undefined,
    doc = route.id
      ? demoMission.lines.find((l) => l.id === route.id)
      : undefined;
  const badPeriod =
    !allMonths.includes(start) || !allMonths.includes(end) || start > end;
  const badFleet =
    !!route.fleet && !['AL1-IL76', 'AL1-AN124'].includes(route.fleet);
  const badAircraft =
    !!route.aircraft &&
    !c.rows.some(
      (r) =>
        r.aircraftId === route.aircraft &&
        (!route.fleet || r.fleet === route.fleet),
    );
  const selectedCategory = route.row
    ? commercialCostLines(c.rows[0], 'plan').find((cat) => cat.id === route.row)
    : undefined;
  const badId =
    !!route.id &&
    !(
      ((program || flight) &&
        kpi in commercialMetrics &&
        !['capacity', 'utilization'].includes(kpi)) ||
      (quote && kpi === 'sales') ||
      (doc && kpi === 'mission')
    );
  if (
    badPeriod ||
    badFleet ||
    badAircraft ||
    badId ||
    (!!route.row && (kpi !== 'cost' || !selectedCategory)) ||
    !knownKpis.has(kpi) ||
    (route.snapshot && route.snapshot !== data.snapshotId)
  )
    return (
      <section className="op-panel">
        <h2>Несовместимый контекст</h2>
        <p>
          Период, источник или запись не соответствуют этому коммерческому
          срезу.
        </p>
        <a
          href={ownerHref({
            page: 'company',
            company: 'AL1',
            metric: 'commerce',
          })}
        >
          Открыть актуальный обзор →
        </a>
      </section>
    );
  const rows = all.filter(
    (r) =>
      (!program || r.orderId === program.id) &&
      (!flight || r.flightId === flight.flightId),
  );
  if (
    (program && !rows.length) ||
    (flight && !rows.length) ||
    (quote &&
      (quote.month < start ||
        quote.month > end ||
        (scope.fleet && quote.fleet !== scope.fleet)))
  )
    return (
      <section className="op-panel">
        <h2>Запись вне выбранного периода</h2>
        <a href={link('overview')}>Вернуться к отбору →</a>
      </section>
    );
  const closed = rows.filter((r) => r.status !== 'FORECAST'),
    future = rows.filter((r) => r.status === 'FORECAST');
  const readMetric = (
    input: CommercialRow[],
    s: OpsScope,
    key: CommercialMetric,
    view: CommercialView,
  ): number | null => {
    if (key !== 'cost' || !selectedCategory)
      return commercialMeasure(ops, input, s, key, view);
    const selected =
      view === 'actual' ? input.filter((r) => r.status !== 'FORECAST') : input;
    return selected.length
      ? cmSum(
          selected.map(
            (r) =>
              commercialCostLines(r, view).find(
                (x) => x.id === selectedCategory.id,
              )!.amount,
          ),
        )
      : null;
  };
  const measure = (
    key: CommercialMetric,
    view: CommercialView = 'forecast',
    input = rows,
    s = scope,
  ) => readMetric(input, s, key, view);
  const labelPeriod = mon(start) + '–' + mon(end) + ' 2026';
  const closedMonths = allMonths.filter(
    (m) => m >= start && m <= end && m <= data.asOf.slice(0, 7),
  );
  const factLabel = closedMonths.length
    ? mon(closedMonths[0]) + '–' + mon(closedMonths.at(-1)!)
    : 'будущая часть: факта нет';
  const closedScope = { ...scope, end: closedMonths.at(-1) || start };
  const isMetric = kpi in commercialMetrics;
  const financialLabel = selectedCategory
    ? selectedCategory.name
    : isMetric
      ? commercialMetrics[kpi as CommercialMetric][0]
      : sections.find((s) => s[0] === kpi)?.[1] || 'Будущий портфель';
  const metricInfo = (key: CommercialMetric) => commercialMetrics[key];
  const go = (key: string, patch: Partial<OwnerRoute> = {}) => {
    window.location.hash = link(key, patch);
  };
  const tally = (key: CommercialMetric) => {
    const m = metricInfo(key);
    return (
      <div className="metric-help-wrap metric-help-row" key={key}><a className="cm-metric-row" href={link(key)}>
        <span>
          {m[0]}
          <small>{m[1]}</small>
        </span>
        <strong>
          {fmt(measure(key))}
          <small>{m[2]}</small>
        </strong>
        <ChevronRight size={16} />
      </a><MetricHelp catalog="commercial" metric={key}/></div>
    );
  };
  const chart = (key: CommercialMetric) => {
    const m = metricInfo(key),
      series = allMonths
        .filter((month) => month >= start && month <= end)
        .map((month) => {
          const rs = rows.filter((r) => r.month === month),
            s = { ...scope, start: month, end: month };
          return {
            month,
            plan: readMetric(rs, s, key, 'plan'),
            actual: readMetric(rs, s, key, 'actual'),
            forecast:
              month > data.asOf.slice(0, 7)
                ? readMetric(rs, s, key, 'forecast')
                : null,
          };
        });
    return (
      <>
        <div
          className="cm-chart"
          role="img"
          aria-label={`${m[0]}: план, факт и прогноз по месяцам`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={series}
              margin={{ top: 18, right: 20, bottom: 8, left: 0 }}
              onClick={(state) => {
                const month = String(state?.activeLabel || '');
                if (allMonths.includes(month))
                  go(key, { start: month, end: month, id: route.id });
              }}
            >
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={mon}
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                tickFormatter={(x) => fmt(Number(x), 2)}
              />
              <Tooltip
                labelFormatter={(x) => mon(String(x)) + ' 2026'}
                formatter={(x) => fmt(Number(x)) + ' ' + m[2]}
                contentStyle={{
                  background: 'var(--panel-solid)',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                }}
              />
              <Legend />
              <Line
                name="План"
                dataKey="plan"
                stroke="var(--muted)"
                strokeWidth={2}
                strokeDasharray="3 5"
                dot={series.length === 1}
                isAnimationActive={false}
              />
              <Line
                name="Факт"
                dataKey="actual"
                stroke="var(--blue)"
                strokeWidth={3}
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
              <Line
                name="Прогноз будущих месяцев"
                dataKey="forecast"
                stroke="var(--warning)"
                strokeWidth={3}
                strokeDasharray="7 4"
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="ops-months">
          {series.map((s) => (
            <a
              key={s.month}
              href={link(key, { start: s.month, end: s.month, id: route.id })}
            >
              {mon(s.month)}
            </a>
          ))}
        </div>
      </>
    );
  };
  const hero = (key: CommercialMetric) => {
    const info = metricInfo(key),
      act = measure(key, 'actual'),
      planClosed = commercialMeasure(ops, closed, scope, key, 'plan'),
      forecast = measure(key),
      plan = measure(key, 'plan');
    return (
      <div className="metric-help-wrap"><a className="cm-hero" href={link(key)}>
        <span className="cm-eyebrow">
          {info[1]} <ArrowUpRight size={17} />
        </span>
        <h3>{info[0]}</h3>
        <strong>
          {fmt(act)} <small>{info[2]}</small>
        </strong>
        <p>
          Факт · {factLabel}
          <br />
          План той же части <b>{fmt(planClosed)}</b>
        </p>
        <div className="cm-hero-bottom">
          <span>
            Прогноз периода <b>{fmt(forecast)}</b>
          </span>
          <span>
            План периода <b>{fmt(plan)}</b>
          </span>
        </div>
      </a><MetricHelp catalog="commercial" metric={key}/></div>
    );
  };
  const selectedPortfolio = commercialPortfolio(v, rows);
  const forecastDelta = cmRound(
    (measure('op') || 0) - (measure('op', 'plan') || 0),
  );
  const bridgeRows = [
    {
      name: 'Доходы',
      value: cmRound(
        (measure('revenue') || 0) - (measure('revenue', 'plan') || 0),
      ),
    },
    {
      name: 'Переменные расходы',
      value: cmSum(rows.map((r) => r.variablePlan - r.variable)),
    },
    {
      name: 'Постоянные расходы',
      value: cmSum(rows.map((r) => r.fixedPlan - r.fixed)),
    },
  ];
  const resultTable = () => (
    <Table
      heads={[
        'Показатель',
        'План периода',
        'План закрытой части',
        'Факт закрытой части',
        'Прогноз периода',
      ]}
      rows={(
        [
          'revenue',
          'contribution',
          'cost',
          'op',
          'margin',
        ] as CommercialMetric[]
      ).map((k) => [
        <span className="metric-title"><a href={link(k)}>
          {metricInfo(k)[0]}
          <small>{metricInfo(k)[2]}</small>
        </a><MetricHelp catalog="commercial" metric={k}/></span>,
        fmt(measure(k, 'plan')),
        fmt(commercialMeasure(ops, closed, scope, k, 'plan')),
        fmt(measure(k, 'actual')),
        fmt(measure(k)),
      ])}
    />
  );
  const flightTable = (input = rows, key: CommercialMetric = 'revenue') => {
    const filtered = input.filter((r) =>
        (r.flightId + ' ' + r.aircraftId + ' ' + r.date)
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
      shown = filtered.slice(page * 20, page * 20 + 20);
    return (
      <>
        <label className="cm-search">
          Поиск рейса или борта
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Номер, борт или дата"
          />
        </label>
        <Table
          heads={[
            'Рейс / борт',
            `План · ${metricInfo(key)[2]}`,
            `Факт / прогноз · ${metricInfo(key)[2]}`,
            'Статус',
          ]}
          rows={shown.map((r) => [
            <a href={link(key, { id: r.flightId })}>
              {r.flightId}
              <small>
                {r.date} · {r.aircraftId}
              </small>
            </a>,
            fmt(readMetric([r], scope, key, 'plan')),
            fmt(
              readMetric(
                [r],
                scope,
                key,
                r.status === 'FORECAST' ? 'forecast' : 'actual',
              ),
            ),
            r.status === 'FORECAST'
              ? 'Прогноз'
              : r.status === 'CANCELLED'
                ? 'Отменён'
                : 'Выполнен',
          ])}
        />
        <div className="cm-paging">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Назад
          </button>
          <span>
            {Math.min(page * 20 + 1, filtered.length)}–
            {Math.min((page + 1) * 20, filtered.length)} из {filtered.length}
          </span>
          <button
            disabled={(page + 1) * 20 >= filtered.length}
            onClick={() => setPage((p) => p + 1)}
          >
            Далее
          </button>
        </div>
      </>
    );
  };
  const scopeControls = (
    <div className="ops-controls">
      <label>
        Период с
        <select
          aria-label="Коммерция: период с"
          value={start}
          onChange={(e) =>
            go(kpi, {
              start: e.target.value,
              end: e.target.value > end ? e.target.value : end,
            })
          }
        >
          {allMonths.map((m) => (
            <option key={m} value={m}>
              {mon(m)} 2026
            </option>
          ))}
        </select>
      </label>
      <label>
        По
        <select
          aria-label="Коммерция: период по"
          value={end}
          onChange={(e) =>
            go(kpi, {
              end: e.target.value,
              start: e.target.value < start ? e.target.value : start,
            })
          }
        >
          {allMonths.map((m) => (
            <option key={m} value={m}>
              {mon(m)} 2026
            </option>
          ))}
        </select>
      </label>
      <label>
        Тип ВС
        <select
          aria-label="Коммерция: тип ВС"
          value={route.fleet || ''}
          onChange={(e) =>
            go(kpi, { fleet: e.target.value || undefined, aircraft: undefined })
          }
        >
          <option value="">Все типы</option>
          <option value="AL1-IL76">Ил-76</option>
          <option value="AL1-AN124">Ан-124</option>
        </select>
      </label>
      {route.aircraft && (
        <a href={link(kpi, { aircraft: undefined })}>
          Снять отбор борта: {route.aircraft} ×
        </a>
      )}
      <span>
        {labelPeriod}
        <small>Срез 31 августа</small>
      </span>
    </div>
  );
  const groupMetrics = (
    title: string,
    keys: CommercialMetric[],
    icon: ReactNode,
  ) => (
    <section className="op-panel cm-panel">
      <h3>
        {icon}
        {title}
      </h3>
      {keys.map(tally)}
    </section>
  );
  const portfolio = () => (
    <>
      <section className="op-panel cm-panel">
        <h2>Будущий портфель</h2>
        <p>
          Только будущие месяцы выбранного периода. Подтверждение — часть программы, не реальный договор.
        </p>
        {route.aircraft ? (
          <p className="cm-warning">
            Портфель имеет зерно месяц × тип ВС. Снимите отбор борта:
            распределять договорное покрытие по бортам без основания нельзя.
          </p>
        ) : !future.length ? (
          <p>В выбранном периоде нет будущих месяцев.</p>
        ) : (
          <>
            <div className="cm-inline-values">
              <div>
                <span>План будущих месяцев</span>
                <strong>
                  {fmt(selectedPortfolio.plan)} <small>млн ₽</small>
                </strong>
              </div>
              <div>
                <span>Прогноз будущих месяцев</span>
                <strong>
                  {fmt(selectedPortfolio.forecast)} <small>млн ₽</small>
                </strong>
              </div>
              <div>
                <span>Подтверждено / план</span>
                <strong>
                  {fmt(
                    selectedPortfolio.plan
                      ? (selectedPortfolio.confirmed / selectedPortfolio.plan) *
                          100
                      : null,
                  )}
                  %
                </strong>
              </div>
            </div>
            <Bars
              rows={[
                { name: 'Подтверждено', value: selectedPortfolio.confirmed },
                {
                  name: 'Взвешенная воронка',
                  value: selectedPortfolio.pipeline,
                },
                { name: 'Разрыв до прогноза', value: selectedPortfolio.gap },
              ]}
            />
            <p className="cm-warning">
              Полная ресурсная проверка подтверждённых{' '}
              {fmt(selectedPortfolio.confirmed)} млн ₽ не выполнена.
              «Подтверждено коммерчески» не означает «обеспечено экипажами и
              ресурсами».
            </p>
            <Table
              heads={[
                'Программа',
                'План',
                'Прогноз',
                'Подтверждено',
                'Воронка × вероятность',
                'Разрыв',
              ]}
              rows={selectedPortfolio.orders.map((o) => [
                <a
                  href={link('revenue', {
                    id: o.id,
                    start: o.month,
                    end: o.month,
                  })}
                >
                  {mon(o.month)} · {fleetName(o.fleet)}
                </a>,
                fmt(
                  cmSum(
                    c.rows
                      .filter((r) => r.orderId === o.id)
                      .map((r) => r.revenuePlan),
                  ),
                ),
                fmt(o.revenue),
                fmt(o.confirmed),
                fmt(o.pipeline),
                fmt(o.gap),
              ])}
            />
          </>
        )}
      </section>
    </>
  );

  function mission() {
    const a = missionBridge('actual'),
      p = missionBridge('plan');
    return (
      <>
        <section className="cm-case-banner">
          <span>ОТДЕЛЬНЫЙ УЧЕБНЫЙ КЕЙС · 15 АВГУСТА 2026</span>
          <h2>{demoMission.title}</h2>
          <p>
            Условные аэропорты A/B. Суммы и часы этого примера не включены в
            финансовую программу АК1. Здесь можно пройти от полной миссии до
            расчётной записи, не принимая распределённую прибыль рейса за
            договорную.
          </p>
        </section>
        {doc ? (
          <section className="op-panel cm-panel">
            <a href={link('mission')}>
              <ArrowLeft size={15} /> К миссии
            </a>
            <h2>{doc.label}</h2>
            <p>
              {doc.evidence} · {doc.id}
            </p>
            <div className="cm-inline-values">
              <div>
                <span>План</span>
                <strong>{fmt(doc.plan)} млн ₽</strong>
              </div>
              <div>
                <span>Факт</span>
                <strong>{fmt(doc.actual)} млн ₽</strong>
              </div>
              <div>
                <span>Количество × ставка</span>
                <strong>
                  {fmt(doc.quantity, 3)} × {fmt(doc.rate, 4)}
                </strong>
                <small>
                  {doc.unit} × млн ₽/{doc.unit}
                </small>
              </div>
            </div>
            <p>
              Причина в расчёте: {doc.reason}. Владелец: {doc.owner}.
            </p>
            <p>
              Это структурированная запись, не скан и не корпоративный
              документ. Первоисточник отсутствует.
            </p>
          </section>
        ) : (
          <>
            <div className="cm-mission-track">
              {demoMission.legs.map((l, i) => (
                <div key={l.id}>
                  <span>
                    0{i + 1} · {l.kind}
                  </span>
                  <strong>
                    {l.from} <Plane size={22} /> {l.to}
                  </strong>
                  <p>
                    {l.start.slice(11, 16)}–{l.end.slice(11, 16)} UTC · 3 ч ·{' '}
                    {l.tonnes} т
                  </p>
                  <small>{l.id}</small>
                </div>
              ))}
            </div>
            <div className="cm-two">
              <section className="op-panel cm-panel">
                <h3>Вся миссия, а не только грузовой участок</h3>
                <div className="cm-inline-values">
                  <div>
                    <span>Выручка</span>
                    <strong>20 млн ₽</strong>
                  </div>
                  <div>
                    <span>Все часы / пустые</span>
                    <strong>6 / 3 ч</strong>
                  </div>
                  <div>
                    <span>Вклад M2 по профилю кейса</span>
                    <strong>{fmt(a.m2)} млн ₽</strong>
                  </div>
                </div>
                <p>
                  При выборе заказа: дополнительный вклад. При оценке бизнеса:
                  полная экономика с распределёнными расходами. Это разные
                  задачи.
                </p>
              </section>
              <section className="op-panel cm-panel">
                <h3>Почему PBT ниже плана на {fmt(p.pbt - a.pbt)} млн ₽</h3>
                <Bars
                  rows={[
                    { name: 'Согласованная скидка', value: -2 },
                    { name: 'Ставка топлива', value: -1 },
                  ]}
                />
                <p>
                  Кейс: снижение цены −2, увеличение прямых затрат −1. Остальные
                  статьи неизменны.
                </p>
              </section>
            </div>
            <section className="op-panel cm-panel">
              <h3>Финансовая лестница · млн ₽</h3>
              <Table
                heads={['Уровень результата', 'План', 'Факт', 'Расчёт']}
                rows={[
                  [
                    'Revenue',
                    fmt(p.revenue),
                    fmt(a.revenue),
                    'Доходы по миссии',
                  ],
                  ['M1', fmt(p.m1), fmt(a.m1), 'Revenue − прямые операционные'],
                  ['M2', fmt(p.m2), fmt(a.m2), 'M1 − переменный ACMI'],
                  ['M3', fmt(p.m3), fmt(a.m3), 'M2 − постоянный ACMI'],
                  [
                    'Операционная прибыль · M4',
                    fmt(p.op),
                    fmt(a.op),
                    'M3 − общие расходы − амортизация',
                  ],
                  [
                    'Profit before tax',
                    fmt(p.pbt),
                    fmt(a.pbt),
                    'OP − проценты',
                  ],
                ]}
              />
              <p>
                Только профиль этой миссии: амортизация и проценты не включены в
                ACMI; амортизация вычитается до M4 один раз. Не универсальная корпоративная классификация. Операционная прибыль · M4 = 2,5; PBT = 2,2 млн ₽.
              </p>
            </section>
            <section className="op-panel cm-panel">
              <h3>Расчётные основания · нажмите на статью</h3>
              <Table
                heads={[
                  'Основание',
                  'План, млн ₽',
                  'Факт, млн ₽',
                  'Ответственный',
                ]}
                rows={demoMission.lines.map((l) => [
                  <a href={link('mission', { id: l.id })}>
                    {l.label}
                    <small>{l.id}</small>
                  </a>,
                  fmt(l.plan),
                  fmt(l.actual),
                  l.owner,
                ])}
              />
            </section>
            <a className="cm-case-link" href={link('crew')}>
              <Users size={23} />
              <span>
                <b>Проверить экипаж для этой миссии</b>
                <small>
                  Назначение, допуски, отдых, доставка и зависимость от переноса
                </small>
              </span>
              <ChevronRight />
            </a>
          </>
        )}
      </>
    );
  }
  function crew() {
    const a = assessDemoCrew(crewScenario, rechecked),
      assigned = future.filter((r) => r.crewAssigned).length;
    return (
      <>
        <section className="op-panel cm-panel">
          <h2>Обеспеченность будущей программы</h2>
          <div className="cm-inline-values">
            <div>
              <span>Предстоящие рейсы в отборе</span>
              <strong>{future.length}</strong>
            </div>
            <div>
              <span>Назначение имеется</span>
              <strong>
                {assigned} / {future.length}
              </strong>
            </div>
            <div>
              <span>Полная проверка</span>
              <strong className="cm-unknown">Не выполнена</strong>
            </div>
          </div>
          <p>
            Исторические выполненные рейсы не улучшают этот показатель.
            Назначение не проверяет допуски, отдых и совместимость ростера. Для
            всех {future.length} выбранных будущих рейсов полная пригодность не
            оценена.
          </p>
          {future.some((r) => !r.crewAssigned) && (
            <a
              className="cm-warning"
              href={link('revenue', {
                start: start < '2026-09' ? '2026-09' : start,
              })}
            >
              {future.length - assigned} рейсов без назначения. Открыть будущую
              программу →
            </a>
          )}
        </section>
        <section className="cm-case-banner">
          <span>ТРЕНАЖЁР ПРОВЕРКИ · НЕ РАЗРЕШЕНИЕ НА ВЫЛЕТ</span>
          <h2>Назначен. А выполнить миссию сможет?</h2>
          <p>
            Та же отдельная миссия 15 августа. Четыре условные роли; состав и
            числовые ограничения придуманы для теста, не являются нормами Ил-76
            или какой-либо юрисдикции.
          </p>
        </section>
        <div
          className="cm-scenarios"
          role="group"
          aria-label="Сценарий экипажа"
        >
          {(Object.keys(demoCrewScenarios) as DemoCrewScenario[]).map((s) => (
            <button
              key={s}
              aria-pressed={s === crewScenario}
              className={s === crewScenario ? 'active' : ''}
              onClick={() => {
                setCrewScenario(s);
                setRechecked(false);
              }}
            >
              {demoCrewScenarios[s]}
            </button>
          ))}
        </div>
        <section
          className={`op-panel cm-panel cm-assessment ${a.usable ? 'cm-ready' : 'cm-alert'}`}
        >
          {a.usable ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
          <div>
            <h3>
              {a.freshness === 'STALE'
                ? 'Проверка устарела'
                : a.result === 'PASS'
                  ? 'Проверки пройдены'
                  : a.result === 'FAIL'
                    ? 'Есть блокирующее условие'
                    : 'Недостаточно данных'}
            </h3>
            <p>
              {a.usable
                ? 'Только условия DEMO-CREW-0.1. Корпоративная пригодность не оценена.'
                : a.freshness === 'STALE'
                  ? 'Второй участок перенесён; прежнее подтверждение не действует. Новый расчёт ниже уже обнаруживает 13 часов работы.'
                  : a.result === 'FAIL'
                    ? 'Одного обязательного отказа достаточно для ограничения всей миссии. Назначенные фамилии это не исправляют.'
                    : 'Неизвестная история не считается нулевой нагрузкой или выполненной проверкой.'}
            </p>
            <small>
              Версия программы {a.programVersion} · расчёт ниже для{' '}
              {a.evaluatedVersion} · {a.freshness} / {a.result}
            </small>
            {a.freshness === 'STALE' && (
              <button onClick={() => setRechecked(true)}>
                Повторить проверку
              </button>
            )}
          </div>
        </section>
        <section className="op-panel cm-panel">
          <h3>Исходные условия и результаты</h3>
          <p>
            {a.legs
              .map(
                (l) =>
                  `${l.id}: ${l.start.slice(11, 16)}–${l.end.slice(11, 16)} UTC`,
              )
              .join(' · ')}
            . По 1 ч на подготовку и завершение — условия кейса.
          </p>
          {a.previousAssessment && (
            <p>
              Прежняя оценка {a.previousAssessment.version}: PASS, завершение в
              17:00.{' '}
              {a.freshness === 'STALE'
                ? 'Она не действует для перенесённой программы.'
                : 'Сохранена как история; текущий пересчёт не снял ограничение.'}
            </p>
          )}
          <p>
            Явка {a.report.slice(11, 16)}, завершение {a.finish.slice(11, 16)}{' '}
            UTC. Тест: отдых ≥12 ч, работа ≤11 ч, работа за 7 дней ≤50 ч,
            доставка минимум за 1 ч до явки. Реальные допуски, медицинские и все
            нормативные ограничения не проверяются.
          </p>
          <Table
            heads={[
              'Участник / роль',
              'Назначен',
              'Предыдущая работа закончена',
              'Допуск до',
            ]}
            rows={a.people.map((p) => [
              <>
                {p.id}
                <small>{p.role}</small>
              </>,
              'Да',
              p.previousEnd === null
                ? 'Неизвестно'
                : new Date(p.previousEnd)
                    .toISOString()
                    .replace('T', ' ')
                    .slice(0, 16),
              new Date(p.validTo).toISOString().replace('T', ' ').slice(0, 16),
            ])}
          />
          <details className="cm-check-details">
            <summary>Датированная история работы и доставки</summary>
            <Table
              heads={['Участник', 'Событие', 'Начало UTC', 'Окончание UTC']}
              rows={a.people.flatMap((p) =>
                p.history
                  ? p.history.map((h) => [
                      p.id,
                      h.kind,
                      new Date(h.start)
                        .toISOString()
                        .replace('T', ' ')
                        .slice(0, 16),
                      new Date(h.end)
                        .toISOString()
                        .replace('T', ' ')
                        .slice(0, 16),
                    ])
                  : [[p.id, 'История отсутствует', '—', '—']],
              )}
            />
          </details>
          <details className="cm-check-details" open={a.result !== 'PASS'}>
            <summary>Все {a.checks.length} проверок и основания</summary>
            <Table
              heads={[
                'Участник / проверка',
                'Наблюдение',
                'Условие',
                'Результат',
              ]}
              rows={a.checks.map((ch) => [
                <>
                  {ch.person}
                  <small>
                    {ch.label} · {ch.source}
                  </small>
                </>,
                ch.observed,
                ch.required,
                <span
                  className={
                    ch.state === 'FAIL'
                      ? 'cm-bad'
                      : ch.state === 'UNKNOWN'
                        ? 'cm-unknown'
                        : ''
                  }
                >
                  {ch.state === 'PASS'
                    ? 'Пройдено'
                    : ch.state === 'FAIL'
                      ? 'Ограничение'
                      : 'Нет данных'}
                </span>,
              ])}
            />
          </details>
        </section>
        <a className="cm-case-link" href={link('mission')}>
          <FileText />
          <span>Вернуться к экономике полной миссии</span>
          <ChevronRight />
        </a>
      </>
    );
  }

  return (
    <div className="cm-workspace">
      <header className="cm-heading">
        <div>
          <span className="cm-eyebrow">AIRLINE 1 · COMMERCIAL</span>
          <h2>Коммерческий результат</h2>
        </div>
        <span className="cm-source-tag">
          Данные на дату среза
          <br />
          <small>31.08.2026</small>
        </span>
      </header>
      <nav className="cm-tabs" aria-label="Коммерческие показатели">
        {sections.map(([key, label]) => (
          <a
            key={key}
            href={link(key)}
            className={kpi === key ? 'active' : ''}
          >
            {label}
          </a>
        ))}
      </nav>
      {kpi !== 'mission' && scopeControls}
      {(program || flight || isMetric) && (
        <nav className="cm-breadcrumb">
          <a href={link('overview')}>Коммерция</a>
          <ChevronRight size={14} />
          <a href={link(kpi)}>{financialLabel}</a>
          {program && (
            <span>
              → {mon(program.month)} · {fleetName(program.fleet)}
            </span>
          )}
          {flight && <span>→ {flight.flightId}</span>}
        </nav>
      )}
      {kpi === 'overview' && (
        <>
          <div className="cm-hero-grid">
            {hero('revenue')}
            {hero('contribution')}
            <a
              className="cm-hero cm-portfolio-hero"
              href={link('portfolio')}
            >
              <span className="cm-eyebrow">
                FORWARD COVERAGE <ArrowUpRight size={17} />
              </span>
              <h3>Будущий портфель</h3>
              <strong>
                {fmt(
                  route.aircraft || !future.length
                    ? null
                    : selectedPortfolio.plan
                      ? (selectedPortfolio.confirmed / selectedPortfolio.plan) *
                        100
                      : null,
                )}
                <small>% плана</small>
              </strong>
              <p>
                {route.aircraft
                  ? 'Нужен уровень компании или типа'
                  : future.length
                    ? `${fmt(selectedPortfolio.confirmed)} млн ₽ подтверждено коммерчески`
                    : 'В отборе нет будущих месяцев'}
              </p>
              <div className="cm-hero-bottom">
                <span>
                  Ресурсное подтверждение <b>Не проверено</b>
                </span>
              </div>
            </a>
          </div>
          <div className="cm-two">
            <section className="op-panel cm-panel">
              <h3>
                Как складывается выручка <small>млн ₽</small>
              </h3>
              {chart('revenue')}
            </section>
            <section className="op-panel cm-panel">
              <h3>
                Отклонение OP от плана <b>{fmt(forecastDelta)} млн ₽</b>
              </h3>
              <Bars rows={bridgeRows} />
              <p>
                Финансовое разложение, не автоматическое установление причин.
              </p>
              <a href={link('budget')}>Раскрыть бюджет и результат →</a>
            </section>
          </div>
          <div className="cm-explore-grid">
            {[
              [
                'pricing',
                'Цена и загрузка',
                'Доходность, вес и объём',
                TrendingUp,
              ],
              [
                'costs',
                'Стоимость перевозки',
                'Статьи и удельные затраты',
                Layers,
              ],
              [
                'resource',
                'Ресурс и перегоны',
                'Использование и сценарий стоимости часа',
                Plane,
              ],
              [
                'sales',
                'Эффективность продаж',
                'Конверсия, скорость КП и портфель',
                Users,
              ],
            ].map(([key, title, sub, Icon]) => {
              const I = Icon as typeof Plane;
              return (
                <a
                  key={String(key)}
                    href={link(String(key))}
                >
                  <I size={24} />
                  <strong>{String(title)}</strong>
                  <small>{String(sub)}</small>
                  <ChevronRight size={17} />
                </a>
              );
            })}
          </div>
          <a className="cm-case-link" href={link('mission')}>
            <FileText size={24} />
            <span>
              <b>Пройти одну миссию целиком</b>
              <small>
                Подача → грузовой участок → M1–M3 → операционная прибыль · M4 → PBT → расчётная запись
              </small>
            </span>
            <ChevronRight />
          </a>
          <section className="op-panel cm-panel">
            <h3>Что требует внимания</h3>
            <div className="cm-decisions">
              <a href={link('portfolio')}>
                <strong>Будущий доход ещё не равен исполнимому портфелю</strong>
                <span>
                  Проверить обязательства и ресурсное покрытие · коммерческий
                  директор + производство
                </span>
              </a>
              <a href={link('crew')}>
                <strong>Назначение экипажа не подтверждает готовность</strong>
                <span>
                  Допуски, отдых и доставка · руководитель лётной эксплуатации
                </span>
              </a>
              <a href={link('budget')}>
                <strong>Отделить вклад продаж от полного результата</strong>
                <span>
                  Классификация расходов и M2/M4 · финансовый директор
                </span>
              </a>
            </div>
          </section>
        </>
      )}
      {kpi === 'portfolio' && portfolio()}
      {kpi === 'budget' && (
        <>
          <section className="op-panel cm-panel">
            <h2>Бюджет, факт и прогноз</h2>
            <p>
              Один финансовый источник с экономикой АК1 и экраном Авиагруппа. Денежные
              суммы — млн ₽; маржа — проценты.
            </p>
            {resultTable()}
            {chart('op')}
          </section>
          <div className="cm-two">
            <section className="op-panel cm-panel">
              <h3>Состав отклонения OP</h3>
              <Bars rows={bridgeRows} />
              <p>
                Сумма влияний {fmt(cmSum(bridgeRows.map((b) => b.value)))} млн ₽
                = прогноз OP минус план OP.
              </p>
            </section>
            <section className="op-panel cm-panel">
              <h3>M2, M4 и PBT компании</h3>
              <p>
                Полный P&L компании теперь связан с теми же выручкой,
                OP и амортизацией. Корпоративная методика ещё не утверждена.
              </p>
              <a href={ownerHref({page:'company',company:'AL1',metric:'economics',kpi:'pnl',snapshot:data.snapshotId,start,end,fleet:route.fleet,aircraft:route.aircraft})}>
                Открыть общую лестницу M1–M4 и P&L компании →
              </a>
              <p>
                Гибкий бюджет по фактическому объёму требует причинной модели
                расходов. Существующее распределение по минутам её не заменяет.
              </p>
            </section>
          </div>
        </>
      )}
      {kpi === 'pricing' && (
        <>
          <div className="cm-two">
            {groupMetrics(
              'Доходность',
              [
                'revenueFH',
                'revenueBH',
                'yield',
                'revenueACTK',
                'revenueFlight',
              ],
              <TrendingUp />,
            )}
            {groupMetrics(
              'Проданный ресурс и груз',
              ['clf', 'volume', 'margin', 'coverage'],
              <Plane />,
            )}
          </div>
          <section className="op-panel cm-panel">
            <h3>Тариф и цена миссии — не одно и то же</h3>
            <p>
              Оплачиваемый вес и договорные тарифы всей программы ещё не заданы:
              средний ₽/кг не рассчитывается из физической массы. Текущий
              Revenue/flight — распределённый доход участка, не цена договора.
            </p>
            <a href={link('mission')}>
              Цена полной миссии: план 22, факт 20 млн ₽ →
            </a>
          </section>
          <section className="op-panel cm-panel">
            <h3>Грузовая доходность по месяцам</h3>
            {chart('yield')}
            <p>
              Для специального груза низкая весовая загрузка не доказывает
              недопродажу. Проверяются объём, размещение и условия выделения
              самолёта.
            </p>
          </section>
        </>
      )}
      {kpi === 'costs' && (
        <>
          <div className="cm-two">
            {groupMetrics(
              'Удельные затраты',
              ['cost', 'costFH', 'costCTK', 'costACTK'],
              <Layers />,
            )}
            <section className="op-panel cm-panel">
              <h3>структура расходов</h3>
              <Bars
                rows={commercialCostLines(rows[0] || c.rows[0], 'forecast').map(
                  (cat) => ({
                    name: cat.name,
                    value: cmSum(
                      rows.map(
                        (r) =>
                          commercialCostLines(r, 'forecast').find(
                            (x) => x.id === cat.id,
                          )!.amount,
                      ),
                    ),
                  }),
                )}
              />
              <p>
                70% переменные / 30% постоянные — классификация
                существующих расходов. Денежное топливо не вычисляется из OFP
                без цены и учётного моста.
              </p>
            </section>
          </div>
          <section className="op-panel cm-panel">
            <h3>Статьи · план / факт / прогноз, млн ₽</h3>
            <Table
              heads={[
                'Статья / владелец',
                'План периода',
                'План закрытой части',
                'Факт',
                'Прогноз',
              ]}
              rows={commercialCostLines(c.rows[0], 'forecast').map((cat) => [
                <a href={link('cost', { row: cat.id })}>
                  {cat.name}
                  <small>{cat.owner}</small>
                </a>,
                fmt(
                  cmSum(
                    rows.map(
                      (r) =>
                        commercialCostLines(r, 'plan').find(
                          (x) => x.id === cat.id,
                        )!.amount,
                    ),
                  ),
                ),
                fmt(
                  cmSum(
                    closed.map(
                      (r) =>
                        commercialCostLines(r, 'plan').find(
                          (x) => x.id === cat.id,
                        )!.amount,
                    ),
                  ),
                ),
                closed.length
                  ? fmt(
                      cmSum(
                        closed.map(
                          (r) =>
                            commercialCostLines(r, 'actual').find(
                              (x) => x.id === cat.id,
                            )!.amount,
                        ),
                      ),
                    )
                  : '—',
                fmt(
                  cmSum(
                    rows.map(
                      (r) =>
                        commercialCostLines(r, 'forecast').find(
                          (x) => x.id === cat.id,
                        )!.amount,
                    ),
                  ),
                ),
              ])}
            />
          </section>
        </>
      )}
      {kpi === 'resource' &&
        (() => {
          const H = measure('revenueFH')
              ? rows.reduce(
                  (s, r) => s + (r.actualHours ?? r.forecastHours ?? 0),
                  0,
                )
              : 0,
            cap = opsMeasure(ops, scope, 'capacity', 'forecast') || 0,
            fixed = cmSum(rows.map((r) => r.fixed)),
            variable = cmSum(rows.map((r) => r.variable)),
            target = scenarioHours ?? Math.max(H, cap),
            current = H ? ((variable + fixed) / H) * 1000 : null,
            proposed =
              H && target ? (variable / H + fixed / target) * 1000 : null;
          return (
            <>
              <div className="cm-two">
                {groupMetrics(
                  'Мощность и использование',
                  ['capacity', 'utilization', 'ferry'],
                  <Plane />,
                )}
                <section className="op-panel cm-panel">
                  <h3>Что стоит пустой налёт</h3>
                  <div className="cm-inline-values">
                    <div>
                      <span>Перегоны, ч · прогноз</span>
                      <strong>{fmt(measure('ferry'))}</strong>
                    </div>
                    <div>
                      <span>Расходы этих строк</span>
                      <strong>
                        {fmt(
                          cmSum(
                            rows
                              .filter((r) => r.positioning)
                              .map((r) => r.cost),
                          ),
                        )}{' '}
                        млн ₽
                      </strong>
                    </div>
                  </div>
                  <p>
                    Подача, возврат и технический перегон могут быть необходимы.
                    Финансовые строки распределены; это не доказанная стоимость
                    избегаемых перегонов.
                  </p>
                  <a href={link('ferry')}>Раскрыть до бортов и рейсов →</a>
                </section>
              </div>
              <section className="op-panel cm-panel">
                <h3>Стоимость часа при другой загрузке</h3>
                <p>
                  Сценарий при неизменной переменной ставке и постоянном пуле.
                  Не меняет план, факт или прогноз. Располагаемый ресурс не
                  подтверждает спрос и полную эксплуатационную готовность.
                </p>
                {H > 0 && cap > H ? (
                  <>
                    <label className="cm-slider">
                      Сценарный налёт: <b>{fmt(target)} ч</b>
                      <input
                        aria-label="Сценарный налёт"
                        type="range"
                        min={H}
                        max={cap}
                        step={1}
                        value={target}
                        onChange={(e) =>
                          setScenarioHours(Number(e.target.value))
                        }
                      />
                    </label>
                    <Bars
                      unit="тыс. ₽/ч"
                      rows={[
                        { name: 'Текущая программа', value: current! },
                        { name: 'Сценарий загрузки', value: proposed! },
                      ]}
                    />
                    <p>
                      Общие расходы: {fmt(variable + fixed)} →{' '}
                      {fmt((variable / H) * target + fixed)} млн ₽. Более
                      дешёвый час не означает снижение общей суммы расходов.
                    </p>
                    <button onClick={() => setScenarioHours(null)}>
                      Сбросить сценарий
                    </button>
                  </>
                ) : (
                  <p>
                    Нет свободного модельного ресурса для сценария увеличения
                    налёта.
                  </p>
                )}
              </section>
            </>
          );
        })()}
      {kpi === 'sales' &&
        (() => {
          const qs = c.opportunities.filter(
              (q) =>
                q.month >= start &&
                q.month <= end &&
                (!scope.fleet || q.fleet === scope.fleet),
            ),
            closedQs = qs.filter(
              (q) => q.status !== 'OPEN' && q.month <= data.asOf.slice(0, 7),
            ),
            won = closedQs.filter((q) => q.status === 'WON'),
            lost = closedQs.filter((q) => q.status === 'LOST'),
            replies = closedQs.map((q) => q.replyHours).sort((a, b) => a - b),
            median = replies.length
              ? (replies[Math.floor((replies.length - 1) / 2)] +
                  replies[Math.ceil((replies.length - 1) / 2)]) /
                2
              : null;
          return (
            <>
              <section className="op-panel cm-panel">
                <h2>Работа продаж</h2>
                <p>
                  когорта КП на программы месяц × тип. WON не является
                  признанной выручкой. Проигранные возможности не входят в
                  финансовый прогноз; открытая взвешенная воронка совпадает с
                  портфелем.
                </p>
                {route.aircraft ? (
                  <p className="cm-warning">
                    CRM не имеет обоснованного распределения на борт. Снимите
                    отбор борта.
                  </p>
                ) : (
                  <>
                    <div className="cm-inline-values">
                      <div>
                        <span>Выиграно / закрыто · прошедшие месяцы</span>
                        <strong>
                          {won.length} / {closedQs.length}
                        </strong>
                        <small>
                          Конверсия{' '}
                          {fmt(
                            closedQs.length
                              ? (won.length / closedQs.length) * 100
                              : null,
                          )}
                          %
                        </small>
                      </div>
                      <div>
                        <span>Медиана до валидного КП</span>
                        <strong>{fmt(median)} ч</strong>
                        <small>От полного запроса интервалы</small>
                      </div>
                      <div>
                        <span>Открытая воронка × вероятность</span>
                        <strong>
                          {fmt(
                            cmSum(
                              qs
                                .filter((q) => q.status === 'OPEN')
                                .map((q) => q.weighted),
                            ),
                          )}{' '}
                          млн ₽
                        </strong>
                        <small>Не подтверждённая продажа</small>
                      </div>
                    </div>
                    <Bars
                      unit="возможностей"
                      rows={[...new Set(lost.map((q) => q.reason))].map(
                        (name) => ({
                          name,
                          value: lost.filter((q) => q.reason === name).length,
                        }),
                      )}
                    />
                    {quote && (
                      <div className="cm-quote">
                        <h3>{quote.id}</h3>
                        <p>
                          {quote.client} · {quote.owner} · {quote.reason}
                        </p>
                        <p>
                          Номинал {fmt(quote.amount)} млн ₽ ×{' '}
                          {fmt(quote.probability * 100)}% ={' '}
                          {fmt(quote.weighted)} млн ₽. Ответ {quote.replyHours}{' '}
                          ч после полного запроса.
                        </p>
                        <a
                          href={link('revenue', {
                            id: quote.programId,
                            start: quote.month,
                            end: quote.month,
                          })}
                        >
                          Связанная программа →
                        </a>
                      </div>
                    )}
                    <Table
                      heads={[
                        'КП / программа',
                        'Статус',
                        'Цена / номинал, млн ₽',
                        'Вероятность',
                        'Ответ, ч',
                        'Владелец',
                      ]}
                      rows={qs.map((q) => [
                        <a href={link('sales', { id: q.id })}>
                          {mon(q.month)} · {fleetName(q.fleet)}
                          <small>
                            {q.client} · {q.id}
                          </small>
                        </a>,
                        q.status,
                        fmt(q.amount),
                        fmt(q.probability * 100) + '%',
                        fmt(q.replyHours),
                        q.owner,
                      ])}
                    />
                  </>
                )}
              </section>
              <section className="op-panel cm-panel">
                <h3>Не маскируем отсутствующие данные</h3>
                <p>
                  Полные ценовые исключения, удержание клиентов, точность
                  замороженных прогнозов, стоимость продаж и утечка вклада
                  требуют истории CRM/договоров и версий финансового плана. Пока
                  они не вычисляются из случайных процентов.
                </p>
                <a href={link('mission')}>
                  Ценовое отклонение и изменение вклада на миссии →
                </a>
              </section>
            </>
          );
        })()}
      {kpi === 'crew' && crew()}
      {kpi === 'mission' && mission()}
      {isMetric &&
        (() => {
          const key = kpi as CommercialMetric,
            info = metricInfo(key),
            categories = route.row
              ? commercialCostLines(c.rows[0], 'plan').find(
                  (cat) => cat.id === route.row,
                )
              : undefined;
          return (
            <>
              <section className="op-panel cm-panel">
                <span className="cm-eyebrow">{info[1]}</span>
                <h2>{categories ? categories.name : info[0]} <MetricHelp catalog="commercial" metric={kpi}/></h2>
                <p>{info[3]}</p>
                {categories && (
                  <p className="cm-warning">
                    Здесь только статья «{categories.name}»: карточки, график и
                    раскрытие пересчитаны для неё. Владелец статьи:{' '}
                    {categories.owner}.
                  </p>
                )}
                <div className="cm-inline-values">
                  {(['plan', 'actual', 'forecast'] as CommercialView[]).map(
                    (view) => (
                      <button
                        key={view}
                        onClick={() =>
                          document
                            .getElementById('cm-breakdown')
                            ?.scrollIntoView({ behavior: 'smooth' })
                        }
                      >
                        <span>
                          {view === 'plan'
                            ? 'План периода'
                            : view === 'actual'
                              ? 'Факт · ' + factLabel
                              : 'Прогноз периода'}
                        </span>
                        <strong>
                          {fmt(measure(key, view))}
                          <small>{info[2]}</small>
                        </strong>
                      </button>
                    ),
                  )}
                </div>
                <p>
                  План закрытой части:{' '}
                  {closed.length
                    ? fmt(readMetric(closed, closedScope, key, 'plan'))
                    : '—'}{' '}
                  {info[2]}. Ответственный:{' '}
                  {[
                    'clf',
                    'volume',
                    'ferry',
                    'capacity',
                    'utilization',
                  ].includes(key)
                    ? 'Коммерция + производство'
                    : 'Коммерция + финансовый контроль'}
                  .
                </p>
                {chart(key)}
              </section>
              {!flight && (
                <section className="op-panel cm-panel" id="cm-breakdown">
                  <h3>
                    {route.aircraft
                      ? 'Рейсы борта'
                      : route.fleet
                        ? 'Борта выбранного типа'
                        : 'Вклад типов ВС'}
                  </h3>
                  {!route.aircraft && (
                    <Table
                      heads={[
                        route.fleet ? 'Борт' : 'Тип ВС',
                        `План · ${info[2]}`,
                        `Факт · ${info[2]}`,
                        `Прогноз · ${info[2]}`,
                      ]}
                      rows={[
                        ...new Set(
                          rows.map((r) =>
                            route.fleet ? r.aircraftId : r.fleet,
                          ),
                        ),
                      ].map((id) => {
                        const filtered = rows.filter(
                            (r) =>
                              (route.fleet ? r.aircraftId : r.fleet) === id,
                          ),
                          s = {
                            ...scope,
                            ...(route.fleet ? { aircraft: id } : { fleet: id }),
                          };
                        return [
                          <a href={link(key, { ...s, id: route.id })}>
                            {route.fleet ? id : fleetName(id)}
                          </a>,
                          ...(
                            ['plan', 'actual', 'forecast'] as CommercialView[]
                          ).map((view) =>
                            fmt(readMetric(filtered, s, key, view)),
                          ),
                        ];
                      })}
                    />
                  )}
                </section>
              )}
              {flight ? (
                <section className="op-panel cm-panel" id="cm-breakdown">
                  <h3>Исходная финансовая строка рейса</h3>
                  <p>
                    {flight.flightId} · {flight.date} · {flight.aircraftId}.{' '}
                    {flight.status === 'FORECAST'
                      ? 'Будущий прогноз'
                      : 'Закрытая запись'}
                    .
                  </p>
                  <Table
                    heads={[
                      'Статья',
                      'План, млн ₽',
                      'Факт / прогноз, млн ₽',
                      'Владелец',
                    ]}
                    rows={commercialCostLines(flight, 'forecast').map((l) => [
                      l.name,
                      fmt(
                        commercialCostLines(flight, 'plan').find(
                          (x) => x.id === l.id,
                        )!.amount,
                      ),
                      fmt(l.amount),
                      l.owner,
                    ])}
                  />
                  <p>
                    Выручка {fmt(flight.revenue)} − переменные{' '}
                    {fmt(flight.variable)} = вклад{' '}
                    {fmt(flight.revenue - flight.variable)}; минус постоянные{' '}
                    {fmt(flight.fixed)} = OP {fmt(flight.revenue - flight.cost)}{' '}
                    млн ₽.
                  </p>
                  <p>
                    Источник: общий месячный финансовый сценарий → распределение
                    по плановым минутам (Ан-124 ×2,5) → классификация
                    70/30. Это не корпоративная первичка и не калькуляция полной
                    миссии.
                  </p>
                  <div className="cm-related">
                    <a
                      href={link(key, {
                        id: flight.orderId,
                        start: flight.month,
                        end: flight.month,
                        aircraft: undefined,
                      })}
                    >
                      Программа месяца →
                    </a>
                    <a
                      href={ownerHref({
                        page: 'company',
                        company: 'AL1',
                        metric: 'production',
                        id: flight.flightId,
                        kpi: 'hours',
                        snapshot: data.snapshotId,
                        start,
                        end,
                        fleet: route.fleet,
                        aircraft: route.aircraft,
                      })}
                    >
                      Операционная запись: груз, OFP и время →
                    </a>
                    <a href={link(key)}>Назад к показателю →</a>
                  </div>
                </section>
              ) : (
                <section className="op-panel cm-panel">
                  <h3>Программы и рейсы</h3>
                  {!program && !['capacity', 'utilization'].includes(key) && (
                    <div className="cm-programs">
                      {v.orders
                        .filter((o) => rows.some((r) => r.orderId === o.id))
                        .map((o) => (
                          <a
                            key={o.id}
                            href={link(key, {
                              id: o.id,
                              start: o.month,
                              end: o.month,
                            })}
                          >
                            {mon(o.month)} · {fleetName(o.fleet)}{' '}
                            <ChevronRight size={14} />
                          </a>
                        ))}
                    </div>
                  )}
                  {key === 'capacity' || key === 'utilization' ? (
                    <>
                      <p>
                        Мощность имеет зерно борт–месяц. У рейсов ниже
                        показывается потребление ресурса, не фиктивная мощность
                        отдельного рейса.
                      </p>
                      <Table
                        heads={[
                          'Борт · месяц',
                          'Располагается, ч',
                          'Программа, ч',
                        ]}
                        rows={ops.capacities
                          .filter(
                            (x) =>
                              x.month >= start &&
                              x.month <= end &&
                              (!scope.fleet || x.fleet === scope.fleet) &&
                              (!scope.aircraft ||
                                x.aircraftId === scope.aircraft),
                          )
                          .map((x) => [
                            x.aircraftId + ' · ' + mon(x.month),
                            fmt(x.executable),
                            fmt(x.plan),
                          ])}
                      />
                    </>
                  ) : (
                    flightTable(rows, key)
                  )}
                </section>
              )}
            </>
          );
        })()}
      <details className="cm-method">
        <summary>Методика, источник и границы демонстрации</summary>
        <p>
          Срез {data.snapshotId}. Финансовые и физические показатели общие с
          экранами Авиагруппа и производства АК1. Отображение округлено до двух знаков,
          расчёты сохраняют точность до рубля. Отношения пересчитываются из
          сумм; данные будущих месяцев не становятся фактом.
        </p>
        <p>
          Постоянные/переменные и статьи — новые классификации
          существующего бюджета. CRM — возможности на программы; не
          реальные клиенты или договоры. Отдельная миссия и тренажёр экипажа не
          прибавляются к итогам.
        </p>
        <p>
          M2/M4/PBT компании, реальные тарифы и персональные допуски требуют
          корпоративных источников. Superset не подключён. Решения здесь не
          утверждаются и не сохраняются.
        </p>
        <p>
          <a
            href="https://www.iata.org/en/publications/newsletters/iata-knowledge-hub/understanding-air-traffic-metrics/"
            target="_blank"
            rel="noreferrer"
          >
            IATA: CTK, ACTK и CLF
          </a>{' '}
          ·{' '}
          <a
            href="https://www.iata.org/en/publications/fatigue-management-guide/"
            target="_blank"
            rel="noreferrer"
          >
            IATA / ICAO / IFALPA: утомляемость
          </a>
        </p>
      </details>
    </div>
  );
}
