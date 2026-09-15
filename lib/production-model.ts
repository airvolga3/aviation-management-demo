export type FleetPlan = {id:string;company:string;companyName:string;aircraft:string;annualPlanHours:number;averageLegMinutes:number;demoAircraftCount:number;planBasis:string};
export type ProductionScenario = {version:string;year:number;closedMonth:number;asOf:string;classification:string;fleets:FleetPlan[];notes:string[]};
export type DemoFlight = {id:string;company:string;fleet:string;date:string;month:string;aircraftId:string;service:'CHARTER'|'REGULAR';planMinutes:number;actualMinutes:number|null;forecastMinutes:number|null;status:'COMPLETED'|'CANCELLED'|'FORECAST';reason:string;recordId:string;owner:string};
export type ProductionSnapshot = ProductionScenario & {flights:DemoFlight[]};
export type FlightScope = {company?:string;fleet?:string;month?:string};
const pad=(n:number)=>String(n).padStart(2,'0');
// Largest-remainder allocation in integer minutes: no rounding drift across the pyramid.
export function allocateMinutes(total:number,weights:number[]):number[] {
  const sum=weights.reduce((a,b)=>a+b,0);
  const raw=weights.map(w=>total*w/sum);const result=raw.map(Math.floor);
  const order=raw.map((v,i)=>({i,remainder:v-result[i]})).sort((a,b)=>b.remainder-a.remainder||a.i-b.i);
  for(let i=0,left=total-result.reduce((a,b)=>a+b,0);i<left;i++)result[order[i].i]++;
  return result;
}
export function buildProduction(scenario:ProductionScenario):ProductionSnapshot {
  if(scenario.classification!=='DEMO_SYNTHETIC'||scenario.closedMonth<1||scenario.closedMonth>11)throw new Error('Invalid synthetic scenario');
  const flights:DemoFlight[]=[];
  scenario.fleets.forEach((fleet,f)=>{
    const weights=[72,70,81,86,90,91,95,96,100,108,114,117].map((w,m)=>w+((m+f*3)%5)*3);
    const months=allocateMinutes(fleet.annualPlanHours*60,weights);
    months.forEach((total,m)=>{
      const month=`${scenario.year}-${pad(m+1)}`;
      const count=Math.max(1,Math.round(total/fleet.averageLegMinutes));
      const durations=allocateMinutes(total,Array.from({length:count},(_,i)=>80+(i*17+f*13+m*7)%45));
      const factor=[1010,1040,980,940,850,910,1020,970,960,1000,1040,1060][(m+f)%12];
      durations.forEach((planMinutes,i)=>{
        const closed=m<scenario.closedMonth;const cancelled=closed&&(i+f*7+m*3)%37===0;
        const id=`DEMO-${fleet.id}-${month}-${String(i+1).padStart(4,'0')}`;
        const observed=cancelled?0:Math.round(planMinutes*(factor+((i*11)%61)-30)/1000);
        const date=`${month}-${pad(1+Math.floor(i*Math.min(28,new Date(Date.UTC(scenario.year,m+1,0)).getUTCDate())/count))}`;
        flights.push({id,company:fleet.company,fleet:fleet.id,date,month,aircraftId:`DEMO-${fleet.id}-${pad(i%fleet.demoAircraftCount+1)}`,service:fleet.company==='AL1'?'CHARTER':fleet.company==='AL2'?(i%3===0?'CHARTER':'REGULAR'):(i%11===0?'CHARTER':'REGULAR'),planMinutes,actualMinutes:closed?observed:null,forecastMinutes:closed?null:observed,status:closed?(cancelled?'CANCELLED':'COMPLETED'):'FORECAST',reason:cancelled?'Учебный сценарий: рейс отменён':observed<planMinutes?'Учебный сценарий: сокращение полётного задания':observed>planMinutes?'Учебный сценарий: увеличение полётного задания':'Без изменения к плану',recordId:`RECORD-${id}`,owner:`Производственный директор · ${fleet.companyName}`});
      });
    });
  });
  return {...scenario,flights:flights.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))};
}
export function scopedFlights(data:ProductionSnapshot,scope:FlightScope):DemoFlight[] {
  return data.flights.filter(r=>(!scope.company||r.company===scope.company)&&(!scope.fleet||r.fleet===scope.fleet)&&(!scope.month||r.month===scope.month));
}
export function productionTotals(rows:DemoFlight[]) {
  const closed=rows.filter(r=>r.actualMinutes!==null);
  const plan=rows.reduce((s,r)=>s+r.planMinutes,0);
  const actual=closed.length?closed.reduce((s,r)=>s+r.actualMinutes!,0):null;
  const planClosed=closed.length?closed.reduce((s,r)=>s+r.planMinutes,0):null;
  const forecast=rows.reduce((s,r)=>s+(r.actualMinutes??r.forecastMinutes??0),0);
  return {plan,actual,planClosed,forecast,variance:forecast-plan,rows:rows.length,completed:closed.filter(r=>r.status==='COMPLETED').length,cancelled:closed.filter(r=>r.status==='CANCELLED').length};
}
export function productionMonths(rows:DemoFlight[],year:number) {
  return Array.from({length:12},(_,i)=>{
    const month=`${year}-${pad(i+1)}`;const records=rows.filter(r=>r.month===month);const t=productionTotals(records);
    return {month,plan:records.length?t.plan/60:null,actual:t.actual===null?null:t.actual/60,forecast:records.length&&t.actual===null?t.forecast/60:null};
  });
}
export const flightHours=(minutes:number|null|undefined)=>minutes==null?'—':new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(minutes/60);
