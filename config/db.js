import {Pool} from 'pg';

export const pool = new Pool({
    connectionString:process.env.POSTGRES_URL,
    ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:false,
});

export const db = (text, params)=>pool.query(text, params);