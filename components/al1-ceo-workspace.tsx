'use client';
import { useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ExecutiveSnapshot } from '@/lib/executive-model';
import { al1Sections, type Al1Section } from '@/lib/al1-ceo-model';
import { ownerHref, type OwnerRoute } from '@/lib/owner-model';
import Al1OperationsWorkspace from './al1-operations-workspace';
import Al1CommercialWorkspace from './al1-commercial-workspace';
import Al1EconomicsWorkspace from './al1-economics-workspace';
import Al1FinanceWorkspace from './al1-finance-workspace';
import Al1SafetyWorkspace from './al1-safety-workspace';
import {sqSummary} from '@/lib/al1-safety-model';
import {MetricHelp} from './metric-help';
import CompanyNavigation from './company-navigation';

const n = (v: number, d = 1) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: d })
    .format(v)
    .replace('-', '−');
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
const date = (d: string) => d.slice(8, 10) + '.' + d.slice(5, 7);
const month = (d: string) =>
  [
    'Янв',
    'Фев',
    'Мар',
    'Апр',
    'Май',
    'Июн',
    'Июл',
    'Авг',
    'Сен',
    'Окт',
    'Ноя',
    'Дек',
  ][Number(d.slice(5, 7)) - 1];
export function Trend({
  rows,
  unit,
  cash = false,
}: {
  rows: {
    label: string;
    plan?: number | null;
    actual?: number | null;
    forecast?: number | null;
    reserve?: number;
  }[];
  unit: string;
  cash?: boolean;
}) {
  return (
    <>
      <div className="al1-legend">
        <span>Единица: {unit}</span>
        {!cash && (
          <>
            <span>— План</span>
            <span>● Факт</span>
          </>
        )}
        <span>┄ Прогноз{cash ? ' · 13 недель' : ''}</span>
      </div>
      <div className="al1-chart">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={1}
          initialDimension={{ width: 360, height: 170 }}
        >
          <LineChart
            data={rows}
            margin={{ left: 0, right: 8, top: 10, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              interval="preserveStartEnd"
              minTickGap={17}
            />
            <YAxis
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              width={42}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--glass-strong)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                color: 'var(--ink)',
              }}
              formatter={(v) => n(Number(v)) + ' ' + unit}
            />
            {!cash && (
              <Line
                dataKey="plan"
                name="План"
                stroke="var(--muted)"
                dot={false}
                strokeWidth={1.5}
              />
            )}
            <Line
              dataKey="actual"
              name="Факт"
              stroke="var(--blue)"
              strokeWidth={2.5}
              dot={{ r: 2 }}
            />
            <Line
              dataKey="forecast"
              name="Прогноз"
              stroke="var(--blue)"
              strokeWidth={2.5}
              strokeDasharray="5 4"
              dot={{ r: 2 }}
            />
            {cash && (
              <ReferenceLine
                y={rows[0]?.reserve}
                stroke="var(--warning)"
                strokeDasharray="3 3"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export default function Al1CeoWorkspace({
  data,
  route,
}: {
  data: ExecutiveSnapshot;
  route: OwnerRoute;
}) {
  const [page, setPage] = useState(0),
    [search, setSearch] = useState('');
  const v = data.al1,
    e = data.entities.find((x) => x.id === 'AL1')!;
  if (!v || v.snapshotId !== data.snapshotId)
    return (
      <section className="op-panel">
        <h2>Срез АК1 недоступен</h2>
        <p>Операционные данные не подменяются другим сценарием.</p>
      </section>
    );
  const section = route.metric as Al1Section | undefined,
    record = route.id ? v.records.find((x) => x.id === route.id) : undefined;
  const link = (s?: Al1Section, id?: string) =>
    ownerHref({
      page: 'company',
      company: 'AL1',
      metric: s,
      id,
      snapshot: data.snapshotId,
      start: route.start,
      end: route.end,
    });
  const financial = (metric: string, field: OwnerRoute['field'] = 'forecast') =>
    ownerHref({
      page: 'executive-detail',
      company: 'AL1',
      metric,
      field,
      snapshot: data.snapshotId,
    });
  const recLink = (id: string) =>
    link(v.records.find((x) => x.id === id)?.section, id);
  const expense = (f: 'plan' | 'forecast' | 'actual') =>
    e.flows.revenue[f] - e.flows.op[f];
  const margin = (e.flows.op.forecast / e.flows.revenue.forecast) * 100;
  const ready = v.planes.filter((x) => x.status === 'Исправен').length,
    crew = sum(v.crews.map((x) => x.available)),
    need = sum(v.crews.map((x) => x.need));
  const minimum = Math.min(e.cash, ...e.weeks.map((w) => w.balance));
  const opTrend = e.monthly.op.map((m) => ({
    label: month(m.month),
    plan: m.plan,
    actual: m.actual,
    forecast: m.forecast,
  }));
  const productionTrend = v.months.map((m) => ({
    label: month(m.month),
    plan: m.plan,
    actual: m.actual,
    forecast: m.forecast,
  }));
  const cashTrend = e.weeks.map((w) => ({
    label: date(w.date),
    forecast: w.balance,
    reserve: e.cashFloor,
  }));
  const source = (s: Al1Section) => {
    const d = al1Sections[s];
    return (
      <details className="al1-source">
        <summary>Определения и ответственность</summary>
        <p>
          {d[2]} · ответственный {d[3]}. Поставщик данных:{' '}
          {s === 'production'
            ? 'диспетчерская служба'
            : s === 'technical'
              ? 'служба ТО'
              : s === 'people'
                ? 'HR и планирование экипажей'
                : s === 'finance'
                  ? 'казначейство'
                  : s === 'commerce'
                    ? 'коммерческая служба'
                    : s === 'safety'
                      ? 'служба безопасности и качества'
                      : 'финансово-экономическая служба'}
          .
        </p>
        <p>
          Единый срез {v.asOf}; все записи, роли и сроки синтетические.
          Исполнитель действия и контрольный срок указаны в его основании.
          Реальные ФИО назначаются при внедрении.
        </p>
      </details>
    );
  };
  const card = (s: Al1Section, children: ReactNode) => (
    <section className={'op-panel al1-card al1-' + s} key={s}>
      <header>
        <a href={link(s)}>
          <h2>{al1Sections[s][0]}</h2>
          <span>{al1Sections[s][1]}</span>
        </a>
        <a
          className="al1-open"
          aria-label={'Раскрыть: ' + al1Sections[s][0]}
          href={link(s)}
        >
          <ArrowUpRight size={20} />
        </a>
      </header>
      {children}
      <a className="al1-card-footer" href={link(s)}>
        {al1Sections[s][2]}
        <ChevronRight size={16} />
      </a>
    </section>
  );
  const metric = (label: string, value: string, url: string, sub?: string) => (
    <div className="metric-help-wrap"><a className="al1-metric" href={url}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </a><MetricHelp catalog="company" metric={label}/></div>
  );
  const table = (heads: string[], rows: ReactNode[][]) => (
    <div className="al1-table">
      <table>
        <thead>
          <tr>
            {heads.map((h) => (
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
    </div>
  );
  const recordLinks = (links: { id: string; label: string }[]) => {
    const filtered = links.filter((x) =>
      x.label.toLowerCase().includes(search.toLowerCase()),
    );
    return (
      <>
        <label className="al1-search">
          Поиск связанных записей
          <input
            value={search}
            onChange={(ev) => {
              setSearch(ev.target.value);
              setPage(0);
            }}
            placeholder="Номер или название"
          />
        </label>
        <div className="al1-records">
          {filtered.slice(page * 20, page * 20 + 20).map((x) => (
            <a href={recLink(x.id)} key={x.id}>
              {x.label}
              <ChevronRight size={16} />
            </a>
          ))}
        </div>
        {!filtered.length && <p>Записей по этому запросу нет.</p>}
        <div className="al1-pager">
          <button disabled={!page} onClick={() => setPage((p) => p - 1)}>
            Назад
          </button>
          <span>
            {filtered.length} записей · страница {page + 1}
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
  const economics = () => (
    <>
      <div className="al1-metrics">
        {metric(
          'Выручка · прогноз',
          n(e.flows.revenue.forecast) + ' млн ₽',
          financial('revenue'),
          'План ' + n(e.flows.revenue.plan),
        )}
        {metric(
          'Прибыль · прогноз',
          n(e.flows.op.forecast) + ' млн ₽',
          financial('op'),
          'План ' + n(e.flows.op.plan),
        )}
        {metric('Маржа · прогноз', n(margin) + '%', financial('margin'))}
      </div>
      <Trend rows={opTrend} unit="млн ₽" />
      <a className="al1-note" href={link('economics')}>
        Расходы {n(expense('forecast'))} млн ₽ · раскрыть статьи и программы
      </a>
    </>
  );
  const commerce = () => (
    <>
      <div className="al1-metrics">
        {metric(
          'Будущая выручка',
          n(e.portfolio.total) + ' млн ₽',
          link('commerce'),
          'Сентябрь–декабрь',
        )}
        {metric(
          'Подтверждено',
          n((e.portfolio.confirmed / e.portfolio.total) * 100) + '%',
          link('commerce'),
          n(e.portfolio.confirmed) + ' млн ₽',
        )}
      </div>
      <a
        className="al1-portfolio"
        href={link('commerce')}
        aria-label="Покрытие будущей выручки"
      >
        {(['confirmed', 'pipeline', 'gap'] as const).map((k) => (
          <i
            key={k}
            style={{ width: (e.portfolio[k] / e.portfolio.total) * 100 + '%' }}
          >
            {n(e.portfolio[k])}
          </i>
        ))}
      </a>
      <div className="al1-legend">
        <span>Подтверждено</span>
        <span>Взвешенные продажи</span>
        <span>Разрыв</span>
      </div>
      <p>
        Заказы должны обеспечить полную ротацию, включая позиционирование и
        ожидание.
      </p>
    </>
  );
  const production = () => (
    <>
      <div className="al1-metrics">
        {metric(
          'Общий налёт · прогноз',
          n(v.totals.forecast / 60) + ' ч',
          link('production'),
          'План года ' + n(v.totals.plan / 60) + ' ч',
        )}
        {metric(
          'Факт янв–авг',
          n(v.totals.actual! / 60) + ' ч',
          link('production'),
          'План периода ' + n(v.totals.planClosed! / 60),
        )}
      </div>
      <Trend rows={productionTrend} unit="ч" />
      <a className="al1-note" href={link('production')}>
        Выполнено {n(v.totals.completed, 0)} рейсов · отменено{' '}
        {v.totals.cancelled}. Раскрыть 22 показателя: регулярность, мощность,
        груз, загрузка, топливо, экипажи и безопасность →
      </a>
    </>
  );
  const technical = () => (
    <>
      <div className="al1-metrics">
        {metric(
          'Исправно на 31 августа',
          ready + ' / ' + v.planes.length,
          link('technical'),
          'Не означает допуск к любой миссии',
        )}
        {metric(
          'Вне эксплуатации',
          String(v.planes.length - ready),
          link('technical'),
          '1 AOG · 1 плановое ТО',
        )}
      </div>
      <a
        href={link('technical')}
        className="al1-plane-strip"
        aria-label="Состояние девяти бортов"
      >
        {v.planes.map((p) => (
          <span
            key={p.id}
            className={p.status === 'Исправен' ? 'ready' : 'unready'}
            title={p.id + ' · ' + p.status}
          >
            {p.type === 'Ил-76' ? 'Ил' : 'Ан'}
          </span>
        ))}
      </a>
      <div className="al1-mini-list">
        {v.repairs.slice(0, 2).map((x) => (
          <a key={x.id} href={recLink(x.id)}>
            <span>{x.title}</span>
            <b>
              {date(x.expectedReturn)}
              <small>ожидаемый возврат</small>
            </b>
          </a>
        ))}
      </div>
    </>
  );
  const finance = () => (
    <>
      <div className="al1-metrics">
        {metric(
          'Деньги на счетах',
          n(e.cash) + ' млн ₽',
          financial('cash'),
          'На 31 августа',
        )}
        {metric(
          'Просроченная ДЗ',
          n(sum(v.debt.map((x) => x.overdue))) + ' млн ₽',
          link('finance'),
          'Из ' + n(sum(v.debt.map((x) => x.amount))) + ' млн ₽ ДЗ',
        )}
      </div>
      <Trend rows={cashTrend} unit="млн ₽" cash />
      <a className="al1-note" href={link('finance')}>
        Минимум {n(minimum)} млн ₽ · резерв {n(e.cashFloor)} · FCF года{' '}
        {n(e.flows.fcf.forecast)}
      </a>
    </>
  );
  const people = () => (
    <>
      <div className="al1-metrics">
        {metric(
          'Готовые экипажные комплекты',
          crew + ' / ' + need,
          link('people'),
          'Потребность программы 1–14 сентября',
        )}
        {metric(
          'Численность / план',
          sum(v.staff.map((x) => x.actual)) +
            ' / ' +
            sum(v.staff.map((x) => x.plan)),
          link('people'),
          'На 31 августа',
        )}
      </div>
      <div className="al1-bars">
        {v.crews.map((c) => (
          <a href={recLink('HR-CREW')} key={c.type}>
            <span>{c.type}</span>
            <i>
              <b style={{ width: (c.available / c.need) * 100 + '%' }} />
            </i>
            <strong>
              {c.available} / {c.need}
            </strong>
          </a>
        ))}
      </div>
      <a className="al1-note" href={recLink('HR-CREW')}>
        Два комплекта Ил-76 проходят подготовку · срок 10 сентября
      </a>
    </>
  );
  const safety = () => {
    if(!data.safety) return <p>Связанный срез безопасности и качества недоступен.</p>;
    const s=sqSummary(data.safety,{start:route.start||'2026-01',end:route.end||'2026-12'});
    const items=[['risks','Неприемлемые риски',String(s.unacceptable),'На 31.08 · оценка'],['safety-actions','Открытые меры безопасности',String(s.safetyOpen),'Критических просроченных: '+s.criticalOverdue],['service','Исполнение программы',s.service===null?'—':n(s.service)+'%','Рейсовый прокси, не DAP · нарушений '+s.missed]];
    return <><div className="al1-metrics">{items.map(([k,label,value,sub])=><div className="al1-metric" key={k}><div><a href={link('safety')+'&kpi='+k}>{label}</a><MetricHelp catalog="safety" metric={k}/></div><a href={link('safety')+'&kpi='+k}><strong>{value}</strong><small>{sub}</small></a></div>)}</div><a className="al1-warning" href={recLink('SAFE-01')}><ShieldAlert size={20}/><span>Безопасность и качество раскрываются отдельно: события, риски, исполнение и проверка эффекта.</span></a></>;
  };
  const parts: Record<Al1Section, () => ReactNode> = {
    economics,
    commerce,
    production,
    technical,
    finance,
    people,
    safety,
  };

  if (
    (section && !al1Sections[section]) ||
    (section !== 'commerce' && section !== 'economics' && section !== 'finance' && section !== 'safety' && route.id && (!record || record.section !== section))
  )
    return (
      <section className="op-panel">
        <h2>Раздел или запись не найдены</h2>
        <a href={link()}>Вернуться к АК1</a>
      </section>
    );
  return (
    <div className="al1-ceo">
      <CompanyNavigation route={route} />
      {section && (
        <nav className="op-trail" aria-label="Путь АК1">
          <a href={ownerHref({ page: 'overview' })}>Авиагруппа</a>
          <ChevronRight size={15} />
          <a
            href={ownerHref({
              page: 'company',
              company: 'MANAGEMENT',
              snapshot: data.snapshotId,
            })}
          >
            УК
          </a>
          <ChevronRight size={15} />
          <a href={link()}>Авиакомпания 1</a>
          <ChevronRight size={15} />
          <a href={link(section)}>{al1Sections[section][0]}</a>
          {record && (
            <>
              <ChevronRight size={15} />
              <span>Основание</span>
            </>
          )}
        </nav>
      )}
      {section === 'safety' ? <Al1SafetyWorkspace key={[route.start,route.end,route.fleet,route.aircraft,route.kpi,route.id,route.row,route.category].join('|')} data={data} route={route}/> : section === 'finance' ? <Al1FinanceWorkspace key={[route.start,route.end,route.field,route.kpi,route.id,route.row,route.from,route.week,route.category].join('|')} data={data} route={route}/> : section === 'economics' ? <Al1EconomicsWorkspace key={[route.start,route.end,route.fleet,route.aircraft,route.kpi,route.id,route.row].join('|')} data={data} route={route}/> : section === 'production' ? <Al1OperationsWorkspace key={[route.start,route.end,route.fleet,route.aircraft,route.captain,route.kpi,route.id].join('|')} data={data} route={route}/> : section === 'commerce' ? <Al1CommercialWorkspace key={[route.start,route.end,route.fleet,route.aircraft,route.kpi,route.id,route.row].join('|')} data={data} route={route}/> : record ? (
        <>
          <section className="op-panel al1-record">
            <a href={link(section)} className="al1-return">
              <ArrowLeft size={16} />К разделу
            </a>
            <h2>{record.title}</h2>
            <p>
              {record.period} · {record.status}
            </p>
            <dl>
              {record.values.map((x, i) => (
                <div key={i}>
                  <dt>{x.label}</dt>
                  <dd>{x.value}</dd>
                </div>
              ))}
            </dl>
            {record.action && (
              <div className="al1-action">
                <b>Действие · {record.owner || al1Sections[record.section][2]}</b>
                <p>{record.action}</p>
                <span>
                  Ответственный {record.assignee || al1Sections[record.section][3]} · срок{' '}
                  {record.due || 'не задан'}
                </span>
              </div>
            )}
            <p className="al1-note">
              Конечное основание — запись модели, не корпоративный
              документ. Данные не используются для фактического выпуска рейса.
            </p>
          </section>
          {record.links.length > 0 && (
            <section className="op-panel">
              <h2>Связанные основания</h2>
              {recordLinks(record.links)}
            </section>
          )}
          {source(record.section)}
        </>
      ) : section ? (
        <>
          <section className="op-panel al1-detail">
            <h2>
              {al1Sections[section][0]} <small>{al1Sections[section][1]}</small>
            </h2>
            {parts[section]()}
          </section>
          {section === 'technical' && (
            <>
              <section className="op-panel">
                <h2>Состояние флота на 31 августа</h2>
                {table(
                  ['Борт', 'Тип', 'Состояние', 'Ожидаемый возврат'],
                  v.planes.map((p) => [
                    p.repairId ? (
                      <a href={recLink(p.repairId)}>{p.id}</a>
                    ) : (
                      p.id
                    ),
                    p.type,
                    p.status,
                    p.returnDate ? date(p.returnDate) : 'В эксплуатации',
                  ]),
                )}
              </section>
              <section className="op-panel">
                <h2>План ТО и ремонта</h2>
                {table(
                  [
                    'Работа',
                    'Начало',
                    'План возврата',
                    'Ожидаемый возврат',
                    'Задания под риском',
                  ],
                  v.repairs.map((x) => [
                    <a href={recLink(x.id)}>{x.title}</a>,
                    date(x.start),
                    date(x.planReturn),
                    date(x.expectedReturn),
                    x.flights.length,
                  ]),
                )}
                <p>
                  Сроки — прогноз. Рейсы, попавшие в ремонтное окно,
                  остаются в базовой программе как неподтверждённые ресурсом;
                  перенос ещё не выполнен. Ресурсы отдельных компонентов и
                  повторные дефекты в этом шаге не моделируются.
                </p>
              </section>
            </>
          )}
          {section === 'people' && (
            <>
              <section className="op-panel">
                <h2>Численность и кадровый план</h2>
                {table(
                  [
                    'Функция',
                    'План',
                    'Факт 31.08',
                    'Прогноз 31.12',
                    'Вакансии',
                  ],
                  v.staff.map((s) => [
                    <a href={recLink(s.id)}>{s.name}</a>,
                    s.plan,
                    s.actual,
                    s.forecast,
                    s.plan - s.actual,
                  ]),
                )}
              </section>
              <section className="op-panel">
                <h2>Экипажные комплекты на программу 1–14 сентября</h2>
                {table(
                  ['Тип', 'Нужно', 'Готово 31.08', 'После подготовки 10.09'],
                  v.crews.map((c) => [
                    <a href={recLink('HR-CREW')}>{c.type}</a>,
                    c.need,
                    c.available,
                    c.afterTraining,
                  ]),
                )}
                <p>
                  Единица — комплект с нужными допусками, не человек. Дефицит{' '}
                  {need - crew} комплектов Ил-76 связан с {v.crewRisk.length}{' '}
                  заданиями. Посменная проверка рабочего времени не
                  реализована.
                </p>
                <a href={recLink('HR-CREW')}>
                  Подготовка и зависимые задания →
                </a>
              </section>
            </>
          )}
          {source(section)}
        </>
      ) : (
        <>
          <section className="al1-brief" aria-label="Резюме ГД">
            <div>
              <span>Результат года · прогноз</span>
              <a href={financial('op')}>
                {n(e.flows.op.forecast)} <small>млн ₽ OP</small>
              </a>
              <p>
                {n(e.flows.op.forecast - e.flows.op.plan)} к плану · выручка{' '}
                <a href={financial('revenue')}>
                  {n(e.flows.revenue.forecast)} млн ₽
                </a>
              </p>
            </div>
            <div>
              <span>Готовность программы · 31 августа</span>
              <a href={link('technical')}>
                {ready}/{v.planes.length} <small>ВС исправны</small>
              </a>
              <p>
                <a href={link('people')}>
                  {crew}/{need} экипажных комплектов
                </a>{' '}
                на первую половину сентября
              </p>
            </div>
            <div>
              <span>Требует внимания ГД</span>
              <a href={recLink('MX-01')}>
                Возврат Ан-124 <ArrowUpRight size={18} />
              </a>
              <p>
                Ожидается 15 сентября вместо 5-го · проверить резерв и перенос
                программы
              </p>
            </div>
          </section>
          <div className="al1-grid">
            {(Object.keys(al1Sections) as Al1Section[]).map((s) =>
              card(s, parts[s]()),
            )}
          </div>
          <section className="op-panel al1-decisions">
            <h2>Где требуется решение</h2>
            <div className="al1-decision-grid">
              <a href={recLink('MX-01')}>
                <b>Подтвердить возврат Ан-124</b>
                <span>Технический директор · до 05.09</span>
                <small>
                  Ремонт → задания → коммерческая программа → деньги
                </small>
              </a>
              <a href={recLink('HR-CREW')}>
                <b>Закрыть потребность в экипажах</b>
                <span>Директор по персоналу · до 10.09</span>
                <small>
                  2 комплекта Ил-76 · связанные задания доступны внутри
                </small>
              </a>
              <a href={recLink('AR-01')}>
                <b>Согласовать оплату с заказчиком A</b>
                <span>Казначейство · 40 млн ₽ просрочено</span>
                <small>Срок истёк 20.08 · подтвердить платёжную дату</small>
              </a>
            </div>
            <p>
              В ремонтные окна и кадровый дефицит попадают {v.riskIds.length}{' '}
              уникальных будущих рейсов, {n(v.riskHours)} ч и {n(v.riskRevenue)}{' '}
              млн ₽ распределённой выручки. Это экспозиция, а не доказанная
              потеря; совпадающие рейсы учтены один раз, OP{' '}
              {n(e.flows.op.forecast)} не уменьшен автоматически.
            </p>
          </section>
          <details className="al1-source">
            <summary>
              Как связаны цифры и где заканчивается модель
            </summary>
            <p>
              Годовой финансовый итог АК1 и консолидированные экраны Авиагруппа/УК
              используют один источник. Месячные выручка и расходы распределены
              на существующие рейсы; технические и кадровые риски
              ссылаются на те же номера.
            </p>
            <p>
              План налёта — 6 000 ч Ил-76 + 2 000 ч Ан-124. Бортов — 6 + 3, это
              допущение. Индивидуальные договоры, полные миссии,
              компоненты, рабочее время, реальные первичные документы и
              корпоративный Superset не подключены.
            </p>
            <p>
              Внутри каждого раздела указаны определения, ответственный за
              результат и поставщик данных. Назначения и действия учебные;
              кнопки не утверждают решения и не изменяют базовый прогноз.
            </p>
          </details>
        </>
      )}
    </div>
  );
}
