'use client';
import { Bar, BarChart, CartesianGrid, Rectangle, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis, type BarShapeProps } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import type { MetricEnvelope, MetricTimeline } from '@/lib/data-contract';
import { chartPoints, monthLabel, monthResult, monthVariance, validTimeline } from '@/lib/result-trend';
import { ownerHref } from '@/lib/owner-model';

const number = (n: number | null) => n === null ? '—' : new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n).replace('-','−');
const signed = (n: number | null) => n !== null && n > 0 ? '+' + number(n) : number(n);
const config = {planTotal:{label:'План',color:'var(--muted)'},actualTotal:{label:'Факт',color:'var(--blue)'},forecastTotal:{label:'Прогноз',color:'var(--blue)'},variance:{label:'Отклонение',color:'var(--warning)'}};

export default function ResultTrend({timeline,version,row}: {timeline?:MetricTimeline;version:string;row?:string}) {
  if (!validTimeline(timeline,version)) return <div className="trend-unavailable">Помесячная история не подключена или не согласована с итогом. График не достраивается по отдельным числам.</div>;
  const points=chartPoints(timeline);
  const href=(month:string)=>ownerHref(row ? {page:'month-row',month,row} : {page:'month',month});
  const open=(state: {activeLabel?: string | number})=>{const month=String(state.activeLabel ?? '');if(points.some(p=>p.month===month)) window.location.hash=href(month);};
  const tooltip=(label: unknown, cumulative=false)=>{
    const p=points.find(p=>p.month===label);if(!p)return null;
    const actual=p.actual !== null;
    return <div className="trend-tooltip"><strong>{monthLabel(p.month)}</strong><small>{cumulative ? 'С начала года' : 'За месяц'} · млн ₽</small><span>План <b>{number(cumulative?p.planTotal:p.plan)}</b></span><span>{actual?'Факт':'Прогноз'} <b>{number(cumulative?(p.actualTotal??p.forecastTotal):monthResult(p))}</b></span><span>Отклонение <b>{signed(cumulative?(p.actualTotal??p.forecastTotal)!-p.planTotal:monthVariance(p))}</b></span><small>Нажмите, чтобы раскрыть месяц</small></div>;
  };
  return <div className="result-trend">
    <div className="trend-heading"><h3>Движение к годовому результату</h3><span>С начала года · млн ₽</span></div>
    <div className="trend-legend" aria-label="Обозначения"><span><i className="plan-key"/>План</span><span><i className="actual-key"/>Факт</span><span><i className="forecast-key"/>Прогноз</span><small>Факт закрыт: {monthLabel(timeline.closedThrough)}</small></div>
    <ChartContainer className="trend-chart" config={config} initialDimension={{width:720,height:218}} aria-label="Экономический результат с начала года: план, факт и прогноз. Точные значения и ссылки на месяцы ниже.">
      <LineChart data={points} margin={{top:16,right:18,bottom:4,left:0}} onClick={open} accessibilityLayer>
        <CartesianGrid vertical={false} stroke="var(--line)"/>
        <XAxis dataKey="month" tickFormatter={m=>monthLabel(m,true)} tick={{fill:'var(--muted)',fontSize:14}} minTickGap={16} axisLine={{stroke:'var(--line)'}} tickLine={false}/>
        <YAxis width={48} domain={([min,max])=>[Math.min(0,min),Math.max(0,max)]} tick={{fill:'var(--muted)',fontSize:14}} axisLine={false} tickLine={false}/>
        <ReferenceLine x={timeline.closedThrough} stroke="var(--muted)" strokeDasharray="2 4"/>
        <Tooltip content={({active,label})=>active?tooltip(label,true):null}/>
        <Line name="План" dataKey="planTotal" type="linear" stroke="var(--muted)" strokeWidth={2} dot={false} isAnimationActive={false}/>
        <Line name="Факт" dataKey="actualTotal" type="linear" stroke="var(--blue)" strokeWidth={2} dot={{r:3}} activeDot={{r:5}} connectNulls={false} isAnimationActive={false}/>
        <Line name="Прогноз" dataKey="forecastTotal" type="linear" stroke="var(--blue)" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls={false} isAnimationActive={false}/>
      </LineChart>
    </ChartContainer>
    <div className="trend-heading variance-heading"><h3>Отклонения по месяцам</h3><span>Выше нуля — лучше плана</span></div>
    <ChartContainer className="variance-chart" config={config} initialDimension={{width:720,height:86}} aria-label="Отклонение каждого месяца от плана. Будущие месяцы показаны контуром; ссылки и значения ниже.">
      <BarChart data={points} margin={{top:5,right:18,bottom:0,left:0}} onClick={open} accessibilityLayer>
        <XAxis dataKey="month" hide/>
        <YAxis width={48} tick={{fill:'var(--muted)',fontSize:12}} axisLine={false} tickLine={false} tickCount={3}/>
        <ReferenceLine y={0} stroke="var(--muted)"/>
        <Tooltip content={({active,label})=>active?tooltip(label):null}/>
        <Bar dataKey="variance" maxBarSize={28} isAnimationActive={false} shape={(props:BarShapeProps)=>{const p=points[props.index];const color=p.variance!<0?'var(--warning)':'var(--blue)';return <Rectangle {...props} fill={p.actual===null?'var(--paper)':color} stroke={color} strokeDasharray={p.actual===null?'3 2':undefined}/>;}}/>
      </BarChart>
    </ChartContainer>
    <div className="month-shortcuts" aria-label="Раскрыть месяц">{points.map(p=><a key={p.month} href={href(p.month)} className={p.actual===null?'future-month':''} aria-label={`${monthLabel(p.month)}: ${p.actual===null?'прогноз':'факт'} ${number(monthResult(p))}, план ${number(p.plan)}, отклонение ${signed(p.variance)} млн рублей. Открыть состав.`}><span>{p.label}</span><b>{signed(p.variance)}</b><small>{p.actual===null?'прогноз':'факт'}</small></a>)}</div>
    <details className="trend-data"><summary>Все значения по месяцам</summary><div className="trend-table-scroll"><table><caption>Экономический результат · млн ₽ · {row?'вклад компании / корректировка':'группа'}</caption><thead><tr><th>Месяц</th><th>План</th><th>Факт</th><th>Прогноз</th><th>Отклонение</th><th>План с начала года</th><th>Факт / прогноз с начала года</th></tr></thead><tbody>{points.map(p=><tr key={p.month}><th><a href={href(p.month)}>{monthLabel(p.month)}</a></th><td>{number(p.plan)}</td><td>{number(p.actual)}</td><td>{number(p.forecast)}</td><td>{signed(p.variance)}</td><td>{number(p.planTotal)}</td><td>{number(p.actualTotal??p.forecastTotal)}</td></tr>)}</tbody></table></div></details>
  </div>;
}

