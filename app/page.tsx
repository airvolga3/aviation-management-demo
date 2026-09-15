'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Building2, CalendarDays, ChartNoAxesCombined, ChevronRight, CircleHelp, ClipboardCheck, FileText, Plane, ShieldCheck, Sun, Target, UserRound, Wrench } from 'lucide-react';
import ThemeControl from '@/components/theme-control';
import ResultTrend from '@/components/result-trend';
import OwnerOverview from '@/components/owner-overview';
import OperatingWorkspace from '@/components/operating-workspace';
import ExecutiveWorkspace from '@/components/executive-workspace';
import { trackWorkspaceNavigation } from '@/components/company-navigation';
import ResultContext from '@/components/result-context';
import ProductionWorkspace, {ProductionSummary} from '@/components/production-workspace';
import ResultMonth from '@/components/result-month';
import { monthLabel } from '@/lib/result-trend';
import { fieldLabel, allowDemoContext, companyResult, ownerHref, parseOwnerRoute, resultValue, type OwnerRoute, type OwnerWorkspace, type ResultField } from '@/lib/owner-model';
import type { MetricEnvelope, MetricBreakdownRow } from '@/lib/data-contract';

const n = (value: number | undefined | null) => typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat('ru-RU', {maximumFractionDigits:2}).format(value).replace('-', '−') : '—';
const signed = (value: number | undefined) => value !== undefined && value > 0 ? '+' + n(value) : n(value);
const clean = (text?: string) => text?.replace(/ · (ФИО )?(TO_ASSIGN|TO_APPROVE)/g, '').replace(/ · не назначен/g, '') || 'Ответственный не назначен';
const date = (value: string) => new Intl.DateTimeFormat('ru-RU', {day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(value + 'T12:00:00Z'));
const A = ({route, children, className = ''}: {route: OwnerRoute; children: ReactNode; className?: string}) => <a href={ownerHref(route)} className={className}>{children}</a>;
const metricLink = (metric: string, field: ResultField = 'forecast'): OwnerRoute => ({page:'metric',metric,field});
const companyLink = (company: string, field: ResultField = 'forecast', from = 'company'): OwnerRoute => ({page:'company-result',company,field,from});
const areas: Record<string, {title: string; text: string}> = {
  capital:{title:'Капитал и активы',text:'Отдача капитала не рассчитана. Нужно согласовать базу капитала, вид результата и отдельные правила для страхового и лизингового бизнеса.'},
  commerce:{title:'Коммерция',text:'На уровне владельца важны подтверждённая будущая работа, её ожидаемый вклад и концентрация на клиентах. Сопоставимого группового набора для этого обзора пока нет.'},
  production:{title:'Производство',text:'В наборе доступна исполнимая мощность группы на семь дней. Это отдельный операционный горизонт, не годовой финансовый результат.'},
  strategy:{title:'Стратегия',text:'Контроль стратегических этапов и результата инвестиций требует отдельного реестра. Доступные поручения не подменяют стратегическую программу.'},
  risks:{title:'Риски',text:'Есть сигналы по деньгам и исполнимой мощности. Их наличие само по себе не означает, что требуется решение владельца. Полный реестр рисков и безопасности ещё не подключён.'},
};

export default function Home() {
  const [data, setData] = useState<OwnerWorkspace | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [route, setRoute] = useState<OwnerRoute>({page:'overview'});
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const changed = () => { trackWorkspaceNavigation(); setRoute(parseOwnerRoute(window.location.hash)); window.scrollTo(0,0); };
    changed();
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch(import.meta.env.BASE_URL + 'data/owner.json', {cache:'no-store',signal:controller.signal}).then(async r => {
      const body = await r.json() as OwnerWorkspace & { message?: string };
      if (!r.ok) throw new Error(body.message || 'Не удалось получить данные.');
      setError('');
      setData(body);
    }).catch(e => { if (e.name !== 'AbortError') {setData(null);setError(e.message);} });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => { titleRef.current?.focus({preventScroll:true}); }, [route]);

  const metrics = data?.metrics ?? [];
  const metric = (id: string) => metrics.find(m => m.metricId === id);
  const result = metric('GROUP_RESULT_FORECAST');
  const cash = metric('GROUP_LIQUIDITY_MIN_13W');
  const context = data?.context;
  const demo = !!data && allowDemoContext(metrics, data.context);
  const companies = context?.companies ?? [];
  const company = companies.find(c => c.id === route.company);
  const companyRow = company ? companyResult(metrics, company.id) : undefined;
  const currentMetric = metric(route.metric || '');
  const driverRow = metric('AL1_GROUP_CONTRIBUTION')?.breakdown.find(r => r.id === route.id);
  const validAl1Route = (!route.company || route.company === 'AL1') && route.field !== 'actual' && route.field !== 'ytdPlan';
  const driver = demo && validAl1Route ? context?.drivers.find(d => d.id === route.id) : undefined;
  const evidence = demo && validAl1Route ? context?.documents.find(d => d.id === route.id) : undefined;
  const task = demo ? context?.tasks.find(t => t.id === route.id) : undefined;
  const field = route.field ?? 'forecast';
  const title = route.page === 'overview' ? 'Группа в фокусе' : route.page === 'legacy' ? 'Архив сценария · v0.11' :
    route.page === 'production' ? 'Полётная программа' :
    route.page === 'flight' ? 'Запись рейса' :
    route.page === 'companies' ? 'Компании группы' :
    route.page === 'company' ? company?.name :
    route.page === 'company-result' ? (company ? company.name + ' · вклад в группу' : undefined) :
    route.page === 'metric' ? (route.metric === 'GROUP_RESULT_FORECAST' ? 'Экономический результат группы' : currentMetric?.label) :
    route.page === 'driver' ? driverRow?.label :
    route.page === 'evidence' ? evidence?.title :
    route.page === 'tasks' ? 'Поручения владельца' :
    route.page === 'task' ? task?.title :
    route.page === 'area' ? areas[route.id || '']?.title :
    route.page === 'month' ? 'Экономический результат за месяц' :
    route.page === 'month-row' ? result?.breakdown.find(r=>r.id===route.row)?.label :
    route.page === 'row' ? currentMetric?.breakdown.find(r => r.id === route.row)?.label : undefined;

  function source(m?: MetricEnvelope, row?: MetricBreakdownRow) {
    if (!m) return <Notice title="Данные отсутствуют">Этот показатель не получен из источника. Отсутствие значения не означает ноль.</Notice>;
    return <details className="source-details"><summary><FileText />Источник и ответственность</summary>
      <dl className="meta-grid"><Meta label="Показатель" value={m.label}/><Meta label="Версия" value={m.version}/>
        <Meta label="Период" value={m.period.label}/><Meta label="Периметр" value={m.perimeter}/>
        <Meta label={row?.owner ? 'Результат строки' : 'Результат'} value={clean(row?.owner || m.owners.result)}/><Meta label="Данные показателя" value={clean(m.owners.data)}/>
        <Meta label="Действие по показателю" value={clean(m.owners.action)}/><Meta label="Источник" value={m.source.reference}/><Meta label="Статус данных" value={m.dataStatus}/><Meta label="Методика" value={m.methodStatus}/>
        {row && <Meta label="Строка" value={row.id}/>}
      </dl><p>{m.disclaimer}</p><p>Роли — рабочие. Конкретные сотрудники пока не назначены.</p></details>;
  }
  function companyTiles() {
    return <div className="company-grid">{companies.map(c => <A key={c.id} route={{page:'company',company:c.id}} className="company-tile">
      <span className="company-icon">{c.kind === 'Авиакомпания' ? <Plane/> : c.id.startsWith('AL1T') ? <Wrench/> : <Building2/>}</span>
      <span><strong>{c.name}</strong><small>{c.kind}</small></span><ChevronRight/></A>)}</div>;
  }
  function tasksList() {
    if (!demo) return <Notice title="Поручения не подключены">поручения не подставляются к данным корпоративного источника.</Notice>;
    return <div className="task-list">{context?.tasks.map(t => <A key={t.id} route={{page:'task',id:t.id}} className="task-row">
      <ClipboardCheck/><strong>{t.title}</strong><span className="task-owner"><UserRound/>{t.owner}</span><span><CalendarDays/>{date(t.due)}</span>
      <span className={'status ' + (t.status === 'DONE' ? 'good' : 'watch')}>{t.status === 'DONE' ? 'Выполнено' : 'В работе'}</span><ChevronRight/></A>)}</div>;
  }
  function comparisons(row: typeof companyRow | MetricEnvelope, target: (f: ResultField) => OwnerRoute) {
    return <div className="comparison-strip">{(['plan','forecast','variance','actual','ytdPlan'] as ResultField[]).map(f =>
      <A key={f} route={target(f)} className={f === field ? 'selected' : ''}><small>{fieldLabel(f,result)}</small><strong className={f === 'variance' ? 'warning-text' : ''}>{f === 'variance' ? signed(resultValue(row,f)) : n(resultValue(row,f))}</strong></A>)}</div>;
  }
  const resultScreen = ['company','company-result','driver','evidence','month','month-row','production','flight'].includes(route.page) || (['metric','row'].includes(route.page) && route.metric === 'GROUP_RESULT_FORECAST');
  if (['overview','companies','company','executive-detail'].includes(route.page)) return <ExecutiveWorkspace route={route}/>;
  if (['operating','op-detail'].includes(route.page)) return <OperatingWorkspace route={route}/>;
  return <div className={'aviation-app' + (route.page==='overview' || route.page==='legacy' || resultScreen ? ' overview-glass' : '') + (resultScreen ? ' drill-glass' : '')}>
    <a className="skip-link" href="#workspace" onClick={event => {event.preventDefault();document.getElementById('workspace')?.focus();}}>К содержанию</a>
    <header className="app-header">
      <A route={{page:'overview'}} className="brand" ><span>AG</span></A><span className="role-label"><UserRound/>Владелец</span>
      <nav aria-label="Основная навигация">{[['Обзор','overview'],['Компании','companies'],['Налёт','production'],['Поручения','tasks']].map(([label,page]) =>
        <A key={page} route={{page:page as OwnerRoute['page']}} className={route.page === page ? 'active' : ''}>{label}</A>)}</nav>
      <div className="header-tools"><ThemeControl/><span className={'source-badge ' + (demo ? 'demo' : '')}>{error ? 'Источник недоступен' : !data ? 'Загрузка' : demo ? 'Данные на дату среза' : 'Superset · методика не принята'}</span></div>
    </header>
    <main className="workspace" id="workspace" tabIndex={-1}>
      {route.page !== 'overview' && <Breadcrumbs route={route} currentTitle={title || 'Раздел недоступен'} companyName={company?.name} parentDriver={evidence ? {id:evidence.driverId,label:metric('AL1_GROUP_CONTRIBUTION')?.breakdown.find(r => r.id === evidence.driverId)?.label || 'Причина'} : undefined}/>}
      <div className="page-heading"><div><h1 ref={titleRef} tabIndex={-1}>{title || 'Раздел недоступен'}</h1>
      <p>{demo && context?.asOf ? 'Срез данных на ' + date(context.asOf) + ' ' + context.asOf.slice(0,4) + ' · ' + (currentMetric?.period.label || result?.period.label || 'период источника') : data ? 'Период и статус — в источнике каждого показателя' : 'Загружаем согласованный набор показателей'}</p></div>
      {route.page !== 'overview' && <A route={{page:'overview'}} className="back-link"><ArrowLeft/>Обзор группы</A>}</div>

      {error ? <Notice title="Не удалось получить данные"><p>{error}</p><button className="plain-button" onClick={() => setReload(v => v + 1)}>Повторить загрузку</button></Notice> :
      !data ? <output className="loading-state">Загрузка показателей…</output> : <>
      {!['production','flight','legacy'].includes(route.page) && <Notice title="Архивный контур">Показатели этого раздела относятся к прежнему сценарию v0.11, а не к операционной прибыли нового обзора. Суммы между сценариями не объединяются.</Notice>}
      {resultScreen && <ResultContext data={data} route={route}/>}

      {route.page === 'legacy' && <>
        <Notice title="Архивный сценарий v0.11">Эти прежние экономические суммы и поручения не относятся к новой модели операционной прибыли. Не сравнивайте их как версии одного показателя. Актуальный блок — в обзоре группы.</Notice>
        <OwnerOverview result={result} cash={cash} demo={demo}/>
        <ProductionSummary enabled={demo}/>
        <div className="area-grid">{[['commerce','Коммерция',ChartNoAxesCombined],['production','Производство',Wrench],['strategy','Стратегия',Target],['risks','Риски',ShieldCheck]].map(([id,label,Icon]) => {
          const Symbol = Icon as typeof Sun; return <A key={id as string} route={id==='production'?{page:'production'}:{page:'area',id:id as string}} className="area-link"><Symbol/><span>{label as string}</span><ArrowRight/></A>;
        })}</div>
        <Section title="Компании группы" subtitle="Прямой вход в компанию">{companyTiles()}</Section>
        <Section title="Поручения владельца" subtitle={demo ? 'задачи · статус выполнения не равен подтверждённому эффекту' : undefined}>{tasksList()}</Section>
      </>}

      {route.page === 'companies' && companyTiles()}
      {route.page === 'company' && (company ? <>
        <p className="section-lead">{company.description}. Обзор в контексте владельца; роль не меняется.</p>
        <ProductionSummary enabled={demo} company={company.id}/>
        <div className="company-overview-grid">
          <section className="panel"><h2>Экономический результат</h2><p>Вклад в группу после атрибутивных корректировок, млн ₽</p>
            <A route={companyLink(company.id)} className="company-headline">{n(resultValue(companyRow,'forecast'))}<ArrowRight/></A>
            {comparisons(companyRow, f => companyLink(company.id,f))}
            <ResultTrend timeline={companyRow?.timeline} version={result?.version || ''} row={company.id}/>
          </section>
          <section className="panel"><h2>Ответственность</h2><p><UserRound/> {company.owner} — за результат компании</p><p>Финансовый блок — за данные и сверку.</p><p className="muted">Конкретные сотрудники не назначены. Эти подписи — проектные роли.</p></section>
        </div>
        <Section title="Другие области"><div className="area-grid">{['Коммерческие','Производственные','Финансовые','Риски и задачи'].map(label =>
          <div className="panel compact" key={label}><h3>{label}</h3><p>Сопоставимые данные этой компании ещё не подготовлены.</p></div>)}</div></Section>
        {company.id === 'AL1' && <section className="panel"><h2>Собственный результат и вклад — не одно и то же</h2><p className="reconciliation">{n(metric('AL1_STANDALONE_FORECAST')?.value)} + ({n(metric('AL1_ATTRIBUTED_ELIMINATIONS')?.value)}) = {n(companyRow?.forecast)} млн ₽</p><p>Собственный прогноз → атрибутивная корректировка → вклад в группу. Эта корректировка уже внутри вклада и второй раз не применяется.</p><A route={companyLink('AL1')}>Открыть сверку и причины <ArrowRight/></A></section>}
      </> : <Notice title="Компания не найдена">Проверьте ссылку или откройте список компаний.</Notice>)}

      {route.page === 'metric' && (currentMetric ? <>
        {route.metric === 'GROUP_RESULT_FORECAST' ? <>
          <div className="detail-total"><span>{fieldLabel(field,result)}</span><strong>{n(resultValue(result,field))} <small>млн ₽</small></strong></div>
          {comparisons(result, f => metricLink('GROUP_RESULT_FORECAST',f))}
          <details className="drill-trend"><summary><ChartNoAxesCombined/>Динамика по месяцам и точные значения</summary><ResultTrend timeline={result?.timeline} version={result?.version || ''}/></details>
          <Section title={field === 'variance' ? 'Кто сформировал отклонение' : 'Из чего складывается показатель'} subtitle="Вклады компаний и отдельные групповые корректировки · млн ₽">
            <div className="data-table"><div className="table-head"><span>Компания / корректировка</span><span>{fieldLabel(field,result)}</span><span>Ответственный</span><span/></div>
              {result?.breakdown.map(row => <A key={row.id} route={row.id === 'GROUP_ADJUSTMENTS' ? {page:'row',metric:'GROUP_RESULT_FORECAST',row:row.id,field} : companyLink(row.id,field,'metric')} className="table-row">
                <span><strong>{row.label}</strong><small>{row.id === 'GROUP_ADJUSTMENTS' ? 'Отдельный контур · не компания' : row.description}</small></span>
                <strong className={field === 'variance' && (resultValue(row,field) ?? 0) < 0 ? 'warning-text' : ''}>{field === 'variance' ? signed(resultValue(row,field)) : n(resultValue(row,field))}</strong><span>{clean(row.owner)}</span><ChevronRight/></A>)}
            </div>
          </Section>
        </> : <MetricDetail metric={currentMetric}/>}
        {source(currentMetric)}
      </> : <Notice title="Показатель отсутствует">Данные не получены. Нулевое значение не подставлено.</Notice>)}

      {route.page === 'company-result' && (company && companyRow ? <>
        <div className="detail-total"><span>{fieldLabel(field,result)} · вклад в группу</span><strong>{n(resultValue(companyRow,field))} <small>млн ₽</small></strong></div>
        {comparisons(companyRow, f => companyLink(company.id,f,route.from))}
        <details className="drill-trend"><summary><ChartNoAxesCombined/>Динамика компании по месяцам</summary><ResultTrend timeline={companyRow.timeline} version={result?.version || ''} row={company.id}/></details>
        {company.id === 'AL1' && <section className="panel"><h2>Сверка собственного результата с вкладом</h2>
          <div className="equation"><span><small>Собственный прогноз</small><b>{n(metric('AL1_STANDALONE_FORECAST')?.value)}</b></span><span>+</span><span><small>Атрибутивная корректировка</small><b>{n(metric('AL1_ATTRIBUTED_ELIMINATIONS')?.value)}</b></span><span>=</span><span><small>Вклад в группу</small><b>{n(companyRow.forecast)}</b></span></div>
          <p>{fieldLabel('forecast',result)}, млн ₽. Корректировка уже включена во вклад.</p></section>}
        {company.id === 'AL1' && (field === 'forecast' || field === 'variance' || field === 'plan') ? <Section title="От плана к прогнозу" subtitle="Причины объясняют изменение результата, а не являются его абсолютными составляющими.">
          <div className="bridge-endpoints"><span>План <b>{n(companyRow.plan)}</b></span><ArrowRight/><span>Изменение <b>{signed(companyRow.variance)}</b></span><ArrowRight/><span>Прогноз <b>{n(companyRow.forecast)}</b></span><span>млн ₽</span></div>
          <div className="driver-grid">{metric('AL1_GROUP_CONTRIBUTION')?.breakdown.map(row => <A key={row.id} route={{page:'driver',id:row.id,company:'AL1',field,from:route.from}} className="driver-card">
            <span>{row.label}</span><strong className={row.value < 0 ? 'warning-text' : 'good-text'}>{signed(row.value)} <small>млн ₽</small></strong><small>{clean(row.owner)}</small><span className="text-link">Открыть основание <ArrowRight/></span></A>)}</div>
        </Section> : <Notice title="Доступна строка вклада">{field === 'actual' || field === 'ytdPlan' ? 'Факт и сопоставимый план прошедшего периода находятся в общей строке источника. Их детальный состав в этом проходе ещё не разложен.' : 'Для этой компании доступен вклад в группу. Подробные причины и первичные основания ещё не подготовлены.'}</Notice>}
        {source(company.id === 'AL1' ? metric('AL1_GROUP_CONTRIBUTION') : result,companyRow)}
        <A route={{page:'company',company:company.id}} className="back-link">Обзор компании <ArrowRight/></A>
      </> : <Notice title="Нет сопоставленной строки компании">Названия недостаточно: для раскрытия необходим устойчивый идентификатор компании в источнике.</Notice>)}

      {route.page === 'driver' && (driver && driverRow ? <>
        <div className="detail-total"><span>Влияние на годовой результат Авиакомпания 1</span><strong>{signed(driverRow.value)} <small>млн ₽</small></strong></div>
        <div className="answer-grid"><section className="panel"><h2>Что делаем</h2><p>{driver.action}</p><p><CalendarDays/> срок: {date(driver.due)}</p></section>
          <section className="panel"><h2>Кто отвечает</h2><p>За действие: {driver.owner}</p><p>За данные: {driver.dataOwner}</p><small className="muted">Роли не закреплены за реальными сотрудниками.</small></section></div>
        <Section title="Записи, из которых получено отклонение" subtitle="Можно открыть каждую запись, в том числе благоприятное отклонение.">
          <div className="evidence-list">{driver.documentIds.map(id => context?.documents.find(d => d.id === id)).filter(Boolean).map(doc => doc && <A key={doc.id} route={{page:'evidence',id:doc.id,company:'AL1',field,from:route.from}} className="evidence-row">
            <FileText/><span><strong>{doc.title}</strong><small>{doc.period} · {doc.kind === 'ACTUAL_RECORD' ? 'Факт' : 'Прогнозное допущение'}</small></span><strong>{signed(doc.impact)} млн ₽</strong><ChevronRight/></A>)}</div></Section>
        {source(metric('AL1_GROUP_CONTRIBUTION'),driverRow)}
      </> : <Notice title="Основание не подключено">документы не прикрепляются к корпоративным данным. Нужны сопоставление источника и права доступа.</Notice>)}

      {route.page === 'evidence' && (evidence ? <article className="document">
        <div className="document-top"><FileText/><span>УЧЕБНЫЙ ДОКУМЕНТ · НЕ КОРПОРАТИВНЫЙ ОРИГИНАЛ</span></div>
        <div className="document-type">{evidence.kind === 'ACTUAL_RECORD' ? 'Синтетическая запись фактических затрат' : 'Синтетическое прогнозное допущение'}</div>
        <dl className="meta-grid"><Meta label="Документ" value={evidence.id}/><Meta label="Строка источника" value={evidence.recordId}/><Meta label="Объект" value={evidence.object}/><Meta label="Период" value={evidence.period}/><Meta label="Версия" value={context?.snapshotId || ''}/><Meta label="Поставщик данных" value={evidence.owner}/></dl>
        <h2>Расчёт записи</h2><div className="document-amounts"><span>база плана<b>{n(evidence.baseline)} млн ₽</b></span><span>{evidence.kind === 'ACTUAL_RECORD' ? 'Факт' : 'прогноз'}<b>{n(evidence.amount)} млн ₽</b></span><span>Влияние на результат<b>{signed(evidence.impact)} млн ₽</b></span></div>
        <p>{evidence.description}</p><dl className="document-lines">{evidence.lines.map((line,i) => <Meta key={i} label={line.label} value={line.value}/>)}</dl>
        <p className="document-note">Это конечное основание данного маршрута. Подписи, контрагенты и реальные рейсовые документы не имитируются. В корпоративном подключении здесь потребуется защищённая ссылка на разрешённую запись/документ источника.</p>
      </article> : <Notice title="Документ недоступен">Источник не подключён или идентификатор не найден. Содержимое не подставляется.</Notice>)}

      {route.page === 'row' && (currentMetric ? <>
        <section className="panel"><h2>Запись источника</h2>{(() => {const row=currentMetric.breakdown.find(r => r.id === route.row);return row ? <>
          <p>{row.description}</p><div className="document-amounts"><span>План<b>{n(row.plan)}</b></span><span>Прогноз<b>{n(row.forecast)}</b></span><span>Отклонение<b>{signed(row.variance)}</b></span></div>
          {row.toDate && <p>За {row.toDate.period.label}: факт {n(row.toDate.actual)}, план {n(row.toDate.plan)} млн ₽.</p>}
          <p>Единица: {currentMetric.unit === 'RUB_MLN' ? 'млн ₽' : currentMetric.unit === 'TONNES' ? 'тонны' : currentMetric.unit}.</p>
          <p className="muted">Строка доступна; отдельный первичный документ этой ветки ещё не подготовлен.</p>{source(currentMetric,row)}
        </> : <p>Строка не найдена.</p>;})()}</section>
      </> : <Notice title="Источник не найден">Проверьте путь к показателю.</Notice>)}

      {(route.page === 'production' || route.page === 'flight') && <ProductionWorkspace route={route} enabled={demo}/>}
      {(route.page === 'month' || route.page === 'month-row') && <ResultMonth metric={result} month={route.month} rowId={route.page==='month-row' ? route.row || '__missing__' : undefined}/>}
      {route.page === 'tasks' && tasksList()}
      {route.page === 'task' && (task ? <>
        <section className="panel"><span className={'status ' + (task.status === 'DONE' ? 'good' : 'watch')}>{task.status === 'DONE' ? 'Выполнено' : 'В работе'}</span><p>{task.description}</p><dl className="meta-grid"><Meta label="Ответственный" value={task.owner}/><Meta label="срок" value={date(task.due)}/></dl></section>
        <div className="answer-grid"><section className="panel"><h2>Подтверждение исполнения</h2><p>{task.evidence}</p></section><section className="panel"><h2>Достигнутый эффект</h2><p>{task.effect}</p></section></div>
        <A route={metricLink(task.metricId)} className="action-link">Проверить связанный показатель <ArrowRight/></A>
      </> : <Notice title="Поручение не найдено">Источник поручений не подключён или запись отсутствует.</Notice>)}

      {route.page === 'area' && <><Notice title={route.id === 'capital' ? 'Методика на согласовании' : 'Граница текущих данных'}>{areas[route.id || '']?.text || 'Раздел не найден.'}</Notice>
        {route.id === 'capital' && companyTiles()}
        {(route.id === 'production' || route.id === 'risks') && <div className="area-grid"><A className="panel" route={metricLink('GROUP_EXECUTABLE_CAPACITY_7D')}>Исполнимая мощность <ArrowRight/></A>{route.id === 'risks' && <A className="panel" route={metricLink('GROUP_LIQUIDITY_MIN_13W')}>Денежный календарь <ArrowRight/></A>}</div>}
        {route.id === 'strategy' && <>{tasksList()}<Section title="Сценарий улучшения результата" subtitle="Оценка будущего эффекта, не факт и не новый утверждённый прогноз."><div className="area-grid">
          <A route={metricLink('GROUP_RECOVERY_EXPECTED')} className="panel"><h3>Ожидаемый эффект</h3><strong>{signed(metric('GROUP_RECOVERY_EXPECTED')?.value ?? undefined)} млн ₽</strong><p>Проверить состав оценки <ArrowRight/></p></A>
          <A route={metricLink('GROUP_RESIDUAL_GAP')} className="panel"><h3>Непокрытый остаток</h3><strong>{signed(metric('GROUP_RESIDUAL_GAP')?.value ?? undefined)} млн ₽</strong><p>Проверить источник расчёта <ArrowRight/></p></A>
        </div></Section></>}
      </>}
      </>}
    </main>
    <footer className="app-footer"><span>{demo ? 'Данные, документы и поручения учебные. Корпоративный Superset не подключён.' : 'Доступность показателей и оснований зависит от подключения и прав.'}</span><span>AG · Владелец</span></footer>
  </div>;
}

