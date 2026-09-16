import fs from 'node:fs';
import ts from 'typescript';
const root = new URL('../', import.meta.url);
const code = ts.transpileModule(fs.readFileSync(new URL('lib/executive-payload.ts',root),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {projectExecutive,executiveProfiles} = await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const data = JSON.parse(fs.readFileSync(new URL('fixtures/executive.json', root)));
for (const profile of executiveProfiles) fs.writeFileSync(new URL('public/data/executive-'+profile+'.json',root), JSON.stringify(projectExecutive(data,profile)));
