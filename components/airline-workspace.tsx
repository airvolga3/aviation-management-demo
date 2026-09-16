'use client';
import { cashTransactions, cashTotal } from '@/lib/drilldown-contract';
import { useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  Plane,
  Wrench,
  Users,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { ExecutiveSnapshot } from '@/lib/executive-model';
import { ownerHref, type OwnerRoute } from '@/lib/owner-model';
import {
  airMonths,
  airSum,
  airRatio,
  airProfiles,
  airSectionNames,
  airCostNames,
  airLegs,
  airValue,
  airMatch,
  airResourceSummary,
  airSafetySummary,
  type AirlineId,
  type AirScope,
  type AirRecord,
  type AirLeg,
  type AirlineBundle,
  type AirView,
} from '@/lib/airline-model';
import { airMetrics, airSectionMetrics } from '@/lib/airline-metrics';
import { MetricHelp } from './metric-help';
import CompanyNavigation from './company-navigation';
import CompanyOverview from './company-overview';
import { presentationText } from '@/lib/presentation-copy';
import RegularFlightWorkspace, {RegularFlightEntry} from './regular-flight-workspace';

const n = (v: number | null | undefined, d = 1) =>
  v == null
    ? '—'
    : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: d })
        .format(v)
        .replace('-', '−');
