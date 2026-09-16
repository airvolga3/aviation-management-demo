import d from '../fixtures/executive.json';

import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {economicsMonthRoute,normalizeEconomicsRoute,cashTransactions,cashTotal} from '../lib/drilldown-contract';
import {ownerHref,parseOwnerRoute} from '../lib/owner-model';
import {airValue} from '../lib/airline-model';
import {buildAl1Economics,econSelectedValue} from '../lib/al1-economics-model';
import Economics from '../components/al1-economics-workspace';
import Company from '../components/company-overview';
import Airline from '../components/airline-workspace';
import {projectExecutive,executiveProfiles,executiveProfile} from '../lib/executive-payload';
const fmt=(v,digits=2)=>v===null?'—':new Intl.NumberFormat('ru-RU',{maximumFractionDigits:digits}).format(v);
const near=(a,b)=>a===null||b===null?assert.equal(a,b):assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
let checks=0;const check=(label,fn)=>{fn();checks++;console.log('PASS '+label)};
const c=d.commercial,e=buildAl1Economics(c),year={start:'2026-01',end:'2026-12'},primary='AL1';
check('Monthly links resolve to matching metric/scenario/amount in the rendered economics screen',()=>{
 for(const month of ['2026-01','2026-08','2026-09','2026-12']) for(const kpi of ['op','revenue','margin']) for(const field of ['plan','actual','forecast','ytdPlan','variance']) {
  const route=parseOwnerRoute(ownerHref(economicsMonthRoute(primary,d.snapshotId,month,kpi,field)));
  assert.equal(route.start,month);assert.equal(route.end,month);assert.equal(route.field,field);assert.equal(route.kpi,kpi);assert.equal(route.id,undefined);
  const entity=d.entities.find(x=>x.id===primary),i=Number(month.slice(5))-1;
  const base=(key,f)=>{const m=entity.monthly[key][i];return f==='plan'?m.plan:f==='actual'?m.actual:m.actual??m.forecast};
  const amount=f=>kpi==='margin'?(base('op',f)===null||!base('revenue',f)?null:100*base('op',f)/base('revenue',f)):base(kpi,f);
  const expected=field==='ytdPlan'?(month>'2026-08'?null:amount('plan')):field==='variance'?amount('forecast')-amount('plan'):amount(field);
  near(econSelectedValue(c,e,{start:month,end:month},kpi,field),expected);
  const html=render(createElement(Economics,{data:d,route}));
  assert.ok(!html.includes('Контекст недоступен'),ownerHref(route));
  const hero=html.match(/class="eco-hero"[\s\S]*?<strong>([\s\S]*?)<\/strong>/)?.[1];
  assert.ok(hero?.includes(fmt(expected)),`${field}/${month}/${kpi}: ${hero} != ${fmt(expected)}`);
  assert.ok(hero.includes(kpi==='margin'?(field==='variance'?'п. п.':'%'):'млн ₽'));
 }
});
check('Legacy month routes and invalid contexts are handled explicitly',()=>{
 const legacy=normalizeEconomicsRoute({page:'company',company:primary,metric:'economics',id:'ECON-2026-01'});assert.equal(legacy.start,'2026-01');assert.equal(legacy.id,undefined);
 for(const patch of [{snapshot:'old'},{start:'2026-13'},{kpi:'unknown'},{fleet:'foreign'},{aircraft:'foreign'},{id:'unknown'}]) {
  const html=render(createElement(Economics,{data:d,route:{...economicsMonthRoute(primary,d.snapshotId,'2026-01','op'),...patch}}));assert.ok(html.includes('Контекст недоступен'));
 }
});
check('Actual hours links and their rendered target retain the same value',()=>{
 for(const company of ['AL2','AL3']) {
  const html=render(createElement(Company,{data:d,route:{page:'company',company,...year}}));
  const section=html.match(/Факт налёта[\s\S]*?<a href="([^"]+)"/);assert.ok(section);
  const route=parseOwnerRoute(section[1].replaceAll('&amp;','&'));assert.equal(route.field,'actual');assert.equal(route.company,company);
  const target=render(createElement(Airline,{data:d,route}));const value=airValue(d.airlines[company],year,'hours','actual');
  assert.ok(target.match(/class="air-detail-number"[\s\S]*?<\/strong>/)?.[0].includes(fmt(value,1)));
  for(const s of [year,{start:'2026-08',end:'2026-08'},{start:'2026-09',end:'2026-09'},{start:'2026-08',end:'2026-09'}]) near(airValue(d.airlines[company],s,'hours','actual'),s.start==='2026-09'?null:d.airlines[company].legs.filter(l=>l.month>=s.start&&l.month<=s.end&&l.status!=='FORECAST').reduce((n,l)=>n+(l.actualMinutes??0)/60,0));
 }
});
check('Cash table and records share scope; totals reconcile in every month and scenario',()=>{
 for(const company of ['AL2','AL3']) for(const scope of [year,{start:'2026-01',end:'2026-08'},{start:'2026-09',end:'2026-12'},{start:'2026-08',end:'2026-09'},...Array.from({length:12},(_,i)=>({start:'2026-'+String(i+1).padStart(2,'0'),end:'2026-'+String(i+1).padStart(2,'0')}))]) for(const kpi of ['ocf','capex','fcf']) {
  const a=d.airlines[company],rows=cashTransactions(a.transactions,scope,kpi);
  for(const field of ['plan','actual','forecast']) {
   const expected=airValue(a,scope,kpi,field);near(cashTotal(rows,field),expected===null?null:(kpi==='capex'?-1:1)*expected);
   const detail=cashTransactions(a.transactions,scope,kpi,undefined,field);assert.ok(detail.every(r=>rows.includes(r)));if(field==='actual')assert.ok(detail.every(r=>!r.future));
  }
  for(const cat of new Set(rows.map(r=>r.category))) assert.ok(cashTransactions(a.transactions,scope,'payments',cat).every(r=>r.category===cat));
  assert.equal(cashTransactions(a.transactions,scope,'payments','UNKNOWN').length,0);
 }
 for(const company of ['AL2','AL3']) for(const kpi of ['ocf','capex','fcf']) {
  const html=render(createElement(Airline,{data:d,route:{page:'company',company,metric:'finance',kpi,...year,field:'forecast',snapshot:d.snapshotId}}));
  assert.ok(html.includes('Итого денежный поток'));if(kpi==='ocf')assert.ok(!html.includes('CAPEX — инвестиционные выплаты'));
 }
});
check('Payload profiles retain only requested company and preserve common financial values',()=>{
 const base=projectExecutive(d,'overview');assert.ok(Buffer.byteLength(JSON.stringify(base))<100000);assert.equal(base.airlines,undefined);assert.equal(base.commercial,undefined);assert.deepEqual(base.entities,d.entities);
 for(const profile of executiveProfiles.filter(p=>p!=='overview')) {const p=projectExecutive(d,profile);assert.deepEqual(Object.keys(p.airlines),[profile]);assert.deepEqual(p.airlines[profile],d.airlines[profile]);assert.deepEqual(p.entities,d.entities);}
 assert.equal(executiveProfile({page:'executive-detail',company:primary}),'overview');assert.equal(executiveProfile({page:'company',company:primary}),primary);
 assert.throws(()=>projectExecutive({...d,airlines:{}},primary));
});
console.log(`${checks} regression groups passed`);

for (const kpi of ['costs','acmi']) for(const field of ['variance','ytdPlan']) {const html=render(createElement(Economics,{data:d,route:{page:'company',company:'AL1',metric:'economics',kpi,field,...year}}));assert.ok(!html.includes('<span>На лётный час</span>'));assert.ok(!html.includes('<span>Затраты / выручка</span>'));}
console.log('PASS comparative scenarios do not display ratios of incomparable amounts');
