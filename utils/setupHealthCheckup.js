import { pgConnectTest } from '../config/db.js';
import { logger } from '../config/logger.js';
// import { logger } from '../config/logger.js';
import {app} from '../index.js'
import { getRedisClient } from './redisConnection.js';

export  function setupHealthCheckUp(app){
    app.get('/healthz', (req, res)=>{
        return res.status(200).json({status:'ok', uptime:process.uptime()});
    });
    app.get('/readyz', async(req, res)=>{
        try{
            //redis check
            const redis = await getRedisClient();
            console.log("Value of redis", redis);
            const pong = await redis.ping();
            console.log("Value of pong:", pong);
            if(pong!=='PONG') throw new Error('Unxepected Redis response');

            // postgres check
            await pgConnectTest();

            return res.status(200).json({ready:true, redis:'Connected', postgres:'Connected'});
        }catch(err){
            logger.error('🔴 Readiness check failed:', err);
            return res.status(503).json({ready:false, error:err.message||'unknown failure'});
        }
    });
}