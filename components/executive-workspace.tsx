'use client';
import { executiveProfile, projectExecutive } from '@/lib/executive-payload';
import { economicsMonthRoute } from '@/lib/drilldown-contract';
import {MetricHelp} from './metric-help';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ChevronRight,
  ShieldAlert,
  UserRound,
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
import ThemeControl from './theme-control';
import Al1CeoWorkspace from './al1-ceo-workspace';
import AirlineWorkspace from './airline-workspace';
import CompanyOverview from './company-overview';
import { WorkspaceBack } from './company-navigation';
import { ownerHref, type OwnerRoute } from '@/lib/owner-model';
import { factorNames } from '@/lib/operating-model';
import { executiveEntity, executiveHierarchy } from '@/lib/executive-model';
import {
  metricNames,
  round,
  type ExecutiveSnapshot,
  type ExecutiveEntity,
  type FlowKey,
} from '@/lib/executive-model';

const n = (v: number | null | undefined, d = 1) =>
  v == null
    ? '—'
    : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: d })
        .format(v)
        .replace('-', '−');
const signed = (v: number) => (v > 0 ? '+' + n(v) : n(v));
const aliases: Record<string, string> = {
  TECH1: 'MRO-1',
  TECH2: 'MRO-2',
  ENGINEER: 'ENG',
  LESSOR: 'LEASE',
};
const flowKeys = ['op', 'revenue', 'da', 'cashBridge', 'ocf', 'capex', 'fcf'];
const role = (key: string) =>
  ['cash', 'fcf', 'ocf', 'cashBridge'].includes(key)
    ? 'Казначейство и финансовый директор'
    : key === 'portfolio'
      ? 'Коммерческий директор'
      : key === 'operations'
        ? 'Производственный директор'
        : key === 'safety'
          ? 'Назначенный руководитель по безопасности'
          : 'Финансовый директор';

