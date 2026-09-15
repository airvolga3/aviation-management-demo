export type Totals = {plan:number; ytd_plan:number; actual:number; remaining:number; forecast:number};
export type OpCompany = Totals & {id:string; name:string; drivers:Record<string,number>};
export type OpMonth = {month:string; label:string; plan:number; actual:number|null; forecast:number|null};
export type OpScenario = {
  status:string; metric_id:string; method_version:string; snapshot_id:string; actual_through:string;
  companies:OpCompany[]; consolidation:Totals & {reason:string}; expected_group:Totals & {gap:number};
  aog_case:{id:string; company:string; period:string; rotation_count:number; revenue_per_rotation:number; avoidable_cost_per_rotation:number; actual_revenue:number; actual_avoidable_cost:number; expected_effect:number; evidence_type:string};
  action:{id:string; period:string; rotations:number; net_increment_per_rotation:number; expected_increment:number; baseline_inclusion:string; approval:string; actual_effect:number|null};
  explicit_limits:string[]; source_fixture:string;
};
export type OpSnapshot = OpScenario & {monthly:Record<string,OpMonth[]>; group:Totals; generatedAt:string};
export const monthNames=['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
export const factorNames:Record<string,string>={volume:'Объём программы',yield:'Доходность',fuel:'Топливо',aog:'Простой и отмены',other:'Другие статьи',consolidation:'Консолидация'};
export const factorOwners:Record<string,string>={volume:'Коммерческий и производственный руководители',yield:'Коммерческий директор',fuel:'Руководитель закупок',aog:'Технический руководитель',other:'ГД компании и финансовый блок',consolidation:'Руководитель консолидации'};
const keys=(['plan','ytd_plan','actual','remaining','forecast'] as const);
const round=(v:number)=>Math.round(v*100)/100;
export function sumTotals(rows:Totals[]):Totals {
  return Object.fromEntries(keys.map(k=>[k,round(rows.reduce((s,r)=>s+r[k],0))])) as Totals;
}
// Deliberate synthetic allocation, in hundredths of a million; last month carries rounding residue.
function allocate(total:number,weights:number[]):number[] {
  const weight=weights.reduce((a,b)=>a+b,0);const units=Math.round(total*100);
  const rows=weights.map(w=>Math.trunc(units*w/weight));
  rows[rows.length-1]+=units-rows.reduce((a,b)=>a+b,0);
  return rows.map(v=>v/100);
}
export function monthlyFor(row:Totals,id:string):OpMonth[] {
  const plan=[...allocate(row.ytd_plan,[8,8,9,10,11,11,12,11]),...allocate(row.plan-row.ytd_plan,[8,8,9,10])];
  let actual=allocate(row.actual,[8,8,9,10,11,11,12,11]);
  // AL2: the August cancellation effect is -24; other YTD effects total -6.
  if(id==='AL2') { const other=allocate(row.actual-row.ytd_plan+24,[8,8,9,10,11,11,12,11]);actual=plan.slice(0,8).map((v,i)=>round(v+other[i]-(i===7?24:0))); }
  const future=id==='CONSOLIDATION'?[0,0,0,row.remaining]:allocate(row.remaining,[8,8,9,10]);
  return monthNames.map((label,i)=>({month:`2026-${String(i+1).padStart(2,'0')}`,label,plan:plan[i],actual:i<8?actual[i]:null,forecast:i>=8?future[i-8]:null}));
}
export function buildOperating(s:OpScenario):OpSnapshot {
  if(s.status!=='DEMO_SYNTHETIC'||s.actual_through!=='2026-08-31'||!s.snapshot_id||!s.companies.length)throw new Error('Неподдерживаемый учебный срез');
  if(new Set(s.companies.map(c=>c.id)).size!==s.companies.length||s.companies.some(c=>['GROUP','CONSOLIDATION'].includes(c.id)))throw new Error('Неуникальный идентификатор');
  for(const row of [...s.companies,s.consolidation,s.expected_group]) {
    if(keys.some(k=>typeof row[k]!=='number'||!Number.isFinite(row[k])))throw new Error('Отсутствует обязательное числовое значение');
    if(Math.abs(row.actual+row.remaining-row.forecast)>.005)throw new Error('Несогласованный прогноз');
  }
  for(const c of s.companies)if(!c.drivers||Object.values(c.drivers).some(v=>!Number.isFinite(v)))throw new Error('Некорректные факторы');
  const a=s.aog_case;
  if(!Number.isInteger(a.rotation_count)||a.rotation_count<1||a.rotation_count>999||!Number.isFinite(a.revenue_per_rotation)||!Number.isFinite(a.avoidable_cost_per_rotation)||a.actual_revenue!==0||a.actual_avoidable_cost!==0||a.period!=='2026-08'||a.company!=='AL2'||Math.abs(a.expected_effect-a.rotation_count*(-a.revenue_per_rotation+a.avoidable_cost_per_rotation))>.005||a.expected_effect!==s.companies.find(c=>c.id==='AL2')?.drivers.aog)throw new Error('Несовместимый кейс отмен');
  if(!Number.isFinite(s.action.expected_increment)||!Number.isFinite(s.action.net_increment_per_rotation)||!Number.isInteger(s.action.rotations)||s.action.rotations<0||Math.abs(s.action.expected_increment-s.action.rotations*s.action.net_increment_per_rotation)>.005)throw new Error('Несогласованный эффект действия');
  const group=sumTotals([...s.companies,s.consolidation]);
  for(const key of keys)if(Math.abs(group[key]-s.expected_group[key])>.005)throw new Error('Несогласованный итог '+key);
  for(const row of s.companies) {
    if(Math.abs(row.actual+row.remaining-row.forecast)>.005 || Math.abs(Object.values(row.drivers).reduce((a,b)=>a+b,0)-row.forecast+row.plan)>.005)throw new Error('Несогласованная компания '+row.id);
  }
  const monthly:Record<string,OpMonth[]>={};
  for(const c of s.companies)monthly[c.id]=monthlyFor(c,c.id);
  monthly.CONSOLIDATION=monthlyFor(s.consolidation,'CONSOLIDATION');
  monthly.GROUP=monthNames.map((label,i)=>({month:`2026-${String(i+1).padStart(2,'0')}`,label,
    plan:round(Object.values(monthly).reduce((sum,rows)=>sum+rows[i].plan,0)),
    actual:i<8?round(Object.values(monthly).reduce((sum,rows)=>sum+(rows[i].actual??0),0)):null,
    forecast:i>=8?round(Object.values(monthly).reduce((sum,rows)=>sum+(rows[i].forecast??0),0)):null}));
  return {...s,group,monthly,generatedAt:new Date().toISOString()};
}
export function entity(s:OpSnapshot,id='GROUP'):OpCompany|undefined {
  if(id==='GROUP')return {...s.group,id,name:'Авиагруппа',drivers:factors(s)};
  if(id==='CONSOLIDATION')return {...s.consolidation,id,name:'Корректировки консолидации',drivers:{consolidation:s.consolidation.forecast-s.consolidation.plan}};
  return s.companies.find(c=>c.id===id);
}
export function factors(s:OpSnapshot):Record<string,number> {
  const result:Record<string,number>={};
  for(const c of s.companies)for(const [key,value] of Object.entries(c.drivers))result[key]=round((result[key]??0)+value);
  result.consolidation=s.consolidation.forecast-s.consolidation.plan;return result;
}
export function recovery(s:OpSnapshot,snapshot:string) {
  if(snapshot!==s.snapshot_id)throw new Error('Срез изменился. Откройте актуальную версию.');
  if(s.action.baseline_inclusion!=='EXCLUDED_IN_TEST_BASELINE')throw new Error('Не подтверждено отсутствие эффекта в прогнозе.');
  const increment=round(s.action.rotations*s.action.net_increment_per_rotation);
  const company=entity(s,'AL2');
  if(!company||!Number.isFinite(increment)||!Number.isFinite(s.action.expected_increment)||Math.abs(increment-s.action.expected_increment)>.005)throw new Error('Несогласованный эффект действия');
  return {increment,group:round(s.group.forecast+increment),company:round(company.forecast+increment)};
}
export function rotation(s:OpSnapshot,id:string) {
  if(!/^AL2-ROT-\d{3}$/.test(id))return undefined;
  const index=Number(id.slice(-3));if(index<1||index>s.aog_case.rotation_count)return undefined;
  const c=s.aog_case;return {id,period:c.period,planRevenue:c.revenue_per_rotation,planCost:c.avoidable_cost_per_rotation,actualRevenue:0,actualCost:0,impact:-c.revenue_per_rotation+c.avoidable_cost_per_rotation};
}
