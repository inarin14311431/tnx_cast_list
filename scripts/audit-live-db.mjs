import { readFile } from 'node:fs/promises';
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) throw new Error('SUPABASE_ACCESS_TOKEN is required; a missing credential is not a passed audit.');
const query = await readFile(new URL('./database-invariants.sql', import.meta.url), 'utf8');
const response = await fetch('https://api.supabase.com/v1/projects/koprmbkoftuuffslhsvt/database/query', {
  method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
  body:JSON.stringify({query}), signal:AbortSignal.timeout(30000)
});
if (!response.ok) throw new Error(`Database metadata audit request failed (${response.status}).`);
const rows = await response.json();
if (!Array.isArray(rows) || rows.length !== 8) throw new Error('Unexpected database audit result.');
for (const row of rows) console.log(`${row.passed === true ? 'PASS' : 'FAIL'} ${row.check_name}`);
if (rows.some(row => row.passed !== true)) process.exitCode=1;
