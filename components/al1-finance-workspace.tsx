'use client';
import { presentationText } from '@/lib/presentation-copy';
import { useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, ChevronRight } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  ComposedChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import type { ExecutiveSnapshot } from '@/lib/executive-model';
import { ownerHref, type OwnerRoute } from '@/lib/owner-model';
import { econMonths } from '@/lib/al1-economics-model';
import {
  buildAl1Finance,
  financeEvents,
  financeTotal,
  bankBalances,
  financeWeeks,
  financeBlocks,
  financeMetrics,
  cashCategories,
  contractBalance,
  monthEnd,
  fsum,
  type CashView,
  type CashEvent,
} from '@/lib/al1-finance-model';
import { MetricHelp } from './metric-help';
const num = (n: number | null | undefined, d = 2) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: d }).format(n);
const date = (d: string) =>
  new Date(d + 'T12:00:00Z').toLocaleDateString('ru-RU', { timeZone: 'UTC' });
const mon = (m: string) =>
  new Date(m + '-15T12:00:00Z').toLocaleDateString('ru-RU', {
    month: 'short',
    timeZone: 'UTC',
  });
const Help = ({ id }: { id: string }) => (
  <MetricHelp catalog="finance" metric={id} />
);
function Table({ heads, rows }: { heads: ReactNode[]; rows: ReactNode[][] }) {
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
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{typeof cell === 'string' ? presentationText(cell) : cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="fin-empty">В этом отборе нет денежных операций.</p>
      )}
    </div>
  );
}
const chartTooltip = {
  background: 'var(--glass-strong)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  color: 'var(--ink)',
};
export default function Al1FinanceWorkspace({
  data,
  route,
}: {
  data: ExecutiveSnapshot;
  route: OwnerRoute;
}) {
  const f = useMemo(
    () => data.finance || (data.commercial ? buildAl1Finance(data) : null),
    [data],
  );
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(0),
    [stress, setStress] = useState(false);
  if (!f)
    return (
      <section className="op-panel">
        <h2>Финансовый срез недоступен</h2>
        <p>Требуется согласованный источник экономики.</p>
      </section>
    );
  const start = route.start || '2026-01',
    end = route.end || '2026-12',
    view: CashView =
      route.field === 'plan'
        ? 'plan'
        : route.field === 'actual'
          ? 'actual'
          : 'forecast';
  const key =
      route.kpi ||
      (route.id?.startsWith('PAY-')
        ? 'calendar'
        : route.id?.startsWith('AR-')
          ? 'settlements'
          : 'overview'),
    asOf = route.from || f.asOf;
  const account = route.row?.startsWith('ACC-') ? route.row : undefined;
  const contract = f.events.some((x) => x.contract === route.row)
    ? route.row
    : route.id?.startsWith('AR-')
      ? route.id
      : undefined;
  const category =
    route.category ||
    (route.row && !account && !contract ? route.row : undefined);
  const scope = { start, end, view, account, category, contract };
  const href = (k = key, patch: Partial<OwnerRoute> = {}) =>
    ownerHref({
      page: 'company',
      company: 'AL1',
      metric: 'finance',
      snapshot: f.snapshotId,
      start,
      end,
      field: view,
      kpi: k,
      from: asOf,
      ...patch,
    });
  const go = (patch: Partial<OwnerRoute>) => {
    window.location.hash = href(key, {
      row: route.row,
      category: route.category,
      ...patch,
    });
  };
  const invalid =
    !econMonths.includes(start) ||
    !econMonths.includes(end) ||
    start > end ||
    !['overview', ...financeBlocks, 'calendar', 'ledger'].includes(key) ||
    !bankBalances(f, asOf, view) ||
    !econMonths.some((m) => monthEnd(m) === asOf) ||
    !!route.fleet ||
    !!route.aircraft ||
    !!route.captain ||
    !!(route.snapshot && route.snapshot !== f.snapshotId) ||
    !!(account && !f.accounts.some((a) => a.id === account)) ||
    !!(route.row && !account && !contract && !cashCategories[route.row]) ||
    !!(
      route.category &&
      route.row &&
      !account &&
      !contract &&
      route.category !== route.row
    ) ||
    !!(contract && !f.events.some((x) => x.contract === contract)) ||
    !!(category && !cashCategories[category]);
  if (invalid)
    return (
      <section className="op-panel">
        <h2>Финансовый контекст не совпадает</h2>
        <p>
          Проверьте период, дату состояния и версию. Остатки банков не
          распределяются по типам ВС и рейсам.
        </p>
        <a
          href={ownerHref({
            page: 'company',
            company: 'AL1',
            metric: 'finance',
            snapshot: f.snapshotId,
          })}
        >
          Открыть текущий финансовый срез АК1
        </a>
      </section>
    );
  const events = financeEvents(f, scope),
    banks = bankBalances(f, asOf, view)!,
    balance = fsum(banks.map((a) => a.total)),
    available = fsum(banks.map((a) => a.available));
  const weeks = financeWeeks(f),
    worst = weeks.reduce((a, b) => (a.available < b.available ? a : b)),
    headroom =
      Math.min(
        fsum(bankBalances(f, f.asOf)!.map((a) => a.available)),
        ...weeks.map((w) => w.available),
      ) - f.reserve;
  const ocf = financeTotal(f, { start, end, view }, 'OCF');
  const scopedOcf = financeTotal(f, scope, 'OCF');
  const matchedEnd =
    view === 'actual' && end > f.asOf.slice(0, 7) ? f.asOf.slice(0, 7) : end;
  const plan =
    start > matchedEnd
      ? null
      : financeTotal(f, { start, end: matchedEnd, view: 'plan' }, 'OCF');
  const belongs = (x: CashEvent) =>
    [
      'ledger',
      'overview',
      'banks',
      'settlements',
      'bridge',
      'calendar',
    ].includes(key) ||
    (key === 'operations'
      ? x.flow === 'OCF'
      : cashCategories[x.category].block === key);
  const weekId =
    route.week || (route.id?.startsWith('PAY-') ? route.id : undefined);
  const week =
    weekId && key === 'calendar' && view === 'forecast'
      ? weeks.find(
          (w) =>
            w.id === weekId &&
            w.date.slice(0, 7) >= start &&
            w.date.slice(0, 7) <= end,
        )
      : undefined;
  const event = route.id
    ? events.find(
        (x) =>
          x.id === route.id && belongs(x) && (!weekId || x.weekId === week?.id),
      )
    : undefined;
  if (
    (weekId && !week) ||
    (route.id &&
      !event &&
      route.id !== week?.id &&
      !(route.id === contract && data.al1?.debt.some((d) => d.id === contract)))
  )
    return (
      <section className="op-panel">
        <h2>Запись не входит в выбранный период или сценарий</h2>
        <a href={href('overview')}>К финансам АК1</a>
      </section>
    );
  const blockRows = events.filter(belongs);
  const cashTrend = econMonths
    .filter((m) => m >= start && m <= end)
    .map((m) => {
      const rows = financeEvents(f, { ...scope, start: m, end: m }).filter(
        belongs,
      );
      const planned = financeEvents(f, {
        ...scope,
        start: m,
        end: m,
        view: 'plan',
      }).filter(belongs);
      const futureFact = view === 'actual' && m > f.asOf.slice(0, 7);
      return {
        label: mon(m),
        receipts: futureFact
          ? null
          : fsum(rows.filter((x) => x.direction === 'in').map((x) => x.amount)),
        payments: futureFact
          ? null
          : fsum(
              rows.filter((x) => x.direction === 'out').map((x) => x.amount),
            ),
        plan: fsum(
          planned.filter((x) => x.direction === 'out').map((x) => x.amount),
        ),
      };
    });
  const filtered = (
    week ? blockRows.filter((x) => x.weekId === week.id) : blockRows
  ).filter((x) =>
    `${x.id} ${cashCategories[x.category].name} ${x.counterparty} ${x.contract}`
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  const eventLink = (x: CashEvent) => (
    <a
      href={href(key, {
        row: route.row,
        category: route.category,
        week: week?.id,
        id: x.id,
      })}
    >
      {cashCategories[x.category].name} <ArrowUpRight size={13} />
    </a>
  );
  const monthly = econMonths
    .filter((m) => m >= start && m <= end)
    .map((m) => ({
      month: m,
      label: mon(m),
      plan: financeTotal(f, { start: m, end: m, view: 'plan' }, 'OCF'),
      actual: financeTotal(f, { start: m, end: m, view: 'actual' }, 'OCF'),
      forecast:
        m > f.asOf.slice(0, 7)
          ? financeTotal(f, { start: m, end: m, view: 'forecast' }, 'OCF')
          : null,
    }));
  const bankLabel =
    (contract
      ? f.events.find((x) => x.contract === contract)?.counterparty +
        ' · ' +
        contract
      : account
        ? f.accounts.find((a) => a.id === account)!.name
        : undefined) || undefined;
  const scopeLabel = [
    bankLabel,
    category ? cashCategories[category].name : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
  const groupLink = ownerHref({
    page: 'executive-detail',
    company: 'AL1',
    metric: 'ocf',
    field: view,
    snapshot: f.snapshotId,
  });
  const header = (
    <>
      <div className="fin-heading">
        <div>
          <h2>Финансы и ликвидность</h2>
          <span className="fin-meta">
            Авиакомпания 1 · срез данных {date(f.asOf)}
          </span>
        </div>
        <a className="al1-return" href={groupLink}>
          OCF года в общей модели <ArrowUpRight size={15} />
        </a>
      </div>
      <div className="fin-controls">
        <label>
          Период с
          <select
            aria-label="Финансы: период с"
            value={start}
            onChange={(e) =>
              go({
                start: e.target.value,
                end: e.target.value > end ? e.target.value : end,
                id: undefined,
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
          по
          <select
            aria-label="Финансы: период по"
            value={end}
            onChange={(e) =>
              go({
                end: e.target.value,
                start: e.target.value < start ? e.target.value : start,
                id: undefined,
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
          Движение денег
          <select
            aria-label="Финансы: сценарий"
            value={view}
            onChange={(e) =>
              go({
                field: e.target.value as OwnerRoute['field'],
                from: f.asOf,
                id: undefined,
              })
            }
          >
            <option value="forecast">Факт + прогноз</option>
            <option value="actual">Факт по 31 августа</option>
            <option value="plan">План</option>
          </select>
        </label>
        <label>
          Остатки на дату
          <select
            aria-label="Финансы: дата остатков"
            value={asOf}
            onChange={(e) => go({ from: e.target.value, id: undefined })}
          >
            {econMonths
              .filter((m) => view !== 'actual' || m <= f.asOf.slice(0, 7))
              .map((m) => (
                <option key={m} value={monthEnd(m)}>
                  {date(monthEnd(m))}
                  {view === 'plan'
                    ? ' · план'
                    : monthEnd(m) > f.asOf
                      ? ' · прогноз'
                      : ''}
                </option>
              ))}
          </select>
        </label>
        <a
          href={ownerHref({
            page: 'company',
            company: 'AL1',
            metric: 'finance',
            snapshot: f.snapshotId,
          })}
        >
          Сбросить
        </a>
      </div>
      <nav className="fin-tabs" aria-label="Финансовые раскрытия">
        <a
          className={key === 'overview' ? 'active' : ''}
          href={href('overview')}
        >
          Обзор
        </a>
        {financeBlocks.map((k) => (
          <a key={k} className={key === k ? 'active' : ''} href={href(k)}>
            {
              {
                operations: 'Движение денег',
                banks: 'Банки',
                debt: 'Кредиты',
                deposits: 'Размещения',
                investments: 'Инвестиции',
                settlements: 'Расчёты',
                commissions: 'Комиссии',
                penalties: 'Штрафы',
                taxes: 'Налоги',
                bridge: 'Сверка с прибылью',
              }[k]
            }
          </a>
        ))}
      </nav>
    </>
  );
  const register = (
    <section className="op-panel fin-register">
      <div className="fin-section-head">
        <h3>
          Денежные события{week ? ' · до ' + date(week.date) : ''}
          {scopeLabel ? ' · ' + scopeLabel : ''}
        </h3>
        <span>{filtered.length} записей</span>
      </div>
      <label className="fin-search">
        Поиск по статье, контрагенту или договору
        <input
          aria-label="Поиск денежных событий"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Например, топливо или LOAN-A"
        />
      </label>
      <Table
        heads={[
          'Дата платежа',
          'Статья / основание',
          'Контрагент',
          'Статус',
          <>
            Поступление <Help id="receipts" />
          </>,
          <>
            Выплата <Help id="payments" />
          </>,
        ]}
        rows={filtered
          .slice(page * 20, page * 20 + 20)
          .map((x) => [
            date(x.date),
            eventLink(x),
            x.counterparty,
            x.scenario === 'actual'
              ? 'Факт'
              : x.scenario === 'plan'
                ? 'План'
                : 'Прогноз',
            x.direction === 'in' ? num(x.amount) : '—',
            x.direction === 'out' ? num(x.amount) : '—',
          ])}
      />
      <div className="fin-pagination">
        <button disabled={page === 0} onClick={() => setPage(page - 1)}>
          Назад
        </button>
        <span>
          {page + 1} / {Math.max(1, Math.ceil(filtered.length / 20))} · млн ₽
        </span>
        <button
          disabled={(page + 1) * 20 >= filtered.length}
          onClick={() => setPage(page + 1)}
        >
          Далее
        </button>
      </div>
    </section>
  );
  if (event)
    return (
      <div className="fin-workspace">
        {header}
        <section className="op-panel al1-record">
          <a
            className="al1-return"
            href={href(key, {
              row: route.row,
              category: route.category,
              id: week?.id,
            })}
          >
            <ArrowLeft size={15} />К отбору
          </a>
          <h2>{cashCategories[event.category].name}</h2>
          <p className="fin-event-amount">
            {event.direction === 'in' ? '+' : '−'}
            {num(event.amount)} <small>млн ₽</small> <Help id="eventAmount" />
          </p>
          <p>
            {event.scenario === 'actual'
              ? 'Исполнено · факт'
              : event.scenario === 'plan'
                ? 'Бюджетное событие'
                : 'Будущий платёж · прогноз, не банковский факт'}
          </p>
          <dl>
            {[
              ['Компания', 'Авиакомпания 1'],
              ['Банк / счёт', 'Банк А / ACC-A / RUB'],
              ['Дата платежа', date(event.date)],
              ['Контрагент', event.counterparty],
              ['Договор', event.contract],
              [
                'Месяц начисления',
                event.accrualMonth ||
                  'Сводный расчёт периода; не отдельная проводка',
              ],
              ['Ответственная роль', event.owner],
              ['Версия', f.method + ' · ' + f.snapshotId],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            <div>
              <dt>
                Денежный поток <Help id={event.flow.toLowerCase()} />
              </dt>
              <dd>{event.flow}</dd>
            </div>
          </dl>
          {event.contract.startsWith('MX-') && (
            <a
              className="fin-crosslink"
              href={ownerHref({
                page: 'company',
                company: 'AL1',
                metric: 'technical',
                id: event.contract,
                snapshot: f.snapshotId,
              })}
            >
              Связанный ремонт и программа ВС <ArrowUpRight size={15} />
            </a>
          )}
          <details open>
            <summary>Первичное основание · {event.sourceRef}</summary>
            <p>
              Это воспроизводимая запись синтетического реестра, не реальная
              банковская выписка, счёт или налоговая декларация.
            </p>
            <Table
              heads={['Связь', 'Идентификатор']}
              rows={[
                [
                  event.scenario === 'actual'
                    ? 'Выписка · строка'
                    : 'График / бюджет · строка',
                  event.sourceRef,
                ],
                ['Денежное событие', event.id],
                ['Договор / календарь', event.contract],
                [
                  'Связь с рейсом',
                  'Не задана: финансовая строка не распределяется на рейс без основания',
                ],
              ]}
            />
          </details>
          {event.accrualMonth && event.accrualMonth.startsWith('2026') && (
            <a
              className="fin-crosslink"
              href={ownerHref({
                page: 'company',
                company: 'AL1',
                metric: 'economics',
                kpi:
                  event.category === 'profitTax'
                    ? 'tax'
                    : event.category === 'interestPaid'
                      ? 'financeCost'
                      : 'interestIncome',
                id: 'ECO-AL1-' + event.accrualMonth,
                start: event.accrualMonth,
                end: event.accrualMonth,
                field: view,
                snapshot: f.snapshotId,
              })}
            >
              Открыть начисление в экономике <ArrowUpRight size={15} />
            </a>
          )}
          <div className="al1-action">
            <b>Контроль · {event.owner}</b>
            <p>
              {event.critical
                ? 'Критическое обязательство: перед изменением срока подтвердить последствия для программы с производством и технической службой.'
                : 'Сверить сумму и дату с договором и первичным основанием.'}
            </p>
            <span>
              Срок контроля: {date(event.date)} · автоматическое исполнение и
              изменение платежей отключены.
            </span>
          </div>
        </section>
      </div>
    );
  const monthRows = f.months.filter(
    (m) =>
      m.view === (view === 'plan' ? 'plan' : 'forecast') &&
      m.month >= start &&
      m.month <= end &&
      (view !== 'actual' || m.month <= f.asOf.slice(0, 7)),
  );
  const state = f.months.find(
    (m) =>
      m.view === (view === 'plan' ? 'plan' : 'forecast') &&
      m.month === asOf.slice(0, 7),
  )!;
  return (
    <div className="fin-workspace">
      {header}
      {key === 'overview' ? (
        <>
          <div className="fin-kpis">
            <article>
              <div className="fin-section-head">
                <a href={href('banks')}>
                  Доступные деньги <ArrowUpRight size={16} />
                </a>
                <Help id="cash" />
              </div>
              <a className="fin-big" href={href('banks')}>
                {num(available)}
                <small>млн ₽</small>
              </a>
              <span>
                На {date(asOf)}
                {view === 'plan'
                  ? ' · план'
                  : asOf > f.asOf
                    ? ' · прогноз'
                    : ''}
              </span>
              <p>
                Всего на счетах {num(balance)} · ограничено{' '}
                {num(balance - available)}
              </p>
            </article>
            <article className={headroom < 0 ? 'fin-risk' : ''}>
              <div className="fin-section-head">
                <a href={href('calendar')}>
                  Запас на 13 недель <ArrowUpRight size={16} />
                </a>
                <Help id="headroom" />
              </div>
              <a className="fin-big" href={href('calendar')}>
                {num(headroom)}
                <small>млн ₽ сверх резерва</small>
              </a>
              <span>
                Минимум {date(worst.date)} · резерв {num(f.reserve)}
              </span>
              <p>
                Кредитная линия {num(f.creditLine)} не включена: доступность не
                подтверждена.
              </p>
            </article>
            <article>
              <div className="fin-section-head">
                <a href={href('operations')}>
                  Операционный поток · OCF <ArrowUpRight size={16} />
                </a>
                <Help id="ocf" />
              </div>
              <a className="fin-big" href={href('operations')}>
                {num(ocf)}
                <small>млн ₽</small>
              </a>
              <span>
                {view === 'actual'
                  ? 'Факт закрытой части'
                  : view === 'plan'
                    ? 'План периода'
                    : 'Факт + прогноз периода'}
              </span>
              <p>
                План сопоставимой части {num(plan)} · Δ{' '}
                {num(ocf == null || plan == null ? null : ocf - plan)}{' '}
                <Help id="variance" />
              </p>
            </article>
          </div>
          <div className="fin-chart-grid">
            <section className="op-panel">
              <div className="fin-section-head">
                <h3>Доступные деньги · 13 недель</h3>
                <Help id="headroom" />
              </div>
              <p className="fin-meta">
                От среза 31.08 · млн ₽ · до {date(weeks.at(-1)!.date)}
              </p>
              <div className="fin-chart">
                <ResponsiveContainer width="100%" height="100%" minWidth={1}>
                  <LineChart
                    data={[
                      {
                        date: f.asOf,
                        available: fsum(
                          bankBalances(f, f.asOf)!.map((x) => x.available),
                        ),
                        stress: fsum(
                          bankBalances(f, f.asOf)!.map((x) => x.available),
                        ),
                      },
                      ...weeks.map((w, i) => ({
                        ...w,
                        stress: w.available - (stress && i < 4 ? 40 : 0),
                      })),
                    ]}
                  >
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) =>
                        String(v).slice(8) + '.' + String(v).slice(5, 7)
                      }
                      minTickGap={25}
                    />
                    <YAxis width={44} domain={[0, 'auto']} />
                    <Tooltip
                      contentStyle={chartTooltip}
                      labelFormatter={(v) => date(String(v))}
                      formatter={(v) => num(Number(v)) + ' млн ₽'}
                    />
                    <ReferenceLine
                      y={f.reserve}
                      stroke="var(--warning)"
                      strokeDasharray="4 3"
                    />
                    <Line
                      dataKey="available"
                      name="Базовый прогноз"
                      stroke="var(--blue)"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{
                        onClick: (_e: any, p: any) => {
                          const w = weeks.find(
                            (x) => x.date === p.payload.date,
                          );
                          if (w)
                            window.location.hash = href('calendar', {
                              id: w.id,
                              field: 'forecast',
                              start: '2026-09',
                              end: '2026-11',
                            });
                        },
                      }}
                    />
                    {stress && (
                      <Line
                        dataKey="stress"
                        name="Стресс: задержка 40 млн ₽"
                        stroke="var(--warning)"
                        strokeDasharray="5 4"
                        dot={false}
                      />
                    )}
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <label className="fin-stress">
                <input
                  type="checkbox"
                  checked={stress}
                  onChange={(e) => setStress(e.target.checked)}
                />
                Сценарий: перенос поступления 40 млн ₽ с сентября на октябрь
              </label>
              <p className="fin-meta">
                Отдельная гипотеза, не сохранённое изменение базового прогноза.
                Пунктирный уровень — резерв.
              </p>
              <a
                href={href('calendar', {
                  field: 'forecast',
                  start: '2026-09',
                  end: '2026-11',
                })}
              >
                Открыть платёжный календарь <ChevronRight size={15} />
              </a>
            </section>
            <section className="op-panel">
              <div className="fin-section-head">
                <h3>Операционный денежный поток</h3>
                <Help id="ocf" />
              </div>
              <p className="fin-meta">Млн ₽ · выбранный период</p>
              <div className="fin-chart">
                <ResponsiveContainer width="100%" height="100%" minWidth={1}>
                  <BarChart data={monthly}>
                    <CartesianGrid vertical={false} stroke="var(--line)" />
                    <XAxis dataKey="label" />
                    <YAxis width={44} />
                    <Tooltip
                      contentStyle={chartTooltip}
                      formatter={(v) => num(Number(v)) + ' млн ₽'}
                    />
                    <ReferenceLine y={0} stroke="var(--muted)" />
                    <Bar
                      dataKey="plan"
                      name="План"
                      fill="var(--muted)"
                      opacity={0.45}
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey="actual"
                      name="Факт"
                      fill="var(--blue)"
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey="forecast"
                      name="Прогноз"
                      fill="var(--warning)"
                      radius={[3, 3, 0, 0]}
                    />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <a href={href('bridge')}>
                Почему прибыль и деньги отличаются? <ChevronRight size={15} />
              </a>
            </section>
          </div>
          <section className="op-panel">
            <h3>Требует внимания</h3>
            <div className="fin-decisions">
              <a href={href('settlements', { from: f.asOf })}>
                <b>70 млн ₽ · просроченная ДЗ на 31.08</b>
                <span>
                  Коммерческий директор → сверить обещания оплаты заказчиков
                  A–C. Контроль: 07.09.
                </span>
              </a>
              <a
                href={href('calendar', {
                  field: 'forecast',
                  start: '2026-09',
                  end: '2026-11',
                })}
              >
                <b>
                  {num(worst.available - f.reserve)} млн ₽ · минимальный запас
                </b>
                <span>
                  Казначейство → проверить даты капитальных платежей и
                  поступлений. Не переносить критические выплаты без
                  согласования.
                </span>
              </a>
              <a href={href('debt')}>
                <b>80 млн ₽ · неподтверждённая линия</b>
                <span>
                  Финансовый директор → проверить условия выборки. До
                  подтверждения не учитывать в покрытии кассового разрыва.
                </span>
              </a>
            </div>
          </section>
        </>
      ) : (
        <section className="op-panel fin-block">
          <div className="fin-section-head">
            <h2>
              {key === 'calendar'
                ? 'Прогнозный платёжный календарь · 13 недель'
                : key === 'ledger'
                  ? 'Денежные события'
                  : financeMetrics[key]?.name}
            </h2>
            <Help
              id={
                key === 'calendar'
                  ? 'headroom'
                  : key === 'ledger'
                    ? 'operations'
                    : key
              }
            />
          </div>
          {scopeLabel && (
            <p className="fin-meta">
              Денежные движения: {scopeLabel}.{' '}
              {category && (account || contract) && (
                <a href={href(key, { row: account || contract })}>
                  Все статьи этого {contract ? 'договора' : 'счёта'} →
                </a>
              )}
            </p>
          )}
          {key === 'operations' && (
            <div className="fin-flow-summary">
              <h3>
                {scopeLabel
                  ? 'Операционный поток выбранного отбора'
                  : 'Операционный денежный поток · OCF'}{' '}
                <Help id="ocf" />
              </h3>
              <p>
                {mon(start)}–{mon(end)} 2026 ·{' '}
                {view === 'actual'
                  ? 'факт по 31.08'
                  : view === 'plan'
                    ? 'план'
                    : 'факт + прогноз'}
                {scopeLabel ? ' · ' + scopeLabel : ''}
              </p>
              <p className="fin-event-amount">
                {num(financeTotal(f, scope, 'OCF', 'in'))}{' '}
                <Help id="receipts" /> −{' '}
                {num(financeTotal(f, scope, 'OCF', 'out'))}{' '}
                <Help id="payments" /> = <strong>{num(scopedOcf)}</strong>{' '}
                <small>млн ₽</small>
              </p>
              {scopeLabel && (
                <p>
                  OCF всей компании за тот же период:{' '}
                  <a href={href('operations')}>
                    {num(ocf)} млн ₽ → снять отбор
                  </a>
                  .
                </p>
              )}
            </div>
          )}
          {(key === 'banks' || key === 'deposits') && (
            <>
              <p>
                Остатки на {date(asOf)} ·{' '}
                {view === 'plan'
                  ? 'план'
                  : asOf > f.asOf
                    ? 'прогноз'
                    : 'факт'}
                . Все сводные суммы — млн ₽.
              </p>
              <Table
                heads={[
                  'Банк / счёт',
                  'Валюта',
                  'В валюте, млн',
                  <>
                    На счетах <Help id="balance" />
                  </>,
                  <>
                    Доступно <Help id="cash" />
                  </>,
                  'Ограничение',
                ]}
                rows={banks.map((a) => [
                  <a href={href('banks', { row: a.id })}>
                    {presentationText(a.bank)} · {a.name}
                  </a>,
                  a.currency,
                  num(a.native),
                  num(a.total),
                  num(a.available),
                  a.restricted
                    ? 'НСО по договору'
                    : 'Без ограничений в демо',
                ])}
              />
              <p>
                USD пересчитан по постоянному курсу 100 ₽. Валютный
                счёт не означает автоматическую возможность конвертации.
              </p>
            </>
          )}
          {key === 'deposits' && (
            <>
              <h3>Портфель размещений компании на {date(asOf)}</h3>
              <Table
                heads={[
                  'Инструмент',
                  'Банк',
                  <>
                    Тело на дату <Help id="depositPrincipal" />
                  </>,
                  'Возврат',
                  'Доступность',
                ]}
                rows={[
                  [
                    <a href={href('deposits', { row: 'DEP-B' })}>
                      Срочный депозит DEP-B
                    </a>,
                    'Банк Б',
                    num(contractBalance(f, 'DEP-B', asOf, view)),
                    '15 млн ₽ ежемесячно с повторным размещением',
                    'Вне денежных эквивалентов',
                  ],
                  [
                    'НСО',
                    'Банк А',
                    '15',
                    'По условиям демо-договора',
                    'Уже в ограниченных деньгах выше',
                  ],
                ]}
              />
              <p>
                Срок остаточного депозита — январь 2027. Досрочное расторжение в
                базовый прогноз не включено. Проценты — отдельные поступления
                ниже.
              </p>
            </>
          )}
          {key === 'debt' && (
            <>
              <h3>
                Договоры компании на {date(asOf)} · выберите для отбора движений
              </h3>
              <Table
                heads={[
                  'Договор',
                  <>
                    Тело на дату <Help id="debtPrincipal" />
                  </>,
                  <>
                    Движение в месяце <Help id="debtMovement" />
                  </>,
                  'Остаточный срок',
                ]}
                rows={[
                  [
                    <a href={href('debt', { row: 'LOAN-A' })}>
                      LOAN-A · банк А
                    </a>,
                    num(contractBalance(f, 'LOAN-A', asOf, view)),
                    'Привлечение 24 / погашение 19',
                    '31.12.2027',
                  ],
                  [
                    <a href={href('debt', { row: 'LEASE-X' })}>
                      LEASE-X · внешний лизинг
                    </a>,
                    num(contractBalance(f, 'LEASE-X', asOf, view)),
                    'Погашение 5',
                    '31.12.2026',
                  ],
                ]}
              />
              <p>
                В модели кредит рефинансирует погашения: общий долг 480 млн ₽
                сохраняется, состав меняется. Лимит 80 млн ₽ показан отдельно и
                не включён в деньги. Полная стоимость долга и ковенанты не
                рассчитываются без договорных условий.
              </p>
            </>
          )}
          {key === 'settlements' && (
            <>
              <p>
                Состояние расчётов на {date(asOf)}.{' '}
                {view === 'plan'
                  ? 'Плановые остатки.'
                  : asOf > f.asOf
                    ? 'Прогнозные остатки.'
                    : 'остатки.'}
              </p>
              <Table
                heads={[
                  'Расчёты',
                  'Начало месяца',
                  'Начислено',
                  'Оплачено',
                  'Конец месяца',
                ]}
                rows={[
                  [
                    <>
                      Дебиторская задолженность <Help id="settlements" />
                    </>,
                    num(state.arOpening),
                    num(state.revenue),
                    num(state.collections),
                    num(state.arClosing),
                  ],
                  [
                    <>
                      Операционные обязательства <Help id="settlements" />
                    </>,
                    num(state.apOpening),
                    num(state.costAccrued),
                    num(state.cashCosts),
                    num(state.apClosing),
                  ],
                ]}
              />
              <Table
                heads={[
                  'Заказчик · факт 31.08',
                  <>
                    ДЗ <Help id="settlements" />
                  </>,
                  <>
                    Просрочено{' '}
                    <MetricHelp catalog="executive" metric="overdue" />
                  </>,
                  'Срок / основание',
                ]}
                rows={data.al1!.debt.map((d) => [
                  <a href={href('settlements', { row: d.id })}>{d.name}</a>,
                  num(d.amount),
                  num(d.overdue),
                  date(d.due),
                ])}
              />
              <p>
                Реестр заказчиков — отдельная расшифровка факта на 31.08: 240
                млн ₽, из них 70 просрочено. Для других дат доступен месячный
                общий баланс выше; детальный возраст долга не моделируется.
                Подневные начисления и авансы не моделируются.
              </p>
            </>
          )}
          {key === 'calendar' && (
            <>
              <p>
                Это отдельный прогнозный календарь на 07.09–30.11.2026 от среза
                31.08. Переключатели «Движение денег», периода и даты остатков
                выше к этой таблице не применяются. Показанные поступления и
                выплаты ещё не исполнены. Нажатие недели открывает её прогнозные
                события из того же реестра.
              </p>
              <Table
                heads={[
                  'Неделя до',
                  <>
                    Поступления <Help id="receipts" />
                  </>,
                  <>
                    Выплаты <Help id="payments" />
                  </>,
                  <>
                    Остаток <Help id="balance" />
                  </>,
                  <>
                    Доступно <Help id="cash" />
                  </>,
                  <>
                    Сверх резерва <Help id="reserveSurplus" />
                  </>,
                ]}
                rows={weeks.map((w) => [
                  <a
                    href={href('calendar', {
                      id: w.id,
                      field: 'forecast',
                      start: '2026-09',
                      end: '2026-11',
                    })}
                  >
                    {date(w.date)}
                  </a>,
                  num(w.receipts),
                  num(w.payments),
                  num(w.balance),
                  num(w.available),
                  <span
                    className={w.available < f.reserve ? 'fin-negative' : ''}
                  >
                    {num(w.available - f.reserve)}
                  </span>,
                ])}
              />
            </>
          )}
          {key === 'bridge' && (
            <>
              <p>
                Прямой OCF из реестра равен косвенному OCF. ДЗ/КЗ синтетически
                откалиброваны под прежние итоги; это не новые подтверждённые
                корпоративные остатки.
              </p>
              <Table
                heads={[
                  'Месяц',
                  <>
                    OP/M4 <MetricHelp catalog="economics" metric="op" />
                  </>,
                  <>
                    D&A <MetricHelp catalog="executive" metric="da" />
                  </>,
                  <>
                    − ΔДЗ <Help id="settlements" />
                  </>,
                  <>
                    + ΔКЗ <Help id="settlements" />
                  </>,
                  <>
                    + % получ. <Help id="interestReceived" />
                  </>,
                  <>
                    − % упл. <Help id="interestPaid" />
                  </>,
                  <>
                    − налог упл. <Help id="profitTax" />
                  </>,
                  <>
                    OCF <Help id="ocf" />
                  </>,
                ]}
                rows={monthRows.map((m) => [
                  mon(m.month),
                  <a
                    href={ownerHref({
                      page: 'company',
                      company: 'AL1',
                      metric: 'economics',
                      kpi: 'op',
                      start: m.month,
                      end: m.month,
                      field: view,
                      snapshot: f.snapshotId,
                    })}
                  >
                    {num(m.op)}
                  </a>,
                  num(m.da),
                  num(m.arOpening - m.arClosing),
                  num(m.apClosing - m.apOpening),
                  num(m.interestReceived),
                  num(-m.interestPaid),
                  num(-m.taxPaid),
                  num(m.ocf),
                ])}
              />
              <p>
                Операционный поток − Cash CAPEX = FCF. В расчёте возврат/размещение
                депозитов и привлечение/погашение долга взаимно компенсируются в
                каждой контрольной неделе. Они видимы в реестре и не добавлены
                повторно.
              </p>
            </>
          )}
          {key === 'investments' && (
            <p>
              Капитальные платежи связаны с прежним Cash CAPEX компании и
              группы. Продажи активов, дивиденды и долевые инвестиции в этом
              сценарии: 0. Депозиты показаны в разделе размещений, не смешаны с
              программой капитальных вложений.
            </p>
          )}
          {key === 'penalties' && (
            <p>
              Показаны денежные выплаты по неустойкам: в факте —
              оплаченные, в плане — бюджетные, в будущем прогнозе — ожидаемые,
              ещё не оплаченные. Производственные претензии клиентов не
              считаются автоматически признанными или оплаченными. Разбор
              причины — юридическая служба; изменения договоров здесь не
              выполняются.
            </p>
          )}
          {key === 'taxes' && (
            <>
              <p>
                Налог на прибыль оплачивается с месячным лагом к P&L. НДС 2,
                НДФЛ 1,2, имущество 0,6 и прочие 0,2 млн ₽ в месяц — суммы, не налоговые ставки. НДС-поступления и выплаты равны;
                НДФЛ, имущество и прочие налоги входят в операционные выплаты.
              </p>
              <Table
                heads={[
                  'Месяц',
                  <>
                    Налог на прибыль: начислено{' '}
                    <MetricHelp catalog="economics" metric="tax" />
                  </>,
                  <>
                    Налог на прибыль: выплаты <Help id="profitTax" />
                  </>,
                  <>
                    Остаток налога к уплате <Help id="taxBalance" />
                  </>,
                ]}
                rows={monthRows.map((m) => [
                  mon(m.month),
                  num(m.taxAccrued),
                  num(m.taxPaid),
                  num(m.taxLiability),
                ])}
              />
            </>
          )}
          {!['banks', 'settlements', 'bridge', 'calendar', 'ledger'].includes(
            key,
          ) && (
            <>
              <h3>Поступления и выплаты по месяцам</h3>
              <p className="fin-meta">
                Млн ₽ ·{' '}
                {view === 'actual'
                  ? 'факт по 31.08'
                  : view === 'plan'
                    ? 'план'
                    : 'факт + прогноз'}
                {scopeLabel ? ' · ' + scopeLabel : ''}. Линия — исходный план
                выплат.
              </p>
              <div className="fin-chart">
                <ResponsiveContainer width="100%" height="100%" minWidth={1}>
                  <ComposedChart data={cashTrend}>
                    <CartesianGrid vertical={false} stroke="var(--line)" />
                    <XAxis dataKey="label" />
                    <YAxis width={50} />
                    <Tooltip
                      contentStyle={chartTooltip}
                      formatter={(v) => num(Number(v)) + ' млн ₽'}
                    />
                    <Bar
                      dataKey="receipts"
                      name="Поступления"
                      fill="var(--blue)"
                    />
                    <Bar
                      dataKey="payments"
                      name="Выплаты"
                      fill="var(--muted)"
                    />
                    <Line
                      dataKey="plan"
                      name="План выплат"
                      stroke="var(--ink)"
                      strokeDasharray="4 3"
                      dot={false}
                    />
                    <Legend />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <Table
                heads={[
                  'Статья',
                  <>
                    План <Help id="operations" />
                  </>,
                  <>
                    Факт по 31.08 <Help id="operations" />
                  </>,
                  <>
                    Факт + прогноз <Help id="operations" />
                  </>,
                  'Направление',
                  <>
                    Δ прогноза к плану <Help id="variance" />
                  </>,
                ]}
                rows={Object.entries(cashCategories)
                  .filter(
                    ([id, c]) =>
                      (key === 'operations'
                        ? c.flow === 'OCF'
                        : c.block === key) &&
                      (!category || id === category) &&
                      ((!account && !contract) ||
                        f.events.some(
                          (x) =>
                            x.category === id &&
                            (!account || x.account === account) &&
                            (!contract || x.contract === contract),
                        )),
                  )
                  .map(([id, c]) => [
                    <>
                      <a
                        href={href(key, {
                          row: account || contract,
                          category: id,
                        })}
                      >
                        {c.name}
                      </a>{' '}
                      <Help id={id} />
                    </>,
                    ...(['plan', 'actual', 'forecast'] as CashView[]).map((v) =>
                      num(
                        financeTotal(
                          f,
                          { ...scope, view: v, category: id },
                          undefined,
                          c.direction,
                        ),
                      ),
                    ),
                    c.direction === 'in' ? 'Поступление' : 'Выплата',
                    (() => {
                      const p = financeTotal(
                          f,
                          { ...scope, view: 'plan', category: id },
                          undefined,
                          c.direction,
                        )!,
                        v = financeTotal(
                          f,
                          { ...scope, view: 'forecast', category: id },
                          undefined,
                          c.direction,
                        )!;
                      return `${num(v - p)} · ${p ? num(((v - p) / Math.abs(p)) * 100) + '%' : '—'}`;
                    })(),
                  ])}
              />
            </>
          )}
          {key !== 'calendar' && (
            <p className="fin-meta">
              Потоки: {mon(start)}–{mon(end)} 2026. Полностью будущий факт —
              «—», не ноль.
            </p>
          )}
        </section>
      )}
      {key === 'calendar' && !week && (
        <p className="fin-meta">
          Ниже — отдельный реестр по выбранным сверху периоду и сценарию (
          {view === 'actual'
            ? 'факт'
            : view === 'plan'
              ? 'план'
              : 'факт + прогноз'}
          ); он не является расшифровкой фиксированного прогноза выше. Для
          расшифровки прогноза нажмите дату недели.
        </p>
      )}
      {key !== 'overview' && key !== 'bridge' && register}
      <details className="fin-method op-panel">
        <summary>Методика, источники и границы</summary>
        <p>
          Все банки, договоры и денежные события вымышлены. Единый источник:
          синтетические экономика и исполнительная модель AG, {f.snapshotId}.{' '}
          {f.events.length} плановых и фактических/прогнозных событий. Реальных
          банковских документов и подключения Superset пока нет.
        </p>
        <p>
          Контрольные суммы АК1 сохранены: 130 млн ₽ на начало года; 255 на
          31.08; прогноз OCF 440, CAPEX 340, FCF 100 млн ₽. Валовые недельные
          суммы заменили прежнюю условную разбивку; чистые движения и все 13
          конечных остатков сохранены.
        </p>
        <p>
          Платежи внутри недели сгруппированы на её конечную дату. Модель не
          подтверждает отсутствие внутринедельного дефицита. Ответственные —
          роли, не назначенные корпоративные сотрудники. Советы — проверяемые
          предложения, не команды на исполнение.
        </p>
        <a
          href="https://www.ifrs.org/issued-standards/list-of-standards/ias-7-statement-of-cash-flows/"
          target="_blank"
          rel="noreferrer"
        >
          IAS 7 · классификация денежных потоков
        </a>
        <span> · </span>
        <a
          href="https://www.treasurers.org/hub/treasurer-magazine/liquidity-first-three-tips-for-treasurer"
          target="_blank"
          rel="noreferrer"
        >
          ACT · скользящий прогноз
        </a>
      </details>
    </div>
  );
}
