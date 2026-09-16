import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
mkdirSync('node_modules/.cache',{recursive:true});
const output=path.resolve('node_modules/.cache/aviation-regressions.mjs');
await build({entryPoints:['scripts/regression-cases.jsx'],bundle:true,platform:'node',format:'esm',packages:'external',outfile:output,jsx:'automatic',tsconfig:'tsconfig.json'});
await import(pathToFileURL(output).href);
