'use client';
import { ArrowDownRight, ArrowRight, Building2, CalendarDays, ChartNoAxesCombined, Target, UserRound, Wallet } from 'lucide-react';
import ResultTrend, { LiquidityTrend } from '@/components/result-trend';
import { ownerHref, resultValue } from '@/lib/owner-model';
import type { MetricEnvelope } from '@/lib/data-contract';

const n=(value:number|null|undefined)=>typeof value==='number'&&Number.isFinite(value)?new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(value).replace('-','−'):'—';
const signed=(value:number|undefined)=>value!==undefined&&value>0?'+'+n(value):n(value);
const link=(field:'plan'|'forecast'|'variance'|'actual'|'ytdPlan'='forecast')=>ownerHref({page:'metric',metric:'GROUP_RESULT_FORECAST',field});

export default function OwnerOverview({result,cash,demo}: {result?:MetricEnvelope;cash?:MetricEnvelope;demo:boolean}) {
  const plan=resultValue(result,'plan');
  const forecast=resultValue(result,'forecast');
  const variance=resultValue(result,'variance');
  const ratio=plan!==undefined&&plan>0&&forecast!==undefined&&forecast>=0 ? forecast/plan : null;
  const arc=ratio===null?0:Math.min(1,ratio)*Math.PI*196;
  const owner=result?.owners.result?.replace(/TO_APPROVE/g,'не утверждена').replace(/TO_ASSIGN/g,'не назначено') || 'Не назначен';
  return <div className="owner-console">
    <div className="console-kpis">
      <a className="console-kpi" href={link('actual')}><span className="kpi-symbol"><CalendarDays/></span><span className="kpi-content"><span>Факт · {result?.toDate?.period.label || 'нет периода'}</span><strong>{n(resultValue(result,'actual'))}<small>млн ₽</small></strong><span>План периода {n(resultValue(result,'ytdPlan'))}</span></span><ArrowRight className="kpi-arrow"/></a>
      <a className="console-kpi" href={link('plan')}><span className="kpi-symbol"><Target/></span><span className="kpi-content"><span>План · {result?.period.label || 'нет периода'}</span><strong>{n(plan)}<small>млн ₽</small></strong><span>Годовое задание</span></span><ArrowRight className="kpi-arrow"/></a>
      <a className="console-kpi deviation-kpi" href={link('variance')}><span className="kpi-symbol"><ArrowDownRight/></span><span className="kpi-content"><span>Прогноз против плана</span><strong>{signed(variance)}<small>млн ₽</small></strong><span>{result?.period.label || 'нет периода'}</span></span><ArrowRight className="kpi-arrow"/></a>
      <a className="console-kpi" href={ownerHref({page:'metric',metric:'GROUP_LIQUIDITY_MIN_13W'})}><span className="kpi-symbol"><Wallet/></span><span className="kpi-content"><span>Минимум денег</span><strong>{n(cash?.value)}<small>млн ₽</small></strong><span>Прогноз на 13 недель</span></span><ArrowRight className="kpi-arrow"/></a>
    </div>

    <div className="console-board">
      <section className="glass-panel console-dynamics"><div className="console-panel-title"><div><span className="eyebrow">ЭКОНОМИКА ГРУППЫ</span><h2>Динамика результата</h2><p className="console-units">С начала года · млн ₽</p></div><a className="console-open" href={link()} aria-label="Раскрыть экономический результат"><ArrowRight/></a></div>
        <ResultTrend timeline={result?.timeline} version={result?.version || ''}/>
      </section>

      <section className="glass-panel console-forecast"><div className="console-panel-title"><div><span className="eyebrow">{result?.period.label || 'ПЕРИОД НЕ ПОЛУЧЕН'}</span><h2>Прогноз результата</h2></div></div>
        <a className="forecast-instrument" href={link()} aria-label={`Прогноз ${n(forecast)} миллионов рублей. ${ratio===null?'Отношение к плану не рассчитано':n(ratio*100)+' процента от годового плана'}. Раскрыть вклад компаний.`}>
          <span className="instrument-bezel"><svg viewBox="0 0 260 260" aria-hidden="true"><circle className="instrument-fine-ring" cx="130" cy="130" r="122"/><circle className="instrument-track" cx="130" cy="130" r="98"/><circle className="instrument-arc" cx="130" cy="130" r="98" strokeDasharray={`${arc} ${Math.PI*196}`} transform="rotate(-90 130 130)"/><circle className="instrument-inner-ring" cx="130" cy="130" r="77"/></svg><span className="instrument-center"><small>Ожидаемый итог</small><strong>{n(forecast)}</strong><span>млн ₽</span></span></span>
        </a>
        <a className="instrument-percentage" href={link()}>{ratio===null?'Отношение не рассчитано':<><strong>{n(Math.round(ratio*1000)/10)}%</strong><span>от годового плана</span></>}</a>
        {ratio!==null&&ratio>1&&<p className="instrument-excess">Прогноз выше плана; кольцо заполнено полностью.</p>}
        <div className="instrument-scale"><a href={link('plan')}><span>План</span><b>{n(plan)}</b></a><a href={link('variance')}><span>Отклонение</span><b>{signed(variance)}</b></a></div>
        <div className="instrument-owner"><UserRound/><span>{owner}</span></div>
        <a href={link()} className="console-primary">Вклад компаний <ArrowRight/></a>
      </section>

      <div className="console-side">
        <section className="glass-panel console-cash"><div className="console-panel-title"><div><span className="eyebrow">ЛИКВИДНОСТЬ</span><h2>Денежный горизонт</h2></div></div><LiquidityTrend metric={cash}/><a className="cash-limit" href={ownerHref({page:'metric',metric:'GROUP_LIQUIDITY_MIN_13W'})}><span>{demo?'Учебная граница':'Граница источника'}</span><strong>{n(cash?.comparison?.guardrail)} <small>млн ₽</small></strong><ArrowRight/></a></section>
        <section className="glass-panel console-capital"><span className="capital-medallion"><Building2/></span><div><span className="eyebrow">КАПИТАЛ И АКТИВЫ</span><h2>Отдача не рассчитана</h2><p>Методика на согласовании</p></div><a href={ownerHref({page:'area',id:'capital'})}>Компании и активы <ArrowRight/></a></section>
      </div>
    </div>
    <p className="console-source"><ChartNoAxesCombined/> План, факт и прогноз — один согласованный набор. Нажмите на показатель или месяц для раскрытия.</p>
  </div>;
}
