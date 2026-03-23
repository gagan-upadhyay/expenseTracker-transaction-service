import { getRedisClient } from "../config/redisConnection.js";

const redisClient = await getRedisClient();
export const rateLimiter = async(req, res, next)=>{
    
    if(process.env.NODE_ENV ==='test'){
        return (req, res, next)=>next();
    }
    const ip = req.ip;
    const key =`login_attempts:${ip}`;
    const maxAttempts=5


    const attempts = await redisClient.incr(key);
    if(attempts===1) await redisClient.expire(key, 60*5) //5 minutes window
    if(attempts>maxAttempts){
        return res.status(429).json({message:'Too many attempts'});
    }
    next();
}