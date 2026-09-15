'use client';
import { ArrowRight } from 'lucide-react';
import type { MetricEnvelope, MetricMonth } from '@/lib/data-contract';
import { monthLabel, monthResult, monthVariance, validTimeline } from '@/lib/result-trend';
import { ownerHref } from '@/lib/owner-model';

const n = (x: number | null) => x === null ? '—' : new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(x).replace('-','−');
const signed = (x: number | null) => x !== null && x > 0 ? '+'+n(x) : n(x);
function Values({point}: {point:MetricMonth}) {
  return <div className="month-values"><span>План за месяц<strong>{n(point.plan)}</strong></span><span>{point.actual===null?'Прогноз за месяц':'Факт за месяц'}<strong>{n(monthResult(point))}</strong></span><span>Отклонение от плана<strong>{signed(monthVariance(point))}</strong></span></div>;
}
export default function ResultMonth({metric,month,rowId}: {metric?:MetricEnvelope;month?:string;rowId?:string}) {
  if (!metric || !month || !validTimeline(metric.timeline,metric.version)) return <section className="notice"><p>Помесячный источник недоступен. Годовые данные вместо месячных не подставляются.</p></section>;
  const companyRow=rowId ? metric.breakdown.find(r=>r.id===rowId) : undefined;
  const timeline=rowId ? companyRow?.timeline : metric.timeline;
  const point=validTimeline(timeline,metric.version) ? timeline.points.find(p=>p.month===month) : undefined;
  if (!point) return <section className="notice"><p>Месяц или строка не найдены в этой версии источника.</p></section>;
  const demo=metric.dataStatus==='DEMO_SYNTHETIC';
  return <>
    <section className="panel month-result"><p>{monthLabel(month)} · {companyRow?.label ?? 'Группа компаний'} · млн ₽</p><Values point={point}/>
      <p className="muted">{point.actual===null?'Будущий месяц: прогноз, не фактический результат.':demo?'Закрытый месяц: учебный факт и сопоставимый план.':'Закрытый месяц: факт и сопоставимый план источника.'}</p>
    </section>
    {!rowId ? <section className="section"><div className="section-heading"><h2>Вклад компаний в этот месяц</h2><p>Групповые корректировки показаны отдельно · млн ₽</p></div>
      <div className="trend-table-scroll"><table className="month-contributors"><thead><tr><th>Компания / корректировка</th><th>План</th><th>{point.actual===null?'Прогноз':'Факт'}</th><th>Отклонение</th><th>Ответственный за результат</th></tr></thead><tbody>{metric.breakdown.map(row=>{
        const p=validTimeline(row.timeline,metric.version)?row.timeline.points.find(p=>p.month===month):undefined;
        const href=ownerHref({page:'month-row',row:row.id,month});
        return <tr key={row.id}><th><a href={href}>{row.label}<ArrowRight/></a></th><td><a href={href} aria-label={`${row.label}: план ${p?n(p.plan):'недоступен'}, ${monthLabel(month)}`}>{p?n(p.plan):'—'}</a></td><td><a href={href} aria-label={`${row.label}: ${point.actual===null?'прогноз':'факт'} ${p?n(monthResult(p)):'недоступен'}, ${monthLabel(month)}`}>{p?n(monthResult(p)):'—'}</a></td><td><a href={href} aria-label={`${row.label}: отклонение ${p?signed(monthVariance(p)):'недоступно'}, ${monthLabel(month)}`}>{p?signed(monthVariance(p)):'—'}</a></td><td>{row.owner || 'Не назначен'}</td></tr>;
      })}</tbody><tfoot><tr><th>Всего за месяц</th><td>{n(point.plan)}</td><td>{n(monthResult(point))}</td><td>{signed(monthVariance(point))}</td><td>Группа</td></tr></tfoot></table></div>
    </section> : <section className="panel month-source"><h2>{point.actual===null?'Запись прогноза':demo?'Запись учебного факта':'Запись факта'}</h2><dl><dt>Строка источника</dt><dd>{point.sourceRow}</dd><dt>Версия</dt><dd>{metric.version}</dd><dt>Период</dt><dd>{monthLabel(month)}</dd><dt>Источник</dt><dd>{demo?'result-months.json · учебная раскладка':metric.source.reference}</dd><dt>За результат</dt><dd>{companyRow?.owner || metric.owners.result}</dd><dt>За данные</dt><dd>{metric.owners.data}</dd></dl><p>{demo?'Это конечная учебная строка месячного вклада.':'Это строка месячного вклада из источника.'} Причины, действия и первичные документы за этот месяц ещё не сопоставлены. Годовые топливные основания не выдаются за месячные.</p></section>}
    <p className="muted">{metric.dataStatus==='DEMO_SYNTHETIC'?'Помесячная раскладка синтетическая. Она не описывает реальную сезонность компаний.':'Периоды и сценарии определены источником.'}</p>
    <a className="back-link" href={ownerHref(companyRow && rowId!=='GROUP_ADJUSTMENTS'?{page:'company-result',company:rowId,field:'forecast',from:'metric'}:{page:'metric',metric:'GROUP_RESULT_FORECAST',field:'forecast'})}>Перейти к годовому результату — другой период <ArrowRight/></a>
  </>;
}
