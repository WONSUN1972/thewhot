import {Pool} from 'pg';import {readFile} from 'node:fs/promises';
const p=new Pool({connectionString:process.env.DATABASE_URL});
try{await p.query(await readFile(new URL('../migrations/001_adapter.sql',import.meta.url),'utf8'));console.log('Adapter migrations applied.')}finally{await p.end()}
