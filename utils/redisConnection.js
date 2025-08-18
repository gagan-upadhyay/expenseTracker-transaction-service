import { createClient } from "redis";

export const redisClient = createClient({
    username:'default',
    password:'BgKGWLAzOIAnCL2GEDc3viudHPj3MahN',
    socket:{
        host:'redis-14117.c92.us-east-1-3.ec2.redns.redis-cloud.com',
        port:14117
    }
});

redisClient.on('error', err=>console.log('Redis client error:', err));
await redisClient.connect();

