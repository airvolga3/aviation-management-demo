'use client';
import { presentationText } from '@/lib/presentation-copy';
import { useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import type { ExecutiveSnapshot } from '@/lib/executive-model';
import { ownerHref, type OwnerRoute } from '@/lib/owner-model';
import type { CommercialView } from '@/lib/al1-commercial-model';
import { MetricHelp } from './metric-help';
import {
  buildAl1Economics,
  canonicalEconMetric,
  econDelta,
  econDirect,
  econExpenses,
  econFlex,
  econLine,
  econMetrics,
  econMonths,
  econPnl,
  econRatio,
  econRows,
  econUnit,
  econValue,
} from '@/lib/al1-economics-model';
const fmt = (n: number | null | undefined, d = 2) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: d }).format(n);
const mon = (m: string) =>
  new Date(m + '-15T12:00:00Z').toLocaleDateString('ru-RU', {
    month: 'short',
    timeZone: 'UTC',
  });
const fleetName = (s: string) =>
  s === 'AL1-IL76' ? 'Ил-76' : s === 'AL1-AN124' ? 'Ан-124' : s;
const tabs = [
  ['overview', 'Обзор'],
  ['pnl', 'P&L · весь результат'],
  ['costs', 'Все расходы'],
  ['acmi', 'ACMI'],
] as const;
const companyOnly = new Set([
  'pbt',
  'net',
  'tax',
  'financeCost',
  'interestIncome',
]);
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
                <td key={j}>{typeof v === 'string' ? presentationText(v) : v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p>Нет записей в выбранном периоде.</p>}
    </div>
  );
}
export default function Al1EconomicsWorkspace({
  data,
  route,
}: {
  data: ExecutiveSnapshot;
  route: OwnerRoute;
}) {
  const [page, setPage] = useState(0),
    [search, setSearch] = useState('');
  const c = data.commercial;
  const e = useMemo(() => (c ? buildAl1Economics(c) : null), [c]);
  const start = route.start || '2026-01',
    end = route.end || '2026-12',
    key = canonicalEconMetric(route.kpi || 'overview');
  const scope = { start, end, fleet: route.fleet, aircraft: route.aircraft };
  const view: CommercialView =
    route.field === 'actual'
      ? 'actual'
      : route.field === 'plan'
        ? 'plan'
        : 'forecast';
  const link = (k: string, patch: Partial<OwnerRoute> = {}) =>
    ownerHref({
      page: 'company',
      company: 'AL1',
      metric: 'economics',
      snapshot: data.snapshotId,
      ...scope,
      ...(route.id?.startsWith('ECO-AL1-') && !companyOnly.has(k)
        ? { start: route.id.slice(7), end: route.id.slice(7) }
        : {}),
      kpi: canonicalEconMetric(k),
      field: view,
      id:
        route.id?.startsWith('ECO-AL1-') && !companyOnly.has(k)
          ? undefined
          : route.id,
      ...patch,
    });
  const go = (k: string, patch: Partial<OwnerRoute> = {}) => {
    window.location.hash = link(k, patch);
  };
  if (!c || !e || c.snapshotId !== data.snapshotId)
    return (
      <section className="op-panel">
        <h2>Экономический срез недоступен</h2>
        <p>Требуется общий коммерческий источник.</p>
      </section>
    );
  const selectedFlight = route.id
    ? c.rows.find((r) => r.flightId === route.id)
    : undefined;
  const financial = route.id
    ? e.financial.find((f) => f.id === route.id)
    : undefined;
  const validIds = !route.id || !!selectedFlight || !!financial;
  const validFleet =
    !route.fleet || ['AL1-IL76', 'AL1-AN124'].includes(route.fleet);
  const validPlane =
    !route.aircraft ||
    c.rows.some(
      (r) =>
        r.aircraftId === route.aircraft &&
        (!route.fleet || r.fleet === route.fleet),
    );
  const rows = econRows(c, scope, selectedFlight?.flightId);
  if (
    !econMonths.includes(start) ||
    !econMonths.includes(end) ||
    start > end ||
    !validFleet ||
    !validPlane ||
    !validIds ||
    (!!financial && !companyOnly.has(key)) ||
    (!Object.hasOwn(econMetrics, key) && !tabs.some((t) => t[0] === key)) ||
    (route.snapshot && route.snapshot !== data.snapshotId) ||
    (selectedFlight && !rows.includes(selectedFlight)) ||
    (financial &&
      (financial.month < start ||
        financial.month > end ||
        !!route.fleet ||
        !!route.aircraft))
  )
    return (
      <section className="op-panel">
        <h2>Контекст недоступен или устарел</h2>
        <p>Период, объект и версия должны относиться к одному срезу.</p>
        <a
          href={ownerHref({
            page: 'company',
            company: 'AL1',
            metric: 'economics',
          })}
        >
          Открыть актуальную экономику АК1 →
        </a>
      </section>
    );
  const activeScope = financial
    ? { ...scope, start: financial.month, end: financial.month }
    : scope;
  const allRows = econRows(c, activeScope, selectedFlight?.flightId),
    closed = allRows.filter((r) => r.status !== 'FORECAST');
  const closedEnd = closed
    .map((r) => r.month)
    .sort()
    .at(-1);
  const closedScope = { ...activeScope, end: closedEnd || '0000-00' };
  const value = (k: string, v: CommercialView = view) =>
    econValue(c, e, activeScope, k, v, selectedFlight?.flightId);
  const planClosed = (k: string) =>
    closed.length
      ? econValue(c, e, closedScope, k, 'plan', selectedFlight?.flightId)
      : null;
  const selectedMonths = econMonths.filter(
    (m) => m >= activeScope.start && m <= activeScope.end,
  );
  const monthRows = (k: string) =>
    selectedMonths.map((month) => {
      const s = { ...activeScope, start: month, end: month },
        rs = econRows(c, s, selectedFlight?.flightId),
        future = rs.length > 0 && rs.every((r) => r.status === 'FORECAST');
      return {
        month,
        name: mon(month),
        plan: econValue(c, e, s, k, 'plan', selectedFlight?.flightId),
        actual: econValue(c, e, s, k, 'actual', selectedFlight?.flightId),
        forecast: future
          ? econValue(c, e, s, k, 'forecast', selectedFlight?.flightId)
          : null,
      };
    });
  const trend = (k: string) => (
    <div className="eco-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={monthRows(k)}
          margin={{ left: 0, right: 20, top: 15, bottom: 8 }}
        >
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
          <YAxis
            width={55}
            tickFormatter={(v: number) => fmt(v, 1)}
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
            domain={[
              (v: number) => Math.min(0, v),
              (v: number) => Math.max(0, v),
            ]}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--panel-solid)',
              border: '1px solid var(--line)',
              borderRadius: 10,
            }}
            formatter={(v) => fmt(Number(v)) + ' млн ₽'}
          />
          <ReferenceLine y={0} stroke="var(--muted)" />
          <Line
            name="План"
            isAnimationActive={false}
            dataKey="plan"
            stroke="var(--muted)"
            strokeDasharray="3 3"
            dot={false}
          />
          <Line
            name="Факт"
            isAnimationActive={false}
            dataKey="actual"
            stroke="var(--blue)"
            strokeWidth={3}
            dot={{ r: 3 }}
            connectNulls={false}
          />
          <Line
            name="Прогноз"
            isAnimationActive={false}
            dataKey="forecast"
            stroke="var(--warning)"
            strokeDasharray="6 4"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
  const legend = (
    <div className="al1-legend">
      <span>млн ₽</span>
      <span>┄ План</span>
      <span>● Факт</span>
      <span>┄ Прогноз будущих месяцев</span>
    </div>
  );
  const signClass = (k: string, delta: number | null) =>
    delta == null
      ? ''
      : (econMetrics[k].expense ? delta > 0 : delta < 0)
        ? 'eco-adverse'
        : 'eco-favorable';
  const pnlTable = (keys: string[]) => (
    <Table
      heads={[
        'Показатель · млн ₽',
        'План периода',
        'План закрытой части',
        'Факт закрытой части',
        'Δ факт / план',
        'Δ, %',
        'Прогноз периода',
        'Δ прогноз / план',
      ]}
      rows={keys.map((k) => {
        const a = value(k, 'actual'),
          p = planClosed(k),
          d = econDelta(a, p);
        return [
          <span className="metric-title">
            <a href={link(k)} className="eco-row-title">
              {econMetrics[k].name}
              <ChevronRight size={14} />
            </a>
            <MetricHelp catalog="economics" metric={k} />
          </span>,
          <a href={link(k, { field: 'plan' })}>{fmt(value(k, 'plan'))}</a>,
          fmt(p),
          <a href={link(k, { field: 'actual' })}>{fmt(a)}</a>,
          <span className={signClass(k, d.amount)}>{fmt(d.amount)}</span>,
          d.percent == null
            ? p === 0 && a !== 0
              ? 'Вне плана'
              : '—'
            : fmt(d.percent, 1) + '%',
          <a href={link(k, { field: 'forecast' })}>
            {fmt(value(k, 'forecast'))}
          </a>,
          <span
            className={signClass(
              k,
              econDelta(value(k, 'forecast'), value(k, 'plan')).amount,
            )}
          >
            {fmt(econDelta(value(k, 'forecast'), value(k, 'plan')).amount)} ·{' '}
            {fmt(econDelta(value(k, 'forecast'), value(k, 'plan')).percent, 1)}%
          </span>,
        ];
      })}
    />
  );
  const expenseKeys = [...econExpenses.map((x) => x.id), 'financeCost', 'tax'];
  const acmiKeys = econExpenses.filter((x) => x.acmi).map((x) => x.id);
  const controls = (
    <div className="eco-controls">
      <label>
        С месяца
        <select
          value={start}
          aria-label="С месяца"
          onChange={(ev) =>
            go(key, {
              start: ev.target.value,
              end: ev.target.value > end ? ev.target.value : end,
              id: undefined,
              from: undefined,
            })
          }
        >
          {econMonths.map((m) => (
            <option key={m} value={m}>
              {mon(m)} 2026
            </option>
          ))}
        </select>
      </label>
      <label>
        По месяц
        <select
          value={end}
          aria-label="По месяц"
          onChange={(ev) =>
            go(key, {
              end: ev.target.value,
              start: ev.target.value < start ? ev.target.value : start,
              id: undefined,
              from: undefined,
            })
          }
        >
          {econMonths.map((m) => (
            <option key={m} value={m}>
              {mon(m)} 2026
            </option>
          ))}
        </select>
      </label>
      <label>
        Тип ВС
        <select
          value={route.fleet || ''}
          aria-label="Тип ВС"
          onChange={(ev) =>
            go(key, {
              fleet: ev.target.value || undefined,
              aircraft: undefined,
              id: undefined,
              from: undefined,
            })
          }
        >
          <option value="">Вся Авиакомпания 1</option>
          <option value="AL1-IL76">Ил-76</option>
          <option value="AL1-AN124">Ан-124</option>
        </select>
      </label>
      <label>
        Основа раскрытия
        <select
          value={view}
          aria-label="Основа раскрытия"
          onChange={(ev) =>
            go(key, {
              field: ev.target.value as OwnerRoute['field'],
              id: route.id,
              from: route.from,
            })
          }
        >
          <option value="forecast">Факт + прогноз периода</option>
          <option value="actual">Факт закрытой части</option>
          <option value="plan">План периода</option>
        </select>
      </label>
      <a
        href={link(key, {
          start: '2026-01',
          end: closedEnd || '2026-08',
          id: undefined,
          from: undefined,
        })}
      >
        С начала года
      </a>
      <a
        href={link(key, {
          start: '2026-01',
          end: '2026-12',
          fleet: undefined,
          aircraft: undefined,
          id: undefined,
          from: undefined,
        })}
      >
        Сбросить отбор
      </a>
    </div>
  );
  const hero = (k: string) => (
    <div key={k} className="metric-help-wrap">
      <a className="eco-hero" href={link(k)}>
        <span>
          {econMetrics[k].name}
          <ArrowUpRight size={17} />
        </span>
        <strong>
          {fmt(value(k))}
          <small> млн ₽</small>
        </strong>
        <p>
          {view === 'forecast'
            ? 'Факт + прогноз периода'
            : view === 'actual'
              ? 'Факт закрытой части'
              : 'План периода'}
        </p>
        <div>
          План периода {fmt(value(k, 'plan'))} · факт {fmt(value(k, 'actual'))}
        </div>
        <small>{econMetrics[k].en}</small>
        <div>
          Δ прогноза к плану{' '}
          {fmt(econDelta(value(k, 'forecast'), value(k, 'plan')).amount)} млн ₽
        </div>
      </a>
      <MetricHelp catalog="economics" metric={k} />
    </div>
  );
  const activeMetric = econMetrics[key];
  const operatingExpense = !!activeMetric?.expense && !companyOnly.has(key);
  const expenseAnalysis = (k: string) => {
    const A = value(k, 'actual'),
      P = planClosed(k),
      F = econFlex(allRows, k),
      d = econDelta(A, P),
      cost = value(k),
      revenue = value('revenue');
    return (
      <>
        <div className="eco-stats">
          <div>
            <span>Факт / план закрытой части</span>
            <strong className={signClass(k, d.amount)}>
              {fmt(econRatio(A, P, 100), 1)}%
            </strong>
            <small>
              Отклонение {fmt(d.amount)} млн ₽ · {fmt(d.percent, 1)}%
            </small>
          </div>
          <div>
            <span>Затраты / выручка</span>
            <strong>{fmt(econRatio(cost, revenue, 100), 1)}%</strong>
            <small>Один период и один сценарий</small>
          </div>
          <div>
            <span>На лётный час</span>
            <strong>{fmt(econUnit(allRows, cost, view, 'FH'))}</strong>
            <small>тыс. ₽ / ч · включая перегоны</small>
          </div>
          <div>
            <span>На тонно-километр</span>
            <strong>{fmt(econUnit(allRows, cost, view, 'CTK'))}</strong>
            <small>₽ / физический CTK</small>
          </div>
        </div>
        {F != null && A != null && P != null && (
          <div className="eco-flex">
            <h3>Что объясняет отклонение бюджета</h3>
            <div>
              <span>
                План закрытой части <b>{fmt(P)}</b>
              </span>
              <span>
                Изменение объёма <b>{fmt(F - P)}</b>
              </span>
              <span>
                Отклонение от модельного норматива <b>{fmt(A - F)}</b>
              </span>
              <span>
                Факт <b>{fmt(A)}</b>
              </span>
            </div>
            <p>
              млн ₽. Переменные расходы пересчитаны по фактическим часам или
              выполненным участкам; постоянные не масштабируются. Это нормализация, не доказательство изменения цены или расхода
              топлива.
            </p>
          </div>
        )}
      </>
    );
  };
  const fallbackBridge = !!route.fleet || !!route.aircraft || !!selectedFlight;
  const bridgeKeys = [
    'revenue',
    'c1',
    'variableAcmi',
    'fixedAcmi',
    'programFixed',
    'indirect',
    'depreciation',
    'otherOp',
    ...(fallbackBridge
      ? ['op']
      : ['interestIncome', 'financeCost', 'tax', 'net']),
  ];
  let running = 0;
  const waterfall = bridgeKeys
    .map((k) => {
      const amount = value(k);
      if (amount == null) return null;
      const total = k === 'revenue' || k === 'net' || k === 'op',
        signed = econMetrics[k].expense ? -amount : amount,
        from = total ? 0 : running,
        to = total ? amount : running + signed;
      running = to;
      return {
        key: k,
        name: ({revenue:'Выручка',c1:'Прямые',variableAcmi:'ACMI перем.',fixedAcmi:'ACMI пост.',programFixed:'Программы',indirect:'Косвенные',depreciation:'Амортизация',otherOp:'Прочие оп.',interestIncome:'Проц. доход',financeCost:'Фин. расходы',tax:'Налог',net:'Чистая прибыль',op:'OP'} as Record<string,string>)[k],
        range: [Math.min(from, to), Math.max(from, to)],
        amount: total ? amount : signed,
        total,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
  const monthlyTable = (k: string) => (
    <Table
      heads={[
        'Месяц',
        'План',
        'Факт',
        'Δ факт / план',
        'Рост к предыдущему месяцу, %',
        'Прогноз',
      ]}
      rows={monthRows(k).map((m) => {
        const i = econMonths.indexOf(m.month),
          prev =
            i > 0
              ? econValue(
                  c,
                  e,
                  {
                    ...activeScope,
                    start: econMonths[i - 1],
                    end: econMonths[i - 1],
                  },
                  k,
                  'actual',
                  selectedFlight?.flightId,
                )
              : null,
          d = econDelta(m.actual, m.plan),
          growth = econDelta(m.actual, prev);
        return [
          <a
            href={link(k, {
              start: m.month,
              end: m.month,
              id: selectedFlight?.flightId,
            })}
          >
            {mon(m.month)}
          </a>,
          fmt(m.plan),
          fmt(m.actual),
          <span className={signClass(k, d.amount)}>{fmt(d.amount)}</span>,
          fmt(growth.percent, 1),
          fmt(m.forecast),
        ];
      })}
    />
  );
  const breakdown = (k: string) => {
    if (companyOnly.has(k) && (route.fleet || route.aircraft))
      return (
        <p>
          Нет базы распределения.{' '}
          <a
            href={link(k, {
              fleet: undefined,
              aircraft: undefined,
              id: undefined,
            })}
          >
            Показать всю компанию →
          </a>
        </p>
      );
    if (companyOnly.has(k))
      return (
        <>
          <p>
            Эта статья — компания–месяц. Распределения на типы ВС и рейсы нет.
          </p>
          <Table
            heads={['Расчётное основание', 'План', 'Факт', 'Прогноз периода']}
            rows={e.financial
              .filter((f) => selectedMonths.includes(f.month))
              .map((f) => [
                <a href={link(k, { id: f.id, from: 'evidence' })}>{f.id}</a>,
                fmt(
                  econValue(c, e, { start: f.month, end: f.month }, k, 'plan'),
                ),
                fmt(
                  econValue(
                    c,
                    e,
                    { start: f.month, end: f.month },
                    k,
                    'actual',
                  ),
                ),
                fmt(
                  econValue(
                    c,
                    e,
                    { start: f.month, end: f.month },
                    k,
                    'forecast',
                  ),
                ),
              ])}
          />
        </>
      );
    const field = route.aircraft
      ? 'flightId'
      : route.fleet
        ? 'aircraftId'
        : 'fleet';
    const ids = Array.from(new Set(allRows.map((r) => r[field]))).filter((id) =>
      id.toLowerCase().includes(search.toLowerCase()),
    );
    return (
      <>
        <div className="eco-search">
          <label>
            Найти объект{' '}
            <input
              value={search}
              onChange={(ev) => {
                setSearch(ev.target.value);
                setPage(0);
              }}
              placeholder="Тип, борт или рейс"
            />
          </label>
        </div>
        <Table
          heads={[
            field === 'fleet'
              ? 'Тип ВС'
              : field === 'aircraftId'
                ? 'Борт'
                : 'Рейс / плановое задание',
            'План',
            'Факт',
            'Факт + прогноз',
          ]}
          rows={ids.slice(page * 20, page * 20 + 20).map((id) => {
            const patch =
              field === 'fleet'
                ? { fleet: id, aircraft: undefined }
                : field === 'aircraftId'
                  ? { aircraft: id }
                  : { id };
            const rs = allRows.filter((r) => r[field] === id);
            return [
              <a href={link(k, patch)}>
                {field === 'fleet' ? fleetName(id) : id} →
              </a>,
              fmt(econDirect(rs, k, 'plan')),
              fmt(econDirect(rs, k, 'actual')),
              fmt(econDirect(rs, k, 'forecast')),
            ];
          })}
        />
        <div className="eco-pages">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>
            Назад
          </button>
          <span>
            {ids.length} объектов · страница {page + 1}
          </span>
          <button
            disabled={(page + 1) * 20 >= ids.length}
            onClick={() => setPage(page + 1)}
          >
            Далее
          </button>
        </div>
      </>
    );
  };
  return (
    <div className="eco-workspace ops-workspace">
      <header className="eco-heading">
        <div>
          <h2>Экономика Авиакомпания 1</h2>
          <p>Результат, расходы и причины отклонений</p>
        </div>
        <span className="eco-badge">Срез данных · 31.08.2026</span>
      </header>
      {controls}
      <nav className="eco-tabs" aria-label="Экономические разделы">
        {tabs.map(([id, name]) => (
          <a
            key={id}
            className={key === id ? 'active' : ''}
            href={link(id, { id: undefined, from: undefined })}
          >
            {name}
          </a>
        ))}
      </nav>
      {(route.fleet || route.aircraft || route.id) && (
        <nav className="op-trail">
          <a
            href={link(key, {
              fleet: undefined,
              aircraft: undefined,
              id: undefined,
              from: undefined,
            })}
          >
            Вся компания
          </a>
          {route.fleet && (
            <>
              <ChevronRight size={14} />
              <a
                href={link(key, {
                  aircraft: undefined,
                  id: undefined,
                  from: undefined,
                })}
              >
                {fleetName(route.fleet)}
              </a>
            </>
          )}
          {route.aircraft && (
            <>
              <ChevronRight size={14} />
              <a href={link(key, { id: undefined, from: undefined })}>
                {route.aircraft}
              </a>
            </>
          )}
          {route.id && <span> / {route.id}</span>}
        </nav>
      )}
      <p className="eco-basis">
        {activeScope.start} — {activeScope.end} · факт{' '}
        {closedEnd ? 'до ' + closedEnd : 'отсутствует'} · единые суммы с коммерцией и группой.
      </p>
      {key === 'overview' ? (
        <>
          <div className="eco-heroes eco-result-heroes">{['op', 'net'].map(hero)}</div>
          <div className="eco-grid">
            <section className="op-panel">
              <header>
                <h3>Операционная прибыль · M4 по месяцам</h3>
                <a href={link('op')}>Раскрыть →</a>
              </header>
              {legend}
              {trend('op')}
            </section>
            <section className="op-panel">
              <header>
                <h3>Операционные расходы</h3>
                <a href={link('opex')}>Раскрыть →</a>
              </header>
              {legend}
              {trend('opex')}
            </section>
          </div>
          <section className="op-panel">
            <header>
              <h3>
                Как формируется{' '}
                {fallbackBridge ? 'операционный результат' : 'чистая прибыль'}
              </h3>
              <a href={link('pnl')}>Весь P&L →</a>
            </header>
            <p>
              млн ₽ ·{' '}
              {view === 'forecast'
                ? 'факт + прогноз'
                : view === 'plan'
                  ? 'план'
                  : 'факт'}
              . Нажмите на статью ниже для раскрытия.
            </p>
            <div className="eco-waterfall">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={waterfall}
                  margin={{ bottom: 75, left: 0, right: 12 }}
                >
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    angle={-35}
                    textAnchor="end"
                    height={90}
                    interval={0}
                    tick={{ fill: 'var(--muted)', fontSize: 12 }}
                  />
                  <YAxis
                    width={50}
                    tick={{ fill: 'var(--muted)', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--panel-solid)' }}
                    formatter={(_v, _name, item) =>
                      fmt((item.payload as { amount: number }).amount) +
                      ' млн ₽'
                    }
                  />
                  <ReferenceLine y={0} stroke="var(--muted)" />
                  <Bar dataKey="range" isAnimationActive={false}>
                    {waterfall.map((r) => (
                      <Cell
                        key={r.key}
                        cursor="pointer"
                        onClick={() => go(r.key)}
                        fill={
                          r.total
                            ? 'var(--blue)'
                            : r.amount < 0
                              ? 'var(--warning)'
                              : 'var(--muted)'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="eco-chips">
              {bridgeKeys
                .filter((k) => value(k) != null)
                .map((k) => (
                  <a key={k} href={link(k)}>
                    {econMetrics[k].name} {fmt(value(k))}
                  </a>
                ))}
            </div>
            {fallbackBridge && (
              <p>
                Финансовые статьи и налог не распределены ниже компании. Чистая
                прибыль здесь не рассчитывается.
              </p>
            )}
          </section>
          <section className="op-panel">
            <h3>Расходы, требующие разбора</h3>
            <p>
              Отклонение не менее ±5% от плана закрытой части. Это запрос
              пояснения, а не автоматический вывод о виновнике.
            </p>
            {pnlTable(
              expenseKeys
                .filter((k) => {
                  const d = econDelta(value(k, 'actual'), planClosed(k));
                  return d.percent != null && Math.abs(d.percent) >= 5;
                })
                .sort(
                  (a, b) =>
                    Math.abs(value(b, 'actual')! - planClosed(b)!) -
                    Math.abs(value(a, 'actual')! - planClosed(a)!),
                )
                .slice(0, 5),
            )}
          </section>
        </>
      ) : key === 'pnl' ? (
        <section className="op-panel">
          <h3>От выручки к чистой прибыли</h3>
          <p>
            Расходы показаны положительными суммами и вычитаются на своей
            ступени один раз. M1–M4 не складываются.
          </p>
          {pnlTable(econPnl)}
          {(route.fleet || route.aircraft) && (
            <p>
              PBT, налог и чистая прибыль доступны только по всей компании:
              корпоративные статьи не распределены.
            </p>
          )}
          <h3>Рентабельность</h3>
          <Table
            heads={[
              'Маржа',
              'План, %',
              'Факт, %',
              'Отклонение, п. п.',
              'Прогноз, %',
            ]}
            rows={['op', 'net'].map((k) => {
              const p = econRatio(planClosed(k), planClosed('revenue'), 100),
                a = econRatio(
                  value(k, 'actual'),
                  value('revenue', 'actual'),
                  100,
                );
              return [
                <a href={link(k)}>{econMetrics[k].name} / выручка</a>,
                fmt(p),
                fmt(a),
                fmt(a == null || p == null ? null : a - p),
                fmt(
                  econRatio(
                    value(k, 'forecast'),
                    value('revenue', 'forecast'),
                    100,
                  ),
                ),
              ];
            })}
          />
        </section>
      ) : key === 'costs' || key === 'acmi' ? (
        <>
          <div className="eco-heroes">
            {(key === 'acmi'
              ? ['variableAcmi', 'fixedAcmi', 'fullAcmi']
              : ['opex', 'financeCost', 'tax']
            ).map(hero)}
          </div>
          <section className="op-panel">
            <h3>
              {key === 'acmi'
                ? 'Состав ACMI'
                : 'Динамика операционных расходов'}
            </h3>
            {legend}
            {trend(key === 'acmi' ? 'fullAcmi' : 'opex')}
            {expenseAnalysis(key === 'acmi' ? 'fullAcmi' : 'opex')}
          </section>
          <section className="op-panel">
            <h3>
              {key === 'acmi'
                ? 'Aircraft · Crew · Maintenance · Insurance'
                : 'Все статьи расходов'}
            </h3>
            <p>
              {key === 'acmi'
                ? 'ACMI — разрез существующих расходов, не дополнительная сумма.'
                : 'Финансовые расходы и налог находятся ниже OP и не входят в OPEX.'}
            </p>
            {pnlTable(key === 'acmi' ? acmiKeys : expenseKeys)}
          </section>
        </>
      ) : (
        <>
          <section className="op-panel">
            <a
              href={link(activeMetric.expense ? 'costs' : 'pnl')}
              className="al1-return"
            >
              <ArrowLeft size={16} />К{' '}
              {activeMetric.expense ? 'расходам' : 'P&L'}
            </a>
            <h3>
              {activeMetric.name} <small>{activeMetric.en}</small>
            </h3>
            <p>{presentationText(activeMetric.definition)}</p>
            <div className="eco-heroes">{hero(key)}</div>
            {companyOnly.has(key) && (route.fleet || route.aircraft) && (
              <p>
                Нет подтверждённой базы распределения.{' '}
                <a
                  href={link(key, {
                    fleet: undefined,
                    aircraft: undefined,
                    id: undefined,
                  })}
                >
                  Посмотреть всю компанию →
                </a>
              </p>
            )}
            {legend}
            {trend(key)}
            {operatingExpense && expenseAnalysis(key)}
            {monthlyTable(key)}
            <p>
              Рост — факт к факту предыдущего календарного месяца того же
              объекта. За январь нет базы; сравнение с прошлым годом недоступно:
              данных 2025 года нет.
            </p>
          </section>
          <section className="op-panel">
            <h3>
              {route.from === 'evidence'
                ? 'Расчётное основание'
                : 'Из чего состоит показатель'}
            </h3>
            {selectedFlight ? (
              <>
                <p>
                  {selectedFlight.flightId} · {fleetName(selectedFlight.fleet)}{' '}
                  · {selectedFlight.aircraftId} · {selectedFlight.date}
                </p>
                <p>
                  Суммы распределены из бюджета компании по плановому налёту с
                  коэффициентом типа. Расход на отменённом задании — остаток
                  распределения, а не доказательство выполненной заправки или
                  услуги.
                </p>
                {pnlTable(
                  operatingExpense
                    ? econExpenses
                        .filter(
                          (x) =>
                            key === 'opex' ||
                            x.id === key ||
                            (key === 'c1' && x.layer === 'c1') ||
                            (key === 'variableAcmi' && x.layer === 'c2') ||
                            (key === 'fixedAcmi' &&
                              x.layer === 'c3' &&
                              x.acmi) ||
                            (key === 'fullAcmi' && x.acmi) ||
                            (key === 'indirect' && x.layer === 'c4'),
                        )
                        .map((x) => x.id)
                    : econPnl.filter((k) => !companyOnly.has(k)),
                )}
                {route.from === 'evidence' ? (
                  <div className="eco-source-card">
                    <h4>Основание распределения</h4>
                    <p>
                      Источник: общий реестр AL1 Ledger → пул расходов месяца →
                      исходная статья → классификатор {e.method} → выбранное
                      задание.
                    </p>
                    <p>
                      Амортизация взята из общей месячной модели группы и
                      распределена теми же весами. Из пула «Прочие» сначала
                      выделена эта сумма; остаток распределён по нормированным
                      долям. Остальные статьи: исходный пул × доля строки.
                      Полная сумма каждого пула сохраняется. Реальный счёт, акт
                      или проводка не подключены.
                    </p>
                    <p>
                      Срез: {e.snapshotId}. Поставщик: финансово-экономическая
                      служба. Статус: синтетическое расчётное основание.
                    </p>
                  </div>
                ) : (
                  <a
                    href={link(key, {
                      id: selectedFlight.flightId,
                      from: 'evidence',
                    })}
                  >
                    Открыть расчётное основание →
                  </a>
                )}
              </>
            ) : financial ? (
              <div className="eco-source-card">
                <h4>{financial.id} · DEMO</h4>
                <p>{activeMetric.definition}</p>
                <p>
                  Компания: Авиакомпания 1. Период: {financial.month}. Владелец
                  методики: финансовый директор; поставщик: бухгалтерия /
                  казначейство.
                </p>
                <p>
                  Сумма {fmt(value(key))} млн ₽. входы: процентный
                  расход 3,5 млн ₽/месяц по плану; прогноз 4 + 0,12 × номер
                  месяца от нуля. Процентный доход: 0,3 / 0,25 млн ₽. Текущий
                  налог — изменение накопленного расчётного обязательства по
                  прибыли; это не остаток долга и не платёж.
                </p>
                <p>
                  Отложенный налог и валютный результат = 0 по явному допущению. Корпоративных документов нет.
                </p>
              </div>
            ) : (
              breakdown(key)
            )}
          </section>
          {activeMetric.expense && (
            <section className="op-panel">
              <h3>Ответственность и следующий разбор</h3>
              <p>
                Владелец статьи:{' '}
                {econExpenses.find((x) => x.id === key)?.owner ||
                  'Финансовый директор'}
                . Владелец результата — ГД АК1; поставщик —
                финансово-экономическая служба.
              </p>
              <p>
                Проверить объём, ставку, курс, перенос признания и базу
                распределения. Причина пока не подтверждена; автоматического
                назначения виновника нет. Экономия проверяется вместе с
                выполнением программы, безопасностью и планом ТО.
              </p>
              <p>
                Действие, исполнитель, срок и эффект требуют назначения. В этой
                версии решения не сохраняются и в прогноз автоматически не
                включаются.
              </p>
            </section>
          )}
        </>
      )}
      <details className="eco-method">
        <summary>Методика, источники и ограничения</summary>
        <p>
          {e.method} · {e.snapshotId}. M4 = операционная прибыль — единое проектное определение. Амортизация и прочие операционные расходы учтены до M4 один раз. Состав ACMI и распределение статей остаются учебными. Общий источник: те же {c.rows.length} заданий,
          Revenue/OP и пять исходных пулов, что в коммерции. Распределение не
          превращается в первичный факт.
        </p>
        <p>
          Косвенные расходы и постоянный ACMI уже включены в распределённые
          строки; нераспределённый операционный остаток в DEMO = 0. Финансовые
          статьи и налог не распределяются. Равенство типов компании проверяется
          до OP, а не для PBT/Net Profit.
        </p>
        <p>
          Удельные значения — отношение сумм, при нулевом знаменателе — «—».
          Будущий факт не подменяется прогнозом. Для остатков ДЗ/КЗ используйте
          финансовый раздел; полный налоговый регистр и корпоративный Superset
          ещё не подключены.
        </p>
        <a
          href="https://www.accaglobal.com/gb/en/student/exam-support-resources/fundamentals-exams-study-resources/f5/technical-articles/budgeting1.html"
          target="_blank"
          rel="noreferrer"
        >
          ACCA · бюджет при фактическом объёме
        </a>{' '}
        ·{' '}
        <a
          href="https://www.ifrs.org/issued-standards/list-of-standards/ias-12-income-taxes/"
          target="_blank"
          rel="noreferrer"
        >
          IAS 12 · налог на прибыль
        </a>
      </details>
    </div>
  );
}
