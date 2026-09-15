'use client';
import {useEffect,useMemo,useState} from 'react';
import {ArrowRight,FileText,Plane} from 'lucide-react';
import {LineChart,Line,CartesianGrid,XAxis,YAxis,Tooltip} from 'recharts';
import {ChartContainer} from '@/components/ui/chart';
import {ownerHref,type OwnerRoute} from '@/lib/owner-model';
import {flightHours,productionMonths,productionTotals,scopedFlights,type ProductionSnapshot} from '@/lib/production-model';
import {monthLabel} from '@/lib/result-trend';

const href=(scope:Partial<OwnerRoute>={})=>ownerHref({page:'production',...scope});
const signed=(n:number)=>(n>0?'+':'')+flightHours(n);
function useProduction(enabled:boolean){
  const [data,setData]=useState<ProductionSnapshot|null>(null);const [error,setError]=useState('');
  useEffect(()=>{if(!enabled)return;const ctrl=new AbortController();fetch(import.meta.env.BASE_URL + 'data/production.json',{signal:ctrl.signal,cache:'no-store'}).then(async r=>{const value=await r.json() as ProductionSnapshot & {message?:string};if(!r.ok)throw Error(value.message||'Не удалось загрузить рейсы');if(value.classification!=='DEMO_SYNTHETIC'||!Array.isArray(value.flights))throw Error('Несовместимый источник налёта');setData(value);setError('');}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>ctrl.abort();},[enabled]);
  return {data:enabled?data:null,error};
}
function Totals({data,rows,month}: {data:ProductionSnapshot;rows:ProductionSnapshot['flights'];month?:string}){
  const t=productionTotals(rows);return <div className="ops-kpis">
    <div><small>{month?'План месяца':'Годовой план'} · ч</small><strong>{flightHours(t.plan)}</strong><small>{data.year}</small></div>
    <div><small>{month?'Факт месяца':'Факт · январь–август'} · ч</small><strong>{flightHours(t.actual)}</strong><small>Сопоставимый план: {flightHours(t.planClosed)} ч</small></div>
    <div><small>{month?'Факт / прогноз месяца':'Ожидаемый итог года'} · ч</small><strong>{flightHours(t.forecast)}</strong><small>{month?'Сценарий выбранного месяца':'Факт + оставшийся прогноз'}</small></div>
    <div><small>Отклонение от плана · ч</small><strong>{signed(t.variance)}</strong><small>{t.rows.toLocaleString('ru-RU')} плановых рейсов</small></div>
  </div>;
}
export function ProductionSummary({company,enabled}: {company?:string;enabled:boolean}){
  const {data,error}=useProduction(enabled);
  if(!enabled)return null;
  if(error)return <section className="ops-panel"><h2>Налёт</h2><p>{error}</p></section>;
  if(!data)return <section className="ops-panel"><p>Загружаем учебную полётную программу…</p></section>;
  const fleets=data.fleets.filter(f=>!company||f.company===company);if(!fleets.length)return null;
  const rows=scopedFlights(data,{company});
  return <section className="ops-panel"><div className="ops-heading"><h2><Plane/> Полётная программа</h2><a href={href({company})}>Раскрыть налёт и рейсы <ArrowRight/></a></div>
    <Totals data={data} rows={rows}/>
    <div className="ops-fleets">{fleets.map(f=>{const t=productionTotals(rows.filter(r=>r.fleet===f.id));return <a className="ops-fleet" key={f.id} href={href({company:f.company,fleet:f.id})}><span>{f.companyName}</span><strong>{f.aircraft}</strong><span>План {flightHours(t.plan)} ч</span><span>Прогноз {flightHours(t.forecast)} ч · {signed(t.variance)}</span></a>;})}</div>
    <p className="ops-note">Учебный факт закрыт по 31 августа {data.year}. В новом экране АК1 доступно модельное распределение месячных финансов на рейсы; это не фактическая калькуляция миссий. По остальным компаниям финансово-рейсовое распределение отсутствует.</p>
  </section>;
}
export default function ProductionWorkspace({route,enabled}: {route:OwnerRoute;enabled:boolean}) {
  return <ProductionView key={[route.company,route.fleet,route.month,route.page].join('|')} route={route} enabled={enabled}/>;
}
function ProductionView({route,enabled}: {route:OwnerRoute;enabled:boolean}) {
  const {data,error}=useProduction(enabled);
  const [search,setSearch]=useState('');const [page,setPage]=useState(0);
  const rows=useMemo(()=>data?scopedFlights(data,route):[],[data,route]);
  if(!enabled)return <section className="notice">Производственный источник не подключён. Учебные рейсы не подставляются к корпоративным цифрам.</section>;
  if(error)return <section className="notice">{error}</section>;
  if(!data)return <p>Загрузка учебной полётной программы…</p>;
  if(route.snapshot&&route.snapshot!==data.version)return <section className="notice">Версия полётной программы изменилась. <a href={href()}>Открыть актуальную программу</a></section>;
  const companies=[...new Map(data.fleets.map(f=>[f.company,f.companyName])).entries()];
  const fleet=data.fleets.find(f=>f.id===route.fleet);
  const parent={company:route.company,fleet:route.fleet,month:route.month,snapshot:data.version};
  const change=(patch:Partial<OwnerRoute>)=>{window.location.assign(href({...parent,...patch}));};
  if(route.page==='flight'){
    const flight=rows.find(f=>f.id===route.id);if(!flight)return <section className="notice">Рейс не найден в выбранном периметре.</section>;
    const f=data.fleets.find(f=>f.id===flight.fleet)!;const value=flight.actualMinutes??flight.forecastMinutes;
    return <><nav className="breadcrumbs"><a href={href()}>Налёт группы</a><ArrowRight/><a href={href({company:f.company,fleet:f.id})}>{f.companyName} · {f.aircraft}</a><ArrowRight/><a href={href(parent)}>Реестр рейсов</a></nav><article className="document">
      <div className="document-top"><FileText/>УЧЕБНАЯ ЗАПИСЬ ПОЛЁТНОГО УЧЁТА</div><h2 className="document-type">{flight.id}</h2>
      <dl className="meta-grid"><div><dt>Компания / тип</dt><dd>{f.companyName} · {f.aircraft}</dd></div><div><dt>Условный борт</dt><dd>{flight.aircraftId}</dd></div><div><dt>Дата</dt><dd>{new Date(flight.date+'T12:00:00Z').toLocaleDateString('ru-RU')}</dd></div><div><dt>Программа</dt><dd>{flight.service==='CHARTER'?'Чартерная':'Регулярная'}</dd></div><div><dt>Ответственный за результат</dt><dd>{flight.owner}</dd></div><div><dt>Ответственный за данные</dt><dd>Планово-диспетчерская служба · роль без персонального назначения</dd></div></dl>
      <div className="document-amounts"><span>План<b>{flightHours(flight.planMinutes)} ч</b></span><span>{flight.actualMinutes===null?'Будущий прогноз':'Учебный факт'}<b>{flightHours(value)} ч</b></span><span>Отклонение<b>{signed((value??0)-flight.planMinutes)} ч</b></span></div>
      <p>{flight.reason}</p><p>Статус: {flight.status==='CANCELLED'?'отменён':flight.status==='COMPLETED'?'выполнен':'будущий рейс'}.</p>
      <details className="source-details"><summary>Точные значения и источник</summary><p>План: {flight.planMinutes} мин; факт: {flight.actualMinutes??'нет'} мин; будущий прогноз: {flight.forecastMinutes??'нет'} мин.</p><p>Запись: {flight.recordId}. Версия: {data.version}.</p><p>Источник: production-scenario.json → buildProduction. Правило: факт до 31 августа, будущий прогноз с сентября. План борта и длительность распределены алгоритмически.</p></details>
      <p className="document-note">Синтетическая запись для проверки. Это не лётный журнал, не реальный борт и не первичный корпоративный документ. Задача и срок по этой записи не назначены.</p>
      {flight.company==='AL1'&&<a href={ownerHref({page:'company',company:'AL1',metric:'production',id:flight.id})}>Распределённая экономика и связанные ограничения этого рейса →</a>}
    </article></>;
  }
  const filtered=rows.filter(r=>!search||[r.id,r.aircraftId,r.reason].join(' ').toLocaleLowerCase('ru-RU').includes(search.toLocaleLowerCase('ru-RU')));
  const pages=Math.max(1,Math.ceil(filtered.length/30));const current=Math.min(page,pages-1);const shown=filtered.slice(current*30,current*30+30);
  const chartRows=productionMonths(rows,data.year).filter(m=>!route.month||m.month===route.month);
  const t=productionTotals(rows);
  return <>
    {route.company==='AL1'&&<a className="back-link" href={ownerHref({page:'company',company:'AL1',metric:'production'})}>Вернуться к производственному разделу ГД АК1 →</a>}
    <nav className="breadcrumbs"><a href={href()}>Налёт группы</a>{route.company&&<><ArrowRight/><a href={href({company:route.company})}>{companies.find(([id])=>id===route.company)?.[1]||route.company}</a></>}{fleet&&<><ArrowRight/><a href={href({company:fleet.company,fleet:fleet.id})}>{fleet.aircraft}</a></>}{route.month&&<><ArrowRight/><span>{monthLabel(route.month)}</span></>}</nav>
    <div className="ops-controls">
      <label>Компания<select aria-label="Компания полётной программы" value={route.company||''} onChange={e=>change({company:e.target.value||undefined,fleet:undefined})}><option value="">Все авиакомпании</option>{companies.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
      <label>Тип самолёта<select aria-label="Тип самолёта" value={route.fleet||''} onChange={e=>change({fleet:e.target.value||undefined})}><option value="">Все типы</option>{data.fleets.filter(f=>!route.company||f.company===route.company).map(f=><option key={f.id} value={f.id}>{f.aircraft} · {f.companyName}</option>)}</select></label>
      <label>Период<select aria-label="Период полётной программы" value={route.month||''} onChange={e=>change({month:e.target.value||undefined})}><option value="">Весь {data.year} год</option>{productionMonths(data.flights,data.year).map(m=><option key={m.month} value={m.month}>{monthLabel(m.month)}</option>)}</select></label>
      <a href={href()}>Сбросить фильтры</a>
    </div>
    {!rows.length?<section className="notice">Нет рейсов в выбранном периметре. <a href={href()}>Сбросить фильтры</a></section>:<>
    {(!route.company||route.company==='AL3')&&<p className="ops-note">Годовой план Авиакомпания 3: 10 000 ч — рабочее допущение для учебного сценария.</p>}
    <Totals data={data} rows={rows} month={route.month}/>
    <section className="ops-panel"><div className="ops-heading"><h2>Налёт по месяцам</h2><span className="ops-note">Полётные часы · факт по 31 августа</span></div><div className="trend-legend"><span><i className="plan-key"/>План</span><span><i className="actual-key"/>Учебный факт</span><span><i className="forecast-key"/>Будущий прогноз</span></div>
      <ChartContainer className="ops-chart" config={{plan:{label:'План',color:'var(--muted)'},actual:{label:'Факт',color:'var(--blue)'},forecast:{label:'Прогноз',color:'var(--blue)'}}} initialDimension={{width:1000,height:290}} aria-label="Налёт по месяцам, в часах. Точные значения доступны ниже.">
        <LineChart data={chartRows} margin={{top:15,right:20,left:0,bottom:10}} accessibilityLayer onClick={s=>{if(chartRows.some(m=>m.month===s.activeLabel))change({month:String(s.activeLabel)});}}><CartesianGrid vertical={false} stroke="var(--line)"/><XAxis dataKey="month" tickFormatter={m=>monthLabel(m,true)} minTickGap={18} tick={{fill:'var(--muted)',fontSize:14}}/><YAxis domain={[0,'auto']} width={60} tick={{fill:'var(--muted)',fontSize:14}}/><Tooltip content={({active,label})=>{const m=chartRows.find(m=>m.month===label);return active&&m?<div className="trend-tooltip"><strong>{monthLabel(m.month)}</strong><span>План: {flightHours((m.plan??0)*60)} ч</span><span>{m.actual===null?'Прогноз':'Факт'}: {flightHours((m.actual??m.forecast??0)*60)} ч</span></div>:null;}}/><Line dataKey="plan" stroke="var(--muted)" strokeWidth={2} dot={{r:3}} isAnimationActive={false}/><Line dataKey="actual" stroke="var(--blue)" strokeWidth={2} dot={{r:4}} connectNulls={false} isAnimationActive={false}/><Line dataKey="forecast" stroke="var(--blue)" strokeWidth={2} strokeDasharray="6 4" dot={{r:3}} connectNulls={false} isAnimationActive={false}/></LineChart>
      </ChartContainer><div className="ops-months">{chartRows.map(m=><a key={m.month} href={href({...parent,month:m.month})}>{monthLabel(m.month,true)}</a>)}</div>
      <details className="source-details"><summary>Точные значения по месяцам</summary><div className="ops-scroll"><table className="ops-table"><thead><tr><th>Месяц</th><th>План, ч</th><th>Факт, ч</th><th>Будущий прогноз, ч</th></tr></thead><tbody>{chartRows.map(m=><tr key={m.month}><td><a href={href({...parent,month:m.month})}>{monthLabel(m.month)}</a></td><td>{flightHours(m.plan===null?null:m.plan*60)}</td><td>{flightHours(m.actual===null?null:m.actual*60)}</td><td>{flightHours(m.forecast===null?null:m.forecast*60)}</td></tr>)}</tbody></table></div></details>
    </section>
    <section className="ops-panel"><h2>Состав налёта</h2><div className="ops-scroll"><table className="ops-table"><thead><tr><th>Компания / тип</th><th>План, ч</th><th>Факт, ч</th><th>Ожидаемый итог, ч</th><th>Отклонение, ч</th></tr></thead><tbody>{data.fleets.filter(f=>rows.some(r=>r.fleet===f.id)).map(f=>{const v=productionTotals(rows.filter(r=>r.fleet===f.id));return <tr key={f.id}><td><a href={href({...parent,company:f.company,fleet:f.id})}>{f.companyName} · {f.aircraft}</a></td>{[v.plan,v.actual,v.forecast,v.variance].map((x,i)=><td key={i}><a href={href({...parent,company:f.company,fleet:f.id})}>{i===3?signed(x??0):flightHours(x)}</a></td>)}</tr>;})}</tbody><tfoot><tr><th>Всего</th><th>{flightHours(t.plan)}</th><th>{flightHours(t.actual)}</th><th>{flightHours(t.forecast)}</th><th>{signed(t.variance)}</th></tr></tfoot></table></div></section>
    <section className="ops-panel"><div className="ops-heading"><h2>Реестр рейсов</h2><span className="ops-note">Выполнено {t.completed} · отменено {t.cancelled}</span></div><div className="ops-controls"><label>Поиск в реестре<input aria-label="Поиск рейса или борта" placeholder="Номер рейса, борт или причина" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></label><span className="ops-note">Поиск сужает только реестр, не показатели выше.</span></div>
      <div className="ops-scroll"><table className="ops-table"><thead><tr><th>Учебный рейс</th><th>Дата</th><th>Программа</th><th>План, ч</th><th>Факт / прогноз, ч</th><th>Статус</th></tr></thead><tbody>{shown.map(row=><tr key={row.id}><td><a href={ownerHref({page:'flight',...parent,id:row.id})}>{row.id}</a></td><td>{new Date(row.date+'T12:00:00Z').toLocaleDateString('ru-RU')}</td><td>{row.service==='CHARTER'?'Чартер':'Регулярный'}</td><td>{flightHours(row.planMinutes)}</td><td>{flightHours(row.actualMinutes??row.forecastMinutes)}</td><td>{row.status==='CANCELLED'?'Отменён':row.status==='COMPLETED'?'Учебный факт':'Прогноз'}</td></tr>)}</tbody></table></div>
      {!shown.length&&<p>Совпадений нет. Измените поиск.</p>}<div className="ops-pager"><button className="ops-primary" disabled={current===0} onClick={()=>setPage(current-1)}>Назад</button><span>{filtered.length.toLocaleString('ru-RU')} записей · страница {current+1} из {pages}</span><button className="ops-primary" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>Далее</button></div>
    </section></>}
    <details className="source-details"><summary>Источник, допущения и ответственность</summary><p>{data.version} · срез {data.asOf} · DEMO_SYNTHETIC</p>{data.fleets.map(f=><p key={f.id}>{f.companyName} · {f.aircraft}: {f.annualPlanHours.toLocaleString('ru-RU')} ч. {f.planBasis}.</p>)}{data.notes.map(n=><p key={n}>{n}</p>)}<p>За результат: производственные директора компаний. За данные: планово-диспетчерские службы. ФИО не назначены. Источник: production-scenario.json; воспроизводимый генератор: buildProduction; агрегация в целых минутах.</p></details>
  </>;
}
