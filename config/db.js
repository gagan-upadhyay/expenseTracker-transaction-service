import {Pool} from 'pg';
import { logger } from './logger.js';

export const pool = new Pool({
    connectionString:process.env.POSTGRES_URL,
    ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:false,
});

export const db = (text, params)=>pool.query(text, params);

export const pgConnectTest = async()=>{
    try{
        await pool.connect();
        const result = await pool.query(`SELECT NOW()`);
        logger.info(`Postgres connected. Server time:${result.rows[0].now}`)
    }catch(err){
        logger.error('Error connecting postgres:', err);
    }
}