function Section({title,subtitle,children}: {title:string;subtitle?:string;children:ReactNode}) {
  return <section className="section"><div className="section-heading"><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{children}</section>;
}
function Notice({title,children}: {title:string;children:ReactNode}) {
  return <section className="notice"><CircleHelp/><div><h2>{title}</h2><div>{children}</div></div></section>;
}
function Meta({label,value}: {label:string;value:string}) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}
function Breadcrumbs({route,currentTitle,companyName,parentDriver}: {route:OwnerRoute;currentTitle:string;companyName?:string;parentDriver?:{id:string;label:string}}) {
  const links: {title:string;route:OwnerRoute}[] = [{title:'Группа',route:{page:'overview'}}];
  if (route.page === 'month-row' && route.month) links.push({title:monthLabel(route.month),route:{page:'month',month:route.month}});
  if (['company','company-result','driver','evidence'].includes(route.page)) {
    links.push(route.from === 'metric' ? {title:'Результат группы',route:metricLink('GROUP_RESULT_FORECAST',route.field)} : {title:'Компании',route:{page:'companies'}});
    if (route.page !== 'company' && route.from !== 'metric') links.push({title:companyName || 'Авиакомпания 1',route:{page:'company',company:route.company || 'AL1'}});
    if (route.page === 'driver' || route.page === 'evidence') links.push({title:(companyName || 'Авиакомпания 1') + ' · вклад',route:companyLink(route.company || 'AL1',route.field,route.from)});
    if (route.page === 'evidence' && parentDriver) links.push({title:parentDriver.label,route:{page:'driver',id:parentDriver.id,company:route.company || 'AL1',field:route.field,from:route.from}});
  }
  if (route.page === 'row') links.push({title:'Показатель',route:metricLink(route.metric || '',route.field)});
  if (route.page === 'task') links.push({title:'Поручения',route:{page:'tasks'}});
  return <nav className="breadcrumbs" aria-label="Путь к экрану">{links.map((link,i) => <span key={i}><A route={link.route}>{link.title}</A><ChevronRight/></span>)}<span aria-current="page">{currentTitle}</span></nav>;
}
function MetricDetail({metric}: {metric:MetricEnvelope}) {
  const cash = metric.aggregation === 'MINIMUM';
  return <>
    <div className="detail-total"><span>{cash ? 'Минимальный остаток на всём горизонте' : 'Значение показателя'}</span><strong>{n(metric.value)} <small>{metric.unit === 'RUB_MLN' ? 'млн ₽' : metric.unit === 'TONNES' ? 'т' : ''}</small></strong></div>
    {cash ? <Notice title="Минимум, не сумма недель">{n(metric.value)} млн ₽ — минимум календаря. Сравнение с границей {n(metric.comparison?.guardrail)} и сравнение с планом конкретной недели — разные показатели. Минимумы компаний не складываются. {metric.dataStatus === 'DEMO_SYNTHETIC' ? 'Граница учебная, корпоративно не утверждена.' : 'Методика и граница требуют проверки по источнику.'}</Notice> :
      metric.scenario === 'RECOVERY' ? <p className="section-lead">Сценарная оценка {n(metric.value)}, цель {n(metric.comparison?.target)}; отличие от цели {signed(metric.comparison?.variance)}. Это не подтверждённый эффект. {metric.description}</p> : <p className="section-lead">План {n(metric.comparison?.plan)} → прогноз {n(metric.comparison?.forecast)}; изменение {signed(metric.comparison?.variance)}. Строки ниже объясняют отклонение.</p>}
    <div className="data-table"><div className="table-head"><span>{cash ? 'Неделя' : 'Составляющая'}</span><span>{cash ? 'Прогноз, млн ₽' : metric.unit === 'TONNES' ? 'Влияние, т' : 'Значение, млн ₽'}</span><span>{cash ? 'План, млн ₽' : 'Ответственный'}</span><span/></div>
      {metric.breakdown.map(row => <A key={row.id} route={{page:'row',metric:metric.metricId,row:row.id}} className="table-row">
        <span><strong>{row.label}</strong><small>{row.description}</small></span><strong>{n(cash ? row.forecast : row.value)}</strong><span>{cash ? n(row.plan) : clean(row.owner)}</span><ChevronRight/></A>)}
    </div>
  </>;
}
