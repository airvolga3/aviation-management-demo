import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const root=new URL('../',import.meta.url),cache=new Map();
function url(name){if(cache.has(name))return cache.get(name);let code=ts.transpileModule(fs.readFileSync(new URL('lib/'+name+'.ts',root),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;code=code.replace(/from ['"]\.\/([^'"]+)['"]/g,(_,dep)=>`from '${url(dep)}'`);const u='data:text/javascript;base64,'+Buffer.from(code).toString('base64');cache.set(name,u);return u;}
const data=n=>JSON.parse(fs.readFileSync(new URL('public/data/'+n+'.json',root)));
const d=data('executive'),p=data('production'),o=data('owner');
let checks=0;function check(label,fn){fn();checks++;console.log('PASS '+label);}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
check('Synthetic public sources',()=>{assert.equal(d.classification,'DEMO_SYNTHETIC');assert.equal(p.classification,'DEMO_SYNTHETIC');assert.equal(o.provider.provider,'synthetic');assert.ok(o.context);});
check('Company identity and single hierarchy',()=>{assert.deepEqual(Object.keys(d.airlines),['AL1','AL2','AL3']);assert.equal(new Set(d.entities.map(e=>e.id)).size,d.entities.length);assert.equal(d.entities.find(e=>e.id==='GROUP').name,'Авиагруппа');});
check('Complete production snapshot',()=>{assert.equal(p.flights.length,4082);assert.equal(new Set(p.flights.map(f=>f.id)).size,4082);for(const a of Object.values(d.airlines)){const ids=new Set(a.legs.map(l=>l.id));assert.equal(ids.size,a.legs.length);assert.ok(a.legs.every(l=>l.company===a.companyId));}});
check('Preserved group revenue',()=>{const r=d.entities.find(e=>e.id==='GROUP').flows.revenue;near(r.plan,8920);near(r.actual,5095);near(r.forecast,8140);});
const regular=await import(url('regular-flight-model'));
for(const [id,revenue,op,kg] of [['AL3',3.45,.22,59850],['AL2',.69,-.14,13860]]){
  const f=regular.buildRegularFlight(d.airlines[id]),v=regular.regularView(f,7);
  check(id+' regular flight financial reconciliation',()=>{near(v.revenue,revenue);near(v.op,op);near(v.carriedKg,kg);near(v.reconciliation,0);assert.equal(f.shipments.length,10);});
  check(id+' chronological states',()=>{for(let i=0;i<7;i++){const s=regular.regularView(f,i);assert.equal(s.carriedKg,null);assert.ok(s.known.every(r=>r.created<=i));}});
}
const nav=await import(url('workspace-navigation')),routes=await import(url('owner-model'));
check('Public URL and parent preserve filters',()=>{const route={page:'company',company:'AL3',metric:'commerce',kpi:'departure',stage:'rcs',row:'SYN-AL3-S9',snapshot:d.snapshotId,start:'2026-08',end:'2026-08'};const next=routes.parseOwnerRoute(routes.ownerHref(route));assert.equal(next.company,'AL3');assert.equal(next.stage,'rcs');const parent=nav.parentWorkspaceRoute(next);assert.equal(parent.row,undefined);assert.equal(parent.start,'2026-08');assert.equal(parent.snapshot,d.snapshotId);});
check('No server-only configuration',()=>{for(const name of ['.env','.openai','.wrangler','app/api','lib/providers'])assert.equal(fs.existsSync(new URL(name,root)),false,name);});
console.log(`${checks} public-release checks passed.`);
