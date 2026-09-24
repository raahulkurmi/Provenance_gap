// Standalone: `npm test`. Needs a populated cache (run ./run.sh once first).
import { runControls } from '../src/controls.mjs';
import { ROOT, TUF_CACHE } from '../src/pipeline.mjs';

const keys = (await (await fetch('https://registry.npmjs.org/-/npm/v1/keys')).json()).keys;
const r = await runControls(ROOT, TUF_CACHE, keys);
for (const c of r.results) console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.id.padEnd(18)} expected ${c.expect.padEnd(34)} got ${c.got}\n      ${c.detail}`);
if (r.missingFixtures.length) console.log(`missing fixtures (run ./run.sh first): ${r.missingFixtures.join(', ')}`);
process.exit(r.allPass ? 0 : 1);
