import { createClient } from "redis";

export const redisClient = createClient({
    username:'default',
    password:'Zs4NBtHYoJvvK8zf9WKOWzg2ShIzvMSB',
    socket:{
        host:'redis-17239.c99.us-east-1-4.ec2.cloud.redislabs.com',
        port:17239
    }
});

redisClient.on('error', err=>console.log('Redis client error:', err));
await redisClient.connect();