export default function ExecutiveWorkspace({ route }: { route: OwnerRoute }) {
  const profile = executiveProfile(route);
  const [loaded, setLoaded] = useState<{profile:string; data:ExecutiveSnapshot} | null>(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  const data = loaded?.profile === profile ? loaded.data : null;
  useEffect(() => {
    const c = new AbortController();
    setError('');
    fetch(import.meta.env.BASE_URL + 'data/executive-' + profile + '.json', { cache: 'no-store', signal: c.signal })
      .then(async (r) => {
        const b = (await r.json()) as ExecutiveSnapshot & { message?: string };
        if (!r.ok) throw Error(b.message);
        const selected = projectExecutive(b, profile);
        if (!c.signal.aborted) setLoaded({profile, data:selected});
      })
      .catch((e) => {
        if (!c.signal.aborted && e.name !== 'AbortError') { setLoaded(null); setError(e.message); }
      });
    return () => c.abort();
  }, [retry, profile]);
  const id = aliases[route.company || ''] || route.company || 'GROUP',
    owner = id === 'GROUP',
    managing = id === 'MANAGEMENT',
    group = owner || managing,
    key = route.metric || 'op';
  const e = data?executiveEntity(data,id):undefined,
    others = data?.entities.filter((x) => x.id !== 'GROUP').map(x=>executiveEntity(data,x.id)!) || [];
  const drillRows = owner&&data?[executiveEntity(data,'MANAGEMENT')!]:others;
  const stale = !!route.snapshot && route.snapshot !== data?.snapshotId;
  const href = (metric: string, company = id, field = route.field) =>
    ownerHref({
      page: 'executive-detail',
      company,
      metric,
      field,
      snapshot: data?.snapshotId,
    });
  const home = (company = id) =>
    ownerHref({
      page: company === 'GROUP' ? 'overview' : 'company',
      company,
      snapshot: data?.snapshotId,
    });
  const op = (metric = 'totals', company = id) =>
    ownerHref({
      page: 'op-detail',
      company:company==='MANAGEMENT'?'GROUP':company,
      id: metric,
      from:id,
      field: route.field,
      snapshot: data?.opSnapshotId,
    });
  const amount = (x: ExecutiveEntity, k: FlowKey) =>
    route.field === 'actual'
      ? x.flows[k].actual
      : route.field === 'plan'
        ? x.flows[k].plan
        : route.field === 'ytdPlan'
          ? x.flows[k].ytd_plan
          : route.field === 'variance'
            ? round(x.flows[k].forecast - x.flows[k].plan)
            : x.flows[k].forecast;
  const min = (x: ExecutiveEntity) =>
    x.weeks.reduce((a, b) => (b.balance < a.balance ? b : a));
  const source = (metric = key) => (
    <details className="op-source">
      <summary>Методика, исходные данные и ответственность</summary>
      <p>
        Срез на 31.08.2026, денежные суммы — млн ₽. Управленческая методика;
        не заменяет отчётность по МСФО. Происхождение данных указано в шапке.
      </p>
      <dl className="op-meta">
        <div>
          <dt>За результат</dt>
          <dd>{owner ? 'Владелец группы' : managing?'ГД УК':`ГД ${e?.name}`}</dd>
        </div>
        <div>
          <dt>За данные / подготовку действия</dt>
          <dd>
            {role(metric)}. Роли предложены; ФИО и полномочия не назначены.
          </dd>
        </div>
        <div>
          <dt>Единый срез</dt>
          <dd>{data?.snapshotId}</dd>
        </div>
        <div>
          <dt>Финансовое основание</dt>
          <dd>
            Версия операционной прибыли {data?.opSnapshotId}.
          </dd>
        </div>
      </dl>
      <p>
        Операционная прибыль сохранена из предыдущей версии. Новые финансовые
        потоки заданы по компаниям; месячные значения распределены модельными
        весами. Детализация до реальных проводок, договоров и первичных
        документов ещё не подключена.
      </p>
      <a href={import.meta.env.BASE_URL + 'data/executive.json'} target="_blank" rel="noreferrer">
        Открыть единый исходный набор JSON ↗
      </a>
    </details>
  );
  function flowChart(x: ExecutiveEntity, k: FlowKey) {
    return (
      <>
        <div className="ex-legend">
          <span>— План</span>
          <span className="ex-fact">● Факт</span>
          <span className="ex-forecast">┄ Прогноз</span>
        </div>
        <div className="ex-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={x.monthly[k]}
              margin={{ top: 12, right: 8, left: -24, bottom: 0 }}
              accessibilityLayer
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--line)"
                strokeDasharray="3 5"
              />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                minTickGap={15}
              />
              <YAxis
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--paper)',
                  border: '1px solid var(--line)',
                  borderRadius: 9,
                }}
                formatter={(v, name) => [n(Number(v), 2) + ' млн ₽', name]}
              />
              <ReferenceLine y={0} stroke="var(--muted)" />
              <Line
                dataKey="plan"
                name="План"
                stroke="var(--muted)"
                dot={false}
                strokeDasharray="3 4"
                isAnimationActive={false}
              />
              <Line
                dataKey="actual"
                name="Факт"
                stroke="var(--op-fact)"
                strokeWidth={2.5}
                dot={{ r: 2 }}
                isAnimationActive={false}
              />
              <Line
                dataKey="forecast"
                name="Прогноз"
                stroke="var(--blue)"
                strokeWidth={2.5}
                dot={{ r: 2 }}
                strokeDasharray="6 3"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </>
    );
  }
  function cashChart(x: ExecutiveEntity) {
    return (
      <div className="ex-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={x.weeks}
            margin={{ top: 12, right: 8, left: -24, bottom: 0 }}
            accessibilityLayer
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--line)"
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              minTickGap={20}
            />
            <YAxis
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                borderRadius: 9,
              }}
              formatter={(v) => [n(Number(v), 2) + ' млн ₽', 'Прогноз остатка']}
            />
            <ReferenceLine
              y={x.cashFloor}
              stroke="var(--warning)"
              strokeDasharray="3 3"
            />
            <Line
              name="Прогноз денег"
              dataKey="balance"
              stroke="var(--blue)"
              strokeWidth={3}
              dot={{ r: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
  function mini(k: FlowKey, label?: string) {
    if (!e) return null;
    return (
      <div className="metric-help-wrap metric-help-row"><a className="ex-mini" href={href(k,id,'forecast')}>
        <span>
          {label || metricNames[k][0]}
          <small>{metricNames[k][1]}</small>
        </span>
        <b>{n(e.flows[k].forecast)}</b>
        <ChevronRight size={16} />
      </a><MetricHelp catalog="executive" metric={k}/></div>
    );
  }
  function companyNavigator(){
    if(!data)return null;
    return <section className="ex-company-navigation" aria-label="Вход через компании"><div className="op-section-head"><h2>Компании · отдельный путь</h2><span className="op-muted">Управленческая структура</span></div>
      <div className="ex-hierarchy-head"><a href={home('GROUP')}>Авиагруппа</a><ChevronRight size={17}/><a className="ex-al1m" href={home('MANAGEMENT')}><b>Управляющая компания</b><span>Управляющая компания →</span></a></div>
      <div className="ex-direct-companies">{executiveHierarchy.subsidiaries.map(cid=>{const c=executiveEntity(data,cid)!;return <a key={cid} href={home(cid)}><strong>{c.name}</strong><small>{c.profile}</small><ChevronRight size={15}/></a>;})}</div>
      <a className="ex-own-activity" href={home('UK')}>УК · собственная деятельность и бюджет <ArrowRight size={15}/></a>
      {managing&&<p className="op-muted">Крыло УК включает компании ниже, собственную деятельность УК и корректировки консолидации. Сейчас это единственное крыло в модели группы; итог не прибавляется к группе повторно.</p>}
    </section>;
  }
  function revenuePanel(){if(!e)return null;const r=e.flows.revenue;return <section className="op-panel ex-revenue"><div className="ex-revenue-title"><h2>Выручка <MetricHelp catalog="executive" metric="revenue"/><small>Revenue · {group?'консолидированная':'компании'}</small></h2><a className="ex-number" href={href('revenue',id,'forecast')}>{n(r.forecast)}<small>млн ₽ · прогноз 2026</small></a><p className="ex-delta">{signed(r.forecast-r.plan)} к плану года</p><a className="ex-next" href={href('revenue',id,'forecast')}>{owner?'Раскрыть через УК':managing?'Вклад компаний и исключения':'Месячный состав выручки'} <ArrowRight size={16}/></a></div><div className="ex-revenue-values"><a href={href('revenue',id,'plan')}><small>План года</small><b>{n(r.plan)}</b></a><a href={href('revenue',id,'actual')}><small>Факт янв–авг</small><b>{n(r.actual)}</b></a><a href={href('revenue',id,'ytdPlan')}><small>План янв–авг</small><b>{n(r.ytd_plan)}</b></a><a href={href('revenue',id,'actual')}><small>Отклонение факта от плана периода</small><b>{signed(r.actual-r.ytd_plan)}</b></a></div><div className="ex-revenue-chart">{flowChart(e,'revenue')}</div></section>;}
  function summary() {
    if (!e || !data) return null;
    const low = min(e),
      p = e.portfolio;
    const priority:Record<string,number>={'Требует решения':0,'Просрочено':1,'В работе':2,'Выполнено':3};
    const scoped = data.actions.filter((a) => group || a.company === id).sort((a,b)=>(priority[a.status]??4)-(priority[b.status]??4)||a.due.localeCompare(b.due));
    return (
      <>
        {group&&companyNavigator()}
        {!group&&<div className="ex-company-context"><b>{id==='UK'?'Собственная деятельность УК':`Рабочий экран ГД · ${e.name}`}</b><span>{e.profile}</span><a href={home('MANAGEMENT')}>Входит в крыло УК →</a></div>}
        <a className="ex-safety" href={href('safety')}>
          <ShieldAlert size={21} />
          <span>
            <b>Безопасность и ограничения</b>{' '}
            <span>Реестр не подключён — статус не оценён</span>
          </span>
          <ChevronRight size={18} />
        </a>
        {!group&&operations()}
        {revenuePanel()}
        <div className={'ex-outcomes'+(!group?' ex-company-outcomes':'')}>
          <section className="op-panel ex-result">
            <div className="ex-panel-title">
              <span>01 / РЕЗУЛЬТАТ</span>
              <a href={href('op')} aria-label="Раскрыть операционную прибыль">
                <ArrowRight />
              </a>
            </div>
            <h2>
              Операционная прибыль · M4 <small>Operating Profit</small>
              <MetricHelp catalog="executive" metric="op"/>
            </h2>
            <a className="ex-number" href={href('op')}>
              {n(e.flows.op.forecast)}
              <small>млн ₽ · прогноз года</small>
            </a>
            <p className="ex-delta">
              {signed(e.flows.op.forecast - e.flows.op.plan)} к плану{' '}
              {n(e.flows.op.plan)}
            </p>
            <div className="ex-comparison">
              <a href={href('op', id, 'actual')}>
                Факт янв–авг <b>{n(e.flows.op.actual)}</b>
              </a>
              <a href={href('op', id, 'ytdPlan')}>
                План янв–авг <b>{n(e.flows.op.ytd_plan)}</b>
              </a>
            </div>
            {flowChart(e, 'op')}
            <div className="ex-driver-preview">{Object.entries(e.drivers).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,2).map(([k,v])=><a href={op(k)} key={k}><span>{factorNames[k]}</span><b>{signed(v)}</b></a>)}</div>
            <a className="ex-mini" href={href('margin')}>
              <span>
                Операционная маржа<small>Operating Margin · прогноз года</small>
              </span>
              <b>
                {e.flows.revenue.forecast
                  ? n((e.flows.op.forecast / e.flows.revenue.forecast) * 100) +
                    '%'
                  : '—'}
              </b>
              <ChevronRight size={16} />
            </a>
            <a className="ex-next" href={op('factors')}>
              Все факторы прибыли <ArrowRight size={16} />
            </a>
          </section>
          <section className="op-panel">
            <div className="ex-panel-title">
              <span>02 / ДЕНЬГИ</span>
              <a href={href('cash')} aria-label="Раскрыть деньги">
                <ArrowRight />
              </a>
            </div>
            <h2>
              Денежные средства <small>Cash balance · 31 августа</small>
              <MetricHelp catalog="executive" metric="cash"/>
            </h2>
            <a className="ex-number" href={href('cash')}>
              {n(e.cash)}
              <small>млн ₽ · до ограничений использования</small>
            </a>
            <p className="ex-delta">
              Минимум прогноза {n(low.balance)} · {low.label}
            </p>
            <div className="ex-comparison">
              <a href={href('cash')}>
                Резерв ликвидности <b>{n(e.cashFloor)}</b>
              </a>
              <a href={href('cash')}>
                Запас до ограничений <b>{n(low.balance - e.cashFloor)}</b>
              </a>
            </div>
            <div className="ex-legend">
              <span className="ex-forecast">┄ Прогноз на 13 недель</span>
              <span>┄ Резерв</span>
            </div>
            {cashChart(e)}
            {group&&others.some(x=>min(x).balance<0)&&<p className="ex-delta">Дефицит внутри группы: {others.filter(x=>min(x).balance<0).map(x=><a href={href('cash',x.id)} key={x.id}>{x.name} {n(min(x).balance)} млн ₽ </a>)}</p>}
            {mini('fcf')}
            {mini('ocf')}
            <a className="ex-next" href={href('cash')}>
              Календарь и потребность в деньгах <ArrowRight size={16} />
            </a>
          </section>
          {group&&<section className="op-panel">
            <div className="ex-panel-title">
              <span>03 / КАПИТАЛ</span>
              <a href={href('capital')} aria-label="Раскрыть капитал">
                <ArrowRight />
              </a>
            </div>
            <h2>
              Отдача на капитал <small>Return on Invested Capital</small>
              <MetricHelp catalog="executive" metric="capital"/>
            </h2>
            <a className="ex-number" href={href('capital')}>
              {e.roic === null ? '—' : n(e.roic) + '%'}
              <small>
                {e.roic === null
                  ? 'Для Страховая компания методика не задана'
                  : 'ROIC · прогноз полного года'}
              </small>
            </a>
            <p className="ex-capital-note">
              {group
                ? 'Нестраховой периметр · Страховая компания исключена'
                : 'NOPAT / средний капитал'}
            </p>
            <a className="ex-mini" href={href('capital')}>
              <span>
                Средний капитал
                <small>
                  {group ? 'Без страховой компании · млн ₽' : 'Модельная база · млн ₽'}
                </small>
              </span>
              <b>{n(e.capital)}</b>
              <ChevronRight size={16} />
            </a>
            <h3 className="ex-small-title">Капитальные платежи · CAPEX</h3>
            <div className="ex-capex">
              {(['plan', 'actual', 'forecast'] as const).map((f, i) => (
                <a href={href('capex', id, f)} key={f}>
                  <span>
                    {['План года', 'Факт янв–авг', 'Прогноз года'][i]}
                    <b>{n(e.flows.capex[f])}</b>
                  </span>
                  <i>
                    <em
                      style={{
                        width: `${(e.flows.capex[f] / Math.max(e.flows.capex.plan, e.flows.capex.forecast, 1)) * 100}%`,
                      }}
                    />
                  </i>
                </a>
              ))}
            </div>
            <p className="op-muted">
              Крупные будущие платежи сосредоточены в сентябре по платёжному прогнозу.
            </p>
            <a className="ex-next" href={href('capital')}>
              Куда направлен капитал <ArrowRight size={16} />
            </a>
          </section>}
        </div>
        {!group&&<div className="ex-company-deeper"><a href={href('capital')}>Капитал и отдача компании <ArrowRight size={16}/></a><a href={href('capex')}>Инвестиционные платежи <ArrowRight size={16}/></a><a href={href('margin')}>Маржа компании <ArrowRight size={16}/></a></div>}
        <div className="ex-middle">
          <section className="op-panel">
            <div className="op-section-head">
              <h2>Чем обеспечен будущий результат</h2>
              <a href={href('portfolio')} aria-label="Раскрыть портфель">
                <ArrowRight />
              </a>
            </div>
            <p className="op-muted">
              Будущая выручка · сентябрь–декабрь · млн ₽. Не прибыль и не
              поступления.
            </p>
            <a
              href={href('portfolio')}
              className="ex-coverage"
              aria-label="Состав будущей выручки"
            >
              {[p.confirmed, p.pipeline, p.gap].map((v, i) => (
                <span
                  key={i}
                  style={{ width: `${p.total > 0 ? (v / p.total) * 100 : 0}%` }}
                />
              ))}
            </a>
            <div className="ex-coverage-labels">
              {[
                ['Подтверждено', p.confirmed],
                ['Ожидаемые продажи', p.pipeline],
                ['Не обеспечено', p.gap],
              ].map(([label, v]) => (
                <a href={href('portfolio')} key={label}>
                  <small>{label}</small>
                  <b>{n(v as number,2)}</b>
                </a>
              ))}
            </div>
            <a className="ex-next" href={href('operations')}>
              {e.fleets.length
                ? 'Хватит ли производственной мощности'
                : 'Исполнение обязательств компании'}{' '}
              <ArrowRight size={16} />
            </a>
          </section>
          <section className="op-panel">
            <div className="op-section-head">
              <h2>Решения и поручения</h2>
              <a href={href('decisions')} aria-label="Все решения">
                <ArrowRight />
              </a>
            </div>
            <p className="op-muted">
              Статус на 31 августа · роли и сроки </p>
            {scoped.length ? (
              scoped.slice(0, 3).map((a) => (
                <a
                  className="ex-action"
                  href={ownerHref({
                    page: 'executive-detail',
                    company: a.company,
                    metric: 'decisions',
                    id: a.id,
                    snapshot: data.snapshotId,
                  })}
                  key={a.id}
                >
                  <span className="ex-action-status">{a.status}</span>
                  <strong>{a.title}</strong>
                  <small>
                    {a.role} · до {a.due.slice(8)}.{a.due.slice(5, 7)}
                  </small>
                  <ChevronRight size={16} />
                </a>
              ))
            ) : (
              <p>
                Поручения этой компании ещё не подготовлены. Это не означает,
                что все задачи выполнены.
              </p>
            )}
            <a className="ex-next" href={href('decisions')}>
              Выполнение и подтверждение эффекта <ArrowRight size={16} />
            </a>
          </section>
        </div>
        {managing && companyTable()}
        {source('op')}
      </>
    );
  }
  function companyTable() {
    return (
      <section className="op-panel">
        <div className="op-section-head">
          <h2>Компании крыла УК · финансовый обзор</h2>
          <span className="op-muted">
            Название → экран ГД · число → показатель
          </span>
        </div>
        <div className="op-scroll">
          <table className="op-table ex-table">
            <thead>
              <tr>
                <th>Компания</th>
                <th>Прибыль · прогноз</th>
                <th>Δ к плану</th>
                <th>FCF · прогноз</th>
                <th>Деньги · минимум 13 нед.</th>
                <th>Ответственный</th>
              </tr>
            </thead>
            <tbody>
              {others.map((x) => (
                <tr key={x.id}>
                  <th>
                    <a href={home(x.id)}>{x.name}</a>
                    <small>{x.profile}</small>
                  </th>
                  <td>
                    <a href={href('op', x.id)}>{n(x.flows.op.forecast)}</a>
                  </td>
                  <td>
                    <a href={href('op', x.id, 'variance')}>
                      {signed(x.flows.op.forecast - x.flows.op.plan)}
                    </a>
                  </td>
                  <td>
                    <a href={href('fcf', x.id)}>{n(x.flows.fcf.forecast)}</a>
                  </td>
                  <td>
                    <a href={href('cash', x.id)}>
                      {n(min(x).balance)}
                      <small>{min(x).label}</small>
                    </a>
                  </td>
                  <td>
                    ГД компании<small>ФИО не назначено</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="op-muted">
          Корректировки консолидации раскрываются отдельно в финансовых
          показателях. Минимумы компаний приходятся на свои даты — их нельзя
          складывать.
        </p>
      </section>
    );
  }
  function operations() {
    if (!e) return null;
    const catalogue: Record<string, string[]> = {
      'MRO-1': [
        'Срок ремонта · TAT',
        'Незавершённые работы · WIP',
        'Материалы и доступные смены',
      ],
      'MRO-2': [
        'Срок ремонта · TAT',
        'Незавершённые работы · WIP',
        'Материалы и доступные смены',
      ],
      ENG: [
        'Прогноз стоимости завершения · EAC',
        'Этапы и сроки',
        'Дефицит компетенций',
      ],
      LEASE: ['Занятость активов', 'Просрочка платежей', 'Сроки возврата'],
      INSURE: [
        'Страховой результат',
        'Достаточность резервов',
        'Страховые случаи',
      ],
      UK: [
        'Межкомпанейские решения',
        'Исполнение бюджета УК',
        'Стратегические этапы',
      ],
    };
    return (
      <section className="op-panel">
        <div className="op-section-head">
          <h2>
            {e.fleets.length
              ? 'Производственная программа'
              : 'Исполнение и ресурсы'}
          </h2>
          <span className="op-muted">{e.profile}</span>
        </div>
        {e.fleets.length ? (
          <>
            <div className="ex-fleets">
              {e.fleets.map((f) => (
                <a
                  key={f.id}
                  href={ownerHref({
                    page: 'production',
                    company: group ? undefined : id,
                    fleet: f.id,
                    snapshot: data?.productionSnapshotId,
                  })}
                >
                  <strong>{f.name}</strong>
                  <b>
                    {n(f.forecast)} <small>ч · прогноз года</small>
                  </b>
                  <span>
                    План {n(f.plan)} · факт янв–авг {n(f.actual)}
                  </span>
                  <span>Отменено за янв–авг: {f.cancelled}</span>
                  <ChevronRight size={17} />
                </a>
              ))}
            </div>
            <p className="op-muted">
              Налёт из существующего реестра. Финансовые суммы пока не
              распределены по этим рейсам; отмены реестра и отдельный кейс OP не
              объединяются.
            </p>
            <div className="ex-module-notes">
              <div>
                <b>
                  {id === 'AL1' ? 'Экономика миссии' : 'Коммерция и загрузка'}
                </b>
                <p>
                  {id === 'AL1'
                    ? 'Для чартера нужны полная ротация, позиционирование и ожидание. Маржа каждой миссии ещё не рассчитана.'
                    : 'CTK, ACTK, CLF и Cargo Yield требуют грузов, расстояний и доступной ёмкости. Этих записей в расчёте пока нет.'}
                </p>
              </div>
              <div>
                <b>Флот, люди и качество</b>
                <p>
                  AOG, допуски экипажей, своевременность доставки и претензии
                  ещё не подключены. Наличие налёта не подтверждает готовность
                  ресурсов.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="ex-module-notes">
            {(catalogue[id] || ['Обязательства и исполнение']).map((t) => (
              <div key={t}>
                <b>{t}</b>
                <p>
                  Источник для отраслевого показателя ещё не подготовлен.
                  Отсутствие значения не означает ноль.
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }
  function detail() {
    if (!e || !data) return null;
    if(key==='margin'&&route.field==='variance')return <section className="op-panel"><h2>Выберите сопоставимый период маржи</h2><p>Отношение отклонений прибыли и выручки не является отклонением маржи.</p><a href={href('margin',id,'forecast')}>Маржа прогноза года →</a></section>;
    if (flowKeys.includes(key) || key === 'margin') {
      const k = (key === 'margin' ? 'op' : key) as FlowKey;
      const val = (x: ExecutiveEntity) =>
        key === 'margin'
          ? amount(x, 'revenue')
            ? (amount(x, 'op') / amount(x, 'revenue')) * 100
            : null
          : amount(x, k);
      const title =
        route.field === 'actual'
          ? 'Факт января–августа'
          : route.field === 'plan'
            ? 'План полного года'
            : route.field === 'ytdPlan'
              ? 'План января–августа'
              : route.field === 'variance'
                ? 'Отклонение прогноза от плана'
                : 'Прогноз полного года';
      return (
        <>
          <section className="op-panel">
            <h2>
              {metricNames[key][0]}{' '}
              <MetricHelp catalog="executive" metric={key}/>
              <small className="op-muted">{metricNames[key][1]}</small>
            </h2>
            <div className="op-detail-number">
              {n(val(e), 2)}
              <small>
                {key === 'margin' ? '%' : 'млн ₽'} · {title}
              </small>
            </div>
            <div className="op-month-links">
              {(
                [
                  'plan',
                  'actual',
                  'ytdPlan',
                  'forecast',
                  ...(key === 'margin' ? [] : ['variance']),
                ] as const
              ).map((f) => (
                <a key={f} href={href(key, id, f as OwnerRoute['field'])}>
                  {
                    (
                      {
                        plan: 'План года',
                        actual: 'Факт янв–авг',
                        ytdPlan: 'План янв–авг',
                        forecast: 'Прогноз года',
                        variance: 'Δ года',
                      } as Record<string, string>
                    )[f]
                  }
                </a>
              ))}
            </div>
            {key !== 'margin' && flowChart(e, k)}
            {key!=='margin'&&route.field==='actual'&&<p>Факт января–августа {n(e.flows[k].actual,2)} · план того же периода {n(e.flows[k].ytd_plan,2)} · отклонение <b>{signed(e.flows[k].actual-e.flows[k].ytd_plan)}</b> млн ₽.</p>}
            {owner&&<p className="op-muted">Единственное крыло в текущей модели — УК. Его итог уже консолидирован и совпадает с группой; повторного добавления компаний или исключений здесь нет.</p>}
            {group ? (
              <>
                <div className="op-scroll">
                  <table className="op-table">
                    <thead>
                      <tr>
                        <th>Компания</th>
                        <th>{title}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drillRows.map((x) => (
                        <tr key={x.id}>
                          <th>
                            <a href={href(key, x.id)}>{x.name}</a>
                          </th>
                          <td>
                            <a href={href(key, x.id)}>
                              {n(val(x), 2)}
                              {key === 'margin' ? '%' : ''}
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {key !== 'margin' ? (
                  <p>
                    Консолидационная корректировка:{' '}
                    <b>
                      {n(
                        round(
                          amount(e, k) -
                            drillRows.reduce((a, x) => a + amount(x, k), 0),
                        ),
                        2,
                      )}{' '}
                      млн ₽
                    </b>
                    . Итог группы {n(amount(e, k), 2)}.
                  </p>
                ) : (
                  <p>
                    Маржа группы = консолидированная прибыль / консолидированная
                    выручка. Проценты компаний не суммируются.
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="op-scroll">
                  <table className="op-table">
                    <thead>
                      <tr>
                        <th>Месяц</th>
                        <th>План</th>
                        <th>Факт</th>
                        <th>Будущий прогноз</th>
                      </tr>
                    </thead>
                    <tbody>
                      {e.monthly[k].map((m, i) => (
                        <tr key={m.month}>
                          <th>{id==='AL1'&&['op','revenue','margin'].includes(key)?<a href={ownerHref(economicsMonthRoute('AL1',data.snapshotId,m.month,key,route.field))}>{m.label} →</a>:m.label}</th>
                          {(['plan', 'actual', 'forecast'] as const).map(
                            (f) => (
                              <td key={f}>
                                {n(
                                  key === 'margin'
                                    ? m[f] === null || !e.monthly.revenue[i][f]
                                      ? null
                                      : (m[f]! / e.monthly.revenue[i][f]!) * 100
                                    : m[f],
                                  2,
                                )}
                              </td>
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="op-muted">
                  Конечное основание этого раскрытия — модельные месячные
                  строки, не первичные документы.
                </p>
              </>
            )}
            {key === 'op' && (
              <a className="ex-next" href={op('factors')}>
                Факторы отклонения и кейс отмен <ArrowRight size={16} />
              </a>
            )}
            {['fcf', 'ocf', 'cashBridge'].includes(key) && (
              <div className="ex-formula">
                <h3>Как связаны прибыль и деньги · прогноз года</h3>
                {mini('op')}
                {mini('da')}
                {mini('cashBridge')}
                {mini('ocf')}
                {mini('capex')}
                {mini('fcf')}
                <p>
                  OCF = OP + амортизация + переход к деньгам; FCF = OCF −
                  денежный CAPEX. Для АК1 переход к деньгам раскрыт в едином
                  реестре: изменения ДЗ/КЗ, проценты и налог на прибыль.
                  По остальным компаниям мост пока задан модельно, без такого реестра.
                  Операционная прибыль не подменяет денежный поток.
                </p>
                <p>
                  АК1 · годовой реестр: привлечено 288 млн ₽, погашено тело
                  кредита 228 и лизинга 60 млн ₽. Чистый CFF равен нулю, но валовые
                  движения не нулевые. Тело лизинга — CFF, проценты — OCF;
                  продажи активов и дивиденды отсутствуют. Это профиль,
                  не утверждённая учётная политика группы.
                </p>
                <a href={ownerHref({page:'company', company:'AL1', metric:'finance', kpi:'bridge', field:'forecast', snapshot:data.snapshotId})}>Сверка прибыли и денежных потоков АК1 →</a>
              </div>
            )}
            {key === 'revenue' && (
              <p>
                Выручка компаний включает внутригрупповой оборот; в группе он
                исключён. Управленческая выручка Страховая компания — условная строка; IFRS 17
                и страховой результат отдельно не смоделированы.
              </p>
            )}
            {key === 'da' && (
              <p>
                Амортизация задана отдельной предпосылкой. Сумма OP + D&amp;A не
                объявляется согласованной EBITDA: полный мост и состав
                корректировок ещё требуют утверждения.
              </p>
            )}
          </section>
          {source()}
        </>
      );
    }
    if (key === 'cash')
      return (
        <>
          <section className="op-panel">
            <h2>Денежный горизонт · 13 недель <MetricHelp catalog="executive" metric="cash"/></h2>
            <p>
              На 31 августа: {n(e.cash)} млн ₽. Минимум {n(min(e).balance)} млн
              ₽ на {min(e).label}; резерв ликвидности {n(e.cashFloor)}.
            </p>
            {cashChart(e)}
            <p className="op-muted">
              Пунктир — модельный резерв. Сумма денег группы не означает право
              свободного перевода между компаниями. Здесь остатки до ограничений.
              АК1: 15 млн ₽ НСО уже внутри остатка; невыбранная линия
              80 млн ₽ не включена. Для остальных компаний ограничения ещё не сопоставлены.
            </p>
            {group && (
              <div className="ex-list">
                {drillRows.map((x) => (
                  <a href={href('cash', x.id)} key={x.id}>
                    <span>{x.name}</span>
                    <b>{n(x.cash)} на 31.08</b>
                    <ChevronRight size={16} />
                  </a>
                ))}
              </div>
            )}
            <div className="op-scroll">
              <table className="op-table">
                <thead>
                  <tr>
                    <th>Дата прогноза</th>
                    <th>Чистое движение за неделю</th>
                    <th>Остаток</th>
                    <th>Запас до ограничений</th>
                  </tr>
                </thead>
                <tbody>
                  {e.weeks.map((w) => (
                    <tr key={w.date}>
                      <th>{w.date}</th>
                      <td>{signed(w.movement)}</td>
                      <td>{n(w.balance, 2)}</td>
                      <td>{n(w.balance - e.cashFloor, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Начальный остаток года + FCF января–августа = деньги на 31
              августа. Будущие остатки = предыдущий остаток + недельное
              движение. Сентябрь, октябрь и ноябрь распределены на 4, 4 и 5
              модельных недель; это не договорный платёжный календарь.
            </p>
            <a href={href('fcf')}>Проверить годовой денежный поток →</a>
            {e.id==='AL1'&&<p><a href={ownerHref({page:'company',company:'AL1',metric:'finance',snapshot:data.snapshotId})}>Доступные деньги, банки и платежи АК1 →</a></p>}
          </section>
          {source()}
        </>
      );
    if (key === 'capital')
      return (
        <>
          <section className="op-panel">
            <h2>Капитал и отдача · ROIC <MetricHelp catalog="executive" metric="capital"/></h2>
            <div className="op-detail-number">
              {e.roic === null ? 'Не рассчитано' : n(e.roic) + '%'}
              <small>Прогноз 2026</small>
            </div>
            <p>
              ROIC = NOPAT / средний инвестированный капитал. NOPAT =
              операционная прибыль × 80%: 20% — условная модельная налоговая
              нагрузка, не ставка налога и не корпоративная методика. Капитал
              задан как средняя база года, без двойного учёта внутригрупповых
              вложений.
            </p>
            <p>
              {group
                ? 'Групповой числитель включает −40 консолидации; Страховая компания исключена из числителя и знаменателя.'
                : id === 'INSURE'
                  ? 'Для страхового бизнеса ROIC не используется без отдельной методики.'
                  : 'База и результат относятся к выбранной компании.'}{' '}
              Сравнение со стоимостью капитала пока недоступно.
            </p>
            {group && (
              <div className="ex-list">
                {drillRows.map((x) => (
                  <a href={href('capital', x.id)} key={x.id}>
                    <span>{x.name}</span>
                    <b>
                      {n(x.capital)} млн ₽ ·{' '}
                      {x.roic === null ? 'ROIC н/д' : n(x.roic) + '%'}
                    </b>
                    <ChevronRight size={16} />
                  </a>
                ))}
              </div>
            )}
            {mini('capex')}
            <p>
              CAPEX — денежные платежи, не стоимость всех инвестиционных
              обязательств. Реестр утверждённых инвестиций ещё не подготовлен.
            </p>
          </section>
          {source()}
        </>
      );
    if (key === 'portfolio')
      return (
        <>
          <section className="op-panel">
            <h2>Будущая выручка · сентябрь–декабрь <MetricHelp catalog="executive" metric="portfolio"/></h2>
            <div className="op-detail-number">
              {n(e.portfolio.total)}
              <small>млн ₽ · прогноз периода</small>
            </div>
            <div className="op-scroll">
              <table className="op-table">
                <thead>
                  <tr>
                    <th>Периметр</th>
                    <th>Подтверждено</th>
                    <th>Ожидаемые продажи</th>
                    <th>Не обеспечено</th>
                    <th>Всего</th>
                  </tr>
                </thead>
                <tbody>
                  {(group ? drillRows : [e]).map((x) => (
                    <tr key={x.id}>
                      <th>
                        <a href={href('portfolio', x.id)}>{x.name}</a>
                      </th>
                      <td>{n(x.portfolio.confirmed)}</td>
                      <td>{n(x.portfolio.pipeline)}</td>
                      <td>{n(x.portfolio.gap)}</td>
                      <td>{n(x.portfolio.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {group && (
              <p>
                Из подтверждённого портфеля исключён будущий внутригрупповой
                оборот{' '}
                {n(
                  drillRows.reduce((a, x) => a + x.portfolio.confirmed, 0) -
                    e.portfolio.confirmed,
                )}{' '}
                млн ₽. Итог: {n(e.portfolio.confirmed)} +{' '}
                {n(e.portfolio.pipeline)} + {n(e.portfolio.gap)} ={' '}
                {n(e.portfolio.total)}.
              </p>
            )}
            <p>
              Это обеспеченность будущей выручки из прогноза, не обеспеченность
              прибыли. «Ожидаемые продажи» — отдельная взвешенная предпосылка, а
              не подписанные договоры. Доли заданы в наборе; реестра
              заказов и вероятностей ещё нет. Факт января–августа повторно не
              включается.
            </p>
            <a href={href('revenue')}>Выручка года и помесячный состав →</a>
          </section>
          {source()}
        </>
      );
    if(id==='AL1'&&['operations','safety'].includes(key))return <section className="op-panel"><h2>{key==='operations'?'Производство авиакомпании 1':'Безопасность и качество авиакомпании 1'}</h2><p>показатели, связанные рейсы и ответственные доступны в рабочем экране ГД.</p><a href={ownerHref({page:'company',company:'AL1',metric:key==='operations'?'production':'safety',snapshot:data.snapshotId})}>Открыть полный раздел АК1 →</a></section>;
    if (key === 'operations')
      return (
        <>
          {operations()}
          {source()}
        </>
      );
    if (key === 'safety')
      return (
        <>
          <section className="op-panel">
            <h2>Безопасность: статус не оценён</h2>
            <p>
              Реестр событий, существенных рисков, эксплуатационных ограничений
              и профилактических действий не подключён. Зелёный статус и нулевое
              количество рисков не присваиваются.
            </p>
            <div className="ex-module-notes">
              <div>
                <b>Нужные данные</b>
                <p>
                  Тяжесть, ограничение, действующая защитная мера,
                  ответственный, срок и подтверждение устранения.
                </p>
              </div>
              <div>
                <b>Граница решения руководителя</b>
                <p>
                  Выделить ресурс и устранить организационное препятствие.
                  Финансовая выгода не снимает эксплуатационное ограничение.
                </p>
              </div>
            </div>
          </section>
          {source()}
        </>
      );
    if (key === 'decisions') {
      const actions = data.actions.filter(
        (a) => (group || a.company === id) && (!route.id || a.id === route.id),
      );
      return (
        <>
          <section className="op-panel">
            <h2>Решения и поручения</h2>
            <p className="op-muted">
              статусы на 31.08.2026. Здесь нет кнопки фактического
              утверждения.
            </p>
            {actions.length ? (
              actions.map((a) => (
                <article className="ex-decision" key={a.id}>
                  <span className="ex-action-status">
                    {a.status} · до {a.due}
                  </span>
                  <h3>{a.title}</h3>
                  <p>
                    {data.entities.find((x) => x.id === a.company)?.name} ·{' '}
                    {a.role}. ФИО не назначено.
                  </p>
                  <p>{a.decision}</p>
                  <p>
                    <b>Эффект:</b> {a.effect}
                  </p>
                  <a
                    href={
                      a.id === 'EXEC-01'
                        ? ownerHref({
                            page: 'op-detail',
                            company: 'AL2',
                            id: 'action',
                            snapshot: data.opSnapshotId,
                          })
                        : href(a.metric, a.company)
                    }
                  >
                    Показатель и основание →
                  </a>
                </article>
              ))
            ) : (
              <p>
                В этом периметре запись не найдена. Чужие поручения не
                подставлены.
              </p>
            )}
          </section>
          {source()}
        </>
      );
    }
    return (
      <section className="op-panel">
        <h2>Показатель не найден</h2>
        <p>
          Проверьте ссылку. Вместо неизвестной метрики не подставляется другая
          цифра.
        </p>
      </section>
    );
  }
  return (
    <div className="aviation-app overview-glass op-app ex-app">
      <header className="app-header">
        <a href="#/overview" className="brand">
          <span>AG</span>
        </a>
        <span className="role-label">
          <UserRound />
          {owner ? 'Владелец группы' : managing?'ГД УК':id==='UK'?'УК · свой бюджет':'ГД компании'}
        </span>
        <nav aria-label="Основная навигация">
          <a
            href="#/overview"
            className={owner && route.page !== 'companies' ? 'active' : ''}
          >
            Обзор
          </a>
          <a
            href="#/companies"
            className={!owner || route.page === 'companies' ? 'active' : ''}
          >
            Компании
          </a>
        </nav>
        <div className="header-tools">
          <ThemeControl />
          <span className="source-badge demo" title="Презентационный набор. Корпоративные источники не подключены.">Синтетические данные</span>
        </div>
      </header>
      <main className="workspace">
        {route.page !== 'overview' && <div className="workspace-navigation"><WorkspaceBack route={route}/><a href={home(managing?'GROUP':'MANAGEMENT')}>{managing?'К владельцу группы':'К управляющей компании УК'}</a></div>}
        <div className="page-heading">
          <div>
            <h1>
              {route.page === 'companies'
                ? 'Компании группы'
                : e?.name || 'Управленческий обзор'}
            </h1>
            <p>{['AL1','AL2','AL3'].includes(id)&&['production','commerce','technical','people','safety'].includes(route.metric||'')?'Период, периметр и единицы измерения — в выбранном блоке ниже':<>2026 · факт январь–август · прогноз полного года · денежные суммы — млн ₽</>}</p>
          </div>
        </div>
        {error ? (
          <section className="op-panel">
            <h2>Данные недоступны</h2>
            <p>{error}</p>
            <button
              className="ops-primary"
              onClick={() => setRetry((v) => v + 1)}
            >
              Повторить
            </button>
          </section>
        ) : !data ? (
          <p>Загрузка единого среза…</p>
        ) : !e || stale ? (
          <section className="op-panel">
            <h2>Периметр или версия недоступны</h2>
            <p>Чужие и устаревшие значения не подставляются.</p>
            <a href="#/overview">Открыть текущий обзор</a>
          </section>
        ) : route.page === 'company' && ['AL1','AL2','AL3'].includes(id) && !route.metric ? (
          <CompanyOverview data={data} route={route}/>
        ) : route.page === 'company' && (id === 'AL2' || id === 'AL3' || id === 'AL1' && ['technical','people'].includes(route.metric||'')) ? (
          <AirlineWorkspace key={JSON.stringify(route)} data={data} route={route}/>
        ) : id === 'AL1' && route.page === 'company' ? (
          <Al1CeoWorkspace key={(route.metric||'overview')+(route.id||'')} data={data} route={route}/>
        ) : route.page === 'executive-detail' ? (
          <>
            <nav className="op-trail" aria-label="Путь раскрытия">
              <a href={href(key,'GROUP')}>Авиагруппа</a>
              <ChevronRight size={16} />
              {!owner&&<><a href={href(key,'MANAGEMENT')}>УК · крыло</a><ChevronRight size={16}/></>}
              {!group && (
                <>
                  <a href={home()}>{e.name}</a>
                  <ChevronRight size={16} />
                </>
              )}
              <span>{metricNames[key]?.[0] || 'Неизвестный показатель'}</span>
            </nav>
            {detail()}
          </>
        ) : route.page === 'companies' ? (
          <>{companyNavigator()}{companyTable()}</>
        ) : (
          summary()
        )}
        <footer className="op-footer">
          <span>Единый управленческий срез · {data?.asOf || '—'}</span>
          <details><summary>О данных и подключении</summary><p>Синтетические данные для презентации. Корпоративный Superset не подключён. Методики, пороги и персональные полномочия требуют утверждения перед внедрением.</p></details>
        </footer>
      </main>
    </div>
  );
}