export function LiquidityTrend({metric}: {metric?:MetricEnvelope}) {
  const rows=metric?.breakdown??[];
  if (!metric || metric.aggregation!=='MINIMUM' || metric.unit!=='RUB_MLN' || rows.length!==13 || rows.some(r=>typeof r.forecast!=='number' || !Number.isFinite(r.forecast)) || Math.min(...rows.map(r=>r.forecast!))!==metric.value) return null;
  return <div className="liquidity-trend"><p>Остаток по неделям · млн ₽</p><ChartContainer className="cash-chart" config={{forecast:{label:'Прогноз остатка',color:'var(--blue)'}}} initialDimension={{width:300,height:132}} aria-label="Прогноз остатка на 13 недель. Точные значения доступны в платёжном календаре.">
    <LineChart data={rows} margin={{top:10,right:12,bottom:0,left:0}} accessibilityLayer onClick={state=>{const row=String(state.activeLabel??'');if(rows.some(r=>r.id===row))window.location.hash=ownerHref({page:'row',metric:metric.metricId,row});}}>
      <XAxis dataKey="id" tickLine={false} axisLine={false} ticks={[rows[0].id,rows[6].id,rows[12].id]} tickFormatter={id=>'Нед. '+(rows.findIndex(r=>r.id===id)+1)} tick={{fill:'var(--muted)',fontSize:12}}/>
      <YAxis hide domain={([min,max])=>[Math.min(0,min),Math.max(0,max)]}/>
      <Tooltip content={({active,label})=>{const row=rows.find(r=>r.id===label);return active&&row?<div className="trend-tooltip"><strong>{row.label}</strong><span>Прогноз остатка <b>{number(row.forecast??null)} млн ₽</b></span></div>:null;}}/>
      {typeof metric.comparison?.guardrail==='number' && <ReferenceLine y={metric.comparison.guardrail} stroke="var(--warning)" strokeDasharray="3 3"/>}
      <Line dataKey="forecast" type="linear" stroke="var(--blue)" strokeWidth={2} dot={false} activeDot={{r:4}} isAnimationActive={false}/>
    </LineChart>
  </ChartContainer><small>Пунктир — {metric.dataStatus==='DEMO_SYNTHETIC'?'учебная граница':'граница источника'}</small></div>;
}