const names: Record<string, string> = {
  READY: 'Исправен',
  MEL: 'Эксплуатация с ограничениями',
  TO: 'Плановое ТО',
  AOG: 'Внеплановый простой',
  UNKNOWN: 'Нет подтверждения',
  OPEN: 'Открыто',
  CONFIRMED: 'Проверки пройдены',
  BLOCKED: 'Есть препятствие',
  STALE: 'Нужно перепроверить',
  VALID: 'Подтверждено',
  EXPIRED: 'Истекло',
  PASS: 'Подтверждено',
  FAIL: 'Не выполнено',
  COMPLETED: 'Выполнен',
  CANCELLED: 'Отменён',
  FORECAST: 'Прогноз',
};
const status = (s: string) => (
  <span
    className={
      'air-status ' +
      (['AOG', 'BLOCKED', 'EXPIRED', 'FAIL'].includes(s)
        ? 'air-bad'
        : ['UNKNOWN', 'STALE', 'MEL'].includes(s)
          ? 'air-warn'
          : '')
    }
  >
    {names[s] ?? s}
  </span>
);
function Table({ heads, rows }: { heads: ReactNode[]; rows: ReactNode[][] }) {
  return (
    <div className="air-table">
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
                <td key={j}>{typeof v === 'string' ? presentationText(v) : v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="air-empty">
          Нет записей в выбранном периметре. Это не подтверждение отсутствия
          риска вне него.
        </p>
      )}
    </div>
  );
}
function Chart({
  rows,
  unit,
}: {
  rows: {
    label: string;
    plan?: number | null;
    actual?: number | null;
    forecast?: number | null;
  }[];
  unit: string;
}) {
  return (
    <>
      <div className="air-legend">
        {rows.some((r) => r.plan != null) && <span>— План</span>}
        {rows.some((r) => r.actual != null) && <span>● Факт</span>}
        {rows.some((r) => r.forecast != null) && <span>┄ Прогноз</span>}
        <span>{unit}</span>
      </div>
      <div className="air-chart">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={1}
          initialDimension={{ width: 500, height: 220 }}
        >
          <LineChart
            data={rows}
            margin={{ top: 12, left: 0, right: 18, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              minTickGap={20}
            />
            <YAxis
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              width={52}
              domain={unit.startsWith('%') ? [0, 100] : ['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--glass-strong)',
                border: '1px solid var(--line)',
                borderRadius: 10,
                color: 'var(--ink)',
              }}
              formatter={(v) => n(Number(v)) + ' ' + unit}
            />
            <ReferenceLine y={0} stroke="var(--line)" />
            <Line
              name="План"
              dataKey="plan"
              stroke="var(--muted)"
              dot={false}
            />
            <Line
              name="Факт"
              dataKey="actual"
              stroke="var(--blue)"
              strokeWidth={2.6}
              dot={{ r: 2 }}
            />
            <Line
              name="Прогноз"
              dataKey="forecast"
              stroke="var(--blue)"
              strokeWidth={2.5}
              strokeDasharray="6 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export default function AirlineWorkspace({
  data,
  route,
}: {
  data: ExecutiveSnapshot;
  route: OwnerRoute;
}) {
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(0);
  const candidate = data.airlines?.[route.company as AirlineId];
  if (
    !candidate ||
    candidate.snapshotId !== data.snapshotId ||
    candidate.asOf !== data.asOf ||
    (route.snapshot && route.snapshot !== data.snapshotId)
  )
    return (
      <section className="op-panel">
        <h2>Срез компании недоступен</h2>
        <p>Нет подмены другой компанией или другим срезом.</p>
      </section>
    );
  const a: AirlineBundle = candidate;
  if(route.metric === 'commerce' && route.kpi === 'departure') return <RegularFlightWorkspace a={a} route={route}/>;
  const section =
      route.metric && airSectionNames[route.metric] ? route.metric : undefined,
    kpi = route.kpi;
  const scope: AirScope = {
    start: route.start ?? '2026-01',
    end: route.end ?? '2026-12',
    fleet: route.fleet,
    aircraft: route.aircraft,
    category: route.category,
  };
  const scopeValid =
    (!route.metric || !!section) &&
    (!kpi || !!airMetrics[kpi] || kpi === 'payments') &&
    !(
      section === 'finance' &&
      (scope.fleet ||
        scope.aircraft ||
        (scope.category && scope.category !== 'ALL'))
    ) &&
    airMonths.includes(scope.start) &&
    airMonths.includes(scope.end) &&
    scope.start <= scope.end &&
    (!scope.fleet || a.fleets.some((f) => f.id === scope.fleet)) &&
    (!scope.aircraft ||
      a.planes.some(
        (p) =>
          p.id === scope.aircraft && (!scope.fleet || p.fleet === scope.fleet),
      )) &&
    (!scope.category || ['ALL', 'CHARTER', 'REGULAR'].includes(scope.category));
  const link = (change: Partial<OwnerRoute> = {}) =>
    ownerHref({
      ...route,
      page: 'company',
      company: a.companyId,
      snapshot: a.snapshotId,
      start: scope.start,
      end: scope.end,
      ...change,
    });
  const metricLink = (key: string) =>
    link({ kpi: key, id: undefined, row: undefined });
  const reset = () => link({ id: undefined, kpi: undefined, row: undefined });
  const lookup = (id: string) => a.records.find((r) => r.id === id);
  const rowSection = (r: AirRecord) =>
    ['employee', 'department', 'crew'].includes(r.kind)
      ? 'people'
      : ['aircraft', 'repair', 'requirement'].includes(r.kind)
        ? 'technical'
        : r.kind === 'payment' || r.id.startsWith('STOCK-')
          ? 'finance'
          : 'safety';
  const recordLink = (id: string) => {
    const r = lookup(id),
      f = a.legs.find((f) => f.id === id),
      date = (r?.date ?? f?.date)?.slice(0, 7);
    return link({
      metric: r ? rowSection(r) : 'production',
      id,
      kpi: undefined,
      row: undefined,
      fleet: r?.fleet ?? f?.fleet,
      aircraft: r?.aircraft ?? f?.aircraftId,
      start: date && date < scope.start ? date : scope.start,
      end: date && date > scope.end ? date : scope.end,
      category: undefined,
    });
  };
  if (!scopeValid)
    return (
      <section className="op-panel">
        <h2>Отбор не соответствует компании или периоду</h2>
        <p>
          Чужие борта и некорректные даты не подменяются данными всей компании.
        </p>
        <a
          href={link({
            metric: section,
            start: '2026-01',
            end: '2026-12',
            fleet: undefined,
            aircraft: undefined,
            category: undefined,
            id: undefined,
            kpi: undefined,
          })}
        >
          Сбросить отбор
        </a>
      </section>
    );
  const res = airResourceSummary(a, scope),
    sq = airSafetySummary(a, scope),
    fs = airLegs(a, scope),
    E = a.entity;
  const allowedRecords = a.records.filter((r) => airMatch(r, scope));
  const record = route.id ? lookup(route.id) : undefined,
    flight = route.id ? a.legs.find((f) => f.id === route.id) : undefined;
  const field: AirView =
    route.field === 'actual'
      ? 'actual'
      : route.field === 'plan'
        ? 'plan'
        : 'forecast';
  const inPeriod = (r: AirRecord) =>
    r.date.slice(0, 7) >= scope.start && r.date.slice(0, 7) <= scope.end;
  const stock = (k: string) =>
    Number(a.records.find((r) => r.kind === k)?.fields[0]?.[1] ?? 0);
  const requirements = a.requirements.filter((r) => airMatch(r, scope));
  const computed = (key: string, v: AirView = field): number | null => {
    if (['fdm', 'spi', 'service', 'integrity'].includes(key))
      return sq[key as 'fdm'];
    if (key === 'safetyEffect')
      return airRatio(sq.safetyEffect.verified, sq.safetyEffect.due);
    if (key === 'qualityEffect')
      return airRatio(sq.qualityEffect.verified, sq.qualityEffect.due);
    if (key === 'ready') return res.ready;
    if (key === 'availability') return res.availability;
    if (key === 'dispatch') return res.dispatch;
    if (key === 'requirements') return requirements.length;
    if (key === 'maintenance') return res.maintenance;
    if (key === 'impact') return res.risk.length;
    if (key === 'crew') return airRatio(res.confirmed, res.crew.length);
    if (key === 'critical')
      return scope.fleet
        ? null
        : airSum(a.departments.map((d) => Math.max(0, d.plan - d.actual)));
    if (key === 'hc') return res.hc;
    if (key === 'qualifications') return airRatio(res.valid, res.hc);
    if (key === 'attrition') {
      if (scope.fleet) return null;
      const rows = a.hrMonths.filter(
        (m) => !m.future && m.month >= scope.start && m.month <= scope.end,
      );
      return rows.length
        ? airRatio(
            airSum(rows.map((m) => m.voluntary)),
            airSum(rows.map((m) => (m.opening + m.closing) / 2)) / rows.length,
          )
        : null;
    }
    if (key === 'cash') return E.cash;
    if (key === 'liquidity') return Math.min(...E.weeks.map((w) => w.balance));
    if (key === 'portfolio')
      return scope.fleet ||
        scope.aircraft ||
        (scope.category && scope.category !== 'ALL')
        ? null
        : E.portfolio.confirmed;
    if (key === 'severe')
      return fs.some((f) => f.status !== 'FORECAST') ? 0 : null;
    const kinds: Record<string, string[]> = {
      events: ['event', 'deviation', 'ground'],
      risks: ['risk'],
      findings: ['finding'],
      claims: ['claim'],
      inspections: ['inspection'],
      actions: ['action'],
    };
    if (kinds[key]) {
      if (
        !['risks', 'findings', 'actions'].includes(key) &&
        !fs.some((f) => f.status !== 'FORECAST')
      )
        return null;
      return allowedRecords.filter(
        (r) =>
          kinds[key].includes(r.kind) &&
          (['risks', 'findings', 'actions'].includes(key) || inPeriod(r)),
      ).length;
    }
    return airValue(a, scope, key, v);
  };
  const card = (key: string) => {
    const m = airMetrics[key];
    if (!m) return null;
    const special =
        m.grain === 'stock' ||
        [
          'availability',
          'dispatch',
          'maintenance',
          'attrition',
          'severe',
          'events',
          'claims',
          'inspections',
          'fdm',
          'spi',
          'service',
          'integrity',
        ].includes(key),
      value = computed(key),
      p = special || m.grain === 'future' ? null : computed(key, 'plan'),
      closedPlan =
        special || m.grain === 'future'
          ? null
          : airValue(
              a,
              { ...scope, end: scope.end < '2026-08' ? scope.end : '2026-08' },
              key,
              'plan',
            ),
      fact = special || m.grain === 'future' ? null : computed(key, 'actual');
    const label =
      m.grain === 'stock'
        ? 'На 31.08.2026'
        : m.grain === 'future'
          ? key === 'liquidity'
            ? '07.09–30.11 · 13 недель'
            : key === 'portfolio'
              ? 'Сентябрь–декабрь'
              : 'Будущие задания отбора'
          : special
            ? 'Закрытая часть периода'
            : field === 'forecast'
              ? 'Факт + будущий прогноз'
              : field === 'actual'
                ? 'Факт закрытой части'
                : 'План выбранного периода';
    return (
      <article className="air-kpi" key={key}>
        <header>
          <span>{m.en}</span>
          <MetricHelp catalog="airline" metric={key} />
        </header>
        <a href={metricLink(key)}>
          <h3>{m.name}</h3>
          <strong>
            {n(value)} <small>{m.unit}</small>
          </strong>
          <span className="air-muted">{label}</span>
          {key === 'severe' && value !== null && (
            <span className="air-muted">
              Происшествия: 0 · серьёзные инциденты: 0
            </span>
          )}
          {key === 'punctuality' && field === 'forecast' && value === null && (
            <span className="air-muted">
              Прогноз задержек не задан. Факт — ниже.
            </span>
          )}
          {p !== null && (
            <span className="air-comparison">
              План {n(p)} · Δ прогноза{' '}
              {n(
                computed(key, 'forecast') == null
                  ? null
                  : computed(key, 'forecast')! - p,
              )}
            </span>
          )}
          {fact !== null && (
            <span className="air-comparison">
              Факт {n(fact)} / план закрытой части {n(closedPlan)}
            </span>
          )}
          <span className="air-kpi-open">
            Состав, причины, ответственный <ArrowUpRight size={15} />
          </span>
        </a>
      </article>
    );
  };
  const recordsTable = (rows: AirRecord[]) => {
    const filtered = rows.filter((r) =>
      (r.id + ' ' + r.title + ' ' + r.status + ' ' + r.owner)
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
    return (
      <>
        <label className="air-search">
          Поиск по реестру
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Борт, запись, статус, ответственный"
          />
        </label>
        <Table
          heads={[
            'Запись / основание',
            'Дата / срок',
            'Статус',
            'Ответственный',
          ]}
          rows={filtered.slice(page * 20, page * 20 + 20).map((r) => [
            <a key={r.id} href={recordLink(r.id)}>
              {presentationText(r.title)}
              <small>{r.id}</small>
            </a>,
            r.date + (r.due ? ' → ' + r.due : ''),
            status(r.status),
            r.owner,
          ])}
        />
        <div className="air-pager">
          <button disabled={!page} onClick={() => setPage(page - 1)}>
            Назад
          </button>
          <span>
            {filtered.length} записей · страница {page + 1}
          </span>
          <button
            disabled={(page + 1) * 20 >= filtered.length}
            onClick={() => setPage(page + 1)}
          >
            Далее
          </button>
        </div>
      </>
    );
  };
  const flightsTable = (rows: AirLeg[], key = 'hours') => {
    const filtered = rows.filter((f) =>
      (f.id + ' ' + f.aircraftId).toLowerCase().includes(search.toLowerCase()),
    );
    return (
      <>
        <label className="air-search">
          Поиск рейса
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Номер задания или борт"
          />
        </label>
        <Table
          heads={[
            'Рейс / дата',
            'Борт / программа',
            'Статус',
            'План · ' + (airMetrics[key]?.unit ?? 'ч'),
            'Факт · ' + (airMetrics[key]?.unit ?? 'ч'),
            'Факт + прогноз · ' + (airMetrics[key]?.unit ?? 'ч'),
          ]}
          rows={filtered.slice(page * 20, page * 20 + 20).map((f) => [
            <a key={f.id} href={link({ id: f.id, kpi: key, row: undefined })}>
              {f.id}
              <small>{f.date}</small>
            </a>,
            <div key={f.id + '-aircraft'}>
              <a href={recordLink(f.aircraftId)}>{f.aircraftId}</a>
              {f.service === 'CHARTER' ? 'Чартер' : 'Регулярный'}
            </div>,
            status(f.status),
            ...(['plan', 'actual', 'forecast'] as const).map((v) =>
              n(
                airValue({ ...a, legs: [f] }, scope, key, v),
                [
                  'rtk',
                  'atk',
                  'revenue',
                  'op',
                  'opex',
                  'personnelCost',
                ].includes(key) || key.startsWith('expense-')
                  ? 4
                  : 1,
              ),
            ),
          ])}
        />
        <div className="air-pager">
          <button disabled={!page} onClick={() => setPage(page - 1)}>
            Назад
          </button>
          <span>
            {filtered.length} рейсов · страница {page + 1}
          </span>
          <button
            disabled={(page + 1) * 20 >= filtered.length}
            onClick={() => setPage(page + 1)}
          >
            Далее
          </button>
        </div>
      </>
    );
  };
  const trend = (key: string) =>
    airMonths
      .filter((m) => m >= scope.start && m <= scope.end)
      .map((month) => ({
        label: month.slice(5),
        plan: airValue(a, { ...scope, start: month, end: month }, key, 'plan'),
        actual: airValue(
          a,
          { ...scope, start: month, end: month },
          key,
          'actual',
        ),
        forecast:
          month > '2026-08'
            ? airValue(
                a,
                { ...scope, start: month, end: month },
                key,
                'forecast',
              )
            : null,
      }));
  const financialTable = (keys: string[]) => (
    <Table
      heads={[
        'Показатель',
        'План периода',
        'План закрытой части',
        'Факт закрытой части',
        'Прогноз периода',
        'Δ прогноз / план',
      ]}
      rows={keys.map((key) => {
        const p = airValue(a, scope, key, 'plan'),
          f = airValue(a, scope, key, 'forecast');
        return [
          <div key={key} className="air-cell-help">
            <a href={metricLink(key)}>
              {airMetrics[key]?.name ?? airCostNames[key.slice(8)] ?? key}
            </a>
            {airMetrics[key] && <MetricHelp catalog="airline" metric={key} />}
          </div>,
          n(p),
          n(
            airValue(
              a,
              { ...scope, end: scope.end < '2026-08' ? scope.end : '2026-08' },
              key,
              'plan',
            ),
          ),
          n(airValue(a, scope, key, 'actual')),
          n(f),
          <span
            key={key + '-delta'}
            className={
              p != null && f != null && Math.abs(f - p) > Math.abs(p) * 0.05
                ? 'air-warn'
                : ''
            }
          >
            {n(p == null || f == null ? null : f - p)} ·{' '}
            {n(
              p == null || !p || f == null
                ? null
                : ((f - p) / Math.abs(p)) * 100,
            )}
            %
          </span>,
        ];
      })}
    />
  );
  const technical = () => (
    <>
      <div className="air-alert">
        <Wrench size={21} />
        <div>
          <strong>
            {res.planes.filter((p) => ['AOG', 'TO'].includes(p.status)).length}{' '}
            ВС вне эксплуатации · {res.limited} с ограничениями
          </strong>
          <p>
            {requirements.filter((r) => r.status === 'UNKNOWN').length}{' '}
            требований без подтверждения применимости. Пустой реестр не
            считается исправностью. Полный выпуск ВС не оценён.
          </p>
        </div>
      </div>
      <div className="air-grid">{airSectionMetrics.technical.map(card)}</div>
      <div className="air-two">
        <section className="op-panel">
          <h3>Где находится парк</h3>
          <div className="air-fleet-wall">
            {res.planes.map((p) => (
              <a
                href={recordLink(p.id)}
                key={p.id}
                className={'air-tail ' + p.status.toLowerCase()}
              >
                <Plane size={23} />
                <strong>{p.name}</strong>
                <span>{p.id}</span>
                {status(p.status)}
              </a>
            ))}
          </div>
        </section>
        <section className="op-panel">
          <h3>Доступность по месяцам</h3>
          <Chart
            unit="% календарных борт-часов"
            rows={airMonths
              .filter((m) => m >= scope.start && m <= scope.end)
              .map((m) => ({
                label: m.slice(5),
                actual:
                  m <= '2026-08'
                    ? airResourceSummary(a, { ...scope, start: m, end: m })
                        .availability
                    : null,
              }))}
          />
          <p className="air-muted">
            Потери: {n(res.unavailable)} борт-ч · из них плановое ТО{' '}
            {n(res.planned)}. План доступности и будущий статус не выдуманы из
            налёта.
          </p>
        </section>
      </div>
      <section className="op-panel">
        <h3>План ТО и сроки возврата</h3>
        <p>
          План, текущий ETA и фактический возврат — отдельные даты. Временная
          шкала показывает весь 2026 год; верхние KPI — выбранный период.
        </p>
        <div className="air-timeline">
          <div className="air-timeline-head">
            <span>Борт / заказ</span>
            <div>
              {airMonths.map((m) => (
                <span key={m}>{m.slice(5)}</span>
              ))}
            </div>
          </div>
          {a.repairs
            .filter((r) => airMatch(r, scope))
            .map((r) => (
              <a
                href={recordLink(r.id)}
                className="air-timeline-row"
                key={r.id}
              >
                <span>
                  {r.id}
                  <small>{r.aircraft}</small>
                </span>
                <div>
                  <span
                    className={r.kind === 'AOG' ? 'aog' : ''}
                    style={{
                      left:
                        ((Date.parse(r.start) - Date.parse('2026-01-01')) /
                          86400000 /
                          365) *
                          100 +
                        '%',
                      width:
                        Math.max(
                          1,
                          ((Date.parse(r.actualReturn ?? r.eta) -
                            Date.parse(r.start)) /
                            86400000 /
                            365) *
                            100,
                        ) + '%',
                    }}
                    title={r.start + ' → ' + (r.actualReturn ?? r.eta)}
                  />
                </div>
                <small>
                  {r.start} → {r.actualReturn ?? r.eta}
                </small>
              </a>
            ))}
        </div>
      </section>
    </>
  );
  const people = () => (
    <>
      <div className="air-alert">
        <Users size={21} />
        <div>
          <strong>Назначен ≠ проверен ≠ допущен к рейсу</strong>
          <p>
            {res.blocked} заданий с препятствиями · {res.unknown} без полного
            подтверждения · {res.stale} требуют перепроверки. Все юридические
            допуски остаются NOT_EVALUATED.
          </p>
        </div>
      </div>
      <div className="air-grid">{airSectionMetrics.people.map(card)}</div>
      <div className="air-two">
        <section className="op-panel">
          <h3>Штат и фактическая команда</h3>
          <p>
            {n(res.hc, 0)} человек · {n(res.fte)} FTE.{' '}
            {scope.fleet
              ? 'Только роли, закреплённые за типом; общая поддержка исключена.'
              : 'Штатные подразделения компании целиком.'}
          </p>
          <Table
            heads={['Подразделение', 'План HC', 'Факт HC', 'Прогноз HC']}
            rows={a.departments.map((d) => [
              <a
                key={d.id}
                href={link({
                  id: d.id,
                  kpi: undefined,
                  fleet: undefined,
                  aircraft: undefined,
                })}
              >
                {d.name}
              </a>,
              d.plan,
              d.actual,
              d.forecast,
            ])}
          />
          <p className="air-muted">
            Таблица подразделений всегда по компании: планы по типам ВС и
            квалифицированным FTE ещё не утверждены.
          </p>
        </section>
        <section className="op-panel">
          <h3>Движение численности компании</h3>
          <Chart
            unit="человек · конец месяца"
            rows={a.hrMonths
              .filter((m) => m.month >= scope.start && m.month <= scope.end)
              .map((m) => ({
                label: m.month.slice(5),
                plan: m.plan,
                actual: m.future ? null : m.closing,
                forecast: m.future ? m.closing : null,
              }))}
          />
          <p className="air-muted">
            Начало + приём − увольнения = конец. Прогноз выхода сотрудников —
            прогноз, не подтверждённый найм.
          </p>
        </section>
      </div>
      <section className="op-panel">
        <h3>С чего начать руководителю</h3>
        <div className="air-action-grid">
          <a href={metricLink('crew')}>
            <strong>1. Пересмотреть назначения</strong>
            <p>Сначала рейсы с неполным составом или истёкшей подготовкой.</p>
          </a>
          <a href={metricLink('qualifications')}>
            <strong>2. Подтвердить подготовку</strong>
            <p>
              Истекающие требования проверить на дату каждого будущего задания.
            </p>
          </a>
          <a href={metricLink('critical')}>
            <strong>3. Закрыть дефицит ролей</strong>
            <p>
              Не заменять недостающий лётный состав свободной численностью
              другой функции.
            </p>
          </a>
        </div>
      </section>
    </>
  );
  const finance = () => (
    <>
      <div className="air-grid">{airSectionMetrics.finance.map(card)}</div>
      <section className="op-panel">
        <h3>Ликвидность · 13 недель</h3>
        <Chart
          unit="млн ₽"
          rows={E.weeks.map((w) => ({
            label: w.date.slice(5),
            forecast: w.balance,
          }))}
        />
        {Math.min(...E.weeks.map((w) => w.balance)) < 0 && (
          <p className="air-alert">
            Требуется финансирование: отрицательный прогноз не является
            доступными деньгами. Решение — подтвердить поступления, сроки CAPEX
            и источник покрытия дефицита.
          </p>
        )}
      </section>
      <div className="air-two">
        <section className="op-panel">
          <h3>Банки на 31 августа</h3>
          <Table
            heads={['Банк', 'Остаток, млн ₽']}
            rows={a.bankShares.map((share, i) => [
              <a key={i} href={metricLink('cash')}>
                Банк {i + 1}
              </a>,
              n(E.cash * share),
            ])}
          />
          <p>
            Общий остаток {n(E.cash)} совпадает с экраном владельца. Права
            использования и НСО по этим компаниям не подтверждены.
          </p>
        </section>
        <section className="op-panel">
          <h3>Обязательства и размещения на дату</h3>
          <Table
            heads={['Показатель', 'млн ₽']}
            rows={[
              'debt',
              'deposit',
              'receivable',
              'overdue-ar',
              'payable',
            ].map((k) => [
              <a key={k} href={recordLink('STOCK-' + a.companyId + '-' + k)}>
                {lookup('STOCK-' + a.companyId + '-' + k)?.title}
              </a>,
              n(stock(k)),
            ])}
          />
          <p className="air-muted">
            Новые отдельные остатки. Не складывать просроченную ДЗ с
            общей ДЗ.
          </p>
        </section>
      </div>
      <section className="op-panel">
        <h3>БДДС · поступления и выплаты</h3>
        {cashTable()}
        <p>
          Операционные выплаты уже включают проценты, налоги, комиссии и штрафы.
          Капитальные платежи — отдельно. Это не начисления P&L.
        </p>
      </section>
    </>
  );
  function cashTable(kpi = 'fcf', category?: string) {
    const tx = cashTransactions(a.transactions, scope, kpi, category);
    return (
      <Table
        heads={[
          'Денежная категория',
          'План периода',
          'Факт закрытых месяцев',
          'Прогноз периода',
        ]}
        rows={[[<strong key="total">Итого денежный поток</strong>, ...(['plan', 'actual', 'forecast'] as const).map(v => n(cashTotal(tx, v)))], ...[...new Set(tx.map((t) => t.category))].map((cat) => {
          const rs = tx.filter((t) => t.category === cat);
          return [
            <a
              key={cat}
              href={link({ kpi: 'payments', row: cat, id: undefined })}
            >
              {cat}
            </a>,
            n(airSum(rs.map((t) => t.plan))),
            rs.some((t) => !t.future)
              ? n(airSum(rs.filter((t) => !t.future).map((t) => t.value)))
              : '—',
            n(airSum(rs.map((t) => t.value))),
          ];
        })]}
      />
    );
  }
  const safety = () => (
    <>
      <div className="air-alert">
        <ShieldAlert size={21} />
        <div>
          <strong>Безопасность и качество — два контура в одном разделе</strong>
          <p>
            Индекс безопасности, SAFA ratio и DAP не подменены произвольным
            баллом. События, замечания и мероприятия — отдельные записи.
          </p>
        </div>
      </div>
      <div className="air-grid">
        {airSectionMetrics.safety.slice(0, 6).map(card)}
      </div>
      <div className="air-two">
        <section className="op-panel">
          <h3>Исполнение обязательств по месяцам</h3>
          <Chart
            unit="%"
            rows={airMonths
              .filter((m) => m >= scope.start && m <= scope.end)
              .map((m) => ({
                label: m.slice(5),
                actual: airSafetySummary(a, { ...scope, start: m, end: m })
                  .service,
              }))}
          />
        </section>
        <section className="op-panel">
          <h3>Полнота наблюдения FDM</h3>
          <Chart
            unit="%"
            rows={airMonths
              .filter((m) => m >= scope.start && m <= scope.end)
              .map((m) => ({
                label: m.slice(5),
                actual: airSafetySummary(a, { ...scope, start: m, end: m }).fdm,
              }))}
          />
          <p>
            {sq.observed.length} пригодных записей / {sq.flown.length}{' '}
            выполненных рейсов. Нет записи:{' '}
            {sq.flown.length - sq.observed.length}. Будущая безопасность не
            прогнозируется баллом.
          </p>
        </section>
      </div>
      <details className="op-panel air-secondary">
        <summary>Индикаторы, проверки и результативность мер</summary>
        <div className="air-grid">
          {airSectionMetrics.safety.slice(6).map(card)}
        </div>
      </details>
      <div className="air-two">
        <section className="op-panel">
          <h3>Безопасность · события и риски</h3>
          {recordsTable(
            allowedRecords.filter(
              (r) =>
                ['event', 'deviation', 'ground', 'risk'].includes(r.kind) &&
                (r.kind === 'risk' || inPeriod(r)),
            ),
          )}
        </section>
        <section className="op-panel">
          <h3>Качество · обязательства и проверки</h3>
          {recordsTable(
            allowedRecords.filter(
              (r) =>
                ['finding', 'claim', 'inspection', 'action'].includes(r.kind) &&
                (['finding', 'action'].includes(r.kind) || inPeriod(r)),
            ),
          )}
        </section>
      </div>
    </>
  );
  const businessKeys = section === 'commerce'
    ? scope.category === 'CHARTER'
      ? ['revenue','m2','price','revenueHour','ferry','coverage','op','load','yield','portfolio','costHour','costRtk']
      : ['revenue','op','load','yield','costRtk','coverage','portfolio','revenueHour','price','costHour','ferry','m2']
    : airSectionMetrics[section!];
  const business = () => (
    <>
      {section === 'commerce' && <section className="op-panel company-commercial-profile">
        <div><h3>{scope.category === 'CHARTER' ? 'Чартерная программа' : scope.category === 'REGULAR' ? 'Регулярная программа' : 'Коммерческий результат компании'}</h3><p>{scope.category === 'CHARTER' ? 'Доходность заданий, стоимость часа и позиционирование. Полная миссия учитывает все связанные участки.' : 'Доходность и загрузка выбранной программы. Cargo yield и расходы на тонно-километр используют один периметр.'}</p></div>
        <nav className="al1-nav" aria-label="Модель коммерческой деятельности">{[['ALL','Вся компания'],['REGULAR','Регулярная программа'],['CHARTER','Чартеры']].map(([value,label])=><a key={value} className={(scope.category||'ALL')===value?'active':''} href={link({category:value,kpi:undefined,id:undefined,row:undefined})}>{label}</a>)}</nav>
      </section>}
      {section === 'commerce' && <RegularFlightEntry a={a} route={route} scope={scope}/>}
      <div className="air-grid">
        {businessKeys.slice(0, 6).map(card)}
      </div>
      <div className="air-two">
        <section className="op-panel">
          <h3>
            {section === 'production'
              ? 'Налёт по месяцам'
              : 'Выручка по месяцам'}
          </h3>
          <Chart
            rows={trend(section === 'production' ? 'hours' : 'revenue')}
            unit={section === 'production' ? 'ч' : 'млн ₽'}
          />
        </section>
        <section className="op-panel">
          <h3>
            {section === 'production'
              ? 'Объём перевезённого груза'
              : 'Операционная прибыль · M4'}
          </h3>
          <Chart
            rows={trend(section === 'production' ? 'tonnes' : 'op')}
            unit={section === 'production' ? 'т' : 'млн ₽'}
          />
        </section>
      </div>
      <details className="op-panel air-secondary">
        <summary>
          Дополнительные показатели и драйверы{' '}
          <span>{Math.max(0, businessKeys.length - 6)}</span>
        </summary>
        <div className="air-grid">
          {businessKeys.slice(6).map(card)}
        </div>
      </details>
      {section === 'economics' && (
        <section className="op-panel">
          <h3>Связанный P&L · от выручки до чистой прибыли</h3>
          {financialTable([
            'revenue',
            'm1',
            'm2',
            'm3',
            'indirect',
            'da',
            'op',
            'interestIncome',
            'financeCost',
            'pbt',
            'tax',
            'net',
          ])}
          <p className="air-muted">
            Декомпозиция расходов не меняет согласованные суммы. Налоговый
            коэффициент 20% — настройка, не ставка законодательства.
            Финансовые начисления ниже OP — только на уровне компании.
          </p>
          <h3>Все операционные расходы · млн ₽</h3>
          {financialTable([
            'opex',
            ...Object.keys(airCostNames).map((k) => 'expense-' + k),
          ])}
        </section>
      )}
      {section === 'commerce' && (
        <section className="op-panel">
          <h3>Будущая выручка · сентябрь–декабрь</h3>
          <Table
            heads={[
              'Подтверждено',
              'Взвешенная воронка',
              'Непокрытая часть',
              'Всего',
            ]}
            rows={[
              [
                n(E.portfolio.confirmed),
                n(E.portfolio.pipeline),
                n(E.portfolio.gap),
                n(E.portfolio.total),
              ],
            ]}
          />
          <p>
            Портфель компании целиком, независимо от отбора программы. Не прибавляется к выручке повторно. Это агрегат, не реестр бронирований или подписанных договоров.
          </p>
        </section>
      )}
      {section === 'production' && (
        <section className="op-panel">
          <h3>Мощность по типам ВС</h3>
          <Table
            heads={[
              'Тип',
              'календарная мощность, ч/год',
              'Годовой план, ч',
              'Годовой прогноз, ч',
            ]}
            rows={a.fleets.map((f) => [
              <a
                key={f.id}
                href={link({ fleet: f.id, kpi: 'hours', aircraft: undefined })}
              >
                {f.aircraft}
              </a>,
              n(
                f.demoAircraftCount *
                  365 *
                  airProfiles[f.id as keyof typeof airProfiles].hoursPerDay,
              ),
              n(f.annualPlanHours),
              n(
                airValue(
                  a,
                  { start: '2026-01', end: '2026-12', fleet: f.id },
                  'hours',
                  'forecast',
                ),
              ),
            ])}
          />
          <p>
            Мощность — расчётный ресурс парка, не гарантированная юридически
            исполнимая программа. Техника и экипажи раскрываются отдельно.
          </p>
        </section>
      )}
    </>
  );
  function detail() {
    if (record) {
      const stockRecord = [
        'aircraft',
        'requirement',
        'department',
        'employee',
        'risk',
        'finding',
        'action',
        'debt',
        'deposit',
        'receivable',
        'overdue-ar',
        'payable',
      ].includes(record.kind);
      if (!airMatch(record, scope) || (!stockRecord && !inPeriod(record)))
        return (
          <section className="op-panel">
            <h2>Запись вне текущего отбора</h2>
            <a href={recordLink(record.id)}>Открыть в её контексте</a>
          </section>
        );
      return (
        <section className="op-panel air-record">
          <span className="air-eyebrow">
            {record.kind.toUpperCase()} / {record.id}
          </span>
          <h2>
            {route.row === 'source'
              ? 'Первичное основание'
              : record.title}
          </h2>
          {status(record.status)}
          <p>{presentationText(record.cause)}</p>
          <Table heads={['Поле', 'Значение']} rows={record.fields} />
          <div className="air-action-grid">
            <div>
              <h3>Ответственный</h3>
              <p>{record.owner}</p>
              <p>Срок: {record.due ?? 'Уточняется владельцем записи'}</p>
            </div>
            <div>
              <h3>Следующее действие</h3>
              <p>{presentationText(record.action)}</p>
            </div>
          </div>
          {route.row === 'source' ? (
            <>
              <h3>Паспорт источника</h3>
              <p>
                {a.method} · {a.snapshotId} · компания {a.companyId}.
                Синтетическое основание для презентации; не приказ, медицинский документ или разрешение на вылет.
              </p>
              <a href={link({ row: undefined })}>Вернуться к карточке</a>
            </>
          ) : (
            <a className="air-source-link" href={link({ row: 'source' })}>
              Открыть первичное основание <ArrowUpRight size={16} />
            </a>
          )}
          <h3>Связанные объекты</h3>
          <p className="air-muted">
            Связь может перейти к другому месяцу или объекту: даты и отбор при
            необходимости расширяются явно в адресе и заголовке.
          </p>
          <div className="air-linked">
            {record.links.slice(page * 20, page * 20 + 20).map((id) => (
              <a key={id} href={recordLink(id)}>
                {lookup(id)?.title ?? id}
                <ChevronRight size={16} />
              </a>
            ))}
          </div>
          {record.links.length > 20 && (
            <div className="air-pager">
              <button disabled={!page} onClick={() => setPage(page - 1)}>
                Назад
              </button>
              <span>{record.links.length} связей</span>
              <button
                disabled={(page + 1) * 20 >= record.links.length}
                onClick={() => setPage(page + 1)}
              >
                Далее
              </button>
            </div>
          )}
        </section>
      );
    }
    if (flight) {
      if (!fs.some((f) => f.id === flight.id))
        return (
          <section className="op-panel">
            <h2>Рейс вне отбора</h2>
            <a
              href={link({
                start: flight.month,
                end: flight.month,
                fleet: flight.fleet,
                aircraft: flight.aircraftId,
                category: undefined,
              })}
            >
              Открыть месяц и борт рейса
            </a>
          </section>
        );
      const crew = a.crew.find((c) => c.flightId === flight.id);
      return (
        <section className="op-panel air-record">
          <span className="air-eyebrow">FLIGHT / {a.companyId}</span>
          <h2>{flight.id}</h2>
          <p>
            {flight.date} ·{' '}
            {flight.service === 'CHARTER' ? 'Чартер' : 'Регулярная программа'} ·{' '}
            {status(flight.status)}
          </p>
          <Table
            heads={['Показатель', 'План', 'Факт / прогноз']}
            rows={[
              [
                'Налёт, ч',
                n(flight.planMinutes / 60),
                n((flight.actualMinutes ?? flight.forecastMinutes ?? 0) / 60),
              ],
              [
                'Выручка, млн ₽',
                n(flight.revenuePlan, 4),
                n(flight.revenue, 4),
              ],
              [
                'Операционные расходы, млн ₽',
                n(flight.costPlan, 4),
                n(flight.cost, 4),
              ],
              [
                'OP / M4, млн ₽',
                n(flight.revenuePlan - flight.costPlan, 4),
                n(flight.revenue - flight.cost, 4),
              ],
              ['Груз, т', n(flight.tonnesPlan), n(flight.tonnes)],
              ['Топливо OFP / факт, т', n(flight.fuelPlan), n(flight.fuel)],
            ]}
          />
          <div className="air-linked">
            <a href={recordLink(flight.aircraftId)}>
              Борт: {flight.aircraftId}
            </a>
            {crew && (
              <a href={recordLink(crew.id)}>
                Комплект экипажа: {names[crew.status]}
              </a>
            )}
            {a.repairs
              .filter(
                (r) =>
                  r.aircraft === flight.aircraftId &&
                  r.start <= flight.date &&
                  r.eta > flight.date,
              )
              .map((r) => (
                <a key={r.id} href={recordLink(r.id)}>
                  Техническое ограничение: {r.title}
                </a>
              ))}
          </div>
          <h3>Полётное задание</h3>
          <p>
            {flight.recordId} · источник: production-scenario.json → общий
            реестр рейсов. Владелец: {flight.owner}. Все дополнительные тоннаж,
            OFP и распределения сумм — расчётные. Корпоративный первичный документ
            не подключён.
          </p>
        </section>
      );
    }
    if (route.id)
      return (
        <section className="op-panel">
          <h2>Запись не найдена в этой компании</h2>
          <p>Чужие документы не показываются по совпадению среза.</p>
        </section>
      );
    if (!kpi) return null;
    const m = airMetrics[kpi];
    const content = () => {
      if (
        [
          'fdm',
          'spi',
          'service',
          'integrity',
          'safetyEffect',
          'qualityEffect',
        ].includes(kpi)
      ) {
        if (kpi === 'fdm')
          return (
            <>
              <p>
                Пригодно {sq.observed.length} / {sq.flown.length}. Ниже рейсы
                без пригодной записи.
              </p>
              {flightsTable(sq.flown.filter((f) => !f.fdmObserved))}
            </>
          );
        if (kpi === 'service')
          return (
            <>
              <p>
                Без нарушений {sq.commercial.length - sq.failures.length} /{' '}
                {sq.commercial.length} коммерческих заданий. Ниже нарушения,
                включая отмены. Перегоны исключены.
              </p>
              {flightsTable(sq.failures)}
            </>
          );
        if (kpi === 'spi' || kpi === 'integrity')
          return recordsTable(
            allowedRecords.filter(
              (r) =>
                r.kind === (kpi === 'spi' ? 'spi' : 'cargo-damage') &&
                inPeriod(r),
            ),
          );
        return recordsTable(
          allowedRecords.filter(
            (r) =>
              r.verification?.domain ===
              (kpi === 'safetyEffect' ? 'safety' : 'quality'),
          ),
        );
      }
      if (kpi === 'ready')
        return recordsTable(
          allowedRecords.filter((r) => r.kind === 'aircraft'),
        );
      if (kpi === 'requirements')
        return recordsTable(
          allowedRecords.filter((r) => r.kind === 'requirement'),
        );
      if (['availability', 'maintenance'].includes(kpi))
        return (
          <>
            <p>
              Доступность {n(res.availability)}% ·{' '}
              {n(res.calendar - res.unavailable)} / {n(res.calendar)}{' '}
              календарных борт-часов. Возвраты в срок {res.ontime} /{' '}
              {res.due.length}. Реестр ниже — все заказы выбранных бортов; KPI
              учитывает закрытые даты отбора.
            </p>
            {recordsTable(allowedRecords.filter((r) => r.kind === 'repair'))}
          </>
        );
      if (kpi === 'dispatch')
        return (
          <>
            <p>
              Технических нарушений {res.techBad.length} /{' '}
              {fs.filter((f) => f.status !== 'FORECAST').length} заданий
              закрытого периода.
            </p>
            {flightsTable(res.techBad)}
          </>
        );
      if (kpi === 'impact')
        return (
          <>
            <p>
              Связанная выручка под техническим риском:{' '}
              {n(airSum(res.risk.map((f) => f.revenue)))} млн ₽. Не равна
              потерям.
            </p>
            {flightsTable(res.risk)}
          </>
        );
      if (kpi === 'crew')
        return (
          <>
            <div className="air-check-strip">
              {(['CONFIRMED', 'BLOCKED', 'UNKNOWN', 'STALE'] as const).map(
                (s) => (
                  <span key={s}>
                    {names[s]}: {res.crew.filter((c) => c.status === s).length}
                  </span>
                ),
              )}
            </div>
            <p>
              Подтверждено {res.confirmed} / {res.crew.length} заданий.
              NOT_EVALUATED — юридический допуск каждого рейса. Клик на запись
              открывает состав и все проверки.
            </p>
            {recordsTable(
              allowedRecords.filter((r) => r.kind === 'crew' && inPeriod(r)),
            )}
          </>
        );
      if (['hc', 'critical'].includes(kpi))
        return (
          <>
            <p>
              HC {res.hc} · FTE {n(res.fte)}. Штатные планы и дефициты — только
              по компании; для типов план FTE не задан.
            </p>
            {recordsTable(a.records.filter((r) => r.kind === 'department'))}
          </>
        );
      if (kpi === 'qualifications')
        return (
          <>
            <p>
              Подтверждено {res.valid} / {res.hc}. Истекло{' '}
              {res.staff.filter((p) => p.qualification === 'EXPIRED').length};
              нет подтверждения{' '}
              {res.staff.filter((p) => p.qualification === 'UNKNOWN').length};
              истекает в сентябре{' '}
              {
                res.staff.filter(
                  (p) => p.qualification === 'VALID' && p.expires < '2026-10',
                ).length
              }
              .
            </p>
            {recordsTable(allowedRecords.filter((r) => r.kind === 'employee'))}
          </>
        );
      if (kpi === 'attrition')
        return (
          <>
            <p>
              Только компания целиком: кадровые движения по типам не
              распределены. Синтетический журнал движения, без персональных
              причин увольнений.
            </p>
            <Table
              heads={[
                'Месяц',
                'Начало',
                'Принято',
                'Ушло',
                'Из них добровольно',
                'Конец',
                'Сценарий',
              ]}
              rows={a.hrMonths
                .filter((r) => r.month >= scope.start && r.month <= scope.end)
                .map((r) => [
                  r.month,
                  r.opening,
                  r.joins,
                  r.leavers,
                  r.voluntary,
                  r.closing,
                  r.future ? 'Прогноз' : 'Факт',
                ])}
            />
          </>
        );
      if (kpi === 'cash' || kpi === 'liquidity')
        return (
          <>
            <p>
              Остаток на 31.08: {n(E.cash)}. Начало года: {n(a.openingCash)} +
              OCF {n(E.flows.ocf.actual)} − CAPEX {n(E.flows.capex.actual)} ={' '}
              {n(E.cash)} млн ₽. Отбор месяцев не меняет этот баланс на
              фиксированную дату.
            </p>
            <Table
              heads={['Неделя', 'Движение', 'Прогноз денег', 'Статус']}
              rows={E.weeks.map((w) => [
                w.date,
                n(w.movement),
                n(w.balance),
                w.balance < 0
                  ? 'Нужно финансирование'
                  : 'До ограничений использования',
              ])}
            />
            {cashTable()}
          </>
        );
      if (['ocf', 'capex', 'fcf', 'payments'].includes(kpi)) {
        const ids = new Set(cashTransactions(a.transactions, scope, kpi, route.row, field).map(t => t.id));
        return <>
          {kpi === 'capex' && <p>CAPEX показан как положительная величина инвестиций; денежные выплаты в таблице имеют знак минус. Итог потока = −CAPEX.</p>}
          {cashTable(kpi, route.row)}
          <p>Реестр: {field === 'actual' ? 'факт закрытых месяцев' : field === 'plan' ? 'план периода' : 'факт + прогноз периода'}.</p>
          {recordsTable(a.records.filter(r => ids.has(r.id)))}
        </>;
      }
      if (kpi === 'portfolio')
        return (
          <>
            <p>
              На 31.08; будущая часть сентябрь–декабрь. Подтверждено{' '}
              {n(E.portfolio.confirmed)} + воронка {n(E.portfolio.pipeline)} +
              разрыв {n(E.portfolio.gap)} = {n(E.portfolio.total)} млн ₽.
            </p>
            <p>
              Компания целиком. Договорные документы и распределение портфеля на
              программы не подключены; не выдаём рейсы за подтверждённые заказы.
            </p>
          </>
        );
      const kinds: Record<string, string[]> = {
        severe: [],
        events: ['event', 'deviation', 'ground'],
        risks: ['risk'],
        findings: ['finding'],
        claims: ['claim'],
        inspections: ['inspection'],
        actions: ['action'],
      };
      if (kinds[kpi])
        return recordsTable(
          allowedRecords.filter(
            (r) =>
              kinds[kpi].includes(r.kind) &&
              (['risks', 'findings', 'actions'].includes(kpi) || inPeriod(r)),
          ),
        );
      if (['pbt', 'net', 'tax', 'interestIncome', 'financeCost'].includes(kpi))
        return (
          <>
            {financialTable([
              'op',
              'interestIncome',
              'financeCost',
              'pbt',
              'tax',
              'net',
            ])}
            <p>
              Ниже OP — только компания, без необоснованной аллокации по типам и
              рейсам. Прогноз налога технический, не налоговая декларация.
            </p>
          </>
        );
      return (
        <>
          <Chart rows={trend(kpi)} unit={m?.unit ?? 'млн ₽'} />
          {!scope.fleet ? (
            <Table
              heads={['Тип ВС', 'План', 'Факт', 'Прогноз']}
              rows={a.fleets.map((f) => [
                <a
                  key={f.id}
                  href={link({
                    fleet: f.id,
                    id: undefined,
                    aircraft: undefined,
                  })}
                >
                  {f.aircraft}
                </a>,
                ...(['plan', 'actual', 'forecast'] as const).map((v) =>
                  n(airValue(a, { ...scope, fleet: f.id }, kpi, v)),
                ),
              ])}
            />
          ) : !scope.aircraft ? (
            <Table
              heads={['Борт', 'План', 'Факт', 'Прогноз']}
              rows={a.planes
                .filter((p) => p.fleet === scope.fleet)
                .map((p) => [
                  <a key={p.id} href={link({ aircraft: p.id, id: undefined })}>
                    {p.id}
                  </a>,
                  ...(['plan', 'actual', 'forecast'] as const).map((v) =>
                    n(airValue(a, { ...scope, aircraft: p.id }, kpi, v)),
                  ),
                ])}
            />
          ) : (
            flightsTable(fs, kpi)
          )}
          {kpi === 'opex' &&
            financialTable(
              Object.keys(airCostNames).map((k) => 'expense-' + k),
            )}
        </>
      );
    };
    return (
      <section className="op-panel air-detail">
        <div className="air-detail-title">
          <div>
            <span className="air-eyebrow">{m?.en ?? 'SOURCE REGISTER'}</span>
            <h2>
              {m?.name ??
                (kpi === 'payments'
                  ? 'Реестр денежных движений'
                  : (airCostNames[kpi.slice(8)] ?? kpi))}
            </h2>
          </div>
          {m && <MetricHelp catalog="airline" metric={kpi} />}
        </div>
        {m && (
          <>
            <strong className="air-detail-number">
              {n(computed(kpi))} <small>{m.unit}</small>
            </strong>
            <p>{m.definition}</p>
            <p className="air-muted">
              Ответственный: {m.owner} · {a.name}.{' '}
              {m.grain === 'stock'
                ? 'Остаток на 31.08.2026.'
                : m.grain === 'future'
                  ? 'Будущая программа / фиксированный горизонт, указанный в паспорте.'
                  : 'Период: ' + scope.start + ' — ' + scope.end + '.'}
            </p>
          </>
        )}
        {content()}
      </section>
    );
  }
  return (
    <div className="air-workspace">
      <nav className="air-breadcrumbs">
        <a href={ownerHref({ page: 'overview' })}>Авиагруппа</a>
        <ChevronRight size={14} />
        <a
          href={ownerHref({
            page: 'company',
            company: 'MANAGEMENT',
            snapshot: a.snapshotId,
          })}
        >
          УК
        </a>
        <ChevronRight size={14} />
        <a
          href={link({
            metric: undefined,
            id: undefined,
            kpi: undefined,
            row: undefined,
            fleet: undefined,
            aircraft: undefined,
            category: undefined,
          })}
        >
          {a.name}
        </a>
        {section && (
          <>
            <ChevronRight size={14} />
            <a href={reset()}>{airSectionNames[section][0]}</a>
          </>
        )}
      </nav>
      <CompanyNavigation route={route}/>
      <div className="air-context">
        <span>
          {a.name}
        </span>
        <span>По состоянию на 31.08.2026</span>
      </div>
      {section && !kpi && !route.id && <header className="company-section-heading"><span>{airSectionNames[section][1]}</span><h2>{{commerce:'Коммерческий результат',economics:'Экономический результат',production:'Производственная программа',technical:'Флот и техника',finance:'Финансы и ликвидность',people:'Персонал и экипажи',safety:'Безопасность и качество'}[section]}</h2></header>}
      {section && (
        <div className="air-filters">
          <label>
            С месяца
            <input
              type="month"
              min="2026-01"
              max="2026-12"
              value={scope.start}
              onChange={(e) => {
                if (e.target.value)
                  window.location.assign(
                    link({
                      start: e.target.value,
                      id: undefined,
                    }),
                  );
              }}
            />
          </label>
          <label>
            По месяц
            <input
              type="month"
              min="2026-01"
              max="2026-12"
              value={scope.end}
              onChange={(e) => {
                if (e.target.value)
                  window.location.assign(
                    link({
                      end: e.target.value,
                      id: undefined,
                    }),
                  );
              }}
            />
          </label>
          <label>
            Основная цифра
            <select
              value={field}
              onChange={(e) =>
                window.location.assign(
                  link({
                    field: e.target.value as OwnerRoute['field'],
                  }),
                )
              }
            >
              <option value="forecast">Факт + прогноз</option>
              <option value="actual">Факт</option>
              <option value="plan">План</option>
            </select>
          </label>
          {section !== 'finance' && (
            <>
              <label>
                Тип ВС
                <select
                  value={scope.fleet ?? ''}
                  onChange={(e) =>
                    window.location.assign(
                      link({
                        fleet: e.target.value || undefined,
                        aircraft: undefined,
                        id: undefined,
                      }),
                    )
                  }
                >
                  <option value="">Все типы</option>
                  {a.fleets.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.aircraft}
                    </option>
                  ))}
                </select>
              </label>
              {section !== 'people' && (
                <label>
                  Борт
                  <select
                    value={scope.aircraft ?? ''}
                    onChange={(e) =>
                      window.location.assign(
                        link({
                          aircraft: e.target.value || undefined,
                          id: undefined,
                        }),
                      )
                    }
                  >
                    <option value="">Все борта</option>
                    {a.planes
                      .filter((p) => !scope.fleet || p.fleet === scope.fleet)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id}
                        </option>
                      ))}
                  </select>
                </label>
              )}
            </>
          )}
          {['commerce', 'production', 'economics'].includes(section) && (
            <label>
              Программа
              <select
                value={scope.category ?? 'ALL'}
                onChange={(e) =>
                  window.location.assign(
                    link({
                      category: e.target.value,
                      id: undefined,
                    }),
                  )
                }
              >
                <option value="ALL">Все задания</option>
                <option value="REGULAR">Регулярная</option>
                <option value="CHARTER">Чартерная</option>
              </select>
            </label>
          )}
        </div>
      )}
      {(kpi || route.id) && (
        <a
          className="air-back"
          href={link({
            id: undefined,
            kpi: route.id ? kpi : undefined,
            row: undefined,
          })}
        >
          <ArrowLeft size={17} />{' '}
          {route.id ? 'К показателю / разделу' : 'К разделу'}
        </a>
      )}
      {route.id || kpi
        ? detail()
        : !section
          ? <CompanyOverview data={data} route={route}/>
          : section === 'technical'
            ? technical()
            : section === 'people'
              ? people()
              : section === 'finance'
                ? finance()
                : section === 'safety'
                  ? safety()
                  : business()}
      <details className="op-panel air-method">
        <summary>Методика, источники и ограничения расчёта</summary>
        <p>
          Основные денежные суммы, рейсы и налёт взяты из единого среза AG.
          Метод расчёта: {a.method}. Роли обозначают зону ответственности;
          персональные назначения выполняются при внедрении.
        </p>
        <p>
          Парк: АК1 — 6 Ил-76 и 3 Ан-124; Авиакомпания 2 — 3 B737-400; Авиакомпания 3 — 5
          B747-400. План Авиакомпания 3 10 000 ч — рабочее допущение. Будущие
          дополнительные типы не включены в производственную программу.
        </p>
        <p>
          Нормативы применимости, сертифицированные мощности, полный FTL, AD /
          MEL / LLP, договоры и персональные документы должны быть подтверждены
          IT и владельцами функций. Проверка не разрешает полёт, не
          продлевает ресурс и не заменяет СУБП.
        </p>
        <ul>
          <li>
            <a
              href="https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentid/1035253"
              target="_blank"
              rel="noreferrer"
            >
              FAA AC 120-17B · мониторинг надёжности
            </a>
          </li>
          <li>
            <a
              href="https://www.easa.europa.eu/en/document-library/easy-access-rules/online-publications/easy-access-rules-continuing-airworthiness"
              target="_blank"
              rel="noreferrer"
            >
              EASA · Continuing Airworthiness
            </a>
          </li>
          <li>
            <a
              href="https://www.easa.europa.eu/en/document-library/easy-access-rules/online-publications/easy-access-rules-air-operations"
              target="_blank"
              rel="noreferrer"
            >
              EASA · Air Operations
            </a>
          </li>
          <li>
            <a
              href="https://report.lufthansagroup.com/2025/annual-report/en/combined-management-report/principles-of-the-group/employees/"
              target="_blank"
              rel="noreferrer"
            >
              Lufthansa Group · раздельные HC, FTE и текучесть
            </a>
          </li>
        </ul>
        <p>
          Международные источники — основание структуры мониторинга, не
          автоматическое распространение иностранного права на компании AG.
        </p>
      </details>
    </div>
  );
}